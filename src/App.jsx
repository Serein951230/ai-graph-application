import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import LearningPath from './pages/LearningPath';
import LearningVideo from './pages/LearningVideo';
import Practice from './pages/Practice';
import DoubtSolver from './pages/DoubtSolver';
import Profile from './pages/Profile';
import Achievements from './pages/Achievements';
import UserProfile from './pages/UserProfile';
import StudyStats from './pages/StudyStats';
import History from './pages/History';
import Favorites from './pages/Favorites';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import Notes from './pages/Notes';
import Database from './pages/Database';
import DatabaseFileViewer from './pages/DatabaseFileViewer';
import Settings from './pages/Settings';
import UserLogin from './pages/UserLogin';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'));
const compactNavQuery = '(max-width: 1180px)';
const isDesktopRuntime = () => {
  const query = new URLSearchParams(window.location.search);
  return Boolean(window.snowwaveDesktop?.isDesktop || query.get('desktop') === '1');
};

function DesktopTitleBar() {
  const controls = window.snowwaveDesktop;

  return (
    <div className="desktop-titlebar">
      <div className="desktop-titlebar-brand">
        <img src="/snowwave-icon.svg?v=5" alt="" />
        <div>
          <strong>AI图谱应用</strong>
          <span>本地桌面应用 · 知识库增强学习助手</span>
        </div>
      </div>
      <div className="desktop-titlebar-status">
        <span>Local AI Workspace</span>
        <i />
        <span>127.0.0.1</span>
      </div>
      <div className="desktop-window-controls">
        <button type="button" onClick={() => controls?.minimize?.()} aria-label="最小化">−</button>
        <button type="button" onClick={() => controls?.maximize?.()} aria-label="最大化">□</button>
        <button type="button" onClick={() => controls?.close?.()} aria-label="关闭">×</button>
      </div>
    </div>
  );
}

export default function App() {
  const [desktopApp] = useState(isDesktopRuntime);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userSignedIn, setUserSignedIn] = useState(() => desktopApp || sessionStorage.getItem('snowwave-user') === 'signed-in');
  const [theme, setTheme] = useState(() => localStorage.getItem('snowwave-theme') || 'dark');
  const [navMode, setNavMode] = useState(() => desktopApp ? 'side' : (localStorage.getItem('snowwave-nav-mode') || 'top'));
  const [compactNav, setCompactNav] = useState(() => window.matchMedia(compactNavQuery).matches);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('desktop-runtime', desktopApp);
    if (desktopApp) sessionStorage.setItem('snowwave-user', 'signed-in');
    return () => document.body.classList.remove('desktop-runtime');
  }, [desktopApp]);

  useEffect(() => {
    const query = window.matchMedia(compactNavQuery);
    const sync = event => {
      setCompactNav(event.matches);
      if (!event.matches) setMobileNavOpen(false);
    };
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes
        userSignedIn={userSignedIn}
        setUserSignedIn={setUserSignedIn}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        theme={theme}
        setTheme={setTheme}
        navMode={navMode}
        setNavMode={setNavMode}
        compactNav={compactNav}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
        desktopApp={desktopApp}
      />
    </BrowserRouter>
  );
}

function AppRoutes({ userSignedIn, setUserSignedIn, sidebarCollapsed, setSidebarCollapsed, theme, setTheme, navMode, setNavMode, compactNav, mobileNavOpen, setMobileNavOpen, desktopApp }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname === '/login';
  const isImmersiveGraph = location.pathname === '/knowledge-graph';
  const isFileReader = location.pathname.startsWith('/database/file/');
  const isImmersive = isImmersiveGraph || isFileReader;
  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('snowwave-theme', nextTheme);
      return nextTheme;
    });
  };
  const toggleNavMode = () => {
    if (desktopApp) return;
    setMobileNavOpen(false);
    setNavMode((currentMode) => {
      const nextMode = currentMode === 'top' ? 'side' : 'top';
      localStorage.setItem('snowwave-nav-mode', nextMode);
      return nextMode;
    });
  };
  const toggleSidebar = () => {
    if (compactNav) setMobileNavOpen(open => !open);
    else setSidebarCollapsed(collapsed => !collapsed);
  };

  if (isAdminRoute) {
    return (
      <div className={`admin-root theme-${theme}`}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    );
  }

  if (!desktopApp && (isLoginRoute || !userSignedIn)) {
    return (
      <div className="admin-root theme-dark">
        <Routes>
          <Route path="/login" element={<UserLogin onLogin={() => setUserSignedIn(true)} />} />
          <Route path="*" element={<UserLogin onLogin={() => setUserSignedIn(true)} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className={`app-layout theme-${theme} nav-mode-${navMode} ${desktopApp ? 'desktop-app-shell' : ''} ${isImmersiveGraph ? 'immersive-graph-layout' : ''} ${isFileReader ? 'database-reader-layout' : ''}`}>
      {desktopApp && <DesktopTitleBar />}
      {!isImmersive && (desktopApp || navMode === 'side' || compactNav) && <Sidebar collapsed={desktopApp ? false : sidebarCollapsed} compactNav={!desktopApp && compactNav} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />}
      <div className="main-content" style={{ marginLeft: !isImmersive && !compactNav && (desktopApp || navMode === 'side') ? (desktopApp ? 'var(--sidebar-width)' : (sidebarCollapsed ? '72px' : 'var(--sidebar-width)')) : 0 }}>
        {!isImmersive && (
          <TopBar
            theme={theme}
            navMode={desktopApp ? 'side' : navMode}
            sidebarCollapsed={sidebarCollapsed}
            compactNav={!desktopApp && compactNav}
            mobileNavOpen={mobileNavOpen}
            onSidebarToggle={toggleSidebar}
            onNavModeToggle={toggleNavMode}
            onThemeToggle={toggleTheme}
            desktopApp={desktopApp}
            onSignOut={() => {
              sessionStorage.removeItem('snowwave-user');
              if (desktopApp) return;
              setUserSignedIn(false);
            }}
          />
        )}
        <div className="page-content" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/learning-path" element={<LearningPath />} />
            <Route path="/learning-video" element={<LearningVideo />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/doubt-solver" element={<DoubtSolver />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/study-stats" element={<StudyStats />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/database" element={<Database />} />
            <Route path="/database/file/:fileId" element={<DatabaseFileViewer />} />
            <Route path="/knowledge-graph" element={<Suspense fallback={<div className="page-loading">知识图谱加载中...</div>}><KnowledgeGraph /></Suspense>} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
