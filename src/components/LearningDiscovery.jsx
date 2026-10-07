import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserScopedStorageKey } from '../data/learningResources';
import { loadLearningGoals } from '../data/learningGoals';

const careerKey = 'snowwave-career-goal';
const readCareer = () => {
    try {
        const value = JSON.parse(localStorage.getItem(getUserScopedStorageKey(careerKey)) || '{}');
        return { role: String(value.role || ''), needs: String(value.needs || '') };
    } catch { return { role: '', needs: '' }; }
};
const dateLabel = value => value ? new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }) : '日期未提供';
const questionLink = question => `/doubt-solver?question=${encodeURIComponent(question.slice(0, 500))}`;

export default function LearningDiscovery() {
    const [career, setCareer] = useState(readCareer);
    const [draft, setDraft] = useState(readCareer);
    const [news, setNews] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [newsState, setNewsState] = useState('loading');
    const [jobsState, setJobsState] = useState('idle');
    const [newsUpdated, setNewsUpdated] = useState('');
    const [jobsUpdated, setJobsUpdated] = useState('');
    const [jobsScope, setJobsScope] = useState('domestic');
    const [editing, setEditing] = useState(false);
    const [starredGoals, setStarredGoals] = useState(() => loadLearningGoals().filter(goal => goal.starred));

    useEffect(() => {
        const refresh = () => setStarredGoals(loadLearningGoals().filter(goal => goal.starred));
        window.addEventListener('snowwave-learning-goals-updated', refresh);
        window.addEventListener('storage', refresh);
        return () => { window.removeEventListener('snowwave-learning-goals-updated', refresh); window.removeEventListener('storage', refresh); };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const refresh = async () => {
            try {
                const response = await fetch(`/api/discovery/learning?needs=${encodeURIComponent(career.needs)}`, { signal: controller.signal });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                setNews(result.items || []); setNewsUpdated(result.updatedAt); setNewsState('ready');
            } catch (error) { if (error.name !== 'AbortError') setNewsState('error'); }
        };
        refresh();
        const timer = window.setInterval(refresh, 60 * 60 * 1000);
        return () => { controller.abort(); window.clearInterval(timer); };
    }, [career.needs]);

    useEffect(() => {
        if (!career.role.trim()) { setJobs([]); setJobsState('idle'); return undefined; }
        const controller = new AbortController();
        const refresh = async () => {
            setJobsState('loading');
            try {
                const response = await fetch(`/api/discovery/jobs?role=${encodeURIComponent(career.role)}`, { signal: controller.signal });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                setJobs(result.jobs || []); setJobsScope(result.scope || 'domestic'); setJobsUpdated(result.updatedAt); setJobsState('ready');
            } catch (error) { if (error.name !== 'AbortError') setJobsState('error'); }
        };
        refresh();
        const timer = window.setInterval(refresh, 60 * 60 * 1000);
        return () => { controller.abort(); window.clearInterval(timer); };
    }, [career.role]);

    const saveCareer = event => {
        event.preventDefault();
        const next = { role: draft.role.trim().slice(0, 60), needs: draft.needs.trim().slice(0, 120) };
        localStorage.setItem(getUserScopedStorageKey(careerKey), JSON.stringify(next));
        setCareer(next); setEditing(false);
    };

    return <section className="learning-discovery" aria-label="学习资讯与岗位信息">
        <div className="discovery-heading"><div><span>学习情报</span><h2>把新信息变成下一步学习</h2><p>优先展示中文技术资讯和国内开发岗位，再补充其他来源。</p></div><Link to="/notes">整理我的学习目标 →</Link></div>
        <div className="discovery-career glass-card">
            <div className="discovery-card-heading"><div><span>我的方向</span><h3>{career.role || '先设定目标岗位'}</h3>{career.needs && <p>学习需求：{career.needs}</p>}</div><button type="button" onClick={() => { setDraft(career); setEditing(value => !value); }}>{editing ? '收起' : career.role ? '修改方向' : '填写方向'}</button></div>
            {editing && <form onSubmit={saveCareer} className="discovery-career-form"><label>目标岗位<input value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })} placeholder="例如：前端开发工程师" maxLength="60" /></label><label>当前学习需求<input value={draft.needs} onChange={event => setDraft({ ...draft, needs: event.target.value })} placeholder="例如：React、测试、项目实践" maxLength="120" /></label><button type="submit">保存方向</button></form>}
            {starredGoals.length > 0 && <p className="discovery-starred-goal">★ 优先目标：{starredGoals.slice(0, 2).map(goal => goal.title).join(' · ')}</p>}
        </div>
        <div className="discovery-columns">
            <div className="discovery-panel"><div className="discovery-card-heading"><div><span>精选资讯</span><h3>最近值得学</h3></div><small>{newsUpdated ? `更新于 ${dateLabel(newsUpdated)}` : '自动更新'}</small></div>
                {newsState === 'loading' && <p className="discovery-empty">正在获取资讯…</p>}
                {newsState === 'error' && <p className="discovery-empty">暂时无法连接资讯来源，请检查网络后刷新页面。</p>}
                {newsState === 'ready' && !news.length && <p className="discovery-empty">目前没有符合学习主题的资讯。</p>}
                <div className="discovery-list">{news.map(item => <article className="discovery-item" key={item.url}><div className="discovery-item-meta"><span>{item.source} · {item.topic}</span><time>{dateLabel(item.publishedAt)}</time></div><h4>{item.title}</h4>{item.summary && <p>{item.summary}</p>}<div className="discovery-item-actions"><a href={item.url} target="_blank" rel="noopener noreferrer">查看原文 ↗</a><Link to={questionLink(`我看到一条学习资讯：“${item.title}”（来源：${item.source}）。请解释它与我学习${career.needs || '编程'}有什么关系，并给出具体学习建议。`)}>问 AI 这条资讯 →</Link></div></article>)}</div>
            </div>
            <div className="discovery-panel"><div className="discovery-card-heading"><div><span>岗位观察</span><h3>{career.role ? `${career.role}相关职位` : '职位信息'}</h3></div><small>{jobsScope === 'domestic' ? '国内招聘社区优先' : '海外远程补充'}</small></div>
                {!career.role && <p className="discovery-empty">填写目标岗位后，会优先查找国内开发者社区的中文招聘帖，并标出工作地点。</p>}
                {jobsState === 'loading' && <p className="discovery-empty">正在查找岗位…</p>}
                {jobsState === 'error' && <p className="discovery-empty">岗位来源暂时无法连接，请稍后刷新页面。</p>}
                {jobsState === 'ready' && !jobs.length && <p className="discovery-empty">目前没有匹配的公开岗位，试试更宽泛的岗位名称。</p>}
                {jobsState === 'ready' && jobsScope === 'overseas' && jobs.length > 0 && <p className="discovery-empty">暂未找到匹配的国内招聘帖，下面是海外远程岗位补充。</p>}
                <div className="discovery-list">{jobs.slice(0, 5).map(job => <article className="discovery-item" key={job.id || job.url}><div className="discovery-item-meta"><span>{job.source} · {job.company}</span><time>{dateLabel(job.publishedAt)}</time></div><h4>{job.title}</h4><p>{job.location}{job.type ? ` · ${job.type}` : ''}</p><div className="discovery-item-actions"><a href={job.url} target="_blank" rel="noopener noreferrer">查看岗位 ↗</a><Link to={questionLink(`我想应聘${career.role}。看到岗位“${job.title}”（来源：${job.source}，地点：${job.location}）。结合我的学习需求“${career.needs || '请帮我制定学习计划'}”，我应该重点准备哪些技能和作品？`)}>问 AI 如何准备 →</Link></div></article>)}</div>
                {jobsUpdated && <p className="discovery-source-note">信息更新于 {dateLabel(jobsUpdated)}。社区岗位由发布者自行提供，地点和招聘状态请以原帖及招聘方说明为准。</p>}
            </div>
        </div>
    </section>;
}
