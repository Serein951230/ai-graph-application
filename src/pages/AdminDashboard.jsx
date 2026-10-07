import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { childrenData, subjects } from '../data/mockData';
import { lmsCourses, lmsLessons, lmsRoleLabels, lmsUsers } from '../data/lmsIntegration';

const tabs = [
    { id: 'students', label: '用户管理', icon: '♙' },
    { id: 'courses', label: '课程管理', icon: '▤' },
    { id: 'addCourse', label: '添加课程', icon: '+' },
    { id: 'progress', label: '学习进度', icon: '▥' },
    { id: 'notices', label: '发送通知', icon: '♧' },
];

const loadAdminCourses = () => {
    try {
        return JSON.parse(localStorage.getItem('snowwave-admin-added-courses') || '[]');
    } catch {
        return [];
    }
};

const managedCoursesKey = 'snowwave-admin-managed-courses';
const adminNoticesKey = 'snowwave-admin-notices';
const adminAutoNoticeKey = 'snowwave-admin-auto-notices';
const adminUsersKey = 'snowwave-admin-users';

function loadRegisteredPlatformUsers() {
    try {
        const registeredUsers = JSON.parse(localStorage.getItem('snowwave-users') || '[]');
        return registeredUsers.map(user => ({
            id: user.id,
            name: user.nickname || user.name || user.email || user.phone || '未命名用户',
            email: user.email || user.contact || '',
            role: user.role || 'user',
            status: user.status || '学习中',
            lastActive: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '尚未登录',
        }));
    } catch {
        return [];
    }
}

function loadPlatformUsers() {
    const merged = [...lmsUsers, ...loadRegisteredPlatformUsers()];
    return merged.filter((user, index) => merged.findIndex(item => item.email && item.email === user.email) === index || (!user.email && merged.findIndex(item => item.id === user.id) === index));
}

function normalizeAdminUser(user) {
    return {
        ...user,
        id: user.id || user.email || user.phone || user.name || 'local-user',
        name: user.name || user.nickname || user.email || '未命名用户',
        email: user.email || user.contact || '',
        role: user.role || 'user',
        status: user.status || '学习中',
        accountStatus: user.accountStatus || (user.status === '已启用' ? '正常' : user.status || '正常'),
        lastActive: user.lastActive || '尚未登录',
    };
}

const makeLesson = (index = 0) => ({
    id: `lesson-${Date.now()}-${index}`,
    title: index === 0 ? '' : `第 ${index + 1} 节课`,
    videoUrl: '',
    exercise: buildAutoExercise(index === 0 ? '第一节课' : `第 ${index + 1} 节课`),
});

function buildAutoExercise(lessonTitle = '本节课') {
    return `1. ${lessonTitle} 的核心概念是什么？\nA. 只记住标题\nB. 理解关键概念并能举例说明\nC. 跳过视频\n答案：B\n解析：课后习题会根据课时标题自动生成基础检查题，后续可手动修改。`;
}

function loadAdminUsers() {
    try {
        const saved = JSON.parse(localStorage.getItem(adminUsersKey) || '[]');
        if (saved.length) {
            const savedKeys = new Set(saved.map(user => user.id || user.email));
            const merged = [...saved, ...loadPlatformUsers().filter(user => !savedKeys.has(user.id) && !savedKeys.has(user.email))];
            return merged.map(normalizeAdminUser);
        }
    } catch {
        // Fall back to seed users.
    }
    return loadPlatformUsers().map(normalizeAdminUser);
}

function saveAdminUsers(users) {
    localStorage.setItem(adminUsersKey, JSON.stringify(users));
    window.dispatchEvent(new Event('snowwave-admin-data'));
}

const normalizeManagedCourse = (course, source = 'system') => ({
    id: course.id,
    avatar: course.avatar || '课',
    title: course.title || '',
    category: course.category || '课程路径',
    description: course.description || '',
    owner: course.owner || '课程管理员',
    users: course.users || 0,
    lessons: course.lessons || 0,
    materials: course.materials || 0,
    status: course.status || '已上线',
    source,
});

const loadManagedCourses = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(managedCoursesKey) || '[]');
        if (saved.length) return saved;
    } catch {
        // Fall back to initial data.
    }
    return [
        ...lmsCourses.map(course => normalizeManagedCourse(course, 'system')),
        ...loadAdminCourses().map(course => normalizeManagedCourse({
            ...course,
            description: course.description,
            lessons: course.firstLesson ? 1 : 0,
            materials: course.videoUrl && course.videoUrl !== '待上传' ? 1 : 0,
            status: '整理中',
        }, 'admin')),
    ];
};

