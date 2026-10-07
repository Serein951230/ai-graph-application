import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!account.trim() || !password.trim()) {
            setError('请输入管理员账号和密码。');
            return;
        }
        sessionStorage.setItem('snowwave-admin', 'signed-in');
        navigate('/admin');
    };

    return (
        <main className="admin-auth-page">
            <div className="admin-auth-topbar">
                <Link to="/" className="admin-brand"><span><strong><small>The</small> AI图谱应用</strong><small>学习平台</small></span></Link>
            </div>
            <form className="admin-auth-card" onSubmit={handleSubmit}>
                <div className="admin-mark">管</div>
                <p className="admin-kicker">SNOWWAVE PAPER</p>
                <h1>管理员登录</h1>
                <p className="admin-auth-subtitle">进入平台管理后台，查看课程和学生学习情况。</p>

                <label className="admin-field-label" htmlFor="admin-account">管理员账号</label>
                <input id="admin-account" className="form-input" value={account} onChange={e => setAccount(e.target.value)} autoComplete="username" />
                <label className="admin-field-label" htmlFor="admin-password">密码</label>
                <input id="admin-password" className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                {error && <div className="admin-error">{error}</div>}
                <button className="btn btn-primary admin-submit" type="submit">登录管理后台</button>
                <Link to="/" className="admin-back-link">返回学习平台</Link>
            </form>
        </main>
    );
}

