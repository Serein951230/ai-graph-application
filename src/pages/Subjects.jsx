import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { subjects } from '../data/mockData';
import { getUserScopedStorageKey } from '../data/learningResources';
import { getUserSubjects } from '../utils/userProgress';

const favoriteCoursesKey = 'snowwave-favorite-courses';

function loadFavoriteIds() {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(favoriteCoursesKey)) || '[]');
    } catch {
        return [];
    }
}

export default function Subjects() {
    const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds);
    const userSubjects = getUserSubjects(subjects);

    const toggleFavorite = (subjectId) => {
        setFavoriteIds((current) => {
            const next = current.includes(subjectId)
                ? current.filter(id => id !== subjectId)
                : [...current, subjectId];
            localStorage.setItem(getUserScopedStorageKey(favoriteCoursesKey), JSON.stringify(next));
            return next;
        });
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>课程选择</h1>
                    <p>当前有 {subjects.length} 门课程，选择今天要重点学习的内容。</p>
                </div>
                <Link to="/favorites" className="btn btn-secondary">
                    我的收藏
                </Link>
            </div>

            <div className="subject-grid">
                {userSubjects.map((s) => (
                    <SubjectCard
                        key={s.id}
                        subject={s}
                        isFavorite={favoriteIds.includes(s.id)}
                        onToggleFavorite={toggleFavorite}
                    />
                ))}
            </div>
        </div>
    );
}

function SubjectCard({ subject: s, isFavorite, onToggleFavorite }) {
    const [hovered, setHovered] = useState(false);
    const isCompleted = s.progress >= 100 || s.topicsCompleted >= s.totalTopics;

    return (
        <div
            className="glass-card"
            style={{ padding: 24, cursor: 'pointer', transform: hovered ? 'translateY(2px)' : 'none', transition: 'transform 0.12s ease, box-shadow 0.12s ease', boxShadow: hovered ? 'inset 0 2px 7px rgba(17,24,39,0.12)' : 'var(--shadow-card)' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 0, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 3px 0 #000' }}>
                    {s.icon}
                </div>
                <button
                    type="button"
                    className={`subject-favorite-button ${isFavorite ? 'active' : ''}`}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFavorite(s.id);
                    }}
                    aria-label={isFavorite ? `取消收藏${s.name}` : `收藏${s.name}`}
                    title={isFavorite ? '取消收藏' : '加入我的收藏'}
                >
                    {isFavorite ? '★' : '☆'}
                </button>
            </div>

            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                已完成 {s.topicsCompleted}/{s.totalTopics} 个主题 · 学习 {s.timeSpent} 小时
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>学习进度</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827' }}>{s.progress}%</span>
            </div>
            <div className="progress-bar-outer">
                <div className="progress-bar-inner" style={{ width: `${s.progress}%`, background: 'var(--accent-blue)' }} />
            </div>

            {/* Next Topic */}
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>下一主题</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{s.nextTopic}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{s.progress}%</div>
            </div>

            <Link to={`/learning-video?subject=${s.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                {isCompleted ? '重新学习 →' : '继续学习 →'}
            </Link>
        </div>
    );
}