const saveManagedCourses = courses => {
    localStorage.setItem(managedCoursesKey, JSON.stringify(courses));
    window.dispatchEvent(new Event('snowwave-admin-data'));
};

const noticeTemplates = [
    { id: 'course', label: '课程更新', title: '课程内容已更新', content: '新的课程资料已经上线，请进入课程中心查看并安排本周学习。' },
    { id: 'achievement', label: '成就达成', title: '你获得了新的学习成就', content: '系统检测到你已完成阶段目标，请到我的成就查看勋章和进度。' },
    { id: 'plan', label: '学习提醒', title: '今日学习计划提醒', content: '你还有学习任务未完成，建议先完成视频学习，再做对应练习题。' },
    { id: 'database', label: '资料入库', title: '资料已进入知识库', content: '管理员上传的课程资料已完成整理，AI 答疑会优先检索这些内容。' },
];

const autoNoticeRules = [
    { id: 'courseUpdated', label: '课程更新后自动通知选中对象' },
    { id: 'achievementUnlocked', label: '用户达成成就后自动提醒' },
    { id: 'inactiveReminder', label: '超过 24 小时未学习时自动提醒' },
];

const emptyCourseForm = {
    avatar: '',
    avatarPreview: '',
    title: '',
    category: '',
    description: '',
    lessons: [makeLesson()],
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('students');
    const [noticeSent, setNoticeSent] = useState(false);
    const [dataVersion, setDataVersion] = useState(0);
    const managedCourses = useMemo(() => { void dataVersion; return loadManagedCourses(); }, [dataVersion]);
    const adminUsers = useMemo(() => { void dataVersion; return loadAdminUsers(); }, [dataVersion]);
    const lmsStats = useMemo(() => ({
        admins: adminUsers.filter(user => user.role === 'admin').length,
        users: adminUsers.filter(user => user.role === 'user').length,
        lessons: lmsLessons.length + managedCourses.filter(course => course.source === 'admin').reduce((total, course) => total + Number(course.lessons || 0), 0),
        indexed: lmsLessons.filter(lesson => lesson.indexed).length + managedCourses.filter(course => course.source === 'admin').reduce((total, course) => total + Number(course.materials || 0), 0),
    }), [adminUsers, managedCourses]);
    const students = useMemo(() => [
        ...childrenData,
        { id: 2, name: '乔同学', avatar: '乔', grade: '高一', weeklyHours: 12.6, lastActive: '今天 17:05', subjectScores: [{ subject: '前端开发', score: 66 }, { subject: '后端开发', score: 74 }] },
        { id: 3, name: '陈同学', avatar: '陈', grade: '高二', weeklyHours: 16.2, lastActive: '昨天 20:12', subjectScores: [{ subject: '软件开发', score: 81 }, { subject: 'AI 应用', score: 78 }] },
    ], []);
    useEffect(() => {
        if (sessionStorage.getItem('snowwave-admin') !== 'signed-in') {
            navigate('/admin/login', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        const refresh = () => setDataVersion(current => current + 1);
        window.addEventListener('snowwave-admin-data', refresh);
        return () => window.removeEventListener('snowwave-admin-data', refresh);
    }, []);

    const signOut = () => {
        sessionStorage.removeItem('snowwave-admin');
        navigate('/admin/login');
    };

    return (
        <div className="admin-shell">
            <header className="admin-header">
                <Link to="/admin" className="admin-brand"><span className="admin-brand-icon">管</span><span><strong>管理后台</strong><small>AI图谱应用</small></span></Link>
                <div className="admin-header-actions">
                    <button className="admin-signout" onClick={signOut}>退出登录</button>
                </div>
            </header>

            <main className="admin-main">
                <div className="admin-page-heading"><div><p className="admin-kicker">CONTROL CENTER</p><h1>管理后台</h1><p>集中查看课程、用户、上传资料和学习进度。</p></div><span className="admin-status">管理员/用户权限</span></div>

                <section className="admin-stat-grid">
                    <AdminStat tone="users" value={lmsStats.users} label="用户账号" detail="学习用户" trend={`${lmsStats.users} 个有效`} />
                    <AdminStat tone="admins" value={lmsStats.admins} label="管理员账号" detail="课程与资料维护" trend="权限正常" />
                    <AdminStat tone="courses" value={managedCourses.length} label="课程总数" detail="课程路径" trend={`${managedCourses.length} 条路径`} />
                    <AdminStat tone="materials" value={`${lmsStats.indexed}/${lmsStats.lessons}`} label="资料已入库" detail="可供 AI 检索" trend={`${lmsStats.lessons ? Math.round((lmsStats.indexed / lmsStats.lessons) * 100) : 0}%`} />
                </section>

                <section className="admin-panel">
                    <nav className="admin-tabs" aria-label="管理模块">
                        {tabs.map(tab => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => { setActiveTab(tab.id); setNoticeSent(false); }}><span>{tab.icon}</span>{tab.label}</button>)}
                    </nav>
                    <div className="admin-panel-content">
                        {activeTab === 'students' && <StudentsTable students={students} lmsUsers={adminUsers} />}
                        {activeTab === 'courses' && <CoursesTable />}
                        {activeTab === 'addCourse' && <AddCoursePanel />}
                        {activeTab === 'progress' && <ProgressTable students={students} />}
                        {activeTab === 'notices' && <NoticePanel students={students} lmsUsers={adminUsers} noticeSent={noticeSent} onSend={() => setNoticeSent(true)} />}
                    </div>
                </section>
            </main>
        </div>
    );
}

function AdminStat({ tone, value, label, detail, trend }) {
    return (
        <div className={`admin-stat admin-stat-${tone}`}>
            <span className="admin-stat-icon" aria-hidden="true">
                <i />
            </span>
            <div className="admin-stat-body">
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
            </div>
            <em>{trend}</em>
        </div>
    );
}

function StudentsTable({ students, lmsUsers }) {
    const [confirmingId, setConfirmingId] = useState('');
    const users = lmsUsers;

    const persistUsers = (nextUsers) => {
        saveAdminUsers(nextUsers);
    };

    const toggleBan = (user) => {
        if (user.role === 'admin') return;
        const nextStatus = user.accountStatus === '已封禁' ? '正常' : '已封禁';
        persistUsers(users.map(item => item.id === user.id ? { ...item, accountStatus: nextStatus } : item));
    };

    const deleteUser = (user) => {
        if (user.role === 'admin') return;
        if (confirmingId !== user.id) {
            setConfirmingId(user.id);
            return;
        }
        persistUsers(users.filter(item => item.id !== user.id));
        setConfirmingId('');
    };

    return (
        <div>
            <div className="admin-section-heading"><div><h2>账号管理</h2><p>管理员负责课程与资料维护，用户可以被封禁或注销；注销前需要二次确认。</p></div><button className="btn btn-primary" type="button">+ 添加账号</button></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>账号</th><th>邮箱</th><th>角色</th><th>状态</th><th>最后活跃</th><th>操作</th></tr></thead><tbody>{users.map(user => {
                const status = user.accountStatus || user.status || '正常';
                return <tr key={user.id}>
                    <td><span className="student-avatar">{user.name.slice(0, 1)}</span><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td><span className="admin-tag">{lmsRoleLabels[user.role]}</span></td>
                    <td><span className={status === '已封禁' ? 'admin-status-banned' : 'admin-status-normal'}>{status}</span></td>
                    <td>{user.lastActive}</td>
                    <td><div className="admin-account-actions">{user.role === 'admin' ? <span className="admin-muted-action">管理员</span> : <><button className="table-action" type="button" onClick={() => toggleBan(user)}>{status === '已封禁' ? '解除封禁' : '封禁'}</button><button className="table-action danger" type="button" onClick={() => deleteUser(user)}>{confirmingId === user.id ? '确认注销' : '注销'}</button></>}</div></td>
                </tr>;
            })}</tbody></table></div>
            <div className="admin-subsection"><h3>用户学习快照</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>年级</th><th>本周学习</th><th>最后活跃</th><th>操作</th></tr></thead><tbody>{students.map(student => <tr key={student.id}><td><span className="student-avatar">{student.avatar}</span><strong>{student.name}</strong></td><td>{student.grade}</td><td>{student.weeklyHours} 小时</td><td>{student.lastActive}</td><td><button className="table-action" type="button">查看详情</button></td></tr>)}</tbody></table></div></div>
        </div>
    );
}

function CoursesTable() {
    const [courses, setCourses] = useState(loadManagedCourses);
    const [editing, setEditing] = useState(false);
    const [savedCourseId, setSavedCourseId] = useState('');

    const persistCourses = (nextCourses) => {
        setCourses(nextCourses);
        saveManagedCourses(nextCourses);
    };

    const updateCourse = (courseId, field, value) => {
        const normalizedValue = ['users', 'lessons', 'materials'].includes(field) ? Math.max(0, Number(value) || 0) : value;
        const nextCourses = courses.map(course => course.id === courseId ? { ...course, [field]: normalizedValue } : course);
        persistCourses(nextCourses);
        setSavedCourseId(courseId);
    };

    const deleteCourse = (courseId) => {
        persistCourses(courses.filter(course => course.id !== courseId));
        setSavedCourseId('');
    };

    return (
        <div>
            <div className="admin-section-heading">
                <div>
                    <h2>课程管理</h2>
                    <p>课程、课时和资料统一在这里维护；资料会作为课程内容和 AI 答疑检索来源。</p>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => setEditing(current => !current)}>
                    {editing ? '完成管理' : '管理课程'}
                </button>
            </div>

            {!editing ? (
                <>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead><tr><th>课程</th><th>说明</th><th>负责人</th><th>用户</th><th>课时/资料</th><th>状态</th></tr></thead>
                            <tbody>{courses.map(course => (
                                <tr key={course.id}>
                                    <td><span className="course-icon">{course.avatar || '课'}</span><strong>{course.title}</strong></td>
                                    <td>{course.description}</td>
                                    <td>{course.owner}</td>
                                    <td>{course.users} 人</td>
                                    <td>{course.lessons} / {course.materials}</td>
                                    <td><span className="admin-tag">{course.status}</span></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    <div className="admin-subsection">
                        <h3>前端课程展示映射</h3>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead><tr><th>课程</th><th>难度</th><th>主题数</th><th>平均进度</th><th>状态</th></tr></thead>
                                <tbody>{subjects.map(course => <tr key={course.id}><td><span className="course-icon">{course.icon}</span><strong>{course.name}</strong></td><td>{course.difficulty}</td><td>{course.totalTopics}</td><td><div className="mini-progress"><i style={{ width: `${course.progress}%` }} /></div><span>{course.progress}%</span></td><td><span className="admin-tag">已上线</span></td></tr>)}</tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="admin-course-manage-list">
                    {courses.length ? courses.map(course => (
                        <div className="admin-course-manage-card" key={course.id}>
                            <label className="admin-course-avatar-field">
                                <span>图标</span>
                                <input value={course.avatar || ''} onChange={(event) => updateCourse(course.id, 'avatar', event.target.value)} placeholder="课" />
                            </label>
                            <div className="admin-course-manage-fields">
                                <label>
                                    <span>课程名称</span>
                                    <input value={course.title || ''} onChange={(event) => updateCourse(course.id, 'title', event.target.value)} />
                                </label>
                                <label>
                                    <span>负责人</span>
                                    <input value={course.owner || ''} onChange={(event) => updateCourse(course.id, 'owner', event.target.value)} />
                                </label>
                                <label className="admin-course-form-wide">
                                    <span>课程资料说明</span>
                                    <textarea value={course.description || ''} onChange={(event) => updateCourse(course.id, 'description', event.target.value)} />
                                </label>
                                <label>
                                    <span>用户数</span>
                                    <input type="number" value={course.users || 0} onChange={(event) => updateCourse(course.id, 'users', event.target.value)} />
                                </label>
                                <label>
                                    <span>课时数</span>
                                    <input type="number" value={course.lessons || 0} onChange={(event) => updateCourse(course.id, 'lessons', event.target.value)} />
                                </label>
                                <label>
                                    <span>资料数</span>
                                    <input type="number" value={course.materials || 0} onChange={(event) => updateCourse(course.id, 'materials', event.target.value)} />
                                </label>
                                <label>
                                    <span>状态</span>
                                    <select value={course.status || '已上线'} onChange={(event) => updateCourse(course.id, 'status', event.target.value)}>
                                        <option value="已上线">已上线</option>
                                        <option value="整理中">整理中</option>
                                        <option value="待审核">待审核</option>
                                        <option value="已下架">已下架</option>
                                    </select>
                                </label>
                            </div>
                            <div className="admin-course-manage-actions">
                                {savedCourseId === course.id && <span>已保存</span>}
                                <button className="table-action danger" type="button" onClick={() => deleteCourse(course.id)}>删除课程</button>
                            </div>
                        </div>
                    )) : (
                        <div className="admin-empty-state">
                            <strong>还没有课程</strong>
                            <span>可以先到“添加课程”新增课程。</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function AddCoursePanel() {
    const [form, setForm] = useState(emptyCourseForm);
    const [courses, setCourses] = useState(loadAdminCourses);
    const [saved, setSaved] = useState(false);

    const updateField = (field, value) => {
        setSaved(false);
        setForm(current => ({ ...current, [field]: value }));
    };

    const updateLesson = (lessonId, field, value) => {
        setSaved(false);
        setForm(current => ({
            ...current,
            lessons: current.lessons.map(lesson => {
                if (lesson.id !== lessonId) return lesson;
                if (field === 'title') return { ...lesson, title: value, exercise: buildAutoExercise(value.trim() || '本节课') };
                return { ...lesson, [field]: value };
            }),
        }));
    };

    const addLesson = () => {
        setSaved(false);
        setForm(current => ({ ...current, lessons: [...current.lessons, makeLesson(current.lessons.length)] }));
    };

    const removeLesson = (lessonId) => {
        setSaved(false);
        setForm(current => ({ ...current, lessons: current.lessons.length > 1 ? current.lessons.filter(lesson => lesson.id !== lessonId) : current.lessons }));
    };

    const selectAvatar = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setForm(current => ({ ...current, avatar: file.name, avatarPreview: reader.result }));
        reader.readAsDataURL(file);
    };

    const addCourse = (event) => {
        event.preventDefault();
        if (!form.title.trim()) return;
        const nextCourse = {
            id: `admin-course-${Date.now()}`,
            avatar: form.avatar.trim() || '课',
            avatarPreview: form.avatarPreview,
            title: form.title.trim(),
            category: form.category.trim() || '未分类',
            description: form.description.trim() || '暂无课程介绍',
            lessons: form.lessons.map((lesson, index) => ({
                ...lesson,
                title: lesson.title.trim() || `第 ${index + 1} 节课`,
                videoUrl: lesson.videoUrl.trim() || '待上传',
                exercise: lesson.exercise.trim() || buildAutoExercise(lesson.title.trim() || `第 ${index + 1} 节课`),
            })),
            createdAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        };
        nextCourse.firstLesson = nextCourse.lessons[0].title;
        nextCourse.videoUrl = nextCourse.lessons[0].videoUrl;
        nextCourse.exercise = nextCourse.lessons[0].exercise;
        const nextCourses = [nextCourse, ...courses];
        setCourses(nextCourses);
        localStorage.setItem('snowwave-admin-added-courses', JSON.stringify(nextCourses));
        saveManagedCourses([normalizeManagedCourse({
            ...nextCourse,
            lessons: nextCourse.lessons.length,
            materials: nextCourse.lessons.filter(lesson => lesson.videoUrl && lesson.videoUrl !== '待上传').length,
            status: '整理中',
        }, 'admin'), ...loadManagedCourses()]);
        setForm(emptyCourseForm);
        setSaved(true);
    };

    return (
        <div>
            <div className="admin-section-heading">
                <div>
                    <h2>添加课程</h2>
                    <p>在这里录入课程、学习视频地址和课后习题，后续可接入真实课程接口。</p>
                </div>
                {saved && <span className="admin-status">课程已保存</span>}
            </div>

            <form className="admin-course-form" onSubmit={addCourse}>
                <div className="admin-course-avatar-picker">
                    <span>课程头像</span>
                    <label className="admin-file-picker">
                        {form.avatarPreview ? <img src={form.avatarPreview} alt="课程头像预览" /> : <span className="admin-avatar-placeholder">上传图片</span>}
                        <input className="admin-course-file-input" type="file" accept="image/*" onChange={selectAvatar} />
                    </label>
                    <input value={form.avatar} onChange={(event) => updateField('avatar', event.target.value)} placeholder="没有图片时可填文字" />
                </div>
                <label>
                    <span>课程名称</span>
                    <input value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="例如：历史基础课" />
                </label>
                <label>
                    <span>课程方向</span>
                    <input value={form.category} onChange={(event) => updateField('category', event.target.value)} placeholder="例如：软件开发 / 前端 / AI" />
                </label>
                <label className="admin-course-form-wide">
                    <span>课程介绍</span>
                    <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="写课程简介、适合人群和学习目标" />
                </label>
                <div className="admin-course-form-wide admin-lesson-list">
                    <div className="admin-lesson-list-heading"><div><strong>课程章节</strong><span>每增加一节，系统会自动生成一份基础课后练习，可继续编辑。</span></div><button className="table-action" type="button" onClick={addLesson}>+ 添加一节</button></div>
                    {form.lessons.map((lesson, index) => <section className="admin-lesson-card" key={lesson.id}>
                        <div className="admin-lesson-card-head"><strong>第 {index + 1} 节</strong><button className="table-action danger" type="button" onClick={() => removeLesson(lesson.id)} disabled={form.lessons.length === 1}>删除</button></div>
                        <label><span>课时标题</span><input value={lesson.title} onChange={(event) => updateLesson(lesson.id, 'title', event.target.value)} placeholder={`例如：第 ${index + 1} 节课`} /></label>
                        <label><span>学习视频地址</span><input value={lesson.videoUrl} onChange={(event) => updateLesson(lesson.id, 'videoUrl', event.target.value)} placeholder="/uploads/lesson.mp4 或视频链接" /></label>
                        <label className="admin-course-form-wide"><span>课后习题</span><textarea value={lesson.exercise} onChange={(event) => updateLesson(lesson.id, 'exercise', event.target.value)} /></label>
                    </section>)}
                </div>
                <div className="admin-course-form-actions">
                    <button className="btn btn-primary" type="submit">+ 添加课程</button>
                </div>
            </form>

            <div className="admin-subsection">
                <h3>已添加课程</h3>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>课程</th><th>方向</th><th>章节数</th><th>已填视频</th><th>自动习题</th><th>添加时间</th></tr></thead>
                        <tbody>
                            {courses.length ? courses.map(course => (
                                <tr key={course.id}>
                                    <td><span className="course-icon">{course.avatar || '课'}</span><strong>{course.title}</strong></td>
                                    <td>{course.category}</td>
                                    <td>{course.lessons?.length || 1}</td>
                                    <td>{course.lessons?.filter(lesson => lesson.videoUrl && lesson.videoUrl !== '待上传').length || (course.videoUrl && course.videoUrl !== '待上传' ? 1 : 0)}</td>
                                    <td>{course.lessons?.every(lesson => lesson.exercise) ? '已生成' : '待补充'}</td>
                                    <td>{course.createdAt}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6">还没有添加课程。</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ProgressTable({ students }) {
    return <div><div className="admin-section-heading"><div><h2>学习进度</h2><p>按用户查看各课程的完成情况。</p></div><button className="table-action">导出报告</button></div><div className="admin-progress-list">{students.map(student => <div className="admin-progress-row" key={student.id}><div className="student-summary"><span className="student-avatar">{student.avatar}</span><div><strong>{student.name}</strong><small>{student.grade} · 本周 {student.weeklyHours} 小时</small></div></div><div className="admin-progress-subjects">{student.subjectScores.map(item => <div key={item.subject}><span>{item.subject}</span><div className="mini-progress"><i style={{ width: `${item.score}%` }} /></div><b>{item.score}%</b></div>)}</div></div>)}</div></div>;
}

function NoticePanel({ lmsUsers: platformUsers, noticeSent, onSend }) {
    const recipients = useMemo(() => {
        const userRecipients = platformUsers.filter(user => user.role === 'user' && user.accountStatus !== '已封禁').map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            meta: user.email || '本地账号',
        }));
        return userRecipients.filter((item, index) => userRecipients.findIndex(other => other.id === item.id || (item.email && other.email === item.email)) === index);
    }, [platformUsers]);
    const [selectedRecipients, setSelectedRecipients] = useState(() => recipients.slice(0, 2).map(item => item.id));
    const [title, setTitle] = useState(noticeTemplates[0].title);
    const [content, setContent] = useState(noticeTemplates[0].content);
    const [autoRules, setAutoRules] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(adminAutoNoticeKey) || '["courseUpdated","achievementUnlocked"]');
        } catch {
            return ['courseUpdated', 'achievementUnlocked'];
        }
    });
    const [sentNotices, setSentNotices] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(adminNoticesKey) || '[]');
        } catch {
            return [];
        }
    });

    const applyTemplate = (template) => {
        setTitle(template.title);
        setContent(template.content);
    };

    const toggleRecipient = (recipientId) => {
        setSelectedRecipients(current => (
            current.includes(recipientId)
                ? current.filter(id => id !== recipientId)
                : [...current, recipientId]
        ));
    };

    const toggleAutoRule = (ruleId) => {
        setAutoRules(current => {
            const next = current.includes(ruleId) ? current.filter(id => id !== ruleId) : [...current, ruleId];
            localStorage.setItem(adminAutoNoticeKey, JSON.stringify(next));
            return next;
        });
    };

    const sendNotice = (event) => {
        event.preventDefault();
        if (!title.trim() || !content.trim() || !selectedRecipients.length) return;
        const selectedNames = recipients
            .filter(recipient => selectedRecipients.includes(recipient.id))
            .map(recipient => recipient.name);
        const nextNotice = {
            id: `notice-${Date.now()}`,
            title: title.trim(),
            content: content.trim(),
            recipients: selectedNames,
            createdAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        };
        const nextNotices = [nextNotice, ...sentNotices].slice(0, 8);
        setSentNotices(nextNotices);
        localStorage.setItem(adminNoticesKey, JSON.stringify(nextNotices));
        onSend();
    };

    return (
        <div>
            <div className="admin-section-heading">
                <div>
                    <h2>通知管理</h2>
                    <p>编辑通知内容、选择发送对象，并配置课程更新或成就达成后的自动提醒。</p>
                </div>
                {noticeSent && <span className="admin-status">通知已发送</span>}
            </div>

            <form className="admin-notice-composer" onSubmit={sendNotice}>
                <section className="admin-notice-editor">
                    <div className="admin-template-row">
                        {noticeTemplates.map(template => (
                            <button type="button" key={template.id} onClick={() => applyTemplate(template)}>
                                {template.label}
                            </button>
                        ))}
                    </div>
                    <label>
                        <span>通知标题</span>
                        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="输入通知标题" />
                    </label>
                    <label>
                        <span>通知内容</span>
                        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="输入要发送给用户的内容" />
                    </label>
                    <div className="admin-notice-actions">
                        <button className="btn btn-primary" type="submit">发送通知</button>
                    </div>
                </section>

                <aside className="admin-recipient-panel">
                    <h3>发送对象</h3>
                    <div className="admin-recipient-tools">
                        <button type="button" onClick={() => setSelectedRecipients(recipients.map(item => item.id))}>全选</button>
                        <button type="button" onClick={() => setSelectedRecipients([])}>清空</button>
                    </div>
                    <div className="admin-recipient-list">
                        {recipients.map(recipient => (
                            <label key={recipient.id}>
                                <input
                                    type="checkbox"
                                    checked={selectedRecipients.includes(recipient.id)}
                                    onChange={() => toggleRecipient(recipient.id)}
                                />
                                <span>
                                    <strong>{recipient.name}</strong>
                                    <small>{recipient.meta}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                </aside>
            </form>

            <div className="admin-notice-automation">
                <div>
                    <h3>自动发送规则</h3>
                    <p>打开后，系统在对应事件发生时自动向相关用户发送通知。</p>
                </div>
                <div className="admin-auto-rule-list">
                    {autoNoticeRules.map(rule => (
                        <label key={rule.id}>
                            <span>{rule.label}</span>
                            <input type="checkbox" checked={autoRules.includes(rule.id)} onChange={() => toggleAutoRule(rule.id)} />
                        </label>
                    ))}
                </div>
            </div>

            <div className="admin-notice-list">
                {(sentNotices.length ? sentNotices : [
                    { id: 'seed-1', title: '本周职业路径资料已更新', content: '课程资料已完成整理。', recipients: ['全部用户'], createdAt: '今天 09:00' },
                    { id: 'seed-2', title: '前端开发课程新增练习题', content: 'React 组件与状态新增练习。', recipients: ['前端学习组'], createdAt: '昨天 18:30' },
                ]).map((notice, index) => (
                    <div className="admin-notice" key={notice.id}>
                        <span className="notice-dot">{index + 1}</span>
                        <div>
                            <strong>{notice.title}</strong>
                            <small>{notice.createdAt} · {notice.recipients.join('、')}</small>
                            <p>{notice.content}</p>
                        </div>
                        <button className="table-action" type="button">查看</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

