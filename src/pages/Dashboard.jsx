import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { subjects } from '../data/mockData';
import { getUserScopedStorageKey } from '../data/learningResources';
import { dateKey, formatStudyMinutes, getTodayStudySeconds, readStudyTimeLog } from '../utils/studyTime';
import { getUserSubjects } from '../utils/userProgress';
import LearningDiscovery from '../components/LearningDiscovery';

const taskVersion = 'user-tasks-v3';
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const todayStamp = () => dateKey();
const currentWeekdayIndex = () => (new Date().getDay() + 6) % 7;
const userKey = key => getUserScopedStorageKey(key);

const readPracticeStats = () => {
    try {
        return JSON.parse(localStorage.getItem(userKey('snowwave-practice-stats')) || '{}');
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

const buildWeeklyStudyData = (studyTimeLog, practiceStats) => getWeekDateKeys().map(({ day, key }) => ({
    day,
    hours: Number(((studyTimeLog[key]?.totalSeconds || 0) / 3600).toFixed(2)),
    questions: practiceStats[key]?.totalQuestions || 0,
}));

const taskPathFromText = (text, taskId = '') => {
    const isQuiz = text.includes('练习') || text.includes('题');
    const routeFor = (subjectId) => (
        isQuiz ? `/practice?subject=${subjectId}${taskId ? `&task=${encodeURIComponent(taskId)}` : ''}` : `/learning-video?subject=${subjectId}`
    );
    if (text.includes('测试') || text.includes('质量') || text.includes('Jest')) return routeFor('testing');
    if (text.includes('函数') || text.includes('抽象')) return routeFor('functions');
    if (text.includes('数据')) return routeFor('data');
    if (text.includes('面向对象') || text.includes('对象') || text.includes('封装')) return routeFor('oop');
    if (text.includes('递归')) return routeFor('recursion');
    if (text.includes('HTML') || text.includes('CSS') || text.includes('Web') || text.includes('前端')) return routeFor('htmlcss');
    if (text.includes('Python')) return routeFor('python');
    if (text.includes('算法')) return routeFor('dsa');
    if (text.includes('Git')) return routeFor('git');
    if (text.includes('CS50') || text.includes('计算机')) return routeFor('cs50');
    if (text.includes('笔记') || text.includes('错题')) return '/notes';
    return '/learning-path';
};

const planTextsToTasks = (items) => items
    .filter(item => item.trim())
    .map((item, index) => {
        const id = `planned-${todayStamp()}-${index}-${item.slice(0, 12)}`;
        return {
            id,
            title: item.replace(/^\d{1,2}:\d{2}\s*/, ''),
            meta: item.includes('练习') || item.includes('题') ? '提交练习题后自动打勾' : index === 0 ? '今日优先观看，视频播完后自动打勾' : '今日计划观看，视频播完后自动打勾',
            status: '待完成',
            path: taskPathFromText(item, id),
            actionType: item.includes('练习') || item.includes('题') ? 'quiz' : 'video',
            completed: false,
        };
    });

const saveTodayTasks = (tasks) => {
    localStorage.setItem(userKey('snowwave-today-tasks'), JSON.stringify(tasks));
    localStorage.setItem(userKey('snowwave-task-version'), taskVersion);
    window.dispatchEvent(new Event('snowwave-tasks-updated'));
    window.dispatchEvent(new Event('snowwave-local-data-updated'));
};

function loadTodayTasks() {
    try {
        const currentDate = todayStamp();
        const planDate = localStorage.getItem(userKey('snowwave-plan-date'));
        const savedVersion = localStorage.getItem(userKey('snowwave-task-version'));
        const savedTomorrow = JSON.parse(localStorage.getItem(userKey('snowwave-tomorrow-tasks')) || '[]');
        if (planDate && planDate !== currentDate && savedTomorrow.some(Boolean)) {
            const rolledTasks = planTextsToTasks(savedTomorrow);
            saveTodayTasks(rolledTasks);
            localStorage.setItem(userKey('snowwave-plan-date'), currentDate);
            return rolledTasks;
        }
        if (savedVersion !== taskVersion) {
            saveTodayTasks([]);
            return [];
        }
        const savedToday = JSON.parse(localStorage.getItem(userKey('snowwave-today-tasks')) || '[]');
        return savedToday.length ? savedToday.map((task, index) => ({
            ...task,
            id: task.id || `saved-${index}`,
            status: task.completed ? '已完成' : '待完成',
            actionType: task.actionType || (task.title?.includes('练习') ? 'quiz' : 'video'),
        })) : [];
    } catch {
        return [];
    }
}

function loadTomorrowTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(userKey('snowwave-tomorrow-tasks')) || '[]');
        return saved.length ? saved : [''];
    } catch {
        return [''];
    }
}

const subjectVisuals = {
    cs50: {
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
        intro: '计算机科学、程序设计思维、内存、算法和基础工程能力。',
    },
    python: {
        image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80',
        intro: '从变量、函数、文件到小项目，建立扎实 Python 编程基础。',
    },
    git: {
        image: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=900&q=80',
        intro: '掌握提交、分支、合并和 GitHub 协作流程。',
    },
    dsa: {
        image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
        intro: '数组、链表、树、排序和复杂度分析，提升代码基本功。',
    },
    htmlcss: {
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
        intro: '语义结构、布局、响应式和基础视觉实现。',
    },
    testing: {
        image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80',
        intro: '单元测试、集成测试、API 测试和代码质量保障。',
    },
    functions: {
        image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
        intro: '函数边界、抽象思维和可复用代码组织。',
    },
    data: {
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
        intro: '列表、表格、数据清洗和小型数据处理程序。',
    },
    oop: {
        image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80',
        intro: '类、对象、封装和面向对象代码组织。',
    },
    recursion: {
        image: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=900&q=80',
        intro: '递归拆解、终止条件和问题求解模式。',
    },
};

