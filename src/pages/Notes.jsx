import React, { useMemo, useState } from 'react';
import { loadNoteFolders, loadNotes, saveNoteFolders, saveNotes } from '../data/learningResources';
import { loadLearningGoals, saveLearningGoals } from '../data/learningGoals';

const emptyNote = {
    title: '未命名笔记',
    course: '自建笔记',
    subjectId: 'htmlcss',
    summary: '新的知识笔记。',
    folder: '课程笔记',
    tags: ['新笔记'],
    content: '## 未命名笔记\n\n在这里记录知识点，也可以用 [[笔记名]] 关联另一篇笔记。',
};

function todayLabel() {
    const now = new Date();
    return `${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function parseWikiLinks(content) {
    return [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map(match => match[1].trim()).filter(Boolean);
}

function renderMarkdown(content) {
    return content
        .split('\n')
        .map((line, index) => {
            if (line.startsWith('## ')) return <h2 key={index}>{line.slice(3)}</h2>;
            if (line.startsWith('# ')) return <h1 key={index}>{line.slice(2)}</h1>;
            if (line.startsWith('- ')) return <li key={index}>{line.slice(2)}</li>;
            if (!line.trim()) return <br key={index} />;
            const parts = line.split(/(\[\[[^\]]+\]\])/g);
            return (
                <p key={index}>
                    {parts.map((part, partIndex) => part.startsWith('[[') && part.endsWith(']]')
                        ? <mark key={partIndex}>{part.slice(2, -2)}</mark>
                        : part)}
                </p>
            );
        });
}

export default function Notes() {
    const [noteList, setNoteList] = useState(loadNotes);
    const [activeId, setActiveId] = useState(() => loadNotes()[0]?.id || '');
    const [folders, setFolders] = useState(loadNoteFolders);
    const [activeFolder, setActiveFolder] = useState('全部笔记');
    const [folderName, setFolderName] = useState('');
    const [query, setQuery] = useState('');
    const [goals, setGoals] = useState(loadLearningGoals);
    const [goalDraft, setGoalDraft] = useState('');
    const activeNote = noteList.find(note => note.id === activeId) || noteList[0] || null;
    const filteredNotes = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        const folderMatched = activeFolder === '全部笔记'
            ? noteList
            : noteList.filter(note => (note.folder || '课程笔记') === activeFolder);
        if (!keyword) return folderMatched;
        return folderMatched.filter(note => `${note.title} ${note.course} ${(note.tags || []).join(' ')} ${note.summary}`.toLowerCase().includes(keyword));
    }, [activeFolder, noteList, query]);
    const backlinks = useMemo(() => {
        if (!activeNote) return [];
        return noteList.filter(note => note.id !== activeNote.id && parseWikiLinks(note.content || '').includes(activeNote.title));
    }, [activeNote, noteList]);
    const outgoingLinks = useMemo(() => parseWikiLinks(activeNote?.content || ''), [activeNote]);

    const persistNotes = nextNotes => {
        setNoteList(nextNotes);
        saveNotes(nextNotes);
    };
    const updateActiveNote = updates => {
        if (!activeNote) return;
        persistNotes(noteList.map(note => note.id === activeNote.id ? { ...note, ...updates, updated: todayLabel() } : note));
    };
    const createNote = () => {
        const id = `note-${Date.now()}`;
        const folder = activeFolder === '全部笔记' ? '未分类' : activeFolder;
        const nextFolders = folders.includes(folder) ? folders : [...folders, folder];
        const nextNote = { ...emptyNote, id, folder, title: `新笔记 ${noteList.length + 1}`, updated: todayLabel() };
        if (nextFolders !== folders) {
            setFolders(nextFolders);
            saveNoteFolders(nextFolders);
        }
        persistNotes([nextNote, ...noteList]);
        setActiveId(id);
    };
    const createFolder = event => {
        event.preventDefault();
        const value = folderName.trim();
        if (!value || folders.includes(value)) return;
        const nextFolders = [...folders, value];
        setFolders(nextFolders);
        saveNoteFolders(nextFolders);
        setActiveFolder(value);
        setFolderName('');
    };
    const moveNoteToFolder = (noteId, targetFolder) => {
        if (!noteId || targetFolder === '全部笔记') return;
        persistNotes(noteList.map(note => note.id === noteId ? { ...note, folder: targetFolder, updated: todayLabel() } : note));
    };
    const deleteFolder = folder => {
        if (folder === '全部笔记') return;
        const remainingFolders = folders.filter(item => item !== folder);
        const fallbackFolder = remainingFolders.find(item => item !== '全部笔记') || '未分类';
        const nextFolders = remainingFolders.includes(fallbackFolder) ? remainingFolders : [...remainingFolders, fallbackFolder];
        const nextNotes = noteList.map(note => (note.folder || '课程笔记') === folder ? { ...note, folder: fallbackFolder, updated: todayLabel() } : note);
        setFolders(nextFolders);
        saveNoteFolders(nextFolders);
        persistNotes(nextNotes);
        if (activeFolder === folder) setActiveFolder(fallbackFolder);
    };
    const persistGoals = nextGoals => { setGoals(nextGoals); saveLearningGoals(nextGoals); };
    const addGoal = event => {
        event.preventDefault();
        const title = goalDraft.trim();
        if (!title) return;
        persistGoals([{ id: `goal-${Date.now()}`, title: title.slice(0, 120), starred: goals.length === 0, createdAt: new Date().toISOString() }, ...goals]);
        setGoalDraft('');
    };

    return (
        <div className="obsidian-notes-page">
            <div className="page-header">
                <div>
                    <h1>笔记系统</h1>
                    <p>Markdown 双链用 [[笔记名]] 建立出链；其他笔记引用当前标题时会成为反向链接，并同步进入知识图谱。</p>
                </div>
                <button className="social-primary-link" type="button" onClick={createNote}>新建笔记</button>
            </div>

            <section className="notes-goals glass-card" aria-label="学习目标">
                <div className="notes-goals-intro"><span>学习目标</span><h2>先写下你想达到的结果</h2><p>建议写成可完成的目标，例如“本月独立做出一个 React 项目”。点击 ☆ 标记优先目标，它也会出现在首页。</p></div>
                <form onSubmit={addGoal} className="notes-goals-form"><input value={goalDraft} onChange={event => setGoalDraft(event.target.value)} maxLength="120" placeholder="写下一个具体目标…" aria-label="新的学习目标" /><button type="submit" disabled={!goalDraft.trim()}>添加目标</button></form>
                {goals.length > 0 && <div className="notes-goal-list">{[...goals].sort((a, b) => Number(b.starred) - Number(a.starred)).map(goal => <div className="notes-goal-row" key={goal.id}><button className={goal.starred ? 'is-starred' : ''} type="button" aria-label={`${goal.starred ? '取消星标' : '标星'}${goal.title}`} title={goal.starred ? '取消星标' : '标记为优先目标'} onClick={() => persistGoals(goals.map(item => item.id === goal.id ? { ...item, starred: !item.starred } : item))}>{goal.starred ? '★' : '☆'}</button><span>{goal.title}</span><button type="button" aria-label={`删除目标${goal.title}`} onClick={() => persistGoals(goals.filter(item => item.id !== goal.id))}>×</button></div>)}</div>}
            </section>

            <section className="obsidian-notes-shell">
                <aside className="glass-card notes-vault">
                    <form className="notes-folder-form" onSubmit={createFolder}>
                        <input value={folderName} onChange={event => setFolderName(event.target.value)} placeholder="创建文件夹" />
                        <button type="submit" aria-label="创建文件夹">+</button>
                    </form>
                    <div className="notes-folder-list">
                        {folders.map(folder => (
                            <div
                                className={`notes-folder-row ${folder === activeFolder ? 'active' : ''}`}
                                key={folder}
                                onDragOver={event => { if (folder !== '全部笔记') event.preventDefault(); }}
                                onDrop={event => {
                                    event.preventDefault();
                                    moveNoteToFolder(event.dataTransfer.getData('text/plain'), folder);
                                }}
                            >
                                <button type="button" onClick={() => setActiveFolder(folder)}>
                                    {folder}
                                </button>
                                {folder !== '全部笔记' && (
                                    <button className="notes-folder-delete" type="button" aria-label={`删除${folder}`} onClick={() => deleteFolder(folder)}>
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <label className="notes-search">
                        <span>搜索</span>
                        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="笔记名、标签、课程" />
                    </label>
                    <div className="notes-vault-list">
                        {filteredNotes.map(note => (
                            <button
                                className={note.id === activeNote?.id ? 'active' : ''}
                                type="button"
                                key={note.id}
                                draggable
                                onDragStart={event => event.dataTransfer.setData('text/plain', note.id)}
                                onClick={() => setActiveId(note.id)}
                            >
                                <strong>{note.title}</strong>
                                <span>{note.course}</span>
                                <small>{(note.tags || []).join(' / ')}</small>
                            </button>
                        ))}
                    </div>
                </aside>

                {activeNote && (
                    <main className="glass-card notes-workbench">
                        <div className="notes-editor-head">
                            <input
                                value={activeNote.title}
                                onChange={event => updateActiveNote({ title: event.target.value || '未命名笔记' })}
                                aria-label="笔记标题"
                            />
                            <span>{activeNote.updated}</span>
                        </div>
                        <div className="notes-meta-row">
                            <input
                                value={activeNote.course}
                                onChange={event => updateActiveNote({ course: event.target.value })}
                                aria-label="课程归属"
                            />
                            <select
                                value={activeNote.folder || '课程笔记'}
                                onChange={event => updateActiveNote({ folder: event.target.value })}
                                aria-label="笔记文件夹"
                            >
                                {folders.filter(folder => folder !== '全部笔记').map(folder => <option key={folder} value={folder}>{folder}</option>)}
                            </select>
                            <input
                                value={(activeNote.tags || []).join(', ')}
                                onChange={event => updateActiveNote({ tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })}
                                aria-label="笔记标签"
                            />
                        </div>
                        <textarea
                            className="notes-markdown-editor"
                            value={activeNote.content || ''}
                            onChange={event => updateActiveNote({ content: event.target.value, summary: event.target.value.replace(/[#*[\]]/g, '').trim().slice(0, 52) || activeNote.summary })}
                            spellCheck="false"
                        />
                    </main>
                )}

                {!activeNote && (
                    <main className="glass-card notes-workbench notes-empty-workbench">
                        <div className="empty-state">
                            <h2>还没有笔记</h2>
                            <p>点击右上角“新建笔记”后，这里会保存当前账号自己的笔记和双链关系。</p>
                            <button className="btn btn-primary" type="button" onClick={createNote}>新建第一篇笔记</button>
                        </div>
                    </main>
                )}

                {activeNote && (
                    <aside className="glass-card notes-preview-panel">
                        <div className="notes-preview">
                            {renderMarkdown(activeNote.content || '')}
                        </div>
                        <div className="notes-link-panel">
                            <strong>关联笔记</strong>
                            {outgoingLinks.length ? outgoingLinks.map(link => <span key={link}>{link}</span>) : <small>暂无出链</small>}
                        </div>
                        <div className="notes-link-panel">
                            <strong>反向链接</strong>
                            {backlinks.length ? backlinks.map(note => (
                                <button type="button" key={note.id} onClick={() => setActiveId(note.id)}>{note.title}</button>
                            )) : <small>暂无反链</small>}
                        </div>
                    </aside>
                )}
            </section>
        </div>
    );
}
