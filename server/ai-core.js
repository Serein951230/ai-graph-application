import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const defaultAiConfig = {
  chat: { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: '', apiKey: '' },
  embedding: { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: '', apiKey: '' },
  retrievalMode: 'terms',
  systemPrompt: '你是 AI图谱应用 的学习助手。准确、清楚地回答问题；不确定时明确说明，不要编造事实。解释概念时给出具体例子。',
};

export function normalizeBaseUrl(value) {
  const url = new URL(String(value || '').trim());
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error('接口地址必须使用 HTTPS；本机服务可使用 HTTP localhost。');
  }
  return url.toString().replace(/\/$/, '');
}

export function validateAiConfig(input, previous = defaultAiConfig) {
  if (!input || typeof input !== 'object') throw new Error('模型设置格式错误。');
  const next = {
    systemPrompt: String(input.systemPrompt ?? previous.systemPrompt).trim().slice(0, 8000),
    retrievalMode: input.retrievalMode === 'embedding' ? 'embedding' : input.retrievalMode === 'terms' ? 'terms' : previous.retrievalMode || 'terms',
  };
  if (!next.systemPrompt) throw new Error('系统提示词不能为空。');
  for (const role of ['chat', 'embedding']) {
    const supplied = input[role] || {};
    const old = previous[role] || defaultAiConfig[role];
    const kind = supplied.kind === 'compatible' ? 'compatible' : supplied.kind === 'ollama' ? 'ollama' : old.kind;
    const baseUrl = normalizeBaseUrl(supplied.baseUrl ?? old.baseUrl);
    const model = String(supplied.model ?? old.model).trim().slice(0, 160);
    const apiKey = supplied.clearApiKey ? '' : String(supplied.apiKey || old.apiKey || '').trim();
    if (apiKey.length > 1000) throw new Error('密钥长度超过限制。');
    next[role] = { kind, baseUrl, model, apiKey };
  }
  return next;
}

export function publicAiConfig(config) {
  return {
    systemPrompt: config.systemPrompt,
    retrievalMode: config.retrievalMode || 'terms',
    chat: { kind: config.chat.kind, baseUrl: config.chat.baseUrl, model: config.chat.model, hasApiKey: Boolean(config.chat.apiKey) },
    embedding: { kind: config.embedding.kind, baseUrl: config.embedding.baseUrl, model: config.embedding.model, hasApiKey: Boolean(config.embedding.apiKey) },
  };
}

export function encryptConfig(config, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
  return JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}

export function decryptConfig(payload, key) {
  const envelope = JSON.parse(payload);
  if (envelope.version !== 1) throw new Error('不支持的配置版本。');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
}

export const contentHash = value => createHash('sha256').update(value).digest('hex');

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return -1;
  let dot = 0;
  let leftSize = 0;
  let rightSize = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftSize += left[index] ** 2;
    rightSize += right[index] ** 2;
  }
  return leftSize && rightSize ? dot / Math.sqrt(leftSize * rightSize) : -1;
}

export function rankChunks(queryVector, chunks, vectors, limit = 5) {
  return chunks.map((chunk, index) => ({ ...chunk, score: cosineSimilarity(queryVector, vectors[index]) }))
    .filter(chunk => chunk.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const normalized = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const excludedTerms = new Set(['什么', '怎么', '如何', '为什么', '请问', '能否', '是否', '问题', '资料', '内容', '一个', '这个', '那个']);

export function fallbackSearchTerms(question) {
  const words = normalized(question).match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9._+-]*/gu) || [];
  const result = [];
  for (const word of words) {
    if (excludedTerms.has(word)) continue;
    if (/^[\p{Script=Han}]+$/u.test(word) && word.length > 4) {
      for (let index = 0; index < word.length - 1 && result.length < 10; index += 1) result.push({ term: word.slice(index, index + 2), weight: 0.65 });
    } else {
      result.push({ term: word.slice(0, 40), weight: 1 });
    }
  }
  return result.slice(0, 10);
}

export function parseSearchTerms(content, question) {
  let parsed;
  try {
    const text = String(content || '');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch { parsed = {}; }
  const terms = [];
  const seen = new Set();
  const candidates = Array.isArray(parsed.terms) ? parsed.terms : [];
  for (const candidate of candidates) {
    const term = normalized(typeof candidate === 'string' ? candidate : candidate?.term).slice(0, 40);
    if (!term || excludedTerms.has(term) || seen.has(term)) continue;
    const rawWeight = typeof candidate === 'string' ? 1 : Number(candidate?.weight);
    const weight = Number.isFinite(rawWeight) ? Math.max(0.3, Math.min(3, rawWeight)) : 1;
    terms.push({ term, weight });
    seen.add(term);
    if (terms.length >= 10) break;
  }
  if (terms.length >= 2) return terms;
  for (const fallback of fallbackSearchTerms(question)) {
    if (seen.has(fallback.term)) continue;
    terms.push({ ...fallback, weight: fallback.weight * 0.7 });
    seen.add(fallback.term);
    if (terms.length >= 12) break;
  }
  return terms;
}

function bigrams(text) {
  const compact = normalized(text).replace(/\s+/g, '');
  const grams = new Set();
  for (let index = 0; index < compact.length - 1; index += 1) grams.add(compact.slice(index, index + 2));
  return grams;
}

function termMatch(term, text) {
  const haystack = normalized(text);
  if (haystack.includes(term)) return 1;
  if (term.length < 3 || !/[\p{Script=Han}]/u.test(term)) return 0;
  const queryGrams = bigrams(term);
  const textGrams = bigrams(haystack);
  const matched = [...queryGrams].filter(gram => textGrams.has(gram)).length;
  const ratio = matched / Math.max(1, queryGrams.size);
  return ratio >= 0.6 ? ratio * 0.45 : 0;
}

export function rankSparseChunks(terms, chunks, limit = 5) {
  if (!terms.length || !chunks.length) return [];
  const frequency = terms.map(({ term }) => chunks.filter(chunk => termMatch(term, `${chunk.title} ${chunk.content}`) > 0).length);
  const ranked = chunks.map(chunk => {
    const score = terms.reduce((total, { term, weight }, index) => {
      const idf = Math.log(1 + (chunks.length - frequency[index] + 0.5) / (frequency[index] + 0.5));
      return total + weight * idf * (3 * termMatch(term, chunk.title) + termMatch(term, chunk.content));
    }, 0);
    return { ...chunk, score };
  }).filter(chunk => chunk.score > 0)
    .sort((left, right) => right.score - left.score);
  const minimum = Math.max(0.5, (ranked[0]?.score || 0) * 0.3);
  return ranked.filter(chunk => chunk.score >= minimum).slice(0, limit);
}