const shortcutOptions = [
    { id: 'study-stats', title: '学习统计', icon: '📊', path: '/study-stats' },
    { id: 'friends', title: '好友', icon: '☷', path: '/friends' },
    { id: 'favorites', title: '我的收藏', icon: '★', path: '/favorites' },
    { id: 'notes', title: '笔记', icon: '📝', path: '/notes' },
    { id: 'database', title: '数据库', icon: '▦', path: '/database' },
    { id: 'learning-path', title: '学习路径', icon: '⌘', path: '/learning-path' },
    { id: 'subjects', title: '课程中心', icon: '📚', path: '/subjects' },
];

function loadShortcutIds() {
    try {
        const saved = JSON.parse(localStorage.getItem(userKey('snowwave-dashboard-shortcuts')) || '[]');
        return saved.length ? saved : ['study-stats', 'friends', 'favorites'];
    } catch {
        return ['study-stats', 'friends', 'favorites'];
    }
}

function loadContinueCourseIds() {
    try {
        const saved = JSON.parse(localStorage.getItem(userKey('snowwave-dashboard-courses')) || '[]');
        const validIds = subjects.map(subject => subject.id);
        const validSaved = saved.filter(id => validIds.includes(id));
        return validSaved;
    } catch {
        return [];
    }
}

