import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    { id: 'email', label: '邮箱' },
    { id: 'wechat', label: '微信' },
    { id: 'phone', label: '手机号' },
];

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

function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

function normalizeAccount(method, value) {
    const trimmed = value.trim();
    if (method === 'email') return trimmed.toLowerCase();
    if (method === 'phone') return trimmed.replace(/\s/g, '');
    return trimmed;
}

function LoginGraphPreview() {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let graph = null;
        let resizeObserver = null;
        let disposed = false;

        Promise.all([
            import('3d-force-graph'),
            import('./KnowledgeGraph'),
            import('three'),
        ]).then(([graphModule, { buildGraphData }, THREE]) => {
            if (disposed || !mount) return;
            const sourceGraph = buildGraphData();
            const keepNode = node => {
                if (node.folder === '学习路径' || node.folder === '标签') return true;
                if (node.folder === '课程' || node.folder === '主题') return true;
                if (node.folder === '视频') return /CS50|Python|Git|算法|Web|函数|数据/.test(node.name);
                if (node.folder === '笔记') return /React|软件|CS50|学习/.test(node.name);
                return node.kind === 'file';
            };
            const keptIds = new Set(sourceGraph.nodes.filter(keepNode).slice(0, 48).map(node => node.id));
            const nodes = sourceGraph.nodes.filter(node => keptIds.has(node.id));
            const links = sourceGraph.links.filter(link => {
                const source = typeof link.source === 'object' ? link.source.id : link.source;
                const target = typeof link.target === 'object' ? link.target.id : link.target;
                return keptIds.has(source) && keptIds.has(target);
            });

            const makeNode = node => {
                const group = new THREE.Group();
                const radius = Math.max(2.1, Math.cbrt(node.val || 3) * 2.05);
                const color = new THREE.Color(node.color || '#facc15');
                const core = new THREE.Mesh(
                    new THREE.SphereGeometry(radius, 18, 18),
                    new THREE.MeshStandardMaterial({
                        color,
                        roughness: 0.38,
                        metalness: 0.1,
                        emissive: color,
                        emissiveIntensity: 0.2,
                        transparent: true,
                        opacity: 0.95,
                    }),
                );
                const glow = new THREE.Mesh(
                    new THREE.SphereGeometry(radius * 1.45, 12, 12),
                    new THREE.MeshBasicMaterial({
                        color,
                        transparent: true,
                        opacity: 0.08,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                    }),
                );
                group.add(glow, core);
                return group;
            };

            graph = graphModule.default({ controlType: 'orbit' })(mount)
                .backgroundColor('rgba(0,0,0,0)')
                .showNavInfo(false)
                .enableNodeDrag(true)
                .enableNavigationControls(true)
                .nodeThreeObject(makeNode)
                .nodeLabel(() => '')
                .linkColor(() => 'rgba(248,241,201,.18)')
                .linkWidth(0.38)
                .linkOpacity(0.42)
                .d3AlphaDecay(0.035)
                .d3VelocityDecay(0.32);

            graph.graphData({ nodes, links });
            graph.width(mount.clientWidth).height(mount.clientHeight);
            graph.cameraPosition({ x: 20, y: 38, z: 390 }, { x: 0, y: 0, z: 0 }, 0);
            const controls = graph.controls();
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.25;
            controls.enablePan = true;
            controls.enableZoom = true;
            controls.enableRotate = true;

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

    return <div className="direct-auth-graph-preview" ref={mountRef} />;
}

export default function UserLogin({ onLogin }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [panel, setPanel] = useState('user');
    const [authMethod, setAuthMethod] = useState('email');
    const [nickname, setNickname] = useState('');
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [captcha, setCaptcha] = useState(createCaptcha);
    const [captchaInput, setCaptchaInput] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [adminAccount, setAdminAccount] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');

    const isRegister = mode === 'register';
    const method = authMethods[authMethod];

    const refreshCaptcha = () => {
        setCaptcha(createCaptcha());
        setCaptchaInput('');
    };

    const resetUserForm = () => {
        setError('');
        setNotice('');
        setNickname('');
        setAccount('');
        setPassword('');
        setConfirmPassword('');
        refreshCaptcha();
    };

    const toggleMode = () => {
        setMode(isRegister ? 'login' : 'register');
        resetUserForm();
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
        if (isRegister) register();
        else login();
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

    const switchPanel = (nextPanel) => {
        setPanel(nextPanel);
        setError('');
        setNotice('');
        setAdminError('');
    };

    return (
        <main className="direct-auth-page">
            <header className="direct-auth-header">
                <div className="direct-auth-brand">
                    <img src="/ai-graph-icon.svg?v=1" alt="" />
                    <span>
                        <strong>AI图谱应用</strong>
                        <small>本地知识库增强学习助手</small>
                    </span>
                </div>
                <button type="button" onClick={() => switchPanel(panel === 'user' ? 'admin' : 'user')}>
                    {panel === 'user' ? '管理员登录' : '用户登录'}
                </button>
            </header>

            <section className="direct-auth-stage">
                <div className="direct-auth-summary">
                    <div className="direct-auth-graph-motion" aria-hidden="true">
                        <LoginGraphPreview />
                    </div>
                </div>

                {panel === 'admin' ? (
                    <form className="direct-auth-card" onSubmit={handleAdminSubmit}>
                        <div className="user-auth-card-heading">
                            <span>ADMIN</span>
                            <h2>管理员登录</h2>
                            <p>进入课程、用户和资料管理后台。</p>
                        </div>

                        <label className="admin-field-label" htmlFor="admin-account">管理员账号</label>
                        <input id="admin-account" className="form-input" value={adminAccount} onChange={event => { setAdminAccount(event.target.value); setAdminError(''); }} autoComplete="username" placeholder="请输入管理员账号" />

                        <label className="admin-field-label" htmlFor="admin-password">密码</label>
                        <input id="admin-password" className="form-input" type="password" value={adminPassword} onChange={event => { setAdminPassword(event.target.value); setAdminError(''); }} autoComplete="current-password" placeholder="请输入密码" />

                        {adminError && <div className="admin-error">{adminError}</div>}
                        <button className="btn btn-primary user-auth-submit" type="submit">进入管理后台</button>
                    </form>
                ) : (
                    <form className="direct-auth-card" onSubmit={handleSubmit}>
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

                        <div className="direct-auth-methods" role="tablist" aria-label="登录方式">
                            {authMethodOptions.map(option => (
                                <button type="button" key={option.id} className={authMethod === option.id ? 'active' : ''} onClick={() => switchMethod(option.id)}>{option.label}</button>
                            ))}
                        </div>

                        <label className="admin-field-label" htmlFor="user-account">{method.label}</label>
                        <input id="user-account" className="form-input" value={account} placeholder={method.placeholder} onChange={event => { setAccount(event.target.value); refreshCaptchaAfterRetry(); }} autoComplete={method.autoComplete} inputMode={method.inputMode} />

                        <label className="admin-field-label" htmlFor="user-password">密码</label>
                        <input id="user-password" className="form-input" type="password" value={password} placeholder="请输入密码" onChange={event => { setPassword(event.target.value); refreshCaptchaAfterRetry(); }} autoComplete={isRegister ? 'new-password' : 'current-password'} />

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
                    </form>
                )}
            </section>
        </main>
    );
}
