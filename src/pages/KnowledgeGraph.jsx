import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { subjects } from '../data/mockData';
import { lessonCatalog, loadDatabaseFiles, loadNotes } from '../data/learningResources';

const paletteByFolder = {
    学习路径: '#facc15',
    课程: '#5b8ff9',
    主题: '#33a02c',
    视频: '#a6cee3',
    图片: '#fb7185',
    笔记: '#f8f1c9',
    文件: '#cab2d6',
    标签: '#e0a234',
};

const lightPaletteByFolder = {
    学习路径: '#2563eb',
    课程: '#2b83ba',
    主题: '#22c55e',
    视频: '#2f9ec7',
    图片: '#e11d48',
    笔记: '#e11d48',
    文件: '#7c3aed',
    标签: '#f97316',
};

const subjectAlias = {
    软件开发: 'cs50',
    前端开发: 'htmlcss',
    后端开发: 'python',
    CS50: 'cs50',
    Python: 'python',
    React: 'htmlcss',
    Web: 'htmlcss',
    Git: 'git',
    算法: 'dsa',
    数据: 'data',
    测试: 'testing',
    函数: 'functions',
    递归: 'recursion',
    对象: 'oop',
};

function endId(value) {
    return typeof value === 'object' && value !== null ? value.id : value;
}

function inferSubjectId(text) {
    const value = text || '';
    const match = Object.entries(subjectAlias).find(([keyword]) => value.includes(keyword));
    return match?.[1] || 'cs50';
}

function fileTypeLabel(type) {
    if (type === 'video') return '视频';
    if (type === 'image') return '图片';
    if (type === 'note') return '笔记';
    return '文件';
}

function relationTokens(text) {
    return [...new Set(String(text || '')
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .match(/[\u4e00-\u9fa5]{2,}|[a-z0-9]{2,}/g) || [])]
        .filter(token => !['mp4', 'pdf', 'csv', 'md', 'jpg', 'jpeg', 'png', 'note', 'video'].includes(token));
}

function hasNameRelation(left, right) {
    const leftTokens = relationTokens(left);
    const rightTokens = relationTokens(right);
    if (!leftTokens.length || !rightTokens.length) return false;
    return leftTokens.some(token => rightTokens.includes(token));
}

function withAlpha(hex, alpha) {
    const value = hex.replace('#', '');
    const n = Number.parseInt(value, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function graphNodeColor(node, isLightTheme) {
    return isLightTheme ? (lightPaletteByFolder[node.folder] || node.color) : node.color;
}

function makeNodeObject(node, isLit, isLightTheme = false) {
    const group = new THREE.Group();
    const radius = Math.max(2.2, Math.cbrt(node.val) * 2.35);
    const displayColor = graphNodeColor(node, isLightTheme);
    const color = new THREE.Color(displayColor);
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 18, 18),
        new THREE.MeshStandardMaterial({
            color,
            roughness: isLightTheme ? 0.52 : 0.38,
            metalness: isLightTheme ? 0.04 : 0.12,
            emissive: color,
            emissiveIntensity: isLit ? (isLightTheme ? 0.025 : 0.18) : 0.035,
            transparent: true,
            opacity: isLit ? (isLightTheme ? 1 : 0.96) : 0.28,
        }),
    );
    group.add(core);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * (isLightTheme ? 1.34 : 1.42), 12, 12),
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: isLit ? (isLightTheme ? 0.16 : 0.07) : 0.012,
            blending: isLightTheme ? THREE.NormalBlending : THREE.AdditiveBlending,
            depthWrite: false,
        }),
    );
    group.add(glow);

    const label = new SpriteText(node.name);
    label.color = isLit ? (isLightTheme ? '#374151' : '#d8d2b0') : (isLightTheme ? 'rgba(55,65,81,0.38)' : 'rgba(160,160,160,0.18)');
    label.textHeight = node.kind === 'tag' ? (isLightTheme ? 2.45 : 2.7) : (isLightTheme ? 1.86 : 2);
    label.position.y = radius * 1.7 + 3;
    group.add(label);

    return group;
}

