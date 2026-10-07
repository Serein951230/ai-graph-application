import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const USERS_STORAGE_KEY = 'snowwave-users';
const PROFILE_STORAGE_KEY = 'snowwave-profile';
const defaultProfilePrivacy = {
    studyStats: true,
    history: true,
    social: true,
    achievements: true,
};
const authMethods = {
    email: { label: '电子邮箱', placeholder: '请输入电子邮箱', autoComplete: 'email', inputMode: 'email', duplicateMessage: '该邮箱已注册，不能重复注册。' },
    phone: { label: '手机号', placeholder: '请输入手机号', autoComplete: 'tel', inputMode: 'tel', duplicateMessage: '该手机号已注册，不能重复注册。' },
    wechat: { label: '微信号', placeholder: '请输入微信号', autoComplete: 'username', inputMode: 'text', duplicateMessage: '该微信号已注册，不能重复注册。' },
};
const authMethodOptions = [
    { id: 'email', label: '邮箱登录' },
    { id: 'wechat', label: '微信登录' },
    { id: 'phone', label: '手机号登录' },
];

const landingGraphColors = {
    学习路径: '#facc15',
    课程: '#38bdf8',
    主题: '#22c55e',
    视频: '#7dd3fc',
    图片: '#fb7185',
    笔记: '#f43f5e',
    文件: '#8b5cf6',
    标签: '#f97316',
};

const infoPanels = {
    terms: {
        title: '服务条款',
        eyebrow: 'Terms of Service',
        paragraphs: [
            'AI图谱用于组织课程、视频、习题、笔记和知识图谱。使用本平台时，请确保上传和填写的资料真实、合法，并仅用于学习和教学管理场景。',
            '平台会根据你的学习行为记录课程进度、练习完成情况和知识节点关系，用于生成学习路径和进度反馈。禁止利用平台发布违法、侵权或干扰系统稳定性的内容。',
            '我们可能根据产品迭代更新功能和规则，重要变更会在平台内进行提示。继续使用即表示你理解并接受更新后的条款。',
        ],
    },
    privacy: {
        title: '隐私政策',
        eyebrow: 'Privacy Policy',
        paragraphs: [
            '我们只收集账号登录、课程学习、练习作答、笔记和学习路径相关数据，用于提供个性化学习服务。',
            '个人资料、头像、名片和学习记录会优先保存在本地或平台授权范围内，不会用于与学习无关的用途。',
            '你可以在个人中心修改资料，在数据库和历史记录中管理学习文件与观看记录。',
        ],
    },
    feedback: {
        title: '反馈建议',
        eyebrow: 'Feedback',
        paragraphs: [
            '如果课程无法播放、习题答案有误、知识图谱关系不准确，建议在反馈中说明课程名称、视频标题和具体问题。',
            '我们会优先处理影响学习路径、进度统计、课程资料和账号登录的问题。',
            '反馈邮箱：feedback@snowwave-paper.local。也可以在登录后通过“社交”模块提交建议。',
        ],
    },
    contact: {
        title: '联系我们',
        eyebrow: 'Contact',
        paragraphs: [
            '课程内容合作：course@snowwave-paper.local',
            '账号与数据支持：support@snowwave-paper.local',
            '管理员与学校部署：admin@snowwave-paper.local',
        ],
    },
    security: {
        title: '数据安全',
        eyebrow: 'Security',
        paragraphs: [
            'AI图谱会区分普通用户和管理员权限。普通用户负责学习，管理员负责课程、资料和学习状态维护。',
            '课程资料、练习记录和学习进度会按模块归档，减少误删和混乱引用。',
            '建议管理员定期检查课程视频来源、习题答案和资料入库状态，确保学习内容可靠。',
        ],
    },
    help: {
        title: '帮助中心',
        eyebrow: 'Help Center',
        paragraphs: [
            '课程中心用于查看全部课程；学习视频页用于播放本地课程视频；习题页用于完成课后练习。',
            '学习路径会把多门课程组合成一个职业方向，例如软件开发工程师路径。',
            '知识图谱用于查看课程、主题、视频、笔记和练习之间的关系。',
        ],
    },
};

function createCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function userStorageId(user) {
    return user.id || `${user.method || 'email'}-${user.contact || user.email || user.phone || user.nickname || 'local'}`;
}

function scopedProfileKey(user) {
    return `${PROFILE_STORAGE_KEY}:${encodeURIComponent(userStorageId(user))}`;
}

function ensureUserProfile(user) {
    const key = scopedProfileKey(user);
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify({
        nickname: user.nickname || user.contact || user.email || '',
        bio: '',
        avatarPreview: '',
        coverPreview: '',
    }));
}

