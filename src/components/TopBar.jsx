import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUserBinding, getUserScopedStorageKey } from '../data/learningResources';

const profileStorageKey = 'snowwave-profile';
const defaultProfile = () => ({ nickname: getCurrentUserBinding().nickname || '', avatarPreview: '' });
const avatarInitial = value => (String(value || '').trim().slice(0, 1) || '?');
const navItems = [
    { path: '/', label: '首页' },
    { path: '/subjects', label: '课程中心' },
    { path: '/doubt-solver', label: 'AI 答疑' },
    { path: '/learning-path', label: '学习路径' },
    { path: '/friends', label: '社交' },
    { path: '/notes', label: '笔记' },
    { path: '/database', label: '数据库' },
    { path: '/knowledge-graph', label: '知识图谱' },
    { path: '/settings', label: '设置' },
];

function loadProfile() {
    try {
        const fallbackProfile = defaultProfile();
        const stored = localStorage.getItem(getUserScopedStorageKey(profileStorageKey));
        return stored ? { ...fallbackProfile, ...JSON.parse(stored) } : fallbackProfile;
    } catch {
        return defaultProfile();
    }
}

export default function TopBar({ theme, navMode, sidebarCollapsed, compactNav, mobileNavOpen, desktopApp = false, onSidebarToggle, onNavModeToggle, onThemeToggle, onSignOut }) {
    const navigate = useNavigate();
    const [notifOpen, setNotifOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [profile, setProfile] = useState(loadProfile);
    const notifRef = useRef(null);
    const userRef = useRef(null);

    const notifications = [];

    useEffect(() => {
        if (!notifOpen && !userOpen) return;

        const handlePointerDown = (event) => {
            if (!notifRef.current?.contains(event.target)) setNotifOpen(false);
            if (!userRef.current?.contains(event.target)) setUserOpen(false);
        };
        const handleKeyDown = event => {
            if (event.key === 'Escape') { setNotifOpen(false); setUserOpen(false); }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [notifOpen, userOpen]);

    useEffect(() => {
        const syncProfile = () => setProfile(loadProfile());
        window.addEventListener('storage', syncProfile);
        window.addEventListener('snowwave-profile-updated', syncProfile);
        return () => {
            window.removeEventListener('storage', syncProfile);
            window.removeEventListener('snowwave-profile-updated', syncProfile);
        };
    }, []);

    const signOut = () => {
        setUserOpen(false);
        onSignOut?.();
        navigate('/login');
    };

    return (
        <header className={`topbar nav-${navMode} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="topbar-left">
                {!desktopApp && (compactNav || navMode === 'side') && (
                    <button type="button" className="icon-btn sidebar-toggle-btn" onClick={onSidebarToggle} aria-controls="site-sidebar" aria-expanded={compactNav ? mobileNavOpen : !sidebarCollapsed} aria-label={compactNav ? (mobileNavOpen ? '关闭导航菜单' : '打开导航菜单') : (sidebarCollapsed ? '展开侧栏' : '收起侧栏')} title={compactNav ? '导航菜单' : (sidebarCollapsed ? '展开侧栏' : '收起侧栏')}>
                        <span aria-hidden="true">☰</span>
                    </button>
                )}
                {!desktopApp && (compactNav || navMode === 'top') && (
                    <Link to="/" className="topbar-brand" aria-label="首页">
                        <img src="/snowwave-icon.svg?v=5" alt="" />
                    </Link>
                )}
                {desktopApp && (
                    <div className="desktop-command-title">
                        <span>工作台</span>
                        <strong>AI 学习应用控制台</strong>
                    </div>
                )}
                {!desktopApp && !compactNav && navMode === 'top' && (
                    <nav className="topbar-nav" aria-label="主导航">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => `topbar-nav-item ${isActive ? 'active' : ''}`}
                                aria-label={item.label}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                )}
            </div>

            <div className="topbar-right">
                {!desktopApp && (
                    <button type="button" className="icon-btn nav-mode-toggle-btn" onClick={onNavModeToggle} aria-label={navMode === 'top' ? '切换为侧边栏导航' : '切换为上边栏导航'} title={navMode === 'top' ? '切换为侧边栏' : '切换为上边栏'}>
                        <span className={`nav-layout-icon ${navMode === 'top' ? 'side' : 'top'}`} aria-hidden="true" />
                    </button>
                )}
                <button type="button" className="icon-btn theme-toggle-btn" onClick={onThemeToggle} aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'} title={theme === 'dark' ? '浅色模式' : '深色模式'}>
                    {theme === 'dark' ? '☀' : '☾'}
                </button>
                {/* 通知 */}
                <div className="notif-wrapper" ref={notifRef}>
                    <button type="button" className="icon-btn" onClick={() => { setNotifOpen(open => !open); setUserOpen(false); }} aria-label="通知" aria-expanded={notifOpen}>
                        🔔
                        {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
                    </button>

                    {notifOpen && (
                        <div className="notif-dropdown">
                            <div className="notif-header">通知</div>
                            {notifications.length > 0 ? notifications.map(n => (
                                <div key={n.id} className="notif-item">
                                    <span className="notif-icon">{n.icon}</span>
                                    <div>
                                        <div className="notif-text">{n.text}</div>
                                        <div className="notif-time">{n.time}</div>
                                    </div>
                                </div>
                            )) : <div className="notif-empty">暂无通知</div>}
                        </div>
                    )}
                </div>

                {/* Avatar */}
                <div className="topbar-user-menu" ref={userRef}>
                    <button type="button" className="topbar-avatar" onClick={() => { setUserOpen(open => !open); setNotifOpen(false); }} aria-label="用户菜单" aria-expanded={userOpen} aria-haspopup="menu" title="用户菜单">
                        {profile.avatarPreview ? <img src={profile.avatarPreview} alt="头像" /> : <span className="topbar-avatar-empty">{avatarInitial(profile.nickname)}</span>}
                    </button>
                    <div className={`topbar-user-dropdown ${userOpen ? 'open' : ''}`} role="menu">
                        <Link to="/profile" role="menuitem" onClick={() => setUserOpen(false)}>个人资料</Link>
                        <Link to="/settings" role="menuitem" onClick={() => setUserOpen(false)}>设置</Link>
                        <button type="button" role="menuitem" onClick={signOut}>退出登录</button>
                    </div>
                </div>
            </div>

            <style>{`
        .topbar {
          position: fixed;
          top: 0; right: 0;
          left: 0;
          height: var(--topbar-height);
          background: rgba(8, 9, 13, 0.58);
          backdrop-filter: blur(22px) saturate(1.15);
          -webkit-backdrop-filter: blur(22px) saturate(1.15);
          border-bottom: 1px solid rgba(250,204,21,.13);
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 22px;
          z-index: 90;
          box-sizing: border-box;
        }

        .topbar.nav-side {
          left: var(--sidebar-width);
        }

        .topbar.nav-side.sidebar-collapsed {
          left: 72px;
        }

        .topbar-left {
          min-width: 0;
          flex: 1;
          display: flex; align-items: center; gap: 16px;
        }

        .topbar-brand {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: block;
          overflow: hidden;
        }

        .topbar-brand img {
          width: 100%;
          height: 100%;
          display: block;
        }

        .topbar-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex: 1 1 auto;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 0;
        }
        .topbar-nav::-webkit-scrollbar { display: none; }

        .topbar-nav-item {
          position: relative;
          height: 70px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: clamp(.86rem, .72vw, 1rem);
          font-weight: 900;
          white-space: nowrap;
          padding: 0 clamp(12px, 1.35vw, 28px);
          transition: color .24s ease;
        }

        .topbar-nav-item + .topbar-nav-item::after {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 1px;
          height: 18px;
          background: rgba(250, 204, 21, .2);
          transform: translateY(-50%);
        }

        .topbar-nav-item::before {
          content: "";
          position: absolute;
          left: clamp(12px, 1.35vw, 28px);
          bottom: 18px;
          width: calc(100% - clamp(24px, 2.7vw, 56px));
          height: 1px;
          background: currentColor;
          opacity: 0;
          transform: scaleX(0);
          transform-origin: left center;
          transition: opacity .24s ease, transform .28s cubic-bezier(.16, 1, .3, 1);
        }

        .topbar-nav-item:hover,
        .topbar-nav-item.active {
          color: #facc15;
        }

        .topbar-nav-item:hover::before,
        .topbar-nav-item:focus-visible::before,
        .topbar-nav-item.active::before {
          opacity: 1;
          transform: scaleX(1);
        }

        .topbar-right {
          flex: 0 0 auto;
          display: flex; align-items: center; gap: 12px;
        }

        .desktop-command-title {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          color: var(--text-primary);
        }

        .desktop-command-title span {
          color: var(--text-muted);
          font-size: .72rem;
          font-weight: 700;
        }

        .desktop-command-title strong {
          font-size: .96rem;
          line-height: 1.18;
          font-weight: 900;
        }

        .icon-btn {
          position: relative;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(248, 241, 201, .16);
          border-radius: 0;
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
        }

        .icon-btn:hover {
          background: rgba(250,204,21,.16);
          color: #facc15;
          transform: translateY(2px);
          box-shadow: inset 0 2px 7px rgba(17,24,39,0.12);
        }

        .theme-toggle-btn {
          font-size: 1rem;
          font-weight: 900;
        }

        .nav-mode-toggle-btn {
          font-size: 1.02rem;
          font-weight: 900;
        }

        .nav-layout-icon {
          width: 18px;
          height: 18px;
          border: 1.5px solid currentColor;
          display: inline-block;
          position: relative;
          box-sizing: border-box;
        }

        .nav-layout-icon::before {
          content: "";
          position: absolute;
          background: currentColor;
        }

        .nav-layout-icon.side::before {
          top: -1.5px;
          bottom: -1.5px;
          left: 4px;
          width: 1.5px;
        }

        .nav-layout-icon.top::before {
          top: 4px;
          left: -1.5px;
          right: -1.5px;
          height: 1.5px;
        }

        .notif-badge {
          position: absolute; top: -4px; right: -4px;
          width: 16px; height: 16px;
          background: #facc15;
          border-radius: 0;
          font-size: 0.6rem; font-weight: 700;
          color: #08090d;
          display: flex; align-items: center; justify-content: center;
        }

        .notif-wrapper { position: relative; }

        .notif-dropdown {
          position: absolute; top: 48px; right: 0;
          width: 300px;
          background: var(--bg-card);
          border: 1px solid var(--border-bright);
          border-radius: 0;
          box-shadow: 0 16px 40px rgba(15,23,42,0.12);
          z-index: 200;
          animation: fadeInUp 0.2s ease;
        }

        .notif-header {
          padding: 14px 16px;
          font-weight: 700; font-size: 0.875rem;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }

        .notif-item {
          display: flex; gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
        }

        .notif-item:hover {
          background: var(--bg-card-hover);
          transform: translateY(2px);
          box-shadow: inset 0 2px 7px rgba(17,24,39,0.08);
        }
        .notif-empty {
          padding: 18px 16px;
          color: var(--text-muted);
          font-size: .78rem;
        }
        .notif-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
        .notif-text { font-size: 0.82rem; color: var(--text-primary); }
        .notif-time { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

        .topbar-user-menu {
          position: relative;
          padding: 8px 0;
        }

        .topbar-avatar {
          width: 38px; height: 38px;
          border: 0;
          padding: 0;
          border-radius: 50%;
          background: #facc15;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700;
          color: #08090d; cursor: pointer;
          text-decoration: none;
          overflow: hidden;
          box-shadow: none;
        }

        .topbar-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .topbar-avatar-empty {
          font-family: var(--font-display);
          font-size: .86rem;
          font-weight: 900;
          line-height: 1;
        }

        .topbar-user-dropdown {
          position: absolute;
          top: 52px;
          right: 0;
          width: 132px;
          padding: 6px;
          background: var(--bg-card);
          border: 1px solid var(--border-bright);
          box-shadow: 0 16px 40px rgba(15,23,42,0.14);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-4px);
          transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;
          z-index: 240;
        }

        .topbar-user-dropdown.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .topbar-user-dropdown a,
        .topbar-user-dropdown button {
          width: 100%;
          height: 34px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          border: 0;
          background: transparent;
          color: var(--text-secondary);
          text-decoration: none;
          font: inherit;
          font-size: 0.78rem;
          cursor: pointer;
        }

        .topbar-user-dropdown a:hover,
        .topbar-user-dropdown button:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }

        .theme-light .topbar {
          background: rgba(255, 255, 255, .58);
          backdrop-filter: blur(22px) saturate(1.12);
          -webkit-backdrop-filter: blur(22px) saturate(1.12);
          border-bottom-color: rgba(17, 24, 39, .12);
        }

        .theme-light .icon-btn {
          background: rgba(255, 255, 255, .52);
          border-color: rgba(17, 24, 39, .12);
          color: #111827;
        }

        .theme-light .icon-btn:hover {
          background: rgba(241, 245, 249, .76);
          color: #111827;
        }

        .theme-light .topbar-nav-item:hover,
        .theme-light .topbar-nav-item.active {
          color: #111827;
        }

        .theme-light .topbar-nav-item + .topbar-nav-item::after {
          background: rgba(17, 24, 39, .16);
        }

        .theme-light .notif-badge,
        .theme-light .topbar-avatar {
          background: #111827;
          color: #ffffff;
        }

        @media (max-width: 1180px) {
          .topbar { left: 0; padding: 0 16px; }
          .topbar.nav-side,
          .topbar.nav-side.sidebar-collapsed,
          .topbar.sidebar-collapsed { left: 0; }
          .topbar-left { gap: 10px; }
        }
        @media (max-width: 480px) {
          .topbar { padding: 0 10px; }
          .topbar-right { gap: 6px; }
          .topbar-brand { width: 34px; height: 34px; }
          .icon-btn, .topbar-avatar { width: 34px; height: 34px; }
          .notif-dropdown { right: -74px; width: min(300px, calc(100vw - 20px)); }
        }
      `}</style>
        </header>
    );
}
