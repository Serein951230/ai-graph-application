import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUserDatabaseId, getCurrentUserDatabaseLabel, loadDatabaseFiles, loadDatabaseFolders, saveDatabaseFiles, saveDatabaseFolders } from '../data/learningResources';
import { deleteDatabaseFileBlob, saveDatabaseFileBlob } from '../data/databaseFileStore';

const types = [
    { id: 'all', label: '全部', icon: '▦', desc: '我的全部上传资料' },
    { id: 'video', label: '视频', icon: '▶', desc: '视频、录屏、讲解素材' },
    { id: 'image', label: '图片', icon: '图', desc: '截图、照片、图片资料' },
    { id: 'document', label: '文档', icon: '文', desc: 'PDF、Word、PPT、文本' },
    { id: 'quiz', label: '题库', icon: '题', desc: '练习题、试卷、数据表' },
    { id: 'note', label: '笔记', icon: '记', desc: 'Markdown、文本笔记' },
];

const inferType = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (['xlsx', 'xls', 'csv', 'json'].includes(ext)) return 'quiz';
    if (['md', 'txt'].includes(ext)) return 'note';
    return 'document';
};

const isPlainTextFile = name => /\.(txt|md|markdown|csv|json|jsonl|js|jsx|ts|tsx|py|html|css|xml|yaml|yml)$/i.test(name);

const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const readFileAsDataUrl = file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
});

const readFileAsText = file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').slice(0, 12000));
    reader.onerror = () => resolve('');
    reader.readAsText(file);
});

