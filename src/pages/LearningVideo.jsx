import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import CoursePractice from '../components/CoursePractice';
import { subjects } from '../data/mockData';
import { getCurrentUserBinding, getUserScopedStorageKey, lessonCatalog } from '../data/learningResources';
import { discussionUsers } from '../data/socialData';
import { recordStudySeconds } from '../utils/studyTime';
import { getUserSubjectStats } from '../utils/userProgress';
import { isVideoComplete } from '../utils/videoCompletion';

const discussionStorageKey = 'snowwave-video-discussions';
const profileStorageKey = 'snowwave-profile';
const videoProgressStorageKey = 'snowwave-video-progress';

function loadCurrentProfile() {
    try {
        const binding = getCurrentUserBinding();
        const stored = JSON.parse(localStorage.getItem(getUserScopedStorageKey(profileStorageKey)) || '{}');
        return {
            nickname: stored.nickname || binding.nickname || binding.contact || binding.email || '',
            avatarPreview: stored.avatarPreview || '',
        };
    } catch {
        return { nickname: '', avatarPreview: '' };
    }
}

function loadDiscussionStore() {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(discussionStorageKey)) || '{}');
    } catch {
        return {};
    }
}

function saveDiscussionStore(nextStore) {
    localStorage.setItem(getUserScopedStorageKey(discussionStorageKey), JSON.stringify(nextStore));
}

function loadVideoProgress() {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(videoProgressStorageKey)) || '{}');
    } catch {
        return {};
    }
}

function saveVideoProgress(progress) {
    localStorage.setItem(getUserScopedStorageKey(videoProgressStorageKey), JSON.stringify(progress));
    window.dispatchEvent(new Event('snowwave-local-data-updated'));
}

function readSavedVideoTime(progressItem) {
    if (typeof progressItem === 'number') return progressItem;
    if (progressItem && typeof progressItem === 'object') return Number(progressItem.currentTime || 0);
    return 0;
}