function landingNodePosition(node, index, total) {
    if (node.folder === '学习路径') return { x: 8, y: 0, z: 0 };
    const folderRadius = {
        标签: 44,
        课程: 78,
        主题: 112,
        视频: 138,
        笔记: 132,
    };
    const folderLift = {
        标签: 0,
        课程: 8,
        主题: -8,
        视频: 18,
        笔记: -18,
    };
    const radius = folderRadius[node.folder] || 118;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = index * goldenAngle + (node.folder === '主题' ? 0.62 : node.folder === '视频' ? 1.16 : 0);
    const normalized = total > 1 ? (index / (total - 1)) - 0.5 : 0;
    return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.78 + (folderLift[node.folder] || 0),
        z: normalized * 82 + Math.sin(angle * 1.7) * 18,
    };
}

function LandingModel() {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;
        let disposed = false;
        let graph = null;
        let resizeObserver = null;

        Promise.all([
            import('3d-force-graph'),
            import('./KnowledgeGraph'),
            import('three'),
            import('three-spritetext'),
        ]).then(([graphModule, { buildGraphData }, THREE, spriteModule]) => {
            if (disposed) return;
            const SpriteText = spriteModule.default;
            const sourceGraph = buildGraphData();
            const keepNode = (node) => {
                if (node.folder === '学习路径' || node.folder === '课程' || node.folder === '主题' || node.folder === '标签') return true;
                if (node.folder === '视频') return /CS50|Python|Git|算法|Web|函数/.test(node.name);
                if (node.folder === '笔记') return /React|软件|CS50/.test(node.name);
                return false;
            };
            const keptNodeIds = new Set(sourceGraph.nodes.filter(keepNode).map(node => node.id));
            const filteredNodes = sourceGraph.nodes.filter(node => keptNodeIds.has(node.id));
            const landingGraph = {
                nodes: filteredNodes.map((node, index) => {
                    const position = landingNodePosition(node, index, filteredNodes.length);
                    return {
                        ...node,
                        ...position,
                        fx: position.x,
                        fy: position.y,
                        fz: position.z,
                        color: landingGraphColors[node.folder] || '#38bdf8',
                    };
                }),
                links: sourceGraph.links.filter(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    return keptNodeIds.has(sourceId) && keptNodeIds.has(targetId);
                }),
            };
            const makeLandingNode = (node) => {
                const group = new THREE.Group();
                const radius = Math.max(2.1, Math.cbrt(node.val || 3) * 1.85);
                const color = new THREE.Color(node.color);
                const core = new THREE.Mesh(
                    new THREE.SphereGeometry(radius, 16, 16),
                    new THREE.MeshStandardMaterial({
                        color,
                        roughness: 0.42,
                        metalness: 0.08,
                        emissive: color,
                        emissiveIntensity: 0.2,
                    }),
                );
                const glow = new THREE.Mesh(
                    new THREE.SphereGeometry(radius * 1.48, 12, 12),
                    new THREE.MeshBasicMaterial({
                        color,
                        transparent: true,
                        opacity: 0.08,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                    }),
                );
                const label = new SpriteText(node.name);
                label.color = 'rgba(248, 241, 201, 0.78)';
                label.textHeight = node.kind === 'tag' ? 2.55 : 1.9;
                label.position.y = radius * 1.8 + 2.2;
                group.add(glow, core, label);
                return group;
            };
            graph = graphModule.default({ controlType: 'orbit' })(mount)
                .backgroundColor('rgba(0, 0, 0, 0)')
                .showNavInfo(false)
                .enableNodeDrag(false)
                .enableNavigationControls(true)
                .nodeLabel(node => node.name)
                .nodeThreeObject(makeLandingNode)
                .linkColor(() => 'rgba(248, 241, 201, 0.34)')
                .linkWidth(0.62)
                .linkOpacity(0.54)
                .warmupTicks(0)
                .cooldownTicks(0);
            graph.graphData(landingGraph);
            const controls = graph.controls();
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.7;
            controls.enablePan = false;
            controls.enableZoom = true;
            graph.cameraPosition({ x: 8, y: 24, z: 285 }, { x: 0, y: 0, z: 0 }, 0);
            resizeObserver = new ResizeObserver(() => {
                if (!graph || disposed) return;
                graph.width(mount.clientWidth).height(mount.clientHeight);
            });
            resizeObserver.observe(mount);
        });

        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            graph?._destructor?.();
            mount.replaceChildren();
        };
    }, []);

    return <div className="foodie-auth-3d-model" ref={mountRef} aria-label="旋转的三维知识模型" />;
}

