import React, { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { monthlyProgress, subjects } from '../data/mockData';
import BackButton from '../components/BackButton';
import { getUserScopedStorageKey } from '../data/learningResources';
import { dateKey, formatStudyMinutes, getTodayStudySeconds, getTotalStudyHours, readStudyTimeLog } from '../utils/studyTime';
import { getUserSubjects } from '../utils/userProgress';

const currentWeekdayIndex = () => (new Date().getDay() + 6) % 7;
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const readPracticeStats = () => {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey('snowwave-practice-stats')) || '{}');
    } catch {
        return {};
    }
};

const getWeekDateKeys = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentWeekdayIndex());
    return weekDays.map((day, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return { day, key: dateKey(date) };
    });
};

const buildWeeklyProgress = (studyTimeLog, practiceStats) => getWeekDateKeys().map(({ day, key }) => ({
    day,
    hours: Number(((studyTimeLog[key]?.totalSeconds || 0) / 3600).toFixed(2)),
    questions: practiceStats[key]?.totalQuestions || 0,
}));

export default function StudyStats() {
    const accent = 'var(--accent-blue)';
    const [activePanel, setActivePanel] = useState('');
    const [studyTimeLog, setStudyTimeLog] = useState(readStudyTimeLog);
    const [practiceStats, setPracticeStats] = useState(readPracticeStats);
    const userSubjects = getUserSubjects(subjects);
    const todaySeconds = getTodayStudySeconds(studyTimeLog);
    const liveWeeklyProgress = buildWeeklyProgress(studyTimeLog, practiceStats);
    const totalHours = liveWeeklyProgress.reduce((sum, item) => sum + item.hours, 0).toFixed(1);
    const totalTrackedHours = getTotalStudyHours(studyTimeLog, 0).toFixed(1);
    const totalQuestions = liveWeeklyProgress.reduce((sum, item) => sum + item.questions, 0);
    const allPracticeEntries = Object.values(practiceStats);
    const allQuestions = allPracticeEntries.reduce((sum, entry) => sum + Number(entry.totalQuestions || 0), 0);
    const allCorrect = allPracticeEntries.reduce((sum, entry) => sum + Number(entry.correctQuestions || 0), 0);
    const practiceAccuracy = allQuestions ? allCorrect / allQuestions : 0;
    const averageProgress = userSubjects.length ? Math.round(userSubjects.reduce((sum, item) => sum + item.progress, 0) / userSubjects.length) : 0;
    const completedCourses = userSubjects.filter(item => item.progress >= 100).length;
    const monthlyTrend = monthlyProgress.map(item => ({
        week: item.week.replace('Week ', '第') + '周',
        value: item.week === monthlyProgress[monthlyProgress.length - 1]?.week ? averageProgress : 0,
    }));
    const practicedSubjects = new Set(Object.values(practiceStats).flatMap(entry => Object.keys(entry.subjects || {}))).size;
    const abilityData = [
        { ability: '课程推进', score: averageProgress },
        { ability: '持续学习', score: Math.min(100, Math.round(totalTrackedHours * 10)) },
        { ability: '练习完成', score: Math.min(100, totalQuestions * 10) },
        { ability: '覆盖课程', score: userSubjects.length ? Math.round((practicedSubjects / userSubjects.length) * 100) : 0 },
        { ability: '完成度', score: userSubjects.length ? Math.round((completedCourses / userSubjects.length) * 100) : 0 },
        { ability: '知识掌握', score: Math.min(100, Math.round(averageProgress * 0.6 + practiceAccuracy * 40)) },
    ];
    const studyLogs = todaySeconds > 0
        ? [{ type: '观看视频', title: `今日累计学习 ${formatStudyMinutes(todaySeconds)}`, time: '今天' }]
        : [];
    const answeredQuestions = Object.entries(practiceStats).flatMap(([date, entry]) => Object.entries(entry.subjects || {}).map(([subjectId, stats]) => {
        const subject = userSubjects.find(item => item.id === subjectId);
        return {
            id: `${date}-${subjectId}`,
            subject: subject?.name || subjectId,
            question: `${date} 提交练习 ${stats.totalQuestions || 0} 题`,
            status: `正确 ${stats.correctQuestions || 0}/${stats.totalQuestions || 0}`,
        };
    }));
    const togglePanel = (panel) => setActivePanel(current => current === panel ? '' : panel);

    React.useEffect(() => {
        const refreshStudyTime = () => {
            setStudyTimeLog(readStudyTimeLog());
            setPracticeStats(readPracticeStats());
        };
        window.addEventListener('snowwave-study-time-updated', refreshStudyTime);
        window.addEventListener('snowwave-practice-stats-updated', refreshStudyTime);
        window.addEventListener('snowwave-local-data-updated', refreshStudyTime);
        window.addEventListener('storage', refreshStudyTime);
        window.addEventListener('focus', refreshStudyTime);
        document.addEventListener('visibilitychange', refreshStudyTime);
        return () => {
            window.removeEventListener('snowwave-study-time-updated', refreshStudyTime);
            window.removeEventListener('snowwave-practice-stats-updated', refreshStudyTime);
            window.removeEventListener('snowwave-local-data-updated', refreshStudyTime);
            window.removeEventListener('storage', refreshStudyTime);
            window.removeEventListener('focus', refreshStudyTime);
            document.removeEventListener('visibilitychange', refreshStudyTime);
        };
    }, []);

    return (
        <div className="profile-page study-stats-page">
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <h1>学习统计</h1>
                    <p>查看学习时间、练习题和课程进度。</p>
                </div>
            </div>

            <section className="profile-stats">
                <ProfileStat label="累计学习" value={`${totalTrackedHours} 小时`} onClick={() => togglePanel('weekly')} active={activePanel === 'weekly'} />
                <ProfileStat label="完成课程" value={`${completedCourses} 门`} onClick={() => togglePanel('courses')} active={activePanel === 'courses'} />
                <ProfileStat label="练习题数" value={totalQuestions} onClick={() => togglePanel('questions')} active={activePanel === 'questions'} />
                <ProfileStat label="课程进度" value={`${averageProgress}%`} onClick={() => togglePanel('courses')} active={activePanel === 'courses'} />
            </section>

            <section className="study-chart-grid">
                <StudyChartCard title="本周学习时长" unit="小时">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={liveWeeklyProgress}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} width={30} />
                            <Tooltip cursor={{ fill: 'rgba(17, 24, 39, 0.06)' }} />
                            <Bar dataKey="hours" name="学习时长" fill={accent} radius={[6, 6, 0, 0]} maxBarSize={42} />
                        </BarChart>
                    </ResponsiveContainer>
                </StudyChartCard>

                <StudyChartCard title="月度学习趋势" unit="综合进度">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyTrend}>
                            <defs>
                                <linearGradient id="studyTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={accent} stopOpacity={0.24} />
                                    <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="week" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" name="综合进度" stroke={accent} strokeWidth={3} fill="url(#studyTrend)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </StudyChartCard>

                <StudyChartCard title="能力评估">
                    <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={abilityData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="ability" tick={{ fontSize: 12, fill: '#475569' }} />
                            <Radar dataKey="score" name="能力值" stroke={accent} fill={accent} fillOpacity={0.18} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </StudyChartCard>
            </section>

            <section className="study-lower-grid">
                <div className="glass-card study-panel study-records">
                    <div className="study-panel-heading">
                        <h2>学习记录</h2>
                        <span>最近动态</span>
                    </div>
                    <div className="study-record-list">
                        {studyLogs.length > 0 ? studyLogs.map(item => (
                            <div className="study-record" key={`${item.type}-${item.title}`}>
                                <span>{item.type}</span>
                                <strong>{item.title}</strong>
                                <em>{item.time}</em>
                            </div>
                        )) : (
                            <div className="study-record study-record-empty">
                                <span>暂无记录</span>
                                <strong>开始观看课程后会自动生成学习记录。</strong>
                                <em>当前账号</em>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {activePanel && <ProfileDetailPanel panel={activePanel} answeredQuestions={answeredQuestions} totalHours={totalHours} weeklyProgress={liveWeeklyProgress} subjects={userSubjects} />}
        </div>
    );
}

function StudyChartCard({ title, unit, children }) {
    return (
        <div className="glass-card study-chart-card">
            <div className="study-chart-heading">
                <h2>{title}</h2>
                {unit && <span>单位：{unit}</span>}
            </div>
            {children}
        </div>
    );
}

function ProfileStat({ label, value, onClick, active }) {
    return (
        <button className={`glass-card profile-stat profile-stat-button ${active ? 'active' : ''}`} type="button" onClick={onClick}>
            <strong>{value}</strong>
            <span>{label}</span>
        </button>
    );
}

function ProfileDetailPanel({ panel, answeredQuestions, totalHours, weeklyProgress, subjects }) {
    if (panel === 'weekly') {
        return (
            <section className="profile-detail-panel glass-card profile-card">
                <div className="section-title">各课程学习时间</div>
                <div className="profile-subject-hours">
                    {subjects.map(subject => (
                        <div className="profile-subject-hour" key={subject.id}>
                            <span>{subject.name}</span>
                            <div className="progress-bar-outer">
                                <div className="progress-bar-inner" style={{ width: `${Math.min(100, (subject.timeSpent / 45) * 100)}%`, background: '#111827' }} />
                            </div>
                            <strong>{subject.timeSpent} 小时</strong>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (panel === 'daily') {
        const maxValue = Math.max(1, ...weeklyProgress.flatMap(item => [item.hours, item.questions]));
        return (
            <section className="profile-detail-panel glass-card profile-card">
                <div className="section-title">本周学习</div>
                <div className="profile-week-chart">
                    <div className="profile-chart-axis"><span>28</span><span>21</span><span>14</span><span>7</span><span>0</span></div>
                    {weeklyProgress.map(item => (
                        <div className="profile-chart-day" key={item.day}>
                            <div className="profile-chart-bars">
                                <i style={{ height: `${(item.hours / maxValue) * 100}%` }} />
                                <b style={{ height: `${(item.questions / maxValue) * 100}%` }} />
                            </div>
                            <span>{item.day}</span>
                        </div>
                    ))}
                </div>
                <div className="profile-chart-legend"><span><i />学习时长</span><span><b />练习题数</span></div>
                <div className="profile-week-total">本周合计：{totalHours} 小时</div>
            </section>
        );
    }

    if (panel === 'questions') {
        return (
            <section className="profile-detail-panel glass-card profile-card">
                <div className="section-title">做过的题目</div>
                <div className="profile-question-list">
                    {answeredQuestions.map((item, index) => (
                        <div className="profile-question-row" key={`${item.subject}-${item.id}-${index}`}>
                            <span>{item.subject}</span>
                            <strong>{item.question}</strong>
                            <em>{item.status}</em>
                        </div>
                    ))}
                    {!answeredQuestions.length && (
                        <div className="study-record study-record-empty">
                            <span>暂无记录</span>
                            <strong>提交课程练习后，这里会显示当前账号自己的做题记录。</strong>
                            <em>当前账号</em>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    return (
        <section className="profile-detail-panel glass-card profile-card">
            <div className="section-title">课程进度</div>
            {subjects.map(subject => (
                <div className="profile-subject" key={subject.id}>
                    <div>
                        <strong>{subject.name}</strong>
                        <span>{subject.topicsCompleted}/{subject.totalTopics} 个主题</span>
                    </div>
                    <b>{subject.progress}%</b>
                    <div className="progress-bar-outer">
                        <div className="progress-bar-inner" style={{ width: `${subject.progress}%`, background: '#111827' }} />
                    </div>
                </div>
            ))}
        </section>
    );
}