function formatRelativeTime(createdAt, fallback = '') {
    const timestamp = Number(createdAt);
    if (!timestamp) return fallback || '刚刚';
    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
    if (diff < 48 * 60 * 60 * 1000) {
        return `昨天 ${new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return new Date(timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatVideoTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

const lessonPracticeCatalog = {
    cs50: [
        [
            { id: 'cs50-1-1', question: '计算机科学导论更强调哪种能力？', options: ['把问题拆成可执行步骤', '只背诵快捷键', '只调整页面颜色', '只下载工具'], answer: 0, explanation: '计算机科学入门的核心是把问题抽象、拆解并转换成算法步骤。' },
            { id: 'cs50-1-2', question: '学习二进制和算法的意义是什么？', options: ['理解计算机如何表示和处理信息', '让视频更清晰', '替代所有编程语言', '减少屏幕亮度'], answer: 0, explanation: '二进制和算法帮助学习者理解程序运行背后的基本模型。' },
        ],
        [
            { id: 'cs50-2-1', question: '程序执行模型通常包含什么？', options: ['输入、处理、输出', '图片、滤镜、收藏', '账号、头像、弹窗', '颜色、字体、边框'], answer: 0, explanation: '大多数程序都可以从输入、处理和输出三个环节理解。' },
            { id: 'cs50-2-2', question: '为什么要关注计算模型？', options: ['帮助判断程序步骤是否清晰可执行', '为了关闭浏览器', '为了绕过练习题', '为了删除变量'], answer: 0, explanation: '计算模型能帮助我们判断问题能否被清楚地描述并交给程序执行。' },
        ],
    ],
    python: [
        [
            { id: 'python-1-1', question: '变量在 Python 中主要用于什么？', options: ['保存数据引用并便于复用', '只能播放视频', '改变电脑硬件', '隐藏所有错误'], answer: 0, explanation: '变量让代码可以用名字引用数据，提升可读性和复用性。' },
            { id: 'python-1-2', question: '字符串输入输出练习主要训练什么？', options: ['读取、组织和展示文本信息', '删除解释器', '修改屏幕尺寸', '创建物理网络'], answer: 0, explanation: '入门阶段常通过文本输入输出来理解程序与用户的交互。' },
        ],
        [
            { id: 'python-2-1', question: '条件语句适合处理哪类逻辑？', options: ['根据不同情况走不同分支', '无条件重复同一操作', '只负责注释', '只能创建文件夹'], answer: 0, explanation: 'if/elif/else 用来表达根据条件变化的分支流程。' },
            { id: 'python-2-2', question: '循环结构常用于什么？', options: ['重复处理一组数据或步骤', '永久停止程序', '替代函数参数', '压缩所有图片'], answer: 0, explanation: '循环可以把重复动作写成清晰、可维护的结构。' },
        ],
    ],
    git: [
        [
            { id: 'git-1-1', question: '版本思维要求开发者关注什么？', options: ['每次变更的原因和范围', '只关注文件大小', '只改图标', '只看运行时间'], answer: 0, explanation: '好的提交会记录清楚变更范围，方便回溯和协作。' },
            { id: 'git-1-2', question: '项目组织清晰的好处是什么？', options: ['降低定位文件和协作成本', '让代码不能运行', '删除历史记录', '隐藏需求'], answer: 0, explanation: '清楚的项目结构让多人协作和后续维护更稳定。' },
        ],
        [
            { id: 'git-2-1', question: '分支协作适合用于什么？', options: ['隔离功能开发和修复工作', '压缩视频', '修改显示器亮度', '清空所有代码'], answer: 0, explanation: '分支能让不同任务并行推进，合并前也便于检查。' },
            { id: 'git-2-2', question: '提交整理时应避免什么？', options: ['把无关改动混在一个提交里', '写清提交信息', '先测试再提交', '小步保存'], answer: 0, explanation: '无关改动混在一起会增加审查和回滚成本。' },
        ],
    ],
    dsa: [
        [
            { id: 'dsa-1-1', question: '算法思维首先关注什么？', options: ['清晰步骤和边界条件', '按钮颜色', '头像尺寸', '视频格式'], answer: 0, explanation: '算法要先明确输入、步骤、输出和边界情况。' },
            { id: 'dsa-1-2', question: '迭代常用于解决什么问题？', options: ['重复推进状态直到完成', '关闭浏览器', '删除数据', '改变字体'], answer: 0, explanation: '迭代通过重复执行规则来逐步接近目标。' },
        ],
        [
            { id: 'dsa-2-1', question: '数据结构的作用是什么？', options: ['用合适方式组织数据', '只负责装饰页面', '替代所有算法', '隐藏用户输入'], answer: 0, explanation: '合适的数据结构能让访问、更新和处理数据更高效。' },
            { id: 'dsa-2-2', question: '问题拆分能带来什么好处？', options: ['把复杂问题变成可处理的小任务', '让程序更混乱', '阻止测试', '减少需求理解'], answer: 0, explanation: '拆分问题能让实现路径更清楚，也更容易验证。' },
        ],
    ],
    htmlcss: [
        [
            { id: 'web-1-1', question: 'Web 项目结构化首先要区分什么？', options: ['内容结构、样式和交互职责', '电脑品牌', '视频时长', '文件颜色'], answer: 0, explanation: 'HTML、CSS 和脚本各有职责，结构清楚更易维护。' },
            { id: 'web-1-2', question: '语义化 HTML 的价值是什么？', options: ['让内容结构更清楚', '让数据库变快', '替代测试', '减少所有文件'], answer: 0, explanation: '语义化标签有助于可读性、可访问性和维护。' },
        ],
        [
            { id: 'web-2-1', question: '页面交互设计需要关注什么？', options: ['用户动作后的状态反馈', '只关注背景图', '隐藏所有按钮', '删除导航'], answer: 0, explanation: '交互要让用户知道当前状态、操作结果和下一步。' },
            { id: 'web-2-2', question: '模块组织的目标是什么？', options: ['让页面部分可复用、可替换', '让代码集中成一行', '禁用样式', '移除结构'], answer: 0, explanation: '模块化能降低重复，方便维护和扩展。' },
        ],
    ],
    testing: [
        [
            { id: 'testing-1-1', question: '测试入门首先要确认什么？', options: ['代码行为是否符合预期', '图标是否足够大', '文件是否越多越好', '视频是否自动播放'], answer: 0, explanation: '测试的核心是用可重复方式验证代码行为。' },
            { id: 'testing-1-2', question: '调试时最重要的习惯是什么？', options: ['缩小问题范围并复现错误', '随机修改代码', '关闭所有日志', '跳过问题'], answer: 0, explanation: '稳定复现和缩小范围能显著提高定位效率。' },
        ],
        [
            { id: 'testing-2-1', question: '错误定位通常先看什么？', options: ['报错信息和最近改动', '屏幕亮度', '头像大小', '文件图标'], answer: 0, explanation: '报错信息和最近变更通常能快速指向问题来源。' },
            { id: 'testing-2-2', question: '好的调试过程应该避免什么？', options: ['没有假设地乱改', '记录现象', '逐步验证', '保留可复现步骤'], answer: 0, explanation: '乱改会引入新问题，也会让原因更难判断。' },
        ],
    ],
    functions: [
        [
            { id: 'functions-1-1', question: '函数边界清楚意味着什么？', options: ['输入、处理和输出明确', '函数越长越好', '不能有参数', '只能打印文本'], answer: 0, explanation: '清楚边界能让函数更容易理解、测试和复用。' },
            { id: 'functions-1-2', question: '抽象思维的目标是什么？', options: ['隐藏细节并保留关键接口', '增加重复代码', '删除所有变量', '让调用更复杂'], answer: 0, explanation: '抽象让使用者关注做什么，而不是每一步怎么做。' },
        ],
        [
            { id: 'functions-2-1', question: '作用域主要决定什么？', options: ['变量在哪里可见和可用', '视频在哪里播放', '按钮颜色', '文件大小'], answer: 0, explanation: '作用域控制变量和名称在代码中的可访问范围。' },
            { id: 'functions-2-2', question: '参数设计合理有什么好处？', options: ['让函数适配不同输入', '让代码不能复用', '强制写死数据', '隐藏返回值'], answer: 0, explanation: '参数让同一段逻辑可以处理多种数据。' },
        ],
    ],
    data: [
        [
            { id: 'data-1-1', question: '数据处理入门通常先做什么？', options: ['理解数据结构和字段含义', '修改屏幕壁纸', '删除所有样本', '跳过检查'], answer: 0, explanation: '处理前要先弄清数据来源、结构和字段含义。' },
            { id: 'data-1-2', question: '清洗数据时常见问题包括什么？', options: ['缺失、重复和格式不一致', '显示器太亮', '键盘太小', '视频太短'], answer: 0, explanation: '这些问题会影响后续统计和判断。' },
        ],
        [
            { id: 'data-2-1', question: '集合数据遍历适合什么场景？', options: ['逐项统计、转换或筛选', '创建硬件', '删除解释器', '改变网络'], answer: 0, explanation: '遍历能对集合中每个元素执行统一处理。' },
            { id: 'data-2-2', question: '处理列表时为什么要注意边界？', options: ['避免空列表或越界造成错误', '为了让颜色更深', '为了禁用函数', '为了增加重复'], answer: 0, explanation: '空数据、缺失字段和越界访问都是常见边界问题。' },
        ],
    ],
    oop: [
        [
            { id: 'oop-1-1', question: '类通常用来描述什么？', options: ['一类对象的属性和行为', '一个颜色值', '一张图片', '一个快捷键'], answer: 0, explanation: '类是对象的模板，描述数据和相关行为。' },
            { id: 'oop-1-2', question: '封装的价值是什么？', options: ['隔离内部实现和外部使用', '暴露所有细节', '阻止复用', '删除接口'], answer: 0, explanation: '封装能减少内部变化对外部代码的影响。' },
        ],
        [
            { id: 'oop-2-1', question: '对象建模时应优先识别什么？', options: ['对象职责和它们的关系', '按钮圆角', '视频码率', '字体文件'], answer: 0, explanation: '建模关注对象承担什么职责以及如何协作。' },
            { id: 'oop-2-2', question: '接口设计清楚有什么好处？', options: ['调用者更容易正确使用对象', '让方法不可见', '让数据丢失', '增加随机性'], answer: 0, explanation: '稳定清晰的接口能降低使用和维护成本。' },
        ],
    ],
    recursion: [
        [
            { id: 'recursion-1-1', question: '递归问题必须包含什么？', options: ['终止条件', '无限调用', '隐藏输入', '删除返回值'], answer: 0, explanation: '没有终止条件，递归会无限调用直到出错。' },
            { id: 'recursion-1-2', question: '递归拆解的关键是什么？', options: ['把问题变成更小的同类问题', '把代码写成一行', '禁用函数', '只用全局变量'], answer: 0, explanation: '递归通过解决更小规模的同类问题来解决整体问题。' },
        ],
        [
            { id: 'recursion-2-1', question: '递归练习中常见错误是什么？', options: ['终止条件不完整', '变量名太短', '颜色不统一', '按钮太多'], answer: 0, explanation: '终止条件和规模缩小规则不正确会导致无限递归或错误结果。' },
            { id: 'recursion-2-2', question: '边界条件测试用于确认什么？', options: ['最小输入和特殊输入是否正确', '图片是否清晰', '页面是否居中', '文件是否压缩'], answer: 0, explanation: '边界测试能发现普通样例不容易暴露的问题。' },
        ],
    ],
};

const completeMatchingVideoTasks = (subjectId) => {
    try {
        const taskKey = getUserScopedStorageKey('snowwave-today-tasks');
        const savedTasks = JSON.parse(localStorage.getItem(taskKey) || '[]');
        if (!savedTasks.length) return;
        const nextTasks = savedTasks.map(task => {
            const isMatchingVideoTask = task.actionType === 'video' && task.path?.includes(`subject=${subjectId}`);
            return isMatchingVideoTask ? { ...task, completed: true, status: '已完成' } : task;
        });
        localStorage.setItem(taskKey, JSON.stringify(nextTasks));
        window.dispatchEvent(new Event('snowwave-tasks-updated'));
    } catch {
        // Ignore local progress write failures; video playback should not be interrupted.
    }
};

export default function LearningVideo() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const videoProgressRef = useRef({ subjectId: '', lessonKey: '', lastTime: 0 });
    const videoRef = useRef(null);
    const subjectId = searchParams.get('subject') || 'cs50';
    const subject = subjects.find(item => item.id === subjectId) || subjects[0];
    const userSubject = getUserSubjectStats(subject);
    const lessons = useMemo(() => lessonCatalog[subject.id] || lessonCatalog.cs50, [subject.id]);
    const initialLesson = Math.min(
        Math.max(Number.parseInt(searchParams.get('lesson') || '0', 10) || 0, 0),
        Math.max(lessons.length - 1, 0),
    );
    const [selectedLesson, setSelectedLesson] = useState(0);
    const [activePanel, setActivePanel] = useState('video');
    const [discussionStore, setDiscussionStore] = useState(loadDiscussionStore);
    const [localProfile] = useState(loadCurrentProfile);
    const [commentDraft, setCommentDraft] = useState('');
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const activeLesson = searchParams.has('lesson') ? initialLesson : Math.min(selectedLesson, Math.max(lessons.length - 1, 0));
    const currentLesson = lessons[activeLesson] || lessons[0];
    const currentQuestions = lessonPracticeCatalog[subject.id]?.[activeLesson] || [];
    const discussionKey = `${subject.id}-${activeLesson}`;
    const comments = discussionStore[discussionKey] || [];
    const buildVideoProgressEntry = (currentTime, duration = videoRef.current?.duration || 0) => ({
        subjectId: subject.id,
        lessonIndex: activeLesson,
        lessonKey: discussionKey,
        title: currentLesson.title,
        course: subject.name,
        currentTime: Number(currentTime || 0),
        duration: Number.isFinite(duration) ? Number(duration || 0) : 0,
        updatedAt: Date.now(),
    });
    const persistVideoProgress = (currentTime, duration, markComplete = false) => {
        const progress = loadVideoProgress();
        const previous = progress[discussionKey];
        const completed = markComplete || Boolean(previous?.completed)
            || isVideoComplete(previous?.currentTime, previous?.duration || duration)
            || isVideoComplete(currentTime, duration);
        progress[discussionKey] = {
            ...buildVideoProgressEntry(currentTime, duration),
            ...(completed ? { completed: true, completedAt: previous?.completedAt || Date.now() } : {}),
        };
        saveVideoProgress(progress);
        if (completed && !previous?.completed) completeMatchingVideoTasks(subject.id);
    };
    useEffect(() => {
        videoProgressRef.current = { subjectId: subject.id, lessonKey: discussionKey, lastTime: 0 };
    }, [subject.id, discussionKey]);
    const recordVideoProgress = (event) => {
        const currentTime = event.currentTarget.currentTime || 0;
        const tracker = videoProgressRef.current;
        const delta = currentTime - tracker.lastTime;
        tracker.lastTime = currentTime;
        setPlaybackPosition(currentTime);
        persistVideoProgress(currentTime, event.currentTarget.duration);
        if (delta > 0 && delta <= 5) {
            recordStudySeconds(subject.id, delta);
        }
    };
    const restoreVideoPosition = (event) => {
        const video = event.currentTarget;
        const saved = loadVideoProgress()[discussionKey];
        const savedTime = readSavedVideoTime(saved);
        const wasCompleted = Boolean(saved?.completed) || isVideoComplete(savedTime, saved?.duration || video.duration);
        if (wasCompleted && !saved?.completed) persistVideoProgress(video.duration, video.duration, true);
        const nextTime = !wasCompleted && savedTime > 0 && savedTime < Math.max(video.duration - 1, 0) ? savedTime : 0;
        if (nextTime > 0) video.currentTime = nextTime;
        setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
        setPlaybackPosition(nextTime);
        videoProgressRef.current.lastTime = nextTime;
    };
    const saveCurrentVideoPosition = (event) => {
        setPlaybackPosition(event.currentTarget.currentTime || 0);
        persistVideoProgress(event.currentTarget.currentTime || 0, event.currentTarget.duration);
    };
    const syncSeekingPosition = (event) => {
        const nextTime = event.currentTarget.currentTime || 0;
        videoProgressRef.current.lastTime = nextTime;
        setPlaybackPosition(nextTime);
        persistVideoProgress(nextTime, event.currentTarget.duration);
    };
    const seekVideo = (event) => {
        const nextTime = Number(event.target.value) || 0;
        if (!videoRef.current) return;
        videoRef.current.currentTime = nextTime;
        videoProgressRef.current.lastTime = nextTime;
        setPlaybackPosition(nextTime);
        persistVideoProgress(nextTime, videoRef.current.duration);
    };
    const completeVideo = (event) => {
        const duration = event.currentTarget.duration || videoDuration || 0;
        persistVideoProgress(duration, duration, true);
        setPlaybackPosition(duration);
    };
    const submitComment = (event) => {
        event.preventDefault();
        const text = commentDraft.trim();
        if (!text) return;
        const nextComment = {
            id: `local-${Date.now()}`,
            userId: 'me',
            createdAt: Date.now(),
            text,
        };
        const nextStore = {
            ...discussionStore,
            [discussionKey]: [nextComment, ...comments],
        };
        setDiscussionStore(nextStore);
        saveDiscussionStore(nextStore);
        setCommentDraft('');
    };
    const goUserProfile = (user) => {
        if (user.id === 'me') {
            navigate('/profile');
            return;
        }
        navigate(`/user-profile?user=${encodeURIComponent(user.id)}`);
    };
    const currentUser = {
        id: 'me',
        name: localProfile.nickname,
        avatar: localProfile.nickname.slice(0, 1) || '',
        avatarImage: localProfile.avatarPreview,
        focus: userSubject.name,
        stats: `当前进度 ${userSubject.progress}%`,
    };
    const getCommentUser = (userId) => userId === 'me' ? currentUser : discussionUsers[userId] || discussionUsers.lin;

    return (
        <div className="learning-video-page">
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <h1>{subject.name}学习视频</h1>
                    <p>继续学习：{currentLesson.title}</p>
                </div>
                <Link to={`/learning-path?subject=${subject.id}`} className="btn btn-secondary">
                    查看学习路径
                </Link>
            </div>

            <div className="learning-video-layout">
                <section className="video-stage">
                    <div className="lesson-mode-tabs" aria-label="课程内容切换">
                        <button type="button" className={activePanel === 'video' ? 'active' : ''} onClick={() => setActivePanel('video')}>视频</button>
                        <button type="button" className={activePanel === 'practice' ? 'active' : ''} onClick={() => setActivePanel('practice')}>习题</button>
                    </div>
                    {activePanel === 'video' ? (
                        <>
                            <div className="video-screen">
                                <video
                                    ref={videoRef}
                                    key={`${subject.id}-${activeLesson}-${currentLesson.localSrc}`}
                                    src={currentLesson.localSrc}
                                    title={currentLesson.title}
                                    controls
                                    preload="metadata"
                                    onTimeUpdate={recordVideoProgress}
                                    onLoadedMetadata={restoreVideoPosition}
                                    onDurationChange={(event) => setVideoDuration(event.currentTarget.duration || 0)}
                                    onSeeking={syncSeekingPosition}
                                    onPause={saveCurrentVideoPosition}
                                    onEnded={completeVideo}
                                />
                            </div>
                            <div className="video-time-control">
                                <input type="range" min="0" max={Math.max(videoDuration, 1)} step="0.1" value={Math.min(playbackPosition, videoDuration || 0)} onChange={seekVideo} aria-label="视频播放进度" />
                                <span>{formatVideoTime(playbackPosition)} / {formatVideoTime(videoDuration)}</span>
                            </div>
                            <div className="video-meta-row">
                                <div>
                                    <h2>{currentLesson.title}</h2>
                                    <p>{userSubject.name} · MIT OpenCourseWare 本地短视频 · {currentLesson.duration}</p>
                                </div>
                                <span>{userSubject.progress}%</span>
                            </div>
                            <div className="progress-bar-outer">
                                <div className="progress-bar-inner" style={{ width: `${userSubject.progress}%`, background: 'var(--accent-blue)' }} />
                            </div>
                            <section className="video-comments">
                                <div className="video-comments-heading">
                                    <div>
                                        <h2>评论区</h2>
                                        <p>围绕这节视频提问、补充笔记或者交流学习方法。</p>
                                    </div>
                                    <span>{comments.length} 条评论</span>
                                </div>
                                <form className="video-comment-form" onSubmit={submitComment}>
                                    <button className="comment-avatar comment-avatar-current" type="button" onClick={() => goUserProfile(currentUser)} aria-label="查看我的个人中心">
                                        {currentUser.avatarImage ? <img src={currentUser.avatarImage} alt="" /> : currentUser.avatar}
                                    </button>
                                    <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="写下你的问题、笔记或补充..." />
                                    <button type="submit">发布</button>
                                </form>
                                <div className="video-comment-list">
                                    {comments.length ? comments.map(comment => {
                                        const user = getCommentUser(comment.userId);
                                        return (
                                            <article className="video-comment" key={comment.id}>
                                                <button className="comment-avatar" type="button" onClick={() => goUserProfile(user)} aria-label={`查看${user.name}主页`}>
                                                    {user.avatarImage ? <img src={user.avatarImage} alt="" /> : user.avatar}
                                                </button>
                                                <div>
                                                    <button className="comment-user-name" type="button" onClick={() => goUserProfile(user)}>{user.name}</button>
                                                    <span>{formatRelativeTime(comment.createdAt, comment.time)}</span>
                                                    <p>{comment.text}</p>
                                                </div>
                                            </article>
                                        );
                                    }) : (
                                        <div className="messages-empty-state">
                                            <strong>暂无评论</strong>
                                            <p>发布第一条评论后，只会保存在当前账号下。</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    ) : (
                        <CoursePractice
                            key={`${subject.id}-${activeLesson}`}
                            subject={subject}
                            questions={currentQuestions}
                            practiceLabel="视频习题"
                            practiceTitle={currentLesson.title}
                        />
                    )}
                </section>

                <aside className="video-lesson-panel">
                    <h2>课程目录</h2>
                    <div className="video-lesson-list">
                        {lessons.map((lesson, index) => (
                            <button
                                key={`${lesson.title}-${lesson.localSrc}`}
                                type="button"
                                className={activeLesson === index ? 'active' : ''}
                                onClick={() => setSelectedLesson(index)}
                            >
                                <span>{String(index + 1).padStart(2, '0')}</span>
                                <strong>{lesson.title}</strong>
                                <small>本地视频<br />{lesson.duration}</small>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}
