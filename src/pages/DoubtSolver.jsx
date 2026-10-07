import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildRagChunks, getUserScopedStorageKey, loadRagSettings } from '../data/learningResources';

const CHAT_STORAGE_KEY = 'snowwave-ai-chat-sessions';
const createEmptySession = () => ({ id: `chat-${Date.now()}`, title: '新的对话', messages: [], updatedAt: Date.now() });

function loadChatSessions() {
    try {
        const saved = JSON.parse(localStorage.getItem(getUserScopedStorageKey(CHAT_STORAGE_KEY)) || '[]');
        return Array.isArray(saved) ? saved.filter(session => Array.isArray(session.messages) && session.messages.length) : [];
    } catch { return []; }
}

function saveChatSessions(sessions) {
    localStorage.setItem(getUserScopedStorageKey(CHAT_STORAGE_KEY), JSON.stringify(sessions));
}

async function requestAnswer(question, history, useKnowledge, ragSettings) {
    const response = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question, useKnowledge, chunks: useKnowledge ? buildRagChunks(ragSettings) : [],
            history: history.slice(-8).map(message => ({ role: message.role, content: message.role === 'user' ? message.text : message.answer?.content })),
        }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `模型请求失败：${response.status}`);
    return { content: result.answer, sources: ragSettings.showCitations ? result.sources || [] : [], searchTerms: result.searchTerms || [], retrievalMethod: result.retrievalMethod || '' };
}

export default function DoubtSolverAi() {
    const [input, setInput] = useState(() => new URLSearchParams(window.location.search).get('question')?.slice(0, 500) || '');
    const [sessions, setSessions] = useState(loadChatSessions);
    const [activeSessionId, setActiveSessionId] = useState(() => loadChatSessions()[0]?.id || '');
    const [ragSettings] = useState(loadRagSettings);
    const [useKnowledge, setUseKnowledge] = useState(true);
    const [loading, setLoading] = useState(false);
    const activeSession = sessions.find(session => session.id === activeSessionId) || sessions[0] || null;
    const messages = activeSession?.messages || [];
    const sortedSessions = useMemo(() => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt), [sessions]);

    const commitSessions = nextSessions => {
        setSessions(nextSessions);
        if (ragSettings.saveChatHistory) saveChatSessions(nextSessions.filter(session => session.messages?.length));
    };
    const newChat = () => {
        const nextSession = createEmptySession();
        commitSessions([nextSession, ...sessions]);
        setActiveSessionId(nextSession.id);
        setInput('');
    };
    const deleteChat = sessionId => {
        const nextSessions = sessions.filter(session => session.id !== sessionId);
        commitSessions(nextSessions);
        if (sessionId === activeSession?.id) setActiveSessionId(nextSessions[0]?.id || '');
    };
    const ask = async (question = input) => {
        if (!question.trim() || loading) return;
        const cleanQuestion = question.trim();
        const previousMessages = activeSession?.messages || [];
        const targetSession = activeSession || { ...createEmptySession(), messages: [] };
        const targetSessionId = targetSession.id;
        const nextSession = { ...targetSession, title: previousMessages.length ? targetSession.title : cleanQuestion.slice(0, 18), messages: [...previousMessages, { role: 'user', text: cleanQuestion }], updatedAt: Date.now() };
        const nextSessions = sessions.some(session => session.id === targetSessionId)
            ? sessions.map(session => session.id === targetSessionId ? nextSession : session)
            : [nextSession, ...sessions];
        setInput(''); setActiveSessionId(targetSessionId); commitSessions(nextSessions); setLoading(true);
        let answer;
        try { answer = await requestAnswer(cleanQuestion, previousMessages, useKnowledge, ragSettings); }
        catch (error) { answer = { content: `请求失败：${error.message}\n\n请检查“设置 → 模型与提示词”中的连接配置。`, error: true }; }
        setSessions(currentSessions => {
            const updated = currentSessions.map(session => session.id === targetSessionId
                ? { ...session, messages: [...session.messages, { role: 'assistant', answer }], updatedAt: Date.now() } : session);
            if (ragSettings.saveChatHistory) saveChatSessions(updated);
            return updated;
        });
        setLoading(false);
    };

    return <div className="chat-page ai-chat-page">
        <aside className="ai-history-panel">
            <button className="ai-new-chat" type="button" onClick={newChat}>新建对话</button>
            <div className="ai-history-list">{sortedSessions.length ? sortedSessions.map(session =>
                <div className={`ai-history-row ${session.id === activeSession?.id ? 'active' : ''}`} key={session.id}>
                    <button className="ai-history-select" type="button" onClick={() => setActiveSessionId(session.id)}><strong>{session.title}</strong><span>{session.messages.length} 条消息</span></button>
                    <button className="ai-history-delete" type="button" onClick={() => deleteChat(session.id)} aria-label={`删除对话 ${session.title}`} title="删除对话">×</button>
                </div>) : <div className="ai-history-empty">当前账号暂无对话</div>}</div>
        </aside>
        <div className="chat-layout"><section className="chat-panel">
            <div className="chat-messages">
                {messages.length === 0 && <div className="chat-empty">
                    <div className="chat-empty-mark snowwave-mark" aria-hidden="true"><img src="/ai-graph-icon.svg?v=1" alt="" /></div>
                    <h2>今天想解决什么问题？</h2><p>连接模型后，可以直接问答，也可以检索你的资料、笔记和课程。</p><Link to="/settings#rag">配置模型</Link>
                </div>}
                {messages.map((message, index) => <ChatMessage key={index} message={message} />)}
                {loading && <div className="chat-loading"><span />正在向模型提问并检索资料...</div>}
            </div>
            <form className="chat-composer" onSubmit={event => { event.preventDefault(); ask(); }}>
                <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(); } }} placeholder="输入问题，Shift + Enter 换行" rows="1" />
                <div className="chat-composer-actions"><label className="ai-knowledge-toggle"><input type="checkbox" checked={useKnowledge} onChange={event => setUseKnowledge(event.target.checked)} />检索我的知识库</label>
                    <button className="chat-send-button" type="submit" disabled={!input.trim() || loading} aria-label="发送">↑</button></div>
            </form>
        </section></div>
    </div>;
}

