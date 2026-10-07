import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { getUserScopedStorageKey } from '../data/learningResources';

const videoProgressStorageKey = 'snowwave-video-progress';

function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).replace(/\//g, '-');
}

function formatDuration(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return minutes ? `${minutes}分${String(rest).padStart(2, '0')}秒` : `${rest}秒`;
}

function loadWatchHistory() {
    try {
        const progress = JSON.parse(localStorage.getItem(getUserScopedStorageKey(videoProgressStorageKey)) || '{}');
        return Object.values(progress)
            .filter(item => item && typeof item === 'object' && item.updatedAt)
            .map(item => ({
                ...item,
                progress: item.duration ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0,
                watchedAt: formatDateTime(item.updatedAt),
                watchedSeconds: item.currentTime || 0,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
}

export default function History() {
    const watchHistory = loadWatchHistory();
    const totalVideos = watchHistory.length;
    const completedVideos = watchHistory.filter(item => item.completed || item.progress >= 95).length;
    const latestCourse = watchHistory[0]?.course || '-';
    const totalMinutes = Math.round(watchHistory.reduce((sum, item) => sum + Number(item.watchedSeconds || 0), 0) / 60);

    return (
        <div className="profile-page">
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <h1>历史记录</h1>
                    <p>查看已看过的视频，按时间从新到旧排序。</p>
                </div>
            </div>

            <section className="profile-stats">
                <HistoryStat label="观看视频" value={`${totalVideos} 个`} />
                <HistoryStat label="已看完" value={`${completedVideos} 个`} />
                <HistoryStat label="累计时长" value={`${totalMinutes} 分钟`} />
                <HistoryStat label="最近课程" value={latestCourse} />
            </section>

            <section className="glass-card history-page-panel">
                <div className="study-panel-heading">
                    <h2>观看记录</h2>
                    <span>最新在上</span>
                </div>
                <div className="history-page-list">
                    {watchHistory.length > 0 ? watchHistory.map(item => (
                        <Link
                            to={`/learning-video?subject=${item.subjectId || 'cs50'}${Number.isInteger(item.lessonIndex) ? `&lesson=${item.lessonIndex}` : ''}`}
                            className="history-page-row"
                            key={item.lessonKey || `${item.title}-${item.watchedAt}`}
                        >
                            <span>{item.watchedAt}</span>
                            <div>
                                <strong>{item.title}</strong>
                                <p>{item.course} · 已观看 {formatDuration(item.watchedSeconds)}</p>
                            </div>
                            <em>{item.progress}%</em>
                        </Link>
                    )) : (
                        <div className="empty-state">
                            <h2>还没有观看记录</h2>
                            <p>当前账号开始观看课程视频后，这里会按时间自动记录。</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function HistoryStat({ label, value }) {
    return (
        <div className="glass-card profile-stat">
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    );
}