const loadCurrentBinding = () => {
    try {
        return JSON.parse(localStorage.getItem('snowwave-user-binding') || '{}');
    } catch {
        return {};
    }
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function Database() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [files, setFiles] = useState(loadDatabaseFiles);
    const selectedFileId = searchParams.get('file');
    const selectedFile = files.find(item => item.id === selectedFileId);
    const [activeType, setActiveType] = useState(() => selectedFile?.type || 'all');
    const [folders, setFolders] = useState(loadDatabaseFolders);
    const [selectedFolder, setSelectedFolder] = useState(() => selectedFile?.folder || loadDatabaseFolders()[0] || '/我的资料');
    const [folderName, setFolderName] = useState('');
    const [currentBinding, setCurrentBinding] = useState(loadCurrentBinding);
    const fileInputRef = useRef(null);

    useEffect(() => {
        saveDatabaseFiles(files);
    }, [files]);

    useEffect(() => {
        saveDatabaseFolders(folders);
    }, [folders]);

    const visibleFiles = useMemo(() => files.filter((file) => {
        const typeMatch = activeType === 'all' || file.type === activeType;
        const folderMatch = selectedFolder === '/' || file.folder === selectedFolder || file.folder.startsWith(`${selectedFolder}/`);
        return typeMatch && folderMatch;
    }), [activeType, files, selectedFolder]);

    const counts = useMemo(() => types.reduce((result, type) => {
        result[type.id] = type.id === 'all' ? files.length : files.filter((file) => file.type === type.id).length;
        return result;
    }, {}), [files]);

    const addFolder = (event) => {
        event.preventDefault();
        const value = folderName.trim();
        if (!value) return;
        const nextFolder = value.startsWith('/') ? value : `/${value}`;
        if (!folders.includes(nextFolder)) setFolders((current) => [...current, nextFolder]);
        setSelectedFolder(nextFolder);
        setFolderName('');
    };

    const deleteFolder = (folder) => {
        const normalizedFolder = folder.replace(/\/$/, '');
        const childPrefix = `${normalizedFolder}/`;
        const foldersToRemove = folders.filter(item => item === normalizedFolder || item.startsWith(childPrefix));
        const remainingFolders = folders.filter(item => !foldersToRemove.includes(item));
        const parentFolder = normalizedFolder.includes('/')
            ? normalizedFolder.slice(0, normalizedFolder.lastIndexOf('/')) || '/未分类'
            : '/未分类';
        const fallbackFolder = remainingFolders.includes(parentFolder)
            ? parentFolder
            : remainingFolders[0] || '/未分类';
        const nextFolders = remainingFolders.includes(fallbackFolder) ? remainingFolders : [...remainingFolders, fallbackFolder];
        setFolders(nextFolders);
        setFiles(current => current.map(file => (
            file.folder === normalizedFolder || file.folder.startsWith(childPrefix)
                ? { ...file, folder: fallbackFolder }
                : file
        )));
        if (selectedFolder === normalizedFolder || selectedFolder.startsWith(childPrefix)) {
            setSelectedFolder(fallbackFolder);
        }
    };

    const handleUpload = async (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (!selectedFiles.length) return;
        const uploadedAt = new Date().toISOString();
        const nextRecords = await Promise.all(selectedFiles.map(async (file, index) => {
            const id = `${Date.now()}-${index}`;
            const type = inferType(file.name);
            const canPersistPreview = file.size <= 2 * 1024 * 1024;
            const previewUrl = URL.createObjectURL(file);
            const dataUrl = canPersistPreview ? await readFileAsDataUrl(file) : '';
            const extractedText = isPlainTextFile(file.name) && file.size <= 1024 * 1024 ? await readFileAsText(file) : '';
            try { await saveDatabaseFileBlob(id, file); } catch { /* 当前会话仍可使用预览地址。 */ }
            return {
                id,
                name: file.name,
                type,
                mime: file.type,
                folder: selectedFolder,
                size: formatSize(file.size),
                status: extractedText ? '内容可检索' : '仅名称可检索',
                ownerId: getCurrentUserDatabaseId(),
                ownerName: currentBinding.nickname || '当前用户',
                uploadedAt,
                previewUrl,
                dataUrl,
                extractedText,
            };
        }));
        setFiles((current) => [...nextRecords, ...current]);
        event.target.value = '';
    };

    const moveFile = (id, folder) => {
        setFiles((current) => current.map((file) => file.id === id ? { ...file, folder } : file));
    };

    const refreshOwner = () => setCurrentBinding(loadCurrentBinding());
    const openFile = file => navigate(`/database/file/${encodeURIComponent(file.id)}`);
    const deleteFile = file => {
        setFiles(current => current.filter(item => item.id !== file.id));
        if (file.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(file.previewUrl);
        deleteDatabaseFileBlob(file.id).catch(() => {});
    };

    return (
        <div>
            <div className="page-header database-toolbar">
                <div>
                    <h1>我的数据库</h1>
                    <p>上传自己的视频、图片、文件、题库和笔记；文件夹用于组织资料、筛选 RAG 范围，并会作为图谱关系线索。</p>
                </div>
                <div className="database-actions">
                    <input ref={fileInputRef} className="database-upload-input" type="file" multiple onChange={handleUpload} />
                    <button className="database-upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
                        <span>↑</span>
                        上传文件
                    </button>
                </div>
            </div>

            <div className="database-type-grid">
                {types.map((type) => (
                    <button className={`database-type-card ${activeType === type.id ? 'active' : ''}`} key={type.id} type="button" onClick={() => setActiveType(type.id)}>
                        <i>{type.icon}</i><strong>{type.label}</strong><b>{counts[type.id]}</b><small>{type.desc}</small>
                    </button>
                ))}
            </div>

            <section className="glass-card database-owner-panel">
                <div className="database-section-heading">
                    <div>
                        <h2>{currentBinding.nickname || '当前用户'}的资料库</h2>
                        <p>当前账号：{getCurrentUserDatabaseLabel()} · 当前共 {files.length} 个节点文件 · 资料按账号隔离保存在本地</p>
                    </div>
                    <button className="database-refresh" type="button" onClick={refreshOwner}>刷新</button>
                </div>
                <div className="database-owner-grid">
                    <span><strong>{files.filter(file => file.type === 'video').length}</strong> 个视频节点</span>
                    <span><strong>{files.filter(file => file.type === 'image').length}</strong> 个图片节点</span>
                    <span><strong>{files.filter(file => file.type === 'document').length}</strong> 个文档节点</span>
                    <span><strong>{files.filter(file => file.type === 'note').length}</strong> 个笔记节点</span>
                </div>
            </section>

            <div className="database-manager">
                <section className="glass-card database-folders">
                    <div className="database-section-heading"><div><h2>文件夹</h2><p>整理个人资料的位置</p></div></div>
                    <form className="database-folder-form" onSubmit={addFolder}><input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="新建文件夹" /><button type="submit" aria-label="新建文件夹">+</button></form>
                    <div className="database-folder-list">
                        <button className={`database-folder ${selectedFolder === '/' ? 'active' : ''}`} type="button" onClick={() => setSelectedFolder('/')}>全部文件</button>
                        {folders.map((folder) => (
                            <div className={`database-folder-row ${selectedFolder === folder ? 'active' : ''}`} key={folder}>
                                <button className="database-folder" type="button" onClick={() => setSelectedFolder(folder)}>{folder}</button>
                                <button className="database-folder-delete" type="button" aria-label={`删除${folder}`} title="删除文件夹" onClick={() => deleteFolder(folder)}>×</button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="glass-card database-files">
                    <div className="database-section-heading"><div><h2>{selectedFolder === '/' ? '全部文件' : selectedFolder}</h2><p>{visibleFiles.length} 个文件 · 已同步到知识图谱</p></div></div>
                    <div className="database-table-wrap">
                        <table className="database-table"><thead><tr><th>类型</th><th>名称</th><th>文件夹</th><th>大小</th><th>上传时间</th><th>状态</th><th>操作</th></tr></thead><tbody>
                            {visibleFiles.map((file) => <tr className={selectedFileId === file.id ? 'database-row-active' : ''} key={file.id}><td><span className={`database-file-type ${file.type}`}>{types.find((type) => type.id === file.type)?.label}</span></td><td><strong>{file.name}</strong></td><td><select className="database-move-select" value={file.folder} onChange={(event) => moveFile(file.id, event.target.value)}>{folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}</select></td><td>{file.size}</td><td>{formatDate(file.uploadedAt)}</td><td><span className="database-status">{file.status}</span></td><td><div className="database-row-actions"><button className="database-open" type="button" onClick={() => openFile(file)}>打开</button><button className="database-danger" type="button" onClick={() => deleteFile(file)}>删除</button></div></td></tr>)}
                            {!visibleFiles.length && <tr><td className="database-empty" colSpan="7">当前分类和文件夹中暂无资料，点击右上角上传文件。</td></tr>}
                        </tbody></table>
                    </div>
                </section>
            </div>
        </div>
    );
}
