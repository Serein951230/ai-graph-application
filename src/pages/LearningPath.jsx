import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { subjects } from '../data/mockData';
import { getUserScopedStorageKey } from '../data/learningResources';
import { getUserSubjects } from '../utils/userProgress';

const basePathCatalog = [
    {
        id: 'software-engineer',
        title: '软件开发工程师路径',
        desc: '从计算机基础到 Python、函数抽象、Git、测试和面向对象，形成完整开发基本功。',
        status: '推荐',
        filter: '推荐',
        meta: '约 122 分钟本地视频 · 7 门课程 · 适合 3-4 周入门',
        courseIds: ['cs50', 'python', 'functions', 'git', 'testing', 'oop', 'dsa'],
    },
    {
        id: 'frontend-engineer',
        title: 'Web 编程基础路径',
        desc: '围绕 Web 结构、函数组织、项目版本管理和调试能力建立前端入门路线。',
        status: '推荐',
        filter: '推荐',
        meta: '约 91 分钟本地视频 · 5 门课程 · 适合 2 周练习',
        courseIds: ['htmlcss', 'functions', 'python', 'git', 'testing'],
    },
    {
        id: 'algorithm-track',
        title: '算法与问题求解路径',
        desc: '围绕循环、递归、复杂度和问题拆解，强化解题与程序设计能力。',
        status: '进行中',
        filter: '进行中',
        meta: '约 92 分钟本地视频 · 5 门课程 · 适合反复复习',
        courseIds: ['cs50', 'dsa', 'recursion', 'functions', 'testing'],
    },
    {
        id: 'data-track',
        title: '数据处理入门路径',
        desc: '用 Python、数据处理、函数抽象和调试训练做小型数据项目。',
        status: '推荐',
        filter: '推荐',
        meta: '约 83 分钟本地视频 · 5 门课程 · 适合数据方向入门',
        courseIds: ['python', 'data', 'functions', 'dsa', 'testing'],
    },
    {
        id: 'quality-track',
        title: '代码质量提升路径',
        desc: '从 Git、测试、函数抽象到面向对象，训练可维护代码习惯。',
        status: '进行中',
        filter: '进行中',
        meta: '约 75 分钟本地视频 · 5 门课程 · 适合项目复盘',
        courseIds: ['git', 'testing', 'functions', 'oop', 'recursion'],
    },
];

const filters = ['全部', '推荐', '进行中'];

const subjectPathMap = {
    cs50: 'software-engineer',
    python: 'software-engineer',
    git: 'software-engineer',
    dsa: 'software-engineer',
    htmlcss: 'frontend-engineer',
    testing: 'software-engineer',
    functions: 'software-engineer',
    data: 'data-track',
    oop: 'software-engineer',
    recursion: 'algorithm-track',
};

const loadCustomPaths = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(getUserScopedStorageKey('snowwave-custom-paths')) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const saveCustomPaths = (paths) => {
    localStorage.setItem(getUserScopedStorageKey('snowwave-custom-paths'), JSON.stringify(paths));
};