// The landing page reuses the same graph data to keep both views consistent.
// eslint-disable-next-line react-refresh/only-export-components
export function buildGraphData() {
    const databaseFiles = loadDatabaseFiles();
    const noteItems = loadNotes();
    const nodes = [
        { id: 'path/software', name: '软件开发工程师路径', folder: '学习路径', kind: 'path', val: 12, route: '/learning-path' },
        { id: 'tag/video', name: '#视频', folder: '标签', kind: 'tag', val: 10 },
        { id: 'tag/note', name: '#笔记', folder: '标签', kind: 'tag', val: 10 },
        { id: 'tag/file', name: '#资料库', folder: '标签', kind: 'tag', val: 10 },
        ...subjects.map(subject => ({
            id: `course/${subject.id}`,
            name: subject.name,
            folder: '课程',
            kind: 'course',
            val: 5 + subject.progress / 20,
            route: `/learning-video?subject=${subject.id}`,
        })),
        ...subjects.map(subject => ({
            id: `topic/${subject.id}`,
            name: subject.nextTopic,
            folder: '主题',
            kind: 'topic',
            val: 4,
            route: `/learning-video?subject=${subject.id}`,
        })),
        ...Object.entries(lessonCatalog).flatMap(([subjectId, lessons]) => lessons.map((lesson, index) => ({
            id: `video/${subjectId}/${index}`,
            name: lesson.title,
            folder: '视频',
            kind: 'video',
            val: 3.8,
            route: `/learning-video?subject=${subjectId}&lesson=${index}`,
        }))),
        ...noteItems.map(note => ({
            id: `note/${note.id}`,
            name: note.title,
            folder: '笔记',
            kind: 'note',
            val: 3.5,
            route: `/notes#${note.id}`,
            subjectId: note.subjectId,
        })),
        ...databaseFiles.map(file => ({
            id: `file/${file.id}`,
            name: file.name,
            folder: fileTypeLabel(file.type),
            kind: 'file',
            val: file.type === 'video' ? 3.8 : 3.2,
            route: `/database?file=${encodeURIComponent(file.id)}`,
        })),
    ];

    const links = [
        ...subjects.map(subject => ({ source: 'path/software', target: `course/${subject.id}` })),
        ...subjects.map(subject => ({ source: `course/${subject.id}`, target: `topic/${subject.id}` })),
        ...Object.entries(lessonCatalog).flatMap(([subjectId, lessons]) => lessons.map((_, index) => ({ source: `course/${subjectId}`, target: `video/${subjectId}/${index}` }))),
        ...Object.entries(lessonCatalog).flatMap(([subjectId, lessons]) => lessons.map((_, index) => ({ source: `video/${subjectId}/${index}`, target: 'tag/video' }))),
        ...noteItems.map(note => ({ source: `course/${note.subjectId || inferSubjectId(note.course)}`, target: `note/${note.id}` })),
        ...noteItems.map(note => ({ source: `note/${note.id}`, target: 'tag/note' })),
        ...databaseFiles.map(file => ({ source: `course/${inferSubjectId(`${file.name} ${file.folder}`)}`, target: `file/${file.id}` })),
        ...databaseFiles.map(file => ({ source: `file/${file.id}`, target: file.type === 'video' ? 'tag/video' : file.type === 'note' ? 'tag/note' : 'tag/file' })),
        ...noteItems.flatMap(note => databaseFiles
            .filter(file => hasNameRelation(`${note.title} ${note.course} ${(note.tags || []).join(' ')}`, file.name))
            .map(file => ({ source: `note/${note.id}`, target: `file/${file.id}` }))),
        ...noteItems.flatMap(note => Object.entries(lessonCatalog).flatMap(([subjectId, lessons]) => lessons
            .map((lesson, index) => ({ lesson, index, subjectId }))
            .filter(({ lesson }) => hasNameRelation(`${note.title} ${note.course} ${(note.tags || []).join(' ')}`, lesson.title))
            .map(({ index, subjectId }) => ({ source: `note/${note.id}`, target: `video/${subjectId}/${index}` })))),
        ...noteItems.flatMap((note, index) => noteItems.slice(index + 1)
            .filter(otherNote => hasNameRelation(`${note.title} ${note.content || ''}`, `${otherNote.title} ${otherNote.content || ''}`))
            .map(otherNote => ({ source: `note/${note.id}`, target: `note/${otherNote.id}` }))),
    ];

    const neighbors = new Map(nodes.map(node => [node.id, new Set()]));
    links.forEach(link => {
        neighbors.get(link.source)?.add(link.target);
        neighbors.get(link.target)?.add(link.source);
    });

    return {
        nodes: nodes.map(node => {
            const nodeNeighbors = [...(neighbors.get(node.id) || [])];
            return {
                ...node,
                val: node.kind === 'tag' ? (1 + nodeNeighbors.length) * 2.2 : node.val + nodeNeighbors.length * 0.28,
                neighbors: nodeNeighbors,
                color: paletteByFolder[node.folder] || '#9aa0c8',
            };
        }),
        links,
    };
}

