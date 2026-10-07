import React, { useEffect, useState } from 'react';
import { getCurrentUserDisplayAccount, getUserScopedStorageKey, loadRagSettings, saveRagSettings } from '../data/learningResources';

const retrievalItems = [
    { key: 'useDatabase', label: '检索我的数据库', help: '文本、Markdown、CSV、JSON 等可检索内容；PDF、Word、图片和视频暂按文件名检索。' },
    { key: 'useNotes', label: '检索我的笔记', help: 'Markdown 笔记、双链和标签会参与回答。' },
    { key: 'useCourses', label: '检索课程资料', help: '平台内置课程标题和课时信息会作为辅助上下文。' },
];

const privacyItems = [
    { key: 'saveChatHistory', label: '保存 AI 对话历史', help: '关闭后新对话不会写入浏览器本地存储。' },
    { key: 'showCitations', label: '回答显示引用来源', help: '开启后回答会显示命中的数据库、笔记或课程来源。' },
];

const profilePrivacyStorageKey = 'snowwave-profile-privacy';
const usersStorageKey = 'snowwave-users';
const defaultProfilePrivacy = {
    studyStats: true,
    history: true,
    social: true,
    achievements: true,
};
const profilePrivacyItems = [
    { key: 'studyStats', label: '公开学习统计', help: '允许好友在你的主页看到学习统计入口。' },
    { key: 'history', label: '公开历史记录', help: '允许好友在你的主页看到历史记录入口。' },
    { key: 'social', label: '公开社交入口', help: '允许好友在你的主页看到社交入口。' },
    { key: 'achievements', label: '公开我的成就', help: '允许好友在你的主页看到成就入口。' },
];

const emptyAiConfig = {
    chat: { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: '', hasApiKey: false },
    embedding: { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: '', hasApiKey: false },
    retrievalMode: 'terms',
    systemPrompt: '你是AI图谱应用的学习助手。准确、清楚地回答问题；不确定时明确说明，不要编造事实。',
};

async function readApiResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `请求失败：${response.status}`);
    return data;
}

function loadProfilePrivacy() {
    try {
        return { ...defaultProfilePrivacy, ...JSON.parse(localStorage.getItem(getUserScopedStorageKey(profilePrivacyStorageKey)) || '{}') };
    } catch {
        return defaultProfilePrivacy;
    }
}

function syncProfilePrivacyToCurrentUser(nextPrivacy) {
    try {
        const binding = JSON.parse(localStorage.getItem('snowwave-user-binding') || '{}');
        const users = JSON.parse(localStorage.getItem(usersStorageKey) || '[]');
        const nextUsers = users.map(user => {
            const storageId = user.id || `${user.method || 'email'}-${user.contact || user.email || user.phone || user.nickname || 'local'}`;
            return storageId === binding.id ? { ...user, profilePrivacy: nextPrivacy } : user;
        });
        localStorage.setItem(usersStorageKey, JSON.stringify(nextUsers));
    } catch {
        // Local-only privacy sync can be skipped if auth data is unavailable.
    }
}

