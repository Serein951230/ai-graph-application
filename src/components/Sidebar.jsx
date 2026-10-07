import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/subjects', label: '课程中心', icon: '📚' },
    { path: '/doubt-solver', label: 'AI 答疑', icon: '💡' },
    { path: '/learning-path', label: '学习路径', icon: '⌘' },
    { path: '/friends', label: '社交', icon: '💬' },
    { path: '/notes', label: '笔记', icon: '📝' },
    { path: '/database', label: '数据库', icon: '▦' },
    { path: '/knowledge-graph', label: '知识图谱', icon: '✦' },
    { path: '/settings', label: '设置', icon: '⚙' },
];

export default function Sidebar({ collapsed, compactNav, mobileOpen, onMobileClose }) {
    const location = useLocation();

    return (
        <>
            {compactNav && mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onMobileClose}
                />
            )}

            <aside id="site-sidebar" aria-label="主导航" className={`sidebar ${!compactNav && collapsed ? 'collapsed' : ''} ${compactNav && mobileOpen ? 'mobile-open' : ''}`} inert={compactNav && !mobileOpen}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon" aria-hidden="true">
                        <img src="/snowwave-icon.svg?v=5" alt="" />
                    </div>
                    {(!collapsed || compactNav) && (
                        <div className="logo-text">
                            <span className="logo-name"><small>The</small> AI图谱应用</span>
                        </div>
                    )}
                    {compactNav && <button className="sidebar-close" type="button" onClick={onMobileClose} aria-label="关闭导航菜单">×</button>}
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar-nav-item ${isActive ? 'active' : ''}`
                            }
                            title={!compactNav && collapsed ? item.label : ''}
                            onClick={onMobileClose}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {(!collapsed || compactNav) && <span className="nav-label">{item.label}</span>}
                            {(!collapsed || compactNav) && location.pathname === item.path && (
                                <span className="active-dot" />
                            )}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <style>{`
        .sidebar {
          position: fixed;
          left: 0; top: 0; bottom: 0;
          width: var(--sidebar-width);
          background: #08090d;
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width var(--transition);
          overflow: hidden;
        }

        .sidebar.collapsed {
          width: 72px;
        }

        .sidebar-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 99;
        }

        .sidebar-close { display: none; margin-left: auto; width: 34px; height: 34px; border: 1px solid var(--border); background: transparent; color: var(--text-primary); font: inherit; font-size: 1.5rem; line-height: 1; cursor: pointer; }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          height: var(--topbar-height);
          padding: 0 16px;
          border-bottom: 1px solid rgba(250,204,21,.18);
          box-sizing: border-box;
        }

        .sidebar.collapsed .sidebar-logo {
          justify-content: center;
          padding: 0;
        }

        .logo-icon {
          width: 40px; height: 40px;
          background: #facc15;
          border-radius: 0;
          position: relative;
          display: block;
          flex-shrink: 0;
          color: #08090d;
          box-shadow: 0 3px 0 rgba(250,204,21,.28);
          overflow: hidden;
        }

        .logo-icon img {
          width: 100%;
          height: 100%;
          display: block;
        }

        .logo-text {
          display: flex; flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .logo-name {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1rem; font-weight: 900;
          line-height: .9;
          color: var(--text-primary);
          white-space: nowrap;
          color: var(--text-primary);
        }

        .logo-tag {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          border-right: 1px solid rgba(250,204,21,.16);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .sidebar-nav::-webkit-scrollbar { display: none; }

        .sidebar-nav-item {
          display: flex; align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 0;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color .18s ease;
          margin-bottom: 2px;
          position: relative;
          white-space: nowrap;
          overflow: hidden;
        }

        .sidebar-nav-item:hover {
          color: #facc15;
        }

        .sidebar-nav-item,
        .sidebar-nav-item:hover,
        .sidebar-nav-item:focus,
        .sidebar-nav-item:focus-visible,
        .sidebar-nav-item:active {
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
          outline: none;
        }

        .sidebar-nav-item.active {
          color: #facc15;
          border: 0;
        }

        .nav-icon { font-size: 1.1rem; flex-shrink: 0; }
        .nav-label {
          flex: 0 1 auto;
          color: inherit;
          background-image: linear-gradient(currentColor, currentColor);
          background-repeat: no-repeat;
          background-position: 0 100%;
          background-size: 0 1px;
          transition: color .18s ease, background-size .28s ease;
        }

        .sidebar-nav-item:hover .nav-label {
          color: var(--text-primary);
          background-size: 100% 1px;
        }

        .active-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #facc15;
          flex-shrink: 0;
        }

        .theme-light .sidebar {
          background: #ffffff;
        }

        .theme-light .sidebar-logo {
          border-bottom-color: rgba(17,24,39,.12);
        }

        .theme-light .sidebar-nav {
          border-right-color: rgba(17,24,39,.12);
        }

        .theme-light .sidebar-nav-item:hover,
        .theme-light .sidebar-nav-item.active {
          color: #111827;
        }

        .theme-light .sidebar-nav-item:hover .nav-label {
          color: #111827;
        }

        .theme-light .logo-icon {
          background: #facc15;
          color: #08090d;
          box-shadow: none;
        }

        .theme-light .active-dot {
          background: #111827;
        }

        @media (max-width: 1180px) {
          .sidebar { transform: translateX(-100%); width: var(--sidebar-width) !important; }
          .sidebar.mobile-open { transform: translateX(0); }
          .sidebar-close { display: grid; place-items: center; }
        }
      `}</style>
        </>
    );
}