export default function LearningPath() {
    const [searchParams] = useSearchParams();
    const selectedSubject = searchParams.get('subject') || '';
    const initialPathId = subjectPathMap[selectedSubject] || 'software-engineer';
    const [activeFilter, setActiveFilter] = useState('全部');
    const [selectedPathId, setSelectedPathId] = useState(initialPathId);
    const [customPaths, setCustomPaths] = useState(loadCustomPaths);
    const [pathModalOpen, setPathModalOpen] = useState(false);
    const [newPathName, setNewPathName] = useState('');
    const [newPathDesc, setNewPathDesc] = useState('');
    const [newPathCourseIds, setNewPathCourseIds] = useState([]);
    const currentTheme = localStorage.getItem('snowwave-theme') || 'dark';
    const userSubjects = getUserSubjects(subjects);

    const allPaths = useMemo(() => [...basePathCatalog, ...customPaths], [customPaths]);

    const filteredPaths = useMemo(() => (
        activeFilter === '全部' ? allPaths : allPaths.filter(path => path.filter === activeFilter)
    ), [activeFilter, allPaths]);
    const selectedPath = allPaths.find(path => path.id === selectedPathId) || allPaths[0];
    const pathCourses = selectedPath.courseIds
        .map(id => userSubjects.find(subject => subject.id === id))
        .filter(Boolean);
    const progressValue = Math.round(pathCourses.reduce((sum, course) => sum + course.progress, 0) / pathCourses.length);

    const addSubjectToPath = (subjectId) => {
        setNewPathCourseIds(current => current.includes(subjectId) ? current : [...current, subjectId]);
    };

    const removeSubjectFromPath = (subjectId) => {
        setNewPathCourseIds(current => current.filter(id => id !== subjectId));
    };

    const createCustomPath = () => {
        const title = newPathName.trim();
        const desc = newPathDesc.trim();
        if (!title || !desc || newPathCourseIds.length === 0) return;
        const nextPath = {
            id: `custom-${Date.now()}`,
            title,
            desc,
            status: '自建',
            filter: '推荐',
            meta: `${newPathCourseIds.length} 门课程 · 自定义学习路径`,
            courseIds: newPathCourseIds,
        };
        setCustomPaths(current => {
            const next = [...current, nextPath];
            saveCustomPaths(next);
            return next;
        });
        setSelectedPathId(nextPath.id);
        setActiveFilter('全部');
        setNewPathName('');
        setNewPathDesc('');
        setNewPathCourseIds([]);
        setPathModalOpen(false);
    };

    return (
        <div className="learning-path-page">
            <div className="learning-path-header">
                <div>
                    <h1>个性化学习路径</h1>
                    <p>工程师路径由多门课程组成，学完路径里的课程就完成对应职业路线。</p>
                </div>
                <div className="path-actions">
                    <button type="button" className="path-primary-action" onClick={() => setPathModalOpen(true)}>＋ 增加路径</button>
                </div>
            </div>

            <section className="path-progress-panel">
                <div>
                    <span>{selectedPath.title}</span>
                    <strong>{progressValue}%</strong>
                    <p>总体进度</p>
                </div>
                <div className="path-progress-track">
                    <i style={{ width: `${progressValue}%` }} />
                </div>
                <b>⚡</b>
            </section>

            <div className="path-filters">
                {filters.map(filter => (
                    <button
                        type="button"
                        key={filter}
                        className={activeFilter === filter ? 'active' : ''}
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            <section className="path-grid">
                {filteredPaths.map(path => {
                    const courses = path.courseIds.map(id => subjects.find(subject => subject.id === id)).filter(Boolean);
                    return (
                        <article className={`path-card ${selectedPath.id === path.id ? 'active' : ''}`} key={path.id}>
                            <header>
                                <button type="button" onClick={() => setSelectedPathId(path.id)}>
                                    <h2>{path.title} <em>★ {path.status}</em></h2>
                                </button>
                                <p>{path.desc}</p>
                            </header>
                            <div className="path-step-list">
                                {courses.map((course, index) => (
                                    <Link className="path-step" to={`/learning-video?subject=${course.id}`} key={course.id}>
                                        <span>{index + 1}</span>
                                        <div>
                                            <div className="path-step-title">
                                                <strong>{course.name}</strong>
                                                <small>{course.progress}%</small>
                                            </div>
                                            <p>{course.nextTopic}</p>
                                            <div className="path-step-track"><i style={{ width: `${course.progress}%` }} /></div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <footer>
                                <span>{path.meta}</span>
                                <button type="button" onClick={() => setSelectedPathId(path.id)}>查看详情 ›</button>
                            </footer>
                        </article>
                    );
                })}
            </section>

            {pathModalOpen && createPortal((
                <div className={`path-modal-backdrop theme-${currentTheme}`} role="presentation" onMouseDown={() => setPathModalOpen(false)}>
                    <div className="path-modal" role="dialog" aria-modal="true" aria-label="增加路径" onMouseDown={(event) => event.stopPropagation()}>
                        <header>
                            <strong>增加路径</strong>
                            <button type="button" onClick={() => setPathModalOpen(false)} aria-label="关闭">×</button>
                        </header>
                        <label>
                            <span>名字</span>
                            <input value={newPathName} onChange={(event) => setNewPathName(event.target.value)} placeholder="例如：软件开发工程师强化路径" />
                        </label>
                        <label>
                            <span>介绍</span>
                            <textarea value={newPathDesc} onChange={(event) => setNewPathDesc(event.target.value)} placeholder="写清楚这条路径适合谁、要完成哪些能力。" rows={3} />
                        </label>
                        <div className="path-modal-section">
                            <span>增加学科</span>
                            <div className="path-subject-pool">
                                {subjects.map(subject => (
                                    <button
                                        type="button"
                                        key={subject.id}
                                        className={newPathCourseIds.includes(subject.id) ? 'active' : ''}
                                        onClick={() => addSubjectToPath(subject.id)}
                                    >
                                        <em>{subject.icon}</em>
                                        {subject.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="path-modal-section">
                            <span>已增加的学科</span>
                            <div className="path-selected-subjects">
                                {newPathCourseIds.length ? newPathCourseIds.map(subjectId => {
                                    const subject = subjects.find(item => item.id === subjectId);
                                    if (!subject) return null;
                                    return (
                                        <div className="path-selected-subject" key={subject.id}>
                                            <button type="button" className="path-selected-remove" onClick={() => removeSubjectFromPath(subject.id)} aria-label={`删除${subject.name}`}>
                                                <span>×</span>
                                            </button>
                                            <em>{subject.icon}</em>
                                            <strong>{subject.name}</strong>
                                            <small>{subject.difficulty}</small>
                                        </div>
                                    );
                                }) : <p>还没有增加学科。</p>}
                            </div>
                        </div>
                        <footer>
                            <button type="button" className="path-plain-action" onClick={() => setPathModalOpen(false)}>取消</button>
                            <button type="button" className="path-primary-action" onClick={createCustomPath} disabled={!newPathName.trim() || !newPathDesc.trim() || newPathCourseIds.length === 0}>保存路径</button>
                        </footer>
                    </div>
                </div>
            ), document.body)}

            <style>{`
        .learning-path-page { color: var(--text-primary); }
        .learning-path-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }
        .learning-path-header h1 {
          margin: 0 0 8px;
          font-family: var(--font-display);
          font-size: 1.45rem;
        }
        .learning-path-header p,
        .path-card p {
          margin: 0;
          color: var(--text-muted);
          font-size: .82rem;
        }
        .path-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .path-plain-action,
        .path-primary-action,
        .path-filters button {
          height: 40px;
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
          color: var(--text-secondary);
          padding: 0 18px;
          text-decoration: none;
          font: inherit;
          font-size: .8rem;
          cursor: pointer;
          box-sizing: border-box;
        }
        .path-primary-action:disabled {
          opacity: .42;
          cursor: not-allowed;
        }
        .path-primary-action,
        .path-filters button.active {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: var(--bg-primary);
          font-weight: 900;
        }
        .path-progress-panel {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr) 78px;
          align-items: center;
          gap: 26px;
          min-height: 132px;
          padding: 24px 30px;
          margin-bottom: 24px;
          border: 1px solid var(--border);
          background: linear-gradient(90deg, #08090d 0%, #17130a 48%, rgba(250, 204, 21, .92) 100%);
          color: #f8f1c9;
        }
        .path-progress-panel span,
        .path-progress-panel p {
          display: block;
          margin: 0;
          font-size: .82rem;
          opacity: .9;
        }
        .path-progress-panel strong {
          display: block;
          margin-top: 10px;
          font-family: var(--font-display);
          font-size: 1.9rem;
        }
        .path-progress-track {
          height: 8px;
          background: rgba(255,255,255,.34);
          overflow: hidden;
        }
        .path-progress-track i,
        .path-step-track i {
          display: block;
          height: 100%;
          background: var(--accent-blue);
        }
        .path-progress-panel b {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.2);
          font-size: 2rem;
        }
        .path-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 28px;
        }
        .path-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }
        .path-card {
          min-height: 288px;
          padding: 26px;
          border: 1px solid var(--border);
          background: var(--bg-card);
        }
        .path-card.active {
          border-color: #facc15;
        }
        .path-card header button,
        .path-card footer button {
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          font: inherit;
        }
        .path-card h2 {
          margin: 0 0 6px;
          font-size: .98rem;
        }
        .path-card h2 em {
          margin-left: 8px;
          color: var(--accent-blue);
          font-style: normal;
          font-size: .68rem;
        }
        .path-step-list {
          display: grid;
          gap: 12px;
          margin: 24px 0 24px;
        }
        .path-step {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 12px;
          background: var(--bg-card-hover);
          color: inherit;
          text-decoration: none;
        }
        .path-step:hover strong {
          transform: translateY(-2px);
        }
        .path-step > span {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          background: var(--accent-blue-soft);
          color: var(--accent-blue);
          font-weight: 700;
          font-size: .76rem;
        }
        .path-step-title {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 5px;
          font-size: .78rem;
        }
        .path-step-title strong {
          transition: transform .15s ease;
        }
        .path-step-title small {
          color: var(--accent-blue);
          font-weight: 700;
        }
        .path-step p {
          margin-bottom: 8px;
          font-size: .74rem;
        }
        .path-step-track { height: 6px; background: var(--accent-blue-soft); }
        .path-step-track i { background: var(--accent-blue); }
        .path-card footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: var(--text-muted);
          font-size: .74rem;
        }
        .path-card footer button {
          color: var(--accent-blue);
          font-weight: 700;
        }
        .path-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 700;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(17, 24, 39, .42);
        }
        .path-modal {
          width: min(760px, 100%);
          max-height: min(760px, calc(100vh - 48px));
          overflow-y: auto;
          padding: 24px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          box-shadow: 0 22px 70px rgba(17,24,39,.16);
          animation: pathModalIn .22s ease;
        }
        @keyframes pathModalIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .path-modal header,
        .path-modal footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .path-modal footer {
          justify-content: flex-end;
          padding-top: 16px;
          padding-bottom: 0;
          border-top: 1px solid var(--border);
          border-bottom: 0;
        }
        .path-modal header strong {
          font-family: var(--font-display);
          font-size: 1.05rem;
        }
        .path-modal header button {
          border: 0;
          background: transparent;
          color: var(--text-secondary);
          font: inherit;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .path-modal label,
        .path-modal-section {
          display: grid;
          gap: 9px;
          margin-top: 18px;
        }
        .path-modal label span,
        .path-modal-section > span {
          color: var(--text-muted);
          font-size: .72rem;
          font-weight: 800;
        }
        .path-modal input,
        .path-modal textarea {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
          color: var(--text-primary);
          padding: 10px 12px;
          font: inherit;
          box-sizing: border-box;
        }
        .path-subject-pool,
        .path-selected-subjects {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .path-subject-pool button {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
          color: var(--text-secondary);
          padding: 0 12px;
          font: inherit;
          font-size: .78rem;
          cursor: pointer;
        }
        .path-subject-pool button.active {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
          font-weight: 800;
        }
        .path-subject-pool em,
        .path-selected-subject em {
          font-style: normal;
        }
        .path-selected-subject {
          position: relative;
          min-height: 84px;
          display: grid;
          align-content: center;
          gap: 4px;
          padding: 14px 38px 14px 14px;
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
        }
        .path-selected-subject strong {
          font-size: .84rem;
        }
        .path-selected-subject small,
        .path-selected-subjects p {
          color: var(--text-muted);
          font-size: .72rem;
        }
        .path-selected-remove {
          appearance: none;
          -webkit-appearance: none;
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border: 0 !important;
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
        }
        .path-selected-remove span {
          width: 17px;
          height: 17px;
          border: 1px solid #9ca3af;
          border-radius: 50%;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          line-height: 1;
        }
        @media (max-width: 900px) {
          .learning-path-header,
          .path-card footer { flex-direction: column; }
          .path-grid,
          .path-progress-panel { grid-template-columns: 1fr; }
          .path-subject-pool,
          .path-selected-subjects { grid-template-columns: 1fr; }
          .path-filters { flex-wrap: wrap; }
        }
      `}</style>
        </div>
    );
}
