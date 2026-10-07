import React, { useMemo, useState } from 'react';
import BackButton from '../components/BackButton';
import { achievementCategories, achievements } from '../data/achievementData';
import { subjects } from '../data/mockData';
import { getUserScopedStorageKey, loadNotes } from '../data/learningResources';
import { readStudyTimeLog } from '../utils/studyTime';
import { getUserSubjects } from '../utils/userProgress';

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(key)) || JSON.stringify(fallback));
    } catch {
        return fallback;
    }
}

function percent(value, target) {
    return Math.min(100, Math.round((value / target) * 100));
}

function achievementDate(unlocked) {
    return unlocked ? `已于 ${new Date().toLocaleDateString('zh-CN')} 获得` : '未解锁';
}

function buildUserAchievements() {
    const userSubjects = getUserSubjects(subjects);
    const notes = loadNotes();
    const studyLog = readStudyTimeLog();
    const practiceStats = readJson('snowwave-practice-stats', {});
    const discussionStore = readJson('snowwave-video-discussions', {});
    const customPaths = readJson('snowwave-custom-paths', []);
    const completedCourses = userSubjects.filter(subject => subject.progress >= 100).length;
    const totalQuestions = Object.values(practiceStats).reduce((sum, entry) => sum + Number(entry.totalQuestions || 0), 0);
    const wrongQuestions = Object.values(practiceStats).reduce((sum, entry) => sum + Math.max(0, Number(entry.totalQuestions || 0) - Number(entry.correctQuestions || 0)), 0);
    const activeDays = Object.values(studyLog).filter(entry => Number(entry?.totalSeconds || 0) > 0).length;
    const maxDaySeconds = Math.max(0, ...Object.values(studyLog).map(entry => Number(entry?.totalSeconds || 0)));
    const myComments = Object.values(discussionStore).flat().filter(comment => comment?.userId === 'me').length;
    const subjectProgress = id => userSubjects.find(subject => subject.id === id)?.progress || 0;
    const fullStackProgress = Math.round((subjectProgress('htmlcss') + subjectProgress('python') + subjectProgress('data')) / 3);

    const progressMap = {
        初学者: percent(completedCourses, 1),
        连续学习者: percent(activeDays, 7),
        技能闪电: percent(totalQuestions, 20),
        知识整理师: percent(notes.length, 18),
        编程高手: subjectProgress('python'),
        全栈入门: fullStackProgress,
        算法新手: subjectProgress('dsa'),
        一个月坚持: percent(activeDays, 30),
        笔记达人: percent(notes.length, 30),
        互助同学: percent(myComments, 5),
        学习搭子: 0,
        图谱探索者: percent(notes.length + completedCourses + totalQuestions, 50),
        冲刺模式: percent(maxDaySeconds, 4 * 3600),
        错题侦探: percent(wrongQuestions, 20),
        项目构建者: percent(customPaths.length, 1),
        夜间坚持: 0,
    };

    return achievements.map(item => {
        const progress = progressMap[item.title] ?? 0;
        const unlocked = progress >= 100;
        return {
            ...item,
            progress,
            unlocked,
            date: achievementDate(unlocked),
        };
    });
}

export default function Achievements() {
    const [achievementCategory, setAchievementCategory] = useState('全部');
    const [achievementSearch, setAchievementSearch] = useState('');
    const [achievementStatus, setAchievementStatus] = useState('all');
    const [achievementSort, setAchievementSort] = useState('name');
    const userAchievements = buildUserAchievements();
    const unlockedAchievements = userAchievements.filter(item => item.unlocked);
    const completionRate = Math.round((unlockedAchievements.length / userAchievements.length) * 100);
    const filteredAchievements = useMemo(() => {
        const keyword = achievementSearch.trim().toLowerCase();
        return userAchievements
            .filter(item => achievementCategory === '全部' || item.category === achievementCategory)
            .filter(item => {
                if (achievementStatus === 'unlocked') return item.unlocked;
                if (achievementStatus === 'locked') return !item.unlocked;
                return true;
            })
            .filter(item => {
                if (!keyword) return true;
                return `${item.title} ${item.desc} ${item.category}`.toLowerCase().includes(keyword);
            })
            .sort((a, b) => {
                if (achievementSort === 'progress') return b.progress - a.progress || a.title.localeCompare(b.title, 'zh-Hans-CN');
                if (achievementSort === 'category') return a.category.localeCompare(b.category, 'zh-Hans-CN') || a.title.localeCompare(b.title, 'zh-Hans-CN');
                return a.title.localeCompare(b.title, 'zh-Hans-CN');
            });
    }, [achievementCategory, achievementSearch, achievementSort, achievementStatus, userAchievements]);

    return (
        <div className="achievements-page">
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <div>
                        <h1>我的成就</h1>
                        <p>查看学习进度、勋章墙和已解锁状态。</p>
                    </div>
                </div>
            </div>

            <section className="achievement-center">
                <div className="achievement-progress-card glass-card">
                    <div className="achievement-progress-icon">🏆</div>
                    <div>
                        <h2>成就进度</h2>
                        <p>已获得 {unlockedAchievements.length} / {userAchievements.length} 个成就</p>
                        <div className="achievement-progress-track"><i style={{ width: `${completionRate}%` }} /></div>
                    </div>
                    <strong>{completionRate}%</strong>
                </div>

                <section className="achievement-browser glass-card">
                    <div className="achievement-tabs" aria-label="成就分类">
                        {achievementCategories.map(category => (
                            <button
                                className={achievementCategory === category.id ? 'active' : ''}
                                key={category.id}
                                type="button"
                                onClick={() => setAchievementCategory(category.id)}
                            >
                                {category.icon} {category.id}
                            </button>
                        ))}
                    </div>
                    <div className="achievement-toolbar">
                        <label>
                            <span>🔍</span>
                            <input value={achievementSearch} onChange={(event) => setAchievementSearch(event.target.value)} placeholder="搜索成就..." />
                        </label>
                        <select value={achievementStatus} onChange={(event) => setAchievementStatus(event.target.value)} aria-label="成就状态">
                            <option value="all">全部</option>
                            <option value="unlocked">已获得</option>
                            <option value="locked">未解锁</option>
                        </select>
                        <select value={achievementSort} onChange={(event) => setAchievementSort(event.target.value)} aria-label="排序方式">
                            <option value="name">按名称排序</option>
                            <option value="progress">按进度排序</option>
                            <option value="category">按分类排序</option>
                        </select>
                        <span>显示 {filteredAchievements.length} 个成就</span>
                    </div>
                    <div className="achievement-card-grid">
                        {filteredAchievements.map(item => (
                            <article className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`} key={item.title}>
                                <span className="achievement-card-icon">{item.icon}</span>
                                <i aria-hidden="true">{item.unlocked ? '✓' : '▢'}</i>
                                <em>{item.category}</em>
                                <strong>{item.title}</strong>
                                <p>{item.desc}</p>
                                <small>{item.date}</small>
                                {!item.unlocked && <div className="achievement-mini-progress"><b style={{ width: `${item.progress}%` }} /></div>}
                            </article>
                        ))}
                    </div>
                    {!filteredAchievements.length && (
                        <div className="achievement-empty">
                            <strong>没有匹配的成就</strong>
                            <p>换一个关键词或筛选条件再试。</p>
                        </div>
                    )}
                </section>
            </section>
        </div>
    );
}
