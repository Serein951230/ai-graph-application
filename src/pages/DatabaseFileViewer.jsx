import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadDatabaseFiles } from '../data/learningResources';
import { loadDatabaseFileBlob } from '../data/databaseFileStore';

export default function DatabaseFileViewer() {
    const { fileId } = useParams();
    const file = useMemo(() => loadDatabaseFiles().find(item => item.id === fileId), [fileId]);
    const [source, setSource] = useState('');
    const [status, setStatus] = useState(() => file ? 'loading' : 'missing');
    const isPdf = Boolean(file && (file.mime === 'application/pdf' || /\.pdf$/i.test(file.name)));
    const backLink = fileId ? `/database?file=${encodeURIComponent(fileId)}` : '/database';

    useEffect(() => {
        let cancelled = false;
        let objectUrl = '';

        const open = async () => {
            if (!file) return;
            try {
                const blob = await loadDatabaseFileBlob(fileId);
                if (cancelled) return;
                if (blob) {
                    objectUrl = URL.createObjectURL(blob);
                    setSource(objectUrl);
                    setStatus('ready');
                    return;
                }
            } catch { /* 兼容旧资料和不支持 IndexedDB 的浏览器。 */ }
            if (cancelled) return;

            if (file.dataUrl) {
                setSource(file.dataUrl);
                setStatus('ready');
                return;
            }

            if (file.previewUrl?.startsWith('blob:')) {
                try {
                    const response = await fetch(file.previewUrl);
                    if (response.ok) {
                        const blob = await response.blob();
                        if (cancelled) return;
                        objectUrl = URL.createObjectURL(blob);
                        setSource(objectUrl);
                        setStatus('ready');
                        return;
                    }
                } catch { /* 旧的临时地址在刷新后可能失效。 */ }
            }
            if (!cancelled) setStatus('missing');
        };

        open();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [file, fileId]);

    return (
        <div className="database-reader-page">
            <header className="database-reader-header">
                <Link className="database-reader-back" to={backLink}>← 返回数据库</Link>
                <div className="database-reader-title">
                    <strong>{file?.name || '文件不可用'}</strong>
                    {file && <span>{file.folder} · {file.size}</span>}
                </div>
                {source && <a className="database-reader-download" href={source} download={file.name}>下载原文件</a>}
            </header>
            <main className="database-reader-content">
                {status === 'loading' && <p className="database-reader-message">正在打开文件…</p>}
                {status === 'missing' && <div className="database-reader-message"><h1>无法打开这个文件</h1><p>文件可能已删除，或旧版上传的文件内容没有保存到本机。请返回数据库重新上传。</p><Link to="/database">返回数据库</Link></div>}
                {status === 'ready' && file.type === 'image' && <img src={source} alt={file.name} />}
                {status === 'ready' && file.type === 'video' && <video src={source} controls />}
                {status === 'ready' && !['image', 'video'].includes(file.type) && <iframe src={source} title={file.name} sandbox={isPdf ? undefined : ''} />}
            </main>
        </div>
    );
}
