import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import { cosineSimilarity, decryptConfig, encryptConfig, parseSearchTerms, rankChunks, rankSparseChunks } from './ai-core.js';

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));

test('encryption and vector ranking', () => {
  const key = Buffer.alloc(32, 7);
  const saved = encryptConfig({ apiKey: 'secret-value' }, key);
  assert.equal(saved.includes('secret-value'), false);
  assert.equal(decryptConfig(saved, key).apiKey, 'secret-value');
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(rankChunks([1, 0], [{ id: 'apple' }, { id: 'banana' }], [[1, 0], [0, 1]])[0].id, 'apple');
  const terms = parseSearchTerms('```json\n{"terms":[{"term":"苹果","weight":2}]}\n```', '苹果是什么');
  assert.equal(terms[0].term, '苹果');
  assert.equal(rankSparseChunks(terms, [{ id: 'a', title: '苹果笔记', content: '苹果是水果' }, { id: 'b', title: '香蕉笔记', content: '香蕉是水果' }])[0].id, 'a');
});

test('encrypted settings, provider calls, local vector retrieval and answer', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'snowwave-ai-test-'));
  process.env.AI_CONFIG_DIRECTORY = directory;
  let lastChatRequest;
  let lastAuthorization;
  let embeddingCalls = 0;
  let searchCalls = 0;
  const provider = createServer(async (req, res) => {
    const parts = [];
    for await (const part of req) parts.push(part);
    const data = JSON.parse(Buffer.concat(parts).toString('utf8'));
    lastAuthorization = req.headers.authorization;
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/embeddings') {
      embeddingCalls += 1;
      res.end(JSON.stringify({ data: data.input.map((text, index) => ({ index, embedding: text.includes('苹果') ? [1, 0] : [0, 1] })) }));
    } else if (req.url === '/v1/chat/completions') {
      lastChatRequest = data;
      if (data.messages?.[0]?.content?.includes('知识库检索词提取器')) {
        searchCalls += 1;
        res.end(JSON.stringify({ choices: [{ message: { content: '{"terms":[{"term":"苹果","weight":2}]}' } }] }));
      } else {
        res.end(JSON.stringify({ choices: [{ message: { content: '这是模拟模型的回答 [1]' } }] }));
      }
    } else { res.statusCode = 404; res.end('{}'); }
  });
  const providerPort = await listen(provider);
  const { default: aiRouter } = await import('./ai-service.js');
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRouter);
  const api = createServer(app);
  const apiPort = await listen(api);
  const base = `http://127.0.0.1:${apiPort}/api/ai`;
  const json = async (url, method, body) => {
    const response = await fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const connection = { kind: 'compatible', baseUrl: `http://127.0.0.1:${providerPort}/v1`, model: 'mock-model', apiKey: 'private-test-key' };
    const saved = await json('/config', 'PUT', { chat: connection, embedding: connection, retrievalMode: 'embedding', systemPrompt: '请简洁回答。' });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.chat.hasApiKey, true);
    assert.equal(JSON.stringify(saved.body).includes('private-test-key'), false);
    assert.equal((await readFile(path.join(directory, '.ai-config.json'), 'utf8')).includes('private-test-key'), false);
    const draft = await json('/test', 'POST', { role: 'chat', config: {
      chat: { ...connection, model: 'draft-model', apiKey: 'unsaved-test-key' },
      embedding: connection,
      systemPrompt: '请简洁回答。',
    } });
    assert.equal(draft.status, 200);
    assert.equal(lastChatRequest.model, 'draft-model');
    assert.equal(lastAuthorization, 'Bearer unsaved-test-key');
    assert.equal((await json('/config', 'GET')).body.chat.model, 'mock-model');
    const asked = await json('/chat', 'POST', {
      question: '苹果是什么？', useKnowledge: true,
      chunks: [
        { id: 'a', sourceType: '笔记', title: '苹果笔记', content: '苹果是一种水果。' },
        { id: 'b', sourceType: '笔记', title: '香蕉笔记', content: '香蕉也是水果。' },
      ],
    });
    assert.equal(asked.status, 200);
    assert.equal(asked.body.sources.length, 1);
    assert.equal(asked.body.sources[0].id, 'a');
    assert.match(lastChatRequest.messages.at(-1).content, /苹果是一种水果/);
    assert.doesNotMatch(lastChatRequest.messages.at(-1).content, /香蕉也是水果/);
    assert.equal(asked.body.answer, '这是模拟模型的回答 [1]');
    assert.ok(embeddingCalls > 0);
    const switched = await json('/config', 'PUT', { chat: connection, embedding: connection, retrievalMode: 'terms', systemPrompt: '请简洁回答。' });
    assert.equal(switched.body.retrievalMode, 'terms');
    const callsBefore = embeddingCalls;
    const termAnswer = await json('/chat', 'POST', {
      question: '苹果有什么营养？', useKnowledge: true,
      chunks: [
        { id: 'a', sourceType: '笔记', title: '苹果笔记', content: '苹果含有膳食纤维。' },
        { id: 'b', sourceType: '笔记', title: '香蕉笔记', content: '香蕉含有钾。' },
      ],
    });
    assert.equal(termAnswer.status, 200);
    assert.equal(termAnswer.body.sources[0].id, 'a');
    assert.equal(termAnswer.body.sources.length, 1);
    assert.equal(termAnswer.body.retrievalMethod, 'model_terms');
    assert.equal(termAnswer.body.searchTerms[0].term, '苹果');
    assert.equal(embeddingCalls, callsBefore);
    assert.ok(searchCalls > 0);
  } finally {
    await close(api);
    await close(provider);
    await rm(directory, { recursive: true, force: true });
    delete process.env.AI_CONFIG_DIRECTORY;
  }
});