function ChatMessage({ message }) {
    if (message.role === 'user') return <div className="chat-message user"><div className="chat-bubble">{message.text}</div></div>;
    return <div className="chat-message assistant"><div className={`chat-bubble ai-answer ${message.answer?.error ? 'ai-answer-error' : ''}`}>
        {renderAnswerContent(message.answer?.content || '')}
        {message.answer?.searchTerms?.length > 0 && <div className="ai-search-terms">
            <strong>{message.answer.retrievalMethod === 'model_terms' ? '模型生成的检索词' : '本机回退检索词'}</strong>
            <span>{message.answer.searchTerms.map(item => item.term).join(' · ')}</span>
        </div>}
        {message.answer?.sources?.length > 0 && <div className="ai-source-list"><strong>本机检索命中</strong>
            {message.answer.sources.map((source, index) => <div key={`${source.id}-${index}`}><b>[{index + 1}] {source.sourceType}《{source.title}》</b><p>{source.content}</p></div>)}
        </div>}
    </div></div>;
}

function renderAnswerContent(content) {
    return content.split(/```([\w-]*)\n([\s\S]*?)```/g).map((part, index, parts) => {
        if (index % 3 === 2) return <pre className="ai-code-block" key={index}>{parts[index - 1] && <span>{parts[index - 1]}</span>}<code>{part.trim()}</code></pre>;
        if (index % 3 === 1) return null;
        return part.split('\n').map((line, lineIndex) => line.trim() ? <p key={`${index}-${lineIndex}`}>{line}</p> : <br key={`${index}-${lineIndex}`} />);
    });
}