function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

function normalizeAccount(method, value) {
    const trimmed = value.trim();
    if (method === 'email') return trimmed.toLowerCase();
    if (method === 'phone') return trimmed.replace(/\s/g, '');
    return trimmed;
}

export default function UserLogin({ onLogin }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [authMethod, setAuthMethod] = useState('email');
    const [nickname, setNickname] = useState('');
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [captcha, setCaptcha] = useState(createCaptcha);
    const [captchaInput, setCaptchaInput] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [authPanelOpen, setAuthPanelOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState('user');
    const [adminAccount, setAdminAccount] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    const [activeInfoPanel, setActiveInfoPanel] = useState(null);

    const isRegister = mode === 'register';
    const method = authMethods[authMethod];

    const refreshCaptcha = () => {
        setCaptcha(createCaptcha());
        setCaptchaInput('');
    };

    const toggleMode = () => {
        setMode(isRegister ? 'login' : 'register');
        setError('');
        setNotice('');
        setNickname('');
        setAccount('');
        setPassword('');
        setConfirmPassword('');
        refreshCaptcha();
    };

    const switchMethod = (nextMethod) => {
        setAuthMethod(nextMethod);
        setAccount('');
        setError('');
        setNotice('');
        refreshCaptcha();
    };

    const refreshCaptchaAfterRetry = () => {
        if (!error) return;
        setError('');
        setNotice('');
        refreshCaptcha();
    };

    const updateAccount = (value) => {
        setAccount(value);
        refreshCaptchaAfterRetry();
    };

    const updatePassword = (value) => {
        setPassword(value);
        refreshCaptchaAfterRetry();
    };

    const validateCaptcha = () => {
        if (captchaInput.trim().toUpperCase() !== captcha) {
            setError('图形验证码不正确。');
            refreshCaptcha();
            return false;
        }
        return true;
    };

    const register = () => {
        if (!nickname.trim()) {
            setError('请输入昵称。');
            return;
        }
        const normalizedAccount = normalizeAccount(authMethod, account);
        if (!normalizedAccount) {
            setError(`请输入${method.label}。`);
            return;
        }
        if (authMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAccount)) {
            setError('请输入有效的电子邮箱。');
            return;
        }
        if (authMethod === 'phone' && !/^1\d{10}$/.test(normalizedAccount)) {
            setError('请输入有效的手机号。');
            return;
        }
        if (!password.trim()) {
            setError('请输入密码。');
            return;
        }
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致。');
            return;
        }
        if (!validateCaptcha()) return;

        const users = loadUsers();
        if (users.some(user => user.method === authMethod && user.contact === normalizedAccount)) {
            setError(method.duplicateMessage);
            return;
        }

        const nextUser = {
            id: `user-${Date.now()}`,
            nickname: nickname.trim(),
            method: authMethod,
            contact: normalizedAccount,
            email: authMethod === 'email' ? normalizedAccount : '',
            phone: authMethod === 'phone' ? normalizedAccount : '',
            wechat: authMethod === 'wechat' ? normalizedAccount : '',
            password,
            role: 'user',
            profilePrivacy: defaultProfilePrivacy,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
        };
        saveUsers([nextUser, ...users]);
        ensureUserProfile(nextUser);
        localStorage.setItem('snowwave-user-binding', JSON.stringify({
            id: userStorageId(nextUser),
            method: authMethod,
            contact: normalizedAccount,
            nickname: nextUser.nickname,
            verifiedAt: nextUser.createdAt,
        }));
        window.dispatchEvent(new Event('snowwave-profile-updated'));
        sessionStorage.setItem('snowwave-user', 'signed-in');
        onLogin?.();
        navigate('/');
    };

    const login = () => {
        const normalizedAccount = normalizeAccount(authMethod, account);
        if (!normalizedAccount) {
            setError(`请输入${method.label}。`);
            return;
        }
        if (!password.trim()) {
            setError('请输入密码。');
            return;
        }
        if (!validateCaptcha()) return;

        const users = loadUsers();
        const user = users.find(item => {
            const itemMethod = item.method || 'email';
            const itemContact = item.contact || normalizeEmail(item.email || '');
            return itemMethod === authMethod && itemContact === normalizedAccount && item.password === password;
        });
        if (!user) {
            setError(`${method.label}或密码不正确。`);
            return;
        }

        const nextUsers = users.map(item => item.id === user.id ? { ...item, lastLoginAt: new Date().toISOString() } : item);
        saveUsers(nextUsers);
        ensureUserProfile(user);
        localStorage.setItem('snowwave-user-binding', JSON.stringify({
            id: userStorageId(user),
            method: user.method || authMethod,
            contact: user.contact || user.email,
            nickname: user.nickname,
            verifiedAt: user.createdAt,
        }));
        window.dispatchEvent(new Event('snowwave-profile-updated'));
        sessionStorage.setItem('snowwave-user', 'signed-in');
        onLogin?.();
        navigate('/');
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        if (isRegister) {
            register();
        } else {
            login();
        }
    };

    const openUserDrawer = () => {
        setDrawerMode('user');
        setAdminError('');
        setAuthPanelOpen(true);
    };

    const switchToAdminDrawer = () => {
        setDrawerMode('admin');
        setError('');
        setNotice('');
        setAdminError('');
        setAuthPanelOpen(true);
    };

    const switchToUserDrawer = () => {
        setDrawerMode('user');
        setAdminError('');
    };

    const handleAdminSubmit = (event) => {
        event.preventDefault();
        if (!adminAccount.trim() || !adminPassword.trim()) {
            setAdminError('请输入管理员账号和密码。');
            return;
        }
        sessionStorage.setItem('snowwave-admin', 'signed-in');
        navigate('/admin');
    };

    return (
        <main className="user-auth-page foodie-auth-page">
            <header className="foodie-auth-header">
                <Link to="/login" className="foodie-auth-logo">
                    <span className="foodie-auth-logo-mark" aria-hidden="true">
                        <img src="/snowwave-icon.svg?v=5" alt="" />
                    </span>
                    <span>
                        <strong><small>The</small> Snowwave</strong>
                        <strong>Paper</strong>
                    </span>
                </Link>
            </header>

            <section className="user-auth-shell foodie-auth-shell">
                <div className="user-auth-visual foodie-auth-visual">
                    <div className="foodie-auth-glow foodie-auth-glow-one" />
                    <div className="foodie-auth-glow foodie-auth-glow-two" />
                    <h1><span>AI图谱</span><span>Paper</span></h1>
                    <p>让知识节点彼此连接，形成可追踪的学习图谱</p>
                    <strong>围绕课程、视频、练习和笔记建立知识关系，帮助你看清学习路径、薄弱环节和下一步方向。</strong>
                    <div className="foodie-auth-visual-actions">
                        <button type="button" onClick={openUserDrawer}>立即体验</button>
                    </div>
                    <div className="foodie-auth-graph-showcase" onDoubleClick={openUserDrawer} aria-label="可拖动的三维知识图谱模型" role="img">
                        <LandingModel />
                    </div>
                </div>
            </section>

            <section className="snowwave-info-band">
                <div className="snowwave-info-inner">
                    <div className="snowwave-footer-grid">
                        <div>
                            <strong>产品</strong>
                            <button type="button" onClick={() => setActiveInfoPanel('help')}>帮助中心</button>
                            <button type="button" onClick={() => setActiveInfoPanel('security')}>数据安全</button>
                        </div>
                        <div>
                            <strong>支持</strong>
                            <button type="button" onClick={() => setActiveInfoPanel('feedback')}>反馈建议</button>
                            <button type="button" onClick={() => setActiveInfoPanel('contact')}>联系我们</button>
                        </div>
                        <div>
                            <strong>法律</strong>
                            <button type="button" onClick={() => setActiveInfoPanel('terms')}>服务条款</button>
                            <button type="button" onClick={() => setActiveInfoPanel('privacy')}>隐私政策</button>
                            <button type="button" onClick={() => setActiveInfoPanel('security')}>权限说明</button>
                        </div>
                        <div>
                            <strong>联系</strong>
                            <span>support@snowwave-paper.local</span>
                            <span>工作日 09:00 - 18:00</span>
                            <span>课程资料与学习路径支持</span>
                        </div>
                    </div>

                    <div className="snowwave-footer-bottom">
                        <span>© 2026 AI图谱应用</span>
                        <span>Knowledge graph learning platform</span>
                    </div>
                </div>
            </section>

            <div className={`foodie-auth-drawer-backdrop ${authPanelOpen ? 'open' : ''}`} onClick={() => setAuthPanelOpen(false)} />
            <aside className={`foodie-auth-drawer ${authPanelOpen ? 'open' : ''}`} aria-hidden={!authPanelOpen}>
                <button className="foodie-auth-drawer-close" type="button" onClick={drawerMode === 'user' ? switchToAdminDrawer : switchToUserDrawer}>{drawerMode === 'user' ? '管理员登录' : '用户登录'}</button>
                {drawerMode === 'admin' ? (
                    <form className="user-auth-card foodie-auth-card" onSubmit={handleAdminSubmit}>
                        <div className="user-auth-card-heading">
                            <span>ADMIN</span>
                            <h2>管理员登录</h2>
                            <p>进入课程、用户和资料管理后台。</p>
                        </div>

                        <label className="admin-field-label" htmlFor="drawer-admin-account">管理员账号</label>
                        <input id="drawer-admin-account" className="form-input" value={adminAccount} onChange={event => { setAdminAccount(event.target.value); setAdminError(''); }} autoComplete="username" placeholder="请输入管理员账号" />

                        <label className="admin-field-label" htmlFor="drawer-admin-password">密码</label>
                        <input id="drawer-admin-password" className="form-input" type="password" value={adminPassword} onChange={event => { setAdminPassword(event.target.value); setAdminError(''); }} autoComplete="current-password" placeholder="请输入密码" />

                        {adminError && <div className="admin-error">{adminError}</div>}
                        <button className="btn btn-primary user-auth-submit" type="submit">进入管理后台</button>
                    </form>
                ) : (
                <form className="user-auth-card foodie-auth-card" onSubmit={handleSubmit}>
                    <div className="user-auth-card-heading">
                        <span>{isRegister ? 'CREATE' : 'LOGIN'}</span>
                        <h2>{isRegister ? '注册账户' : '登录账户'}</h2>
                        <p>{isRegister ? '已有账号？' : '还没有账号？'} <button type="button" onClick={toggleMode}>{isRegister ? '立即登录' : '立即注册'}</button></p>
                    </div>

                    {isRegister && (
                        <>
                            <label className="admin-field-label" htmlFor="user-nickname">昵称</label>
                            <input id="user-nickname" className="form-input" value={nickname} onChange={event => setNickname(event.target.value)} autoComplete="nickname" />
                        </>
                    )}

                    <label className="admin-field-label" htmlFor="user-account">{method.label}</label>
                    <input id="user-account" className="form-input" value={account} placeholder={method.placeholder} onChange={event => updateAccount(event.target.value)} autoComplete={method.autoComplete} inputMode={method.inputMode} />

                    <label className="admin-field-label" htmlFor="user-password">密码</label>
                    <input id="user-password" className="form-input" type="password" value={password} placeholder="请输入密码" onChange={event => updatePassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} />

                    {isRegister && (
                        <>
                            <label className="admin-field-label" htmlFor="user-confirm-password">确认密码</label>
                            <input id="user-confirm-password" className="form-input" type="password" value={confirmPassword} placeholder="请再次输入密码" onChange={event => { setConfirmPassword(event.target.value); refreshCaptchaAfterRetry(); }} autoComplete="new-password" />
                        </>
                    )}

                    <label className="admin-field-label" htmlFor="user-captcha">图形验证码</label>
                    <div className="user-auth-captcha-row">
                        <input id="user-captcha" className="form-input" value={captchaInput} onChange={event => setCaptchaInput(event.target.value)} placeholder="请输入图形验证码" autoComplete="off" />
                        <button className="user-auth-captcha" type="button" onClick={refreshCaptcha} aria-label="刷新图形验证码">{captcha}</button>
                    </div>

                    {notice && <div className="admin-success">{notice}</div>}
                    {error && <div className="admin-error">{error}</div>}
                    <button className="btn btn-primary user-auth-submit" type="submit">{isRegister ? '注册并登录' : '登录'}</button>

                    <div className="user-auth-divider"><span>其他方式</span></div>
                    <div className="user-auth-socials">
                        {authMethodOptions.filter(option => option.id !== authMethod).map(option => (
                            <button type="button" key={option.id} onClick={() => switchMethod(option.id)}>{option.label}</button>
                        ))}
                    </div>
                </form>
                )}
            </aside>

            {activeInfoPanel && (
                <div className="snowwave-info-modal-backdrop" onClick={() => setActiveInfoPanel(null)}>
                    <section className="snowwave-info-modal" onClick={event => event.stopPropagation()}>
                        <button type="button" onClick={() => setActiveInfoPanel(null)} aria-label="关闭">×</button>
                        <span>{infoPanels[activeInfoPanel].eyebrow}</span>
                        <h2>{infoPanels[activeInfoPanel].title}</h2>
                        {infoPanels[activeInfoPanel].paragraphs.map(paragraph => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </section>
                </div>
            )}
        </main>
    );
}