export default function KnowledgeGraph() {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const graphRef = useRef(null);
    const spotlightRef = useRef(null);
    const focusNodeSetRef = useRef(null);
    const nodeObjectCacheRef = useRef(new Map());
    const activeCategoriesRef = useRef(new Set(Object.keys(paletteByFolder)));
    const [activeCategories, setActiveCategories] = useState(() => new Set(Object.keys(paletteByFolder)));
    const [graphError, setGraphError] = useState('');
    const sourceGraphData = useMemo(() => buildGraphData(), []);
    const categories = useMemo(() => Object.keys(paletteByFolder), []);
    const folderByNodeId = useMemo(() => new Map(sourceGraphData.nodes.map(node => [node.id, node.folder])), [sourceGraphData]);
    const goBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/');
    };
    const toggleCategory = category => {
        spotlightRef.current = null;
        focusNodeSetRef.current = null;
        setActiveCategories(current => {
            const next = new Set(current);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };
    const toggleAllCategories = () => {
        spotlightRef.current = null;
        focusNodeSetRef.current = null;
        setActiveCategories(current => current.size === categories.length ? new Set() : new Set(categories));
    };
    const zoomGraph = (direction) => {
        const graph = graphRef.current;
        if (!graph) return;
        const camera = graph.camera();
        const controls = graph.controls();
        const target = controls?.target || new THREE.Vector3(0, 0, 0);
        const current = camera.position.clone();
        const next = target.clone().add(current.sub(target).multiplyScalar(direction === 'in' ? 0.78 : 1.24));
        graph.cameraPosition({ x: next.x, y: next.y, z: next.z }, { x: target.x, y: target.y, z: target.z }, 260);
    };
    const refreshGraphAppearance = useCallback(() => {
        const graph = graphRef.current;
        if (!graph) return;
        const isLightTheme = Boolean(document.querySelector('.theme-light'));
        const activeSet = activeCategoriesRef.current;
        const focusSet = focusNodeSetRef.current;
        const nodeVisible = node => activeSet.has(node.folder) && (!focusSet || focusSet.has(node.id));
        const linkVisible = link => {
            const sourceId = endId(link.source);
            const targetId = endId(link.target);
            return activeSet.has(folderByNodeId.get(sourceId))
                && activeSet.has(folderByNodeId.get(targetId))
                && (!focusSet || (focusSet.has(sourceId) && focusSet.has(targetId)));
        };
        const isLit = nodeId => !spotlightRef.current || spotlightRef.current.has(nodeId);
        const linkLit = link => !spotlightRef.current || (spotlightRef.current.has(endId(link.source)) && spotlightRef.current.has(endId(link.target)));
        const nodeColor = node => (isLit(node.id) ? graphNodeColor(node, isLightTheme) : withAlpha(graphNodeColor(node, isLightTheme), isLightTheme ? 0.28 : 0.14));
        const linkColor = link => linkLit(link)
            ? (isLightTheme ? 'rgba(98, 116, 136, .42)' : 'rgba(150, 160, 190, .38)')
            : (isLightTheme ? 'rgba(98,116,136,0.14)' : 'rgba(154,160,200,0.03)');
        const getNodeObject = node => {
            const lit = isLit(node.id);
            const cacheKey = `${node.id}:${lit ? 'lit' : 'dim'}:${isLightTheme ? 'light' : 'dark'}`;
            if (!nodeObjectCacheRef.current.has(cacheKey)) {
                nodeObjectCacheRef.current.set(cacheKey, makeNodeObject(node, lit, isLightTheme));
            }
            return nodeObjectCacheRef.current.get(cacheKey);
        };

        graph
            .nodeVisibility(nodeVisible)
            .linkVisibility(linkVisible)
            .nodeColor(nodeColor)
            .linkColor(linkColor)
            .linkWidth(link => (linkLit(link) ? (isLightTheme ? 0.38 : 0.32) : 0.1))
            .linkOpacity(isLightTheme ? 0.5 : 0.34)
            .nodeThreeObject(getNodeObject);
    }, [folderByNodeId]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        let graph;
        let observer;
        let themeObserver;
        let fitTimer;
        let errorTimer;
        const reportGraphError = message => {
            errorTimer = window.setTimeout(() => setGraphError(message), 0);
        };
        const preventContextMenu = event => event.preventDefault();

        try {
            graph = ForceGraph3D({ controlType: 'orbit' })(container);
        } catch (error) {
            console.error('Knowledge graph init failed:', error);
            reportGraphError('图谱初始化失败，请确认浏览器支持 WebGL 后刷新。');
            return undefined;
        }

        graphRef.current = graph;
        reportGraphError('');
        graph.renderer()?.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));
        graph.renderer()?.setClearColor?.(0x000000, 0);
        graph.scene().add(new THREE.AmbientLight(0xffffff, 1.45));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
        keyLight.position.set(-140, 180, 240);
        graph.scene().add(keyLight);
        const blueLight = new THREE.PointLight(0x5b8ff9, 3.2, 620);
        blueLight.position.set(180, -80, 140);
        graph.scene().add(blueLight);

        try {
            graph
                .graphData(sourceGraphData)
                .backgroundColor('rgba(0,0,17,0)')
                .showNavInfo(false)
                .nodeRelSize(1)
                .nodeOpacity(0)
                .nodeVal(node => node.val)
                .nodeLabel(() => '')
                .nodeColor(node => node.color)
                .nodeThreeObject(node => makeNodeObject(node, true, Boolean(document.querySelector('.theme-light'))))
                .linkColor('rgba(150, 160, 190, .38)')
                .linkOpacity(0.34)
                .linkWidth(0.28)
                .linkDirectionalParticles(0)
                .linkDirectionalParticleWidth(0.4)
                .linkDirectionalParticleSpeed(0.002)
                .warmupTicks(54)
                .cooldownTicks(220)
                .d3AlphaDecay(0.028)
                .d3VelocityDecay(0.24)
                .onNodeClick(node => {
                    if (node.kind === 'tag') {
                        focusNodeSetRef.current = null;
                        const active = spotlightRef.current?.has(node.id);
                        spotlightRef.current = active ? null : new Set([node.id, ...(node.neighbors || [])]);
                        refreshGraphAppearance();
                        return;
                    }
                    if (node.route) {
                        navigate(node.route);
                    }
                })
                .onNodeRightClick((node, event) => {
                    event?.preventDefault?.();
                    spotlightRef.current = null;
                    focusNodeSetRef.current = new Set([node.id, ...(node.neighbors || [])]);
                    refreshGraphAppearance();
                })
                .onBackgroundClick(() => {
                    spotlightRef.current = null;
                    focusNodeSetRef.current = null;
                    refreshGraphAppearance();
                });

            graph.d3Force('charge')?.strength(-70);
            graph.d3Force('charge')?.distanceMax?.(330);
            graph.d3Force('link')?.distance?.(72);
            graph.d3Force('link')?.strength?.(0.62);
            graph.controls().enableDamping = true;
            graph.controls().dampingFactor = 0.08;
            graph.controls().rotateSpeed = 0.62;
            graph.controls().zoomSpeed = 0.75;
            graph.controls().autoRotate = false;
            graph.controls().autoRotateSpeed = 0;
            graph.cameraPosition({ x: 0, y: 36, z: 360 }, { x: 0, y: 0, z: 0 }, 0);
            refreshGraphAppearance();
            fitTimer = window.setTimeout(() => graph.zoomToFit(760, 92), 440);
        } catch (error) {
            console.error('Knowledge graph render failed:', error);
            reportGraphError('图谱渲染失败，已阻止黑屏。刷新后如果仍然出现，请告诉我浏览器控制台报错。');
        }

        const resizeGraph = () => {
            graph.width(container.clientWidth || 800);
            graph.height(container.clientHeight || 560);
        };
        observer = new ResizeObserver(resizeGraph);
        observer.observe(container);
        resizeGraph();
        container.addEventListener('contextmenu', preventContextMenu);
        themeObserver = new MutationObserver(() => refreshGraphAppearance());
        themeObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });

        return () => {
            if (fitTimer) window.clearTimeout(fitTimer);
            if (errorTimer) window.clearTimeout(errorTimer);
            observer?.disconnect();
            themeObserver?.disconnect();
            container.removeEventListener('contextmenu', preventContextMenu);
            graph._destructor?.();
            container.replaceChildren();
            graphRef.current = null;
        };
    }, [navigate, refreshGraphAppearance, sourceGraphData]);

    useEffect(() => {
        activeCategoriesRef.current = activeCategories;
        refreshGraphAppearance();
    }, [activeCategories, refreshGraphAppearance]);

    return (
        <div className="knowledge-graph-page">
            <section className="graph-board graph-board-3d graph-galaxy-board">
                <button className="graph-back-button" type="button" onClick={goBack} aria-label="返回">
                    ←
                </button>
                <div className="graph-category-panel" aria-label="图谱类别筛选">
                    <button
                        type="button"
                        className={activeCategories.size === categories.length ? 'active' : ''}
                        onClick={toggleAllCategories}
                        aria-pressed={activeCategories.size === categories.length}
                    >
                        <span style={{ background: 'linear-gradient(135deg, #facc15, #5b8ff9, #33a02c)' }} />
                        <b>全部</b>
                        <small>{sourceGraphData.nodes.length}</small>
                    </button>
                    {categories.map(category => (
                        <button
                            key={category}
                            type="button"
                            className={activeCategories.has(category) ? 'active' : ''}
                            onClick={() => toggleCategory(category)}
                            aria-pressed={activeCategories.has(category)}
                        >
                            <span style={{ background: lightPaletteByFolder[category] }} />
                            <b>{category}</b>
                            <small>{sourceGraphData.nodes.filter(node => node.folder === category).length}</small>
                        </button>
                    ))}
                </div>
                <div className="graph-zoom-panel" aria-label="图谱缩放控制">
                    <button type="button" onClick={() => zoomGraph('in')} aria-label="放大">+</button>
                    <button type="button" onClick={() => zoomGraph('out')} aria-label="缩小">−</button>
                </div>
                <div className="graph-canvas" ref={containerRef} />
                {graphError && (
                    <div className="graph-error">
                        <strong>知识图谱没有正常加载</strong>
                        <span>{graphError}</span>
                    </div>
                )}
            </section>
        </div>
    );
}