export default function Dashboard() {
    const [activeSubject, setActiveSubject] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [showTomorrowPlan, setShowTomorrowPlan] = useState(false);
    const [todayTasks, setTodayTasks] = useState(loadTodayTasks);
    const [tomorrowTasks, setTomorrowTasks] = useState(loadTomorrowTasks);
    const [autoPlanEnabled, setAutoPlanEnabled] = useState(() => localStorage.getItem(userKey('snowwave-auto-plan')) === 'enabled');
    const [shortcutIds, setShortcutIds] = useState(loadShortcutIds);
    const [shortcutPickerOpen, setShortcutPickerOpen] = useState(false);
    const [continueCourseIds, setContinueCourseIds] = useState(loadContinueCourseIds);
    const [courseManagerOpen, setCourseManagerOpen] = useState(false);
    const [shortcutDragging, setShortcutDragging] = useState(false);
    const [studyTimeLog, setStudyTimeLog] = useState(readStudyTimeLog);
    const [practiceStats, setPracticeStats] = useState(readPracticeStats);
    const userSubjects = getUserSubjects(subjects);
    const dragRef = useRef(null);
    const draggedRef = useRef(false);
    const shortcutScrollRef = useRef(null);
    const shortcutDragRef = useRef(null);
    const shortcutDraggedRef = useRef(false);
    const subjectCount = subjects.length;
    const quickShortcuts = shortcutIds
        .map(id => shortcutOptions.find(item => item.id === id))
        .filter(Boolean);
    const addableShortcuts = shortcutOptions.filter(item => !shortcutIds.includes(item.id));
    const continueCourses = continueCourseIds
        .map(id => userSubjects.find(subject => subject.id === id))
        .filter(Boolean);
    const remainingCourses = userSubjects.filter(subject => !continueCourseIds.includes(subject.id));
    const todaySeconds = getTodayStudySeconds(studyTimeLog);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dateKey(yesterday);
    const yesterdaySeconds = studyTimeLog[yesterdayKey]?.totalSeconds || 0;
    const studyChange = yesterdaySeconds ? Math.round(((todaySeconds - yesterdaySeconds) / yesterdaySeconds) * 100) : (todaySeconds ? 100 : 0);
    const liveStudyData = buildWeeklyStudyData(studyTimeLog, practiceStats);
    const updateTomorrowTask = (index, value) => {
        setTomorrowTasks(current => current.map((task, taskIndex) => taskIndex === index ? value : task));
    };
    const addTomorrowTask = () => {
        setTomorrowTasks(current => [...current, '']);
    };
    const removeTomorrowTask = (index) => {
        setTomorrowTasks(current => current.length > 1 ? current.filter((_, taskIndex) => taskIndex !== index) : ['']);
    };
    const buildAutoPlan = () => {
        let designedPath = null;
        try {
            designedPath = JSON.parse(localStorage.getItem(userKey('snowwave-designed-path')) || 'null');
        } catch {
            designedPath = null;
        }
        if (designedPath) {
            return [
                `08:30 ${designedPath.goal}：核心课程推进`,
                `14:00 ${designedPath.level}阶段：专项练习`,
                `20:00 复盘学习路径：整理问题`,
            ];
        }
        const subject = userSubjects[activeSubject] || userSubjects[0];
        return [
            `08:30 观看${subject.name}视频`,
            `14:00 完成${subject.name}配套练习题`,
            `20:00 观看测试与代码质量视频`,
        ];
    };
    const updateAutoPlan = (enabled) => {
        setAutoPlanEnabled(enabled);
        if (enabled) {
            setTomorrowTasks(buildAutoPlan());
        }
    };
    const addShortcut = (shortcutId) => {
        setShortcutIds(current => {
            if (current.includes(shortcutId)) return current;
            const next = [...current, shortcutId];
            localStorage.setItem(userKey('snowwave-dashboard-shortcuts'), JSON.stringify(next));
            return next;
        });
        setShortcutPickerOpen(false);
    };
    const handleShortcutPointerDown = (event) => {
        if (!shortcutScrollRef.current) return;
        shortcutDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: shortcutScrollRef.current.scrollLeft,
        };
        setShortcutDragging(true);
        shortcutDraggedRef.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handleShortcutPointerMove = (event) => {
        const drag = shortcutDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !shortcutScrollRef.current) return;
        const offset = event.clientX - drag.startX;
        shortcutDraggedRef.current = Math.abs(offset) > 6;
        shortcutScrollRef.current.scrollLeft = drag.scrollLeft - offset;
    };
    const handleShortcutPointerUp = (event) => {
        const drag = shortcutDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        shortcutDragRef.current = null;
        setShortcutDragging(false);
        if (shortcutScrollRef.current) {
            const pageWidth = shortcutScrollRef.current.clientWidth;
            const targetPage = Math.round(shortcutScrollRef.current.scrollLeft / pageWidth);
            shortcutScrollRef.current.scrollTo({ left: targetPage * pageWidth, behavior: 'smooth' });
        }
    };
    const handleShortcutClick = (event) => {
        if (shortcutDraggedRef.current) {
            event.preventDefault();
            shortcutDraggedRef.current = false;
        }
    };
    const addContinueCourse = (subjectId) => {
        setContinueCourseIds(current => {
            if (current.includes(subjectId)) return current;
            const next = [...current, subjectId];
            localStorage.setItem(userKey('snowwave-dashboard-courses'), JSON.stringify(next));
            return next;
        });
    };
    const removeContinueCourse = (subjectId) => {
        setContinueCourseIds(current => {
            const next = current.filter(id => id !== subjectId);
            localStorage.setItem(userKey('snowwave-dashboard-courses'), JSON.stringify(next));
            return next;
        });
    };
    const goToSubject = (direction) => {
        setActiveSubject(current => (current + direction + subjectCount) % subjectCount);
    };
    const getCarouselPosition = (index) => {
        let position = index - activeSubject;
        if (position > subjectCount / 2) position -= subjectCount;
        if (position < -subjectCount / 2) position += subjectCount;
        return position;
    };
    const handleCarouselPointerDown = (event) => {
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX };
        draggedRef.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handleCarouselPointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const nextOffset = event.clientX - drag.startX;
        draggedRef.current = Math.abs(nextOffset) > 6;
        setDragOffset(Math.max(-220, Math.min(220, nextOffset)));
    };
    const handleCarouselPointerUp = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const finalOffset = event.clientX - drag.startX;
        if (finalOffset > 48) goToSubject(-1);
        if (finalOffset < -48) goToSubject(1);
        setDragOffset(0);
        dragRef.current = null;
    };
    useEffect(() => {
        if (dragRef.current) return undefined;
        const timer = window.setInterval(() => {
            setActiveSubject(current => (current + 1) % subjectCount);
        }, 4200);
        return () => window.clearInterval(timer);
    }, [activeSubject, subjectCount]);

    useEffect(() => {
        localStorage.setItem(userKey('snowwave-auto-plan'), autoPlanEnabled ? 'enabled' : 'disabled');
    }, [autoPlanEnabled]);

    useEffect(() => {
        localStorage.setItem(userKey('snowwave-tomorrow-tasks'), JSON.stringify(tomorrowTasks));
        localStorage.setItem(userKey('snowwave-plan-date'), todayStamp());
    }, [tomorrowTasks]);

    useEffect(() => {
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

    useEffect(() => {
        const refreshTodayTasks = () => setTodayTasks(loadTodayTasks());
        const timer = window.setInterval(refreshTodayTasks, 60 * 1000);
        window.addEventListener('snowwave-tasks-updated', refreshTodayTasks);
        window.addEventListener('storage', refreshTodayTasks);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('snowwave-tasks-updated', refreshTodayTasks);
            window.removeEventListener('storage', refreshTodayTasks);
        };
    }, []);

    return (
        <div>
            <div className="dashboard-banner">
                <div
                    className="banner-content subject-focus-carousel"
                    onPointerDown={handleCarouselPointerDown}
                    onPointerMove={handleCarouselPointerMove}
                    onPointerUp={handleCarouselPointerUp}
                    onPointerCancel={() => { dragRef.current = null; setDragOffset(0); }}
                >
                    {userSubjects.map((subject, index) => {
                        const position = getCarouselPosition(index);
                        const distance = Math.abs(position);
                        if (distance > 2) return null;
                        const visual = subjectVisuals[subject.id];
                        const scale = distance === 0 ? 1 : distance === 1 ? 0.58 : 0.46;
                        const opacity = distance === 0 ? 1 : distance === 1 ? 0.74 : 0.34;
                        const offset = position * 520 + dragOffset;
                        return (
                            <div
                                className={`subject-carousel-card ${position === 0 ? 'is-active' : ''} ${position < 0 ? 'is-left' : ''} ${position > 0 ? 'is-right' : ''}`}
                                key={subject.id}
                                style={{
                                    '--offset': `${offset}px`,
                                    '--scale': scale,
                                    '--opacity': opacity,
                                    '--z': 10 - distance,
                                }}
                                draggable="false"
                                onDragStart={(event) => event.preventDefault()}
                            >
                                <img src={visual.image} alt={`${subject.name}课程`} draggable="false" />
                                <div className="subject-carousel-overlay">
                                    <span>{subject.icon}</span>
                                    <h2>
                                        <Link
                                            to={`/learning-video?subject=${subject.id}`}
                                            onPointerDown={(event) => event.stopPropagation()}
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            {subject.name}
                                        </Link>
                                    </h2>
                                    <p>{visual.intro}</p>
                                    <b>{subject.progress}% 进度 · 下一主题：{subject.nextTopic}</b>
                                </div>
                            </div>
                        );
                    })}
                    <div className="subject-carousel-dots">
                        {userSubjects.map((subject, index) => (
                            <button
                                type="button"
                                key={subject.id}
                                className={index === activeSubject ? 'active' : ''}
                                onClick={() => setActiveSubject(index)}
                                aria-label={`切换到${subject.name}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="dashboard-info-grid">
                <div className="dashboard-left-column">
                    <div className="dashboard-task-panel">
                    <div className="section-title">📋 今日学习任务</div>
                    <div className="today-task-list">
                        {todayTasks.length > 0 ? todayTasks.map((task, index) => (
                            <div className={`today-task-item ${task.completed ? 'is-complete' : ''}`} key={task.id || task.title}>
                                <span className="today-task-index">{String(index + 1).padStart(2, '0')}</span>
                                <div>
                                    <h3>
                                        <Link className="text-hover-link" to={task.path}>{task.title}</Link>
                                    </h3>
                                    <p>{task.meta}</p>
                                </div>
                                {task.completed ? (
                                    <span className="task-complete-indicator" aria-label={`${task.title}已完成`}>
                                        <span>✓</span>
                                    </span>
                                ) : (
                                    <span className="task-complete-space" aria-hidden="true" />
                                )}
                            </div>
                        )) : (
                            <div className="dashboard-empty-block">
                                <strong>今天还没有任务</strong>
                                <p>在“安排明日计划”里添加任务，第二天会自动出现在这里。</p>
                            </div>
                        )}
                    </div>
                    <div className="today-task-plan-row">
                        <a
                            href="#tomorrow-plan"
                            className="text-hover-link plan-link"
                            onClick={(event) => {
                                event.preventDefault();
                                setShowTomorrowPlan(true);
                            }}
                        >
                            安排明日计划
                        </a>
                    </div>
                    <div className={`tomorrow-plan-panel ${showTomorrowPlan ? 'is-open' : ''}`} id="tomorrow-plan">
                        <div className="tomorrow-plan-header">
                            <span>明日计划</span>
                            <div className="tomorrow-plan-header-actions">
                                <label className="auto-plan-toggle">
                                    <span className="text-hover-link">自动规划</span>
                                    <input
                                        type="checkbox"
                                        checked={autoPlanEnabled}
                                        onChange={(event) => updateAutoPlan(event.target.checked)}
                                    />
                                    <i aria-hidden="true" />
                                </label>
                                <a
                                    href="#today-tasks"
                                    className="text-hover-link"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        setShowTomorrowPlan(false);
                                    }}
                                >
                                    返回今日任务
                                </a>
                            </div>
                        </div>
                        <div className="tomorrow-plan-editor">
                            {tomorrowTasks.map((task, index) => (
                                <label className="tomorrow-plan-field" key={index}>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <input
                                        value={task}
                                        onChange={(event) => updateTomorrowTask(index, event.target.value)}
                                        placeholder="写下明日学习任务"
                                    />
                                    <button
                                        type="button"
                                        className="tomorrow-task-remove"
                                        onClick={() => removeTomorrowTask(index)}
                                        aria-label="删除任务"
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </label>
                            ))}
                            <a
                                href="#add-task"
                                className="text-hover-link tomorrow-plan-action"
                                onClick={(event) => {
                                    event.preventDefault();
                                    addTomorrowTask();
                                }}
                            >
                                增加任务
                            </a>
                        </div>
                    </div>
                    </div>
                    <div className="dashboard-activity-panel">
                    <div className="section-title">📈 本周学习活动</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={liveStudyData}>
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 0, boxShadow: 'none', fontSize: 12 }}
                                wrapperStyle={{ boxShadow: 'none' }}
                                cursor={false}
                            />
                            <XAxis dataKey="day" stroke="transparent" tick={{ fill: 'rgba(248, 241, 201, 0.48)', fontSize: 11 }} />
                            <YAxis stroke="transparent" tick={{ fill: 'rgba(248, 241, 201, 0.48)', fontSize: 11 }} />
                            <Bar dataKey="hours" name="学习时长" fill="var(--accent-blue)" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="questions" name="练习题数" fill="#8a7425" radius={[0, 0, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="chart-legend">
                        <span><i className="legend-swatch legend-hours" />学习时长</span>
                        <span><i className="legend-swatch legend-questions" />练习题数</span>
                    </div>
                    </div>
                </div>

                <div className="dashboard-right-column">
                    <div className="dashboard-continue-panel">
                    <div className="today-learned-card">
                        <div>
                            <span>今日学习</span>
                            <strong>{formatStudyMinutes(todaySeconds)}</strong>
                            <em>{studyChange >= 0 ? '↗' : '↘'} {studyChange >= 0 ? '+' : ''}{studyChange}% 较昨天</em>
                        </div>
                        <i aria-hidden="true">◷</i>
                    </div>
                    <div className="continue-learning-heading">
                        <div>
                            <span>▱</span>
                            <strong>继续学习</strong>
                        </div>
                        <div>
                            <button type="button" className="continue-action" onClick={() => setCourseManagerOpen(true)}>管理课程</button>
                            <Link to="/subjects" className="continue-view-all">查看全部 ›</Link>
                        </div>
                    </div>
                    <div className="continue-course-grid">
                        {continueCourses.length > 0 ? continueCourses.map((subject, index) => (
                            <div className="continue-course-card" key={subject.id}>
                                <div className="continue-course-thumb">
                                    <img src={subjectVisuals[subject.id].image} alt={`${subject.name}课程`} />
                                    {index === 0 && <span>▷</span>}
                                </div>
                                <div className="continue-course-body">
                                    <Link to={`/learning-video?subject=${subject.id}`} className="continue-course-title">{subject.name}</Link>
                                    <p>{subjectVisuals[subject.id].intro}</p>
                                    <div className="continue-progress-label">
                                        <span>学习进度</span>
                                        <b>{subject.progress}%</b>
                                    </div>
                                    <div className="continue-progress">
                                        <i style={{ width: `${subject.progress}%` }} />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="dashboard-empty-block continue-empty-block">
                                <strong>还没有继续学习课程</strong>
                                <p>打开“管理课程”添加你想放在首页追踪的课程。</p>
                                <button type="button" className="text-hover-link" onClick={() => setCourseManagerOpen(true)}>管理课程</button>
                            </div>
                        )}
                    </div>
                    {courseManagerOpen && (
                        <div className="course-manager-backdrop" onClick={() => setCourseManagerOpen(false)}>
                            <section className="course-manager-panel" onClick={(event) => event.stopPropagation()}>
                                <header>
                                    <strong>管理课程</strong>
                                    <button type="button" onClick={() => setCourseManagerOpen(false)}>×</button>
                                </header>
                                <div className="course-manager-section">
                                    <span>已添加课程</span>
                                    {continueCourses.length ? continueCourses.map(subject => (
                                        <div className="course-manager-row" key={subject.id}>
                                            <img src={subjectVisuals[subject.id].image} alt={`${subject.name}课程`} />
                                            <div>
                                                <strong>{subject.nextTopic}</strong>
                                                <p>{subjectVisuals[subject.id].intro}</p>
                                                <small>学习详细资料 <b>{subject.progress}%</b></small>
                                                <i><em style={{ width: `${subject.progress}%` }} /></i>
                                            </div>
                                            <button type="button" onClick={() => removeContinueCourse(subject.id)}>删除</button>
                                        </div>
                                    )) : <p>还没有添加课程</p>}
                                </div>
                                <div className="course-manager-section">
                                    <span>可添加课程</span>
                                    {remainingCourses.length ? remainingCourses.map(subject => (
                                        <div className="course-manager-row" key={subject.id}>
                                            <img src={subjectVisuals[subject.id].image} alt={`${subject.name}课程`} />
                                            <div>
                                                <strong>{subject.nextTopic}</strong>
                                                <p>{subjectVisuals[subject.id].intro}</p>
                                                <small>学习详细资料 <b>{subject.progress}%</b></small>
                                                <i><em style={{ width: `${subject.progress}%` }} /></i>
                                            </div>
                                            <button type="button" onClick={() => addContinueCourse(subject.id)}>添加</button>
                                        </div>
                                    )) : <p>没有剩余课程</p>}
                                </div>
                            </section>
                        </div>
                    )}
                    </div>
                    <div className="dashboard-shortcut-panel">
                        <div className="section-title">快捷方式</div>
                    <div className={`shortcut-folder ${shortcutDragging ? 'is-dragging' : ''}`} ref={shortcutScrollRef}>
                            <div className="shortcut-page">
                                {quickShortcuts.map(shortcut => (
                                    <Link className="shortcut-tile" to={shortcut.path} key={shortcut.id} onClick={handleShortcutClick} draggable="false">
                                        <span>{shortcut.icon}</span>
                                        <strong>{shortcut.title}</strong>
                                    </Link>
                                ))}
                                <button className="shortcut-tile shortcut-add" type="button" onClick={() => setShortcutPickerOpen(current => !current)}>
                                    <span>＋</span>
                                    <strong>添加</strong>
                                </button>
                            </div>
                        </div>
                        <div
                            className="shortcut-drag-zone"
                            onPointerDown={handleShortcutPointerDown}
                            onPointerMove={handleShortcutPointerMove}
                            onPointerUp={handleShortcutPointerUp}
                            onPointerCancel={() => { shortcutDragRef.current = null; setShortcutDragging(false); }}
                        />
                        {shortcutPickerOpen && (
                            <div className="shortcut-picker">
                                {addableShortcuts.length ? addableShortcuts.map(shortcut => (
                                    <button type="button" key={shortcut.id} onClick={() => addShortcut(shortcut.id)}>
                                        <span>{shortcut.icon}</span>
                                        {shortcut.title}
                                    </button>
                                )) : <p>没有可添加的模块</p>}
                            </div>
                        )}
                        </div>
                </div>
            </div>

            <LearningDiscovery />

            <style>{`
        .dashboard-banner {
          position: relative;
          height: clamp(430px, 26vw, 560px);
          min-height: 430px;
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          overflow: hidden;
          animation: fadeInUp 0.5s ease;
        }
        .banner-content { width: 100%; height: 100%; overflow: hidden; }
        .subject-focus-carousel {
          position: relative;
          height: 100%;
          min-height: 0;
          cursor: grab;
          touch-action: pan-y;
          user-select: none;
        }
        .subject-focus-carousel:active { cursor: grabbing; }
        .subject-carousel-card {
          position: absolute;
          left: 50%;
          top: 0;
          width: min(1280px, 72vw);
          height: 100%;
          overflow: hidden;
          color: #f8f1c9;
          border: 1px solid rgba(250, 204, 21, 0.18);
          background: #08090d;
          text-decoration: none;
          opacity: var(--opacity);
          z-index: var(--z);
          transform: translateX(calc(-50% + var(--offset))) scale(var(--scale));
          transform-origin: center;
          transition: transform .52s cubic-bezier(.16, 1, .3, 1), opacity .42s ease;
          box-shadow: 0 18px 50px rgba(17,24,39,.18);
        }
        .subject-carousel-card:not(.is-active)::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .subject-carousel-card:not(.is-active).is-left::after {
          background: linear-gradient(90deg, rgba(17,24,39,0), rgba(17,24,39,0.82));
        }
        .subject-carousel-card:not(.is-active).is-right::after {
          background: linear-gradient(90deg, rgba(17,24,39,0.82), rgba(17,24,39,0));
        }
        .subject-carousel-card:not(.is-active) .subject-carousel-overlay { padding: 20px; }
        .subject-carousel-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .35s ease;
          pointer-events: none;
        }
        .subject-carousel-card:hover img { transform: scale(1.04); }
        .subject-carousel-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 22px;
          background: linear-gradient(180deg, rgba(17,24,39,0.06), rgba(17,24,39,0.84));
          pointer-events: auto;
        }
        .subject-carousel-card:not(.is-active).is-left .subject-carousel-overlay {
          background: linear-gradient(180deg, rgba(17,24,39,0.04), rgba(17,24,39,0.36));
        }
        .subject-carousel-card:not(.is-active).is-right .subject-carousel-overlay {
          background: linear-gradient(180deg, rgba(17,24,39,0.04), rgba(17,24,39,0.36));
        }
        .subject-carousel-overlay span { font-size: 1.6rem; margin-bottom: 8px; }
        .subject-carousel-overlay h2 {
          font-family: var(--font-display);
          font-size: 1.45rem;
          margin-bottom: 8px;
        }
        .subject-carousel-overlay h2 a {
          color: #f8f1c9;
          text-decoration: none;
          pointer-events: auto;
          background-image: linear-gradient(currentColor, currentColor);
          background-repeat: no-repeat;
          background-size: 0 2px;
          background-position: 0 100%;
          transition: background-size .18s ease, transform .18s ease;
        }
        .subject-carousel-overlay h2 a:hover {
          background-size: 100% 2px;
        }
        .subject-carousel-overlay p {
          max-width: 300px;
          color: rgba(255,255,255,.86);
          font-size: .82rem;
          line-height: 1.7;
          margin-bottom: 12px;
        }
        .subject-carousel-overlay b {
          width: fit-content;
          padding: 6px 9px;
          background: rgba(255,255,255,.9);
          color: #08090d;
          font-size: .72rem;
        }
        .subject-carousel-dots {
          position: absolute;
          left: 50%;
          bottom: 14px;
          z-index: 20;
          display: flex;
          gap: 8px;
          transform: translateX(-50%);
        }
        .subject-carousel-dots button {
          width: 24px;
          height: 4px;
          border: 0;
          background: rgba(17,24,39,.22);
          cursor: pointer;
        }
        .subject-carousel-dots button.active { background: var(--accent-blue); }
        .theme-dark .subject-carousel-dots button { background: rgba(255,255,255,.28); }
        .theme-dark .subject-carousel-dots button.active { background: #f8fafc; }
        @media (max-width: 1180px) {
          .subject-carousel-card { width: min(780px, 70vw); }
        }
        .chart-legend {
          display: flex;
          justify-content: flex-end;
          gap: 14px;
          margin-top: 12px;
          color: var(--text-secondary);
          font-size: 0.68rem;
        }
        .chart-legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .legend-swatch {
          width: 16px;
          height: 7px;
          display: inline-block;
        }
        .legend-hours { background: var(--accent-blue); }
        .legend-questions { background: #8a7425; }
        .dashboard-learning-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, .78fr);
          gap: 0;
          margin-top: 24px;
          padding: 0;
          background: transparent;
          position: relative;
        }
        .dashboard-learning-row::before,
        .dashboard-learning-row::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          height: 1px;
          background: var(--border);
          pointer-events: none;
        }
        .dashboard-learning-row::before {
          top: 0;
        }
        .dashboard-learning-row::after {
          bottom: 0;
        }
        .dashboard-activity-panel,
        .dashboard-task-panel {
          min-width: 0;
          padding: 24px 28px 22px;
        }
        .dashboard-activity-panel {
          padding-left: 0;
        }
        .dashboard-task-panel {
          padding-right: 0;
          position: relative;
          overflow: hidden;
        }
        .dashboard-task-panel::before {
          content: "";
          position: absolute;
          left: 0;
          top: 26px;
          bottom: 26px;
          width: 1px;
          background: var(--border);
        }
        .today-task-list {
          position: relative;
        }
        .today-task-list::before {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          top: 0;
          height: 1px;
          background: var(--border);
        }
        .dashboard-empty-block {
          min-height: 132px;
          display: grid;
          align-content: center;
          gap: 8px;
          padding: 24px 18px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .dashboard-empty-block strong {
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: .95rem;
        }
        .dashboard-empty-block p {
          margin: 0;
          color: var(--text-muted);
          font-size: .76rem;
          line-height: 1.8;
        }
        .dashboard-empty-block button {
          justify-self: start;
          border: 0;
          background: transparent;
          padding: 0;
          font: inherit;
          cursor: pointer;
        }
        .today-task-item {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 18px 0;
          color: var(--text-secondary);
          position: relative;
        }
        .today-task-item::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 1px;
          background: var(--border);
        }
        .today-task-index {
          color: var(--text-muted);
          font-family: var(--font-display);
          font-size: .72rem;
          font-weight: 800;
        }
        .today-task-item h3 {
          margin: 0 0 5px;
          color: inherit;
          font-size: .86rem;
        }
        .today-task-item p {
          margin: 0;
          color: var(--text-muted);
          font-size: .72rem;
        }
        .task-complete-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid var(--accent-blue);
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          padding: 0;
          font: inherit;
          cursor: default;
          transition: border-color .18s ease, color .18s ease, background .18s ease;
        }
        .task-complete-space {
          display: block;
          width: 42px;
          height: 42px;
        }
        .task-complete-indicator span {
          display: inline-grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border: 1px solid var(--accent-blue);
          background: var(--accent-blue);
          color: #08090d;
          font-size: .76rem;
          font-weight: 900;
        }
        .today-task-item.is-complete {
          color: #f8d85a;
        }
        .today-task-item.is-complete h3 .text-hover-link {
          color: #f8d85a;
        }
        .today-task-item:hover {
          color: var(--text-primary);
        }
        .text-hover-link {
          display: inline;
          color: var(--text-secondary);
          text-decoration: none;
          background-image: linear-gradient(currentColor, currentColor);
          background-repeat: no-repeat;
          background-position: 0 100%;
          background-size: 0 1px;
          transition: color .18s ease, background-size .28s ease;
        }
        .today-task-item:hover .text-hover-link,
        .text-hover-link:hover {
          color: var(--text-primary);
          background-size: 100% 1px;
        }
        .today-task-plan-row {
          position: relative;
          display: flex;
          align-items: center;
          gap: 28px;
          padding: 14px 0 2px;
        }
        .plan-link {
          font-size: .86rem;
          font-weight: 700;
        }
        .auto-plan-toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          font-size: .86rem;
          font-weight: 700;
          cursor: pointer;
        }
        .auto-plan-toggle input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        .auto-plan-toggle i {
          width: 32px;
          height: 17px;
          border: 1px solid #9ca3af;
          border-radius: 999px;
          position: relative;
          box-sizing: border-box;
          transition: border-color .18s ease, background-color .18s ease;
        }
        .auto-plan-toggle i::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #9ca3af;
          transition: transform .22s ease, background-color .18s ease;
        }
        .auto-plan-toggle:hover {
          color: var(--text-primary);
        }
        .auto-plan-toggle:hover .text-hover-link {
          color: var(--text-primary);
          background-size: 100% 1px;
        }
        .auto-plan-toggle input:checked + i {
          border-color: var(--accent-blue);
          background: var(--accent-blue);
        }
        .auto-plan-toggle input:checked + i::before {
          transform: translateX(15px);
          background: #08090d;
        }
        .tomorrow-plan-panel {
          position: absolute;
          inset: 0 0 0 0;
          z-index: 12;
          padding: 24px 0 22px 28px;
          background: var(--bg-card);
          transform: translateX(104%);
          transition: transform .36s cubic-bezier(.22, .61, .36, 1);
        }
        .tomorrow-plan-panel.is-open {
          transform: translateX(0);
        }
        .tomorrow-plan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 18px;
          margin-right: 18px;
          border-bottom: 1px solid var(--border);
        }
        .tomorrow-plan-header span {
          color: var(--text-primary);
          font-weight: 800;
        }
        .tomorrow-plan-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 18px;
          white-space: nowrap;
        }
        .tomorrow-plan-list {
          padding-top: 8px;
          margin-right: 18px;
        }
        .tomorrow-plan-editor {
          display: grid;
          gap: 0;
          padding-top: 8px;
          margin-right: 18px;
        }
        .tomorrow-plan-field {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          padding: 15px 34px 15px 0;
          border-bottom: 1px solid var(--border);
          position: relative;
        }
        .tomorrow-plan-field span {
          color: var(--text-muted);
          font-family: var(--font-display);
          font-size: .72rem;
          font-weight: 800;
        }
        .tomorrow-plan-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font: inherit;
          font-size: .82rem;
        }
        .tomorrow-plan-field input::placeholder {
          color: var(--text-muted);
        }
        .tomorrow-task-remove {
          appearance: none;
          -webkit-appearance: none;
          position: absolute;
          top: 12px;
          right: 0;
          width: 22px;
          height: 22px;
          border: 0 !important;
          border-radius: 0;
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          box-shadow: none !important;
          outline: 0;
        }
        .tomorrow-task-remove span {
          width: 17px;
          height: 17px;
          border: 1px solid #9ca3af;
          border-radius: 50%;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 400;
          line-height: 1;
          box-sizing: border-box;
          transition: color .18s ease, border-color .18s ease;
        }
        .tomorrow-task-remove:hover span {
          color: #6b7280;
          border-color: #6b7280;
        }
        .tomorrow-plan-action {
          justify-self: start;
          margin-top: 16px;
          font-size: .86rem;
          font-weight: 700;
        }
        .ai-plan-link {
          margin-top: 18px;
        }
        .dashboard-info-grid {
          position: relative;
          margin-top: 24px;
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(420px, .88fr);
          align-items: start;
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
        }
        .dashboard-info-grid::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 56%;
          width: 1px;
          background: var(--border);
          z-index: 3;
          pointer-events: none;
        }
        .dashboard-left-column,
        .dashboard-right-column {
          min-width: 0;
          position: relative;
          background: transparent;
        }
        .dashboard-left-column {
          grid-column: 1;
        }
        .dashboard-right-column {
          grid-column: 2;
        }
        .dashboard-left-column,
        .dashboard-right-column {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .dashboard-task-panel,
        .dashboard-continue-panel,
        .dashboard-activity-panel,
        .dashboard-shortcut-panel {
          min-width: 0;
          padding: 18px 28px;
          border: 0;
          background: transparent;
          position: relative;
          overflow: hidden;
        }
        .dashboard-task-panel {
          padding-right: 28px;
        }
        .dashboard-task-panel::before {
          display: none;
        }
        .dashboard-activity-panel {
          padding-left: 28px;
          padding-top: 6px;
        }
        .dashboard-activity-panel .section-title {
          margin-top: 0;
          margin-bottom: 8px;
        }
        .dashboard-continue-panel,
        .dashboard-shortcut-panel {
          border-left: 0;
        }
        .dashboard-shortcut-panel {
          padding-top: 6px;
        }
        .dashboard-activity-panel::before,
        .dashboard-shortcut-panel::before {
          content: "";
          position: absolute;
          top: 0;
          left: 28px;
          right: 28px;
          height: 1px;
          background: #111827;
        }
        .dashboard-shortcut-panel::before {
          top: 0;
        }
        .dashboard-shortcut-panel .section-title {
          margin-top: 0;
          margin-bottom: 8px;
        }
        .tomorrow-plan-panel {
          padding: 24px 28px 22px;
        }
        .today-learned-card {
          min-height: 112px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
          margin-bottom: 20px;
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
          box-shadow: 0 10px 24px rgba(0, 0, 0, .12);
        }
        .today-learned-card span,
        .today-learned-card strong,
        .today-learned-card em {
          display: block;
        }
        .today-learned-card span {
          color: var(--accent-blue);
          font-size: .72rem;
          font-weight: 900;
        }
        .today-learned-card strong {
          font-family: var(--font-display);
          font-size: 1.45rem;
          color: var(--accent-blue);
        }
        .today-learned-card em {
          margin-top: 8px;
          color: var(--accent-blue);
          font-style: normal;
          font-size: .72rem;
        }
        .today-learned-card i {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: 50% !important;
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          font-style: normal;
          font-size: 1.45rem;
        }
        .continue-learning-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 20px;
          margin-bottom: 14px;
          padding-top: 18px;
          position: relative;
        }
        .continue-learning-heading::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: #111827;
        }
        .continue-learning-heading > div {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .continue-learning-heading strong {
          font-family: var(--font-display);
          font-size: 1rem;
        }
        .continue-learning-heading > div:last-child {
          gap: 8px;
        }
        .continue-action,
        .continue-view-all {
          display: inline-flex;
          align-items: center;
          height: 30px;
          padding: 0 12px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: .72rem;
          font-weight: 700;
          font: inherit;
          cursor: pointer;
        }
        .continue-action {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }
        .continue-course-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .continue-empty-block {
          grid-column: 1 / -1;
          min-height: 150px;
          background: var(--bg-secondary);
        }
        .continue-course-card {
          display: grid;
          grid-template-columns: 104px minmax(0, 1fr);
          gap: 14px;
          min-height: 116px;
          padding: 8px 0;
          border: 0;
          background: transparent;
          color: var(--text-primary);
          box-shadow: none;
        }
        .continue-course-thumb {
          position: relative;
          min-height: 104px;
          overflow: hidden;
          background: #e5e7eb;
        }
        .continue-course-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: grayscale(.1);
        }
        .continue-course-thumb::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(17,24,39,.38));
        }
        .continue-course-thumb span {
          position: absolute;
          right: 8px;
          bottom: 8px;
          z-index: 2;
          color: white;
          font-size: 1rem;
        }
        .continue-course-body {
          min-width: 0;
        }
        .continue-course-title {
          display: inline-block;
          margin: 0 0 6px;
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
          text-decoration: none;
          transition: transform .18s ease, color .18s ease;
        }
        .continue-course-title:hover {
          transform: translateY(-3px);
          color: var(--accent-blue);
        }
        .continue-course-card p {
          margin: 0;
          color: var(--text-muted);
          font-size: .7rem;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .continue-progress-label {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 8px;
          color: var(--text-muted);
          font-size: .68rem;
        }
        .continue-progress-label b {
          color: var(--accent-blue);
        }
        .continue-progress {
          height: 6px;
          margin-top: 4px;
          background: var(--accent-blue-soft);
          overflow: hidden;
        }
        .continue-progress i {
          display: block;
          height: 100%;
          background: var(--accent-blue);
        }
        .course-manager-backdrop {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(17, 24, 39, .42);
          animation: fadeIn .18s ease;
        }
        .course-manager-panel {
          width: min(720px, 100%);
          max-height: min(720px, calc(100vh - 48px));
          overflow-y: auto;
          padding: 24px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          box-shadow: 0 22px 70px rgba(17,24,39,.16);
          animation: coursePanelIn .24s ease;
        }
        @keyframes coursePanelIn {
          from { opacity: 0; transform: translateY(18px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .course-manager-panel header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .course-manager-panel header strong {
          font-family: var(--font-display);
          font-size: 1.05rem;
        }
        .course-manager-panel header button {
          border: 0;
          background: transparent;
          color: var(--text-secondary);
          font: inherit;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .course-manager-section {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }
        .course-manager-section > span {
          color: var(--text-muted);
          font-size: .72rem;
          font-weight: 700;
        }
        .course-manager-section p {
          color: var(--text-muted);
          font-size: .8rem;
        }
        .course-manager-row {
          display: grid;
          grid-template-columns: 128px minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
        }
        .course-manager-row img {
          width: 128px;
          height: 98px;
          object-fit: cover;
          display: block;
          filter: grayscale(.08);
        }
        .course-manager-row strong {
          display: block;
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
        }
        .course-manager-row p {
          margin: 6px 0 8px;
          color: var(--text-secondary);
          font-size: .8rem;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .course-manager-row small {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--text-muted);
          font-size: .72rem;
        }
        .course-manager-row small b {
          color: var(--accent-blue);
        }
        .course-manager-row i {
          display: block;
          height: 6px;
          margin-top: 5px;
          background: var(--accent-blue-soft);
          overflow: hidden;
        }
        .course-manager-row i em {
          display: block;
          height: 100%;
          background: var(--accent-blue);
        }
        .course-manager-row button {
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
          color: var(--text-secondary);
          padding: 6px 10px;
          font: inherit;
          font-size: .74rem;
          cursor: pointer;
        }
        .course-manager-row button:hover {
          color: var(--text-primary);
          border-color: var(--text-primary);
          transform: none;
          box-shadow: none;
        }
        .shortcut-folder {
          position: relative;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          scrollbar-width: none;
          padding-top: 0;
          padding-bottom: 2px;
          user-select: none;
        }
        .shortcut-folder.is-dragging {
          scroll-snap-type: none;
          scroll-behavior: auto;
        }
        .shortcut-folder::-webkit-scrollbar {
          display: none;
        }
        .shortcut-drag-zone {
          min-height: 36px;
          cursor: grab;
          touch-action: pan-y;
          user-select: none;
        }
        .shortcut-drag-zone:active {
          cursor: grabbing;
        }
        .shortcut-page {
          position: relative;
          display: grid;
          grid-auto-flow: column;
          grid-template-rows: repeat(2, 104px);
          grid-auto-columns: 50%;
          gap: 0;
          min-width: 100%;
        }
        .shortcut-page::before,
        .shortcut-page::after {
          content: "";
          position: absolute;
          z-index: 1;
          pointer-events: none;
          background: var(--border);
        }
        .shortcut-page::before {
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
        }
        .shortcut-page::after {
          left: 0;
          right: 0;
          top: 104px;
          height: 1px;
        }
        .shortcut-tile {
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          border: 0;
          background: var(--bg-card-hover);
          color: var(--text-secondary);
          text-decoration: none;
          font: inherit;
          cursor: pointer;
          scroll-snap-align: start;
          user-select: none;
        }
        .shortcut-tile:hover {
          color: var(--text-primary);
        }
        .shortcut-tile span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          background: #111827;
          color: #ffffff;
          font-size: 1.2rem;
        }
        .shortcut-tile strong {
          font-size: .78rem;
          font-weight: 600;
        }
        .shortcut-add span {
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          font-size: 1.55rem;
          line-height: 1;
        }
        .shortcut-picker {
          position: absolute;
          right: 28px;
          bottom: 28px;
          z-index: 8;
          width: min(220px, calc(100% - 56px));
          padding: 8px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          box-shadow: 0 16px 40px rgba(15,23,42,.12);
        }
        .shortcut-picker button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border: 0;
          background: transparent;
          color: var(--text-secondary);
          font: inherit;
          font-size: .78rem;
          text-align: left;
          cursor: pointer;
        }
        .shortcut-picker button:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
          transform: none;
          box-shadow: none;
        }
        .shortcut-picker p {
          padding: 9px 10px;
          color: var(--text-muted);
          font-size: .78rem;
        }

        @media (max-width: 900px) {
          .dashboard-banner {
            height: 360px;
            min-height: 360px;
          }
          .subject-focus-carousel { height: 100%; min-height: 0; }
          .subject-carousel-card { width: 78vw; height: 100%; }
          .subject-carousel-overlay p { font-size: .78rem; }
          .dashboard-learning-row {
            grid-template-columns: 1fr;
          }
          .dashboard-info-grid {
            grid-template-columns: 1fr;
          }
          .dashboard-left-column,
          .dashboard-right-column {
            grid-column: 1;
          }
          .dashboard-info-grid::before {
            display: none;
          }
          .dashboard-activity-panel,
          .dashboard-task-panel,
          .dashboard-continue-panel,
          .dashboard-shortcut-panel {
            padding: 18px;
          }
          .continue-course-grid {
            grid-template-columns: 1fr;
          }
          .course-manager-row {
            grid-template-columns: 96px minmax(0, 1fr);
          }
          .course-manager-row img {
            width: 96px;
            height: 78px;
          }
          .course-manager-row button {
            grid-column: 2;
            justify-self: start;
          }
          .dashboard-continue-panel,
          .dashboard-shortcut-panel {
            border-left: 0;
            border-top: 1px solid var(--border);
          }
          .dashboard-shortcut-panel::before {
            top: 0;
          }
          .dashboard-task-panel::before {
            display: none;
          }
        }
      `}</style>
        </div>
    );
}