export default function Settings() {
    const [ragSettings, setRagSettings] = useState(loadRagSettings);
    const [profilePrivacy, setProfilePrivacy] = useState(loadProfilePrivacy);
    const [notice, setNotice] = useState('');
    const [aiConfig, setAiConfig] = useState(emptyAiConfig);
    const [apiKeys, setApiKeys] = useState({ chat: '', embedding: '' });
    const [aiBusy, setAiBusy] = useState('');
    const [aiDirty, setAiDirty] = useState(false);
    const [aiTestMessages, setAiTestMessages] = useState({ chat: '', embedding: '', retrieval: '' });
    const account = getCurrentUserDisplayAccount();

    useEffect(() => {
        fetch('/api/ai/config').then(readApiResponse).then(setAiConfig)
            .catch(error => setNotice(`模型配置读取失败：${error.message}`));
    }, []);

    const saveSettings = (nextSettings, message = '设置已保存') => {
        setRagSettings(nextSettings);
        saveRagSettings(nextSettings);
        setNotice(message);
    };
    const updateSetting = (key) => {
        const checked = !ragSettings[key];
        saveSettings({ ...ragSettings, [key]: checked });
    };
    const updateAiConnection = (role, key, value) => {
        setAiConfig(current => ({ ...current, [role]: { ...current[role], [key]: value } }));
        setAiDirty(true);
        setAiTestMessages(current => ({ ...current, [role]: '' }));
    };
    const saveAiConfig = async (clearRole = '') => {
        setAiBusy('save');
        try {
            const payload = {
                ...aiConfig,
                chat: { ...aiConfig.chat, apiKey: apiKeys.chat, clearApiKey: clearRole === 'chat' },
                embedding: { ...aiConfig.embedding, apiKey: apiKeys.embedding, clearApiKey: clearRole === 'embedding' },
            };
            const saved = await readApiResponse(await fetch('/api/ai/config', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            }));
            setAiConfig(saved);
            setApiKeys({ chat: '', embedding: '' });
            setAiDirty(false);
            setNotice('模型连接和提示词已加密保存到本机服务端');
        } catch (error) {
            setNotice(`保存失败：${error.message}`);
        } finally {
            setAiBusy('');
        }
    };
    const testAiConnection = async role => {
        setAiBusy(role);
        setAiTestMessages(current => ({ ...current, [role]: '正在连接模型服务...' }));
        try {
            const result = await readApiResponse(await fetch('/api/ai/test', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, config: {
                    ...aiConfig,
                    chat: { ...aiConfig.chat, apiKey: apiKeys.chat },
                    embedding: { ...aiConfig.embedding, apiKey: apiKeys.embedding },
                } }),
            }));
            const message = `${result.message}${aiDirty ? ' 当前填写的设置尚未保存。' : ''}`;
            setAiTestMessages(current => ({ ...current, [role]: message }));
            setNotice(message);
        } catch (error) {
            const message = `连接失败：${error.message}`;
            setAiTestMessages(current => ({ ...current, [role]: message }));
            setNotice(message);
        } finally {
            setAiBusy('');
        }
    };
    const updateProfilePrivacy = (key) => {
        const nextPrivacy = { ...profilePrivacy, [key]: !profilePrivacy[key] };
        setProfilePrivacy(nextPrivacy);
        localStorage.setItem(getUserScopedStorageKey(profilePrivacyStorageKey), JSON.stringify(nextPrivacy));
        syncProfilePrivacyToCurrentUser(nextPrivacy);
        setNotice('公开主页隐私已保存');
    };
    const clearChatHistory = () => {
        localStorage.removeItem(getUserScopedStorageKey('snowwave-ai-chat-sessions'));
        setNotice('AI 对话历史已清空');
    };

    return (
        <div className="settings-page settings-platform-page">
            <div className="page-header">
                <div>
                    <h1>设置</h1>
                    <p>管理账号、模型连接、知识库检索、隐私和本地记录。</p>
                </div>
            </div>

            <section className="settings-platform-layout">
                <aside className="glass-card settings-platform-nav">
                    <strong>设置中心</strong>
                    <a href="#account">账号与资料</a>
                    <a href="#retrieval">知识库检索</a>
                    <a href="#rag">模型与提示词</a>
                    <a href="#privacy">隐私与记录</a>
                    <a href="#data">数据管理</a>
                </aside>

                <main className="glass-card settings-platform-panel">
                    <section id="account" className="settings-section">
                        <div className="settings-section-head">
                            <div>
                                <h2>账号与资料</h2>
                                <p>当前资料库、笔记和图谱都按账号隔离保存在本机。</p>
                            </div>
                        </div>
                        <div className="settings-info-row">
                            <span>当前账号</span>
                            <strong>{account}</strong>
                        </div>
                        <div className="settings-info-row">
                            <span>资料范围</span>
                            <strong>数据库、笔记、知识图谱、AI 历史</strong>
                        </div>
                    </section>

                    <section id="retrieval" className="settings-section">
                        <div className="settings-section-head">
                            <div>
                                <h2>知识库检索</h2>
                                <p>控制 AI 答疑会从哪些个人知识源里查找依据。</p>
                            </div>
                        </div>
                        <div className="settings-list">
                            {retrievalItems.map(item => (
                                <label key={item.key} className="settings-switch-row">
                                    <span>
                                        <strong>{item.label}</strong>
                                        <small>{item.help}</small>
                                    </span>
                                    <input type="checkbox" checked={Boolean(ragSettings[item.key])} onChange={() => updateSetting(item.key)} />
                                </label>
                            ))}
                        </div>
                    </section>

                    <section id="rag" className="settings-section">
                        <div className="settings-section-head">
                            <div>
                                <h2>模型与提示词</h2>
                                <p>用现有问答模型即可完成带权检索词查询；也可选用独立嵌入模型进行语义向量检索。</p>
                            </div>
                        </div>
                        <div className="ai-provider-card ai-retrieval-mode">
                            <h3>知识库检索方式</h3>
                            <label><input type="radio" name="retrievalMode" checked={aiConfig.retrievalMode !== 'embedding'} onChange={() => { setAiConfig(current => ({ ...current, retrievalMode: 'terms' })); setAiDirty(true); }} />使用问答模型生成带权检索词（无需额外服务）</label>
                            <p>模型只返回检索词和权重；平台在本机给资料分块评分、筛选，再让模型根据命中内容回答。这是稀疏词向量检索，不等同于专用语义嵌入。</p>
                            <label><input type="radio" name="retrievalMode" checked={aiConfig.retrievalMode === 'embedding'} onChange={() => { setAiConfig(current => ({ ...current, retrievalMode: 'embedding' })); setAiDirty(true); }} />使用独立嵌入模型的语义向量</label>
                            {aiConfig.retrievalMode !== 'embedding' && <div className="ai-provider-actions"><button type="button" disabled={Boolean(aiBusy)} onClick={() => testAiConnection('retrieval')}>测试检索词生成</button></div>}
                            {aiTestMessages.retrieval && aiConfig.retrievalMode !== 'embedding' && <p className="ai-test-message" role="status">{aiTestMessages.retrieval}</p>}
                        </div>
                        {[
                            { role: 'chat', title: '问答模型', help: '用于理解问题、组织答案和引用检索结果。' },
                            { role: 'embedding', title: '向量模型', help: '将问题和资料变为向量；平台在本机计算相似度并检索。' },
                        ].filter(item => item.role === 'chat' || aiConfig.retrievalMode === 'embedding').map(item => (
                            <div className="ai-provider-card" key={item.role}>
                                <h3>{item.title}</h3><p>{item.help}</p>
                                <div className="settings-form-grid">
                                    <label className="settings-form-field"><span>接口类型</span>
                                        <select value={aiConfig[item.role].kind} onChange={event => {
                                            const kind = event.target.value;
                                            updateAiConnection(item.role, 'kind', kind);
                                            updateAiConnection(item.role, 'baseUrl', kind === 'ollama' ? 'http://127.0.0.1:11434/v1' : 'https://api.openai.com/v1');
                                        }}><option value="ollama">本机 Ollama</option><option value="compatible">OpenAI 兼容接口</option></select>
                                    </label>
                                    <label className="settings-form-field"><span>模型名称</span>
                                        <input value={aiConfig[item.role].model} onChange={event => updateAiConnection(item.role, 'model', event.target.value)} placeholder={item.role === 'embedding' ? '例如 nomic-embed-text' : '例如本机模型名称'} />
                                    </label>
                                    <label className="settings-form-field settings-form-field-wide"><span>API 基础地址</span>
                                        <input value={aiConfig[item.role].baseUrl} onChange={event => updateAiConnection(item.role, 'baseUrl', event.target.value)} placeholder="https://provider.example.com/v1" />
                                    </label>
                                    <label className="settings-form-field settings-form-field-wide"><span>API 密钥 {apiKeys[item.role] ? '· 待保存' : aiConfig[item.role].hasApiKey ? '· 已加密保存' : '· 未设置'}</span>
                                        <input type="password" autoComplete="off" value={apiKeys[item.role]} onChange={event => { setApiKeys(current => ({ ...current, [item.role]: event.target.value })); setAiDirty(true); setAiTestMessages(current => ({ ...current, [item.role]: '' })); }} placeholder="留空保持现有密钥；本机 Ollama 通常无需填写" />
                                    </label>
                                </div>
                                <div className="ai-provider-actions">
                                    <button type="button" disabled={Boolean(aiBusy)} onClick={() => testAiConnection(item.role)}>测试当前填写的连接</button>
                                    {aiConfig[item.role].hasApiKey && <button type="button" disabled={Boolean(aiBusy)} onClick={() => saveAiConfig(item.role)}>清除密钥</button>}
                                </div>
                                {aiTestMessages[item.role] && <p className="ai-test-message" role="status">{aiTestMessages[item.role]}</p>}
                                {item.role === 'embedding' && aiConfig.embedding.baseUrl.includes(':1337') &&
                                    <p className="settings-section-note">Jan 的公开 API 文档未列出向量接口。若此项测试返回 404，请给向量模型改用支持 /embeddings 的服务，例如本机 Ollama；问答模型仍可使用 Jan。</p>}
                            </div>
                        ))}
                        <label className="settings-form-field ai-system-prompt"><span>系统提示词</span>
                            <textarea rows="6" value={aiConfig.systemPrompt} onChange={event => { setAiConfig(current => ({ ...current, systemPrompt: event.target.value })); setAiDirty(true); }} placeholder="指导模型的身份、风格、回答格式和边界" />
                        </label>
                        <div className="ai-provider-actions"><button type="button" disabled={Boolean(aiBusy)} onClick={() => saveAiConfig()}>保存模型与提示词</button>{aiDirty && <span className="ai-unsaved-hint">当前填写的设置尚未保存</span>}</div>
                        <p className="settings-section-note">密钥由本机后端加密保存，浏览器不会读取已保存的密钥。检索词模式仅把问题发给问答模型，平台在本机筛选资料后再发送命中的片段；语义向量模式还会把所选资料发送给向量服务。使用外部服务时请留意资料范围。</p>
                    </section>

                    <section id="privacy" className="settings-section">
                        <div className="settings-section-head">
                            <div>
                                <h2>隐私与记录</h2>
                                <p>控制外部请求、历史记录和引用展示。</p>
                            </div>
                        </div>
                        <div className="settings-list">
                            {privacyItems.map(item => (
                                <label key={item.key} className="settings-switch-row">
                                    <span>
                                        <strong>{item.label}</strong>
                                        <small>{item.help}</small>
                                    </span>
                                    <input type="checkbox" checked={Boolean(ragSettings[item.key])} onChange={() => updateSetting(item.key)} />
                                </label>
                            ))}
                        </div>
                        <div className="settings-subsection">
                            <h3>好友可见内容</h3>
                            <p>控制别人进入你的个人主页时，下面四个入口是否可见。默认全部打开。</p>
                        </div>
                        <div className="settings-list">
                            {profilePrivacyItems.map(item => (
                                <label key={item.key} className="settings-switch-row">
                                    <span>
                                        <strong>{item.label}</strong>
                                        <small>{item.help}</small>
                                    </span>
                                    <input type="checkbox" checked={Boolean(profilePrivacy[item.key])} onChange={() => updateProfilePrivacy(item.key)} />
                                </label>
                            ))}
                        </div>
                    </section>

                    <section id="data" className="settings-section">
                        <div className="settings-section-head">
                            <div>
                                <h2>数据管理</h2>
                                <p>文件夹用于组织资料、缩小检索范围，并辅助知识图谱建立关系。</p>
                            </div>
                        </div>
                        <div className="settings-action-row">
                            <span>
                                <strong>AI 对话历史</strong>
                                <small>只清空浏览器本地保存的历史，不影响数据库文件和笔记。</small>
                            </span>
                            <button type="button" onClick={clearChatHistory}>清空历史</button>
                        </div>
                    </section>
                </main>
            </section>
            {notice && <div className="settings-notice">{notice}</div>}
        </div>
    );
}

