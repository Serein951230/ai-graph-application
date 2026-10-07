export const lessonCatalog = {
  cs50: [
    { title: '计算机科学导论', duration: '16分钟', localSrc: '/videos/courses/computer-basics.mp4' },
    { title: '程序执行与计算模型', duration: '8分钟', localSrc: '/videos/courses/computer-execution-short.mp4' },
  ],
  python: [
    { title: '变量、字符串与输入输出', duration: '16分钟', localSrc: '/videos/courses/python-basics.mp4' },
    { title: '条件、循环与流程控制', duration: '8分钟', localSrc: '/videos/courses/python-control-flow-short.mp4' },
  ],
  git: [
    { title: '项目组织与版本思维', duration: '12分钟', localSrc: '/videos/courses/git-project-workflow.mp4' },
    { title: '分支协作与提交整理', duration: '7分钟', localSrc: '/videos/courses/git-branch-workflow-short.mp4' },
  ],
  dsa: [
    { title: '循环、迭代与算法思维', duration: '15分钟', localSrc: '/videos/courses/algorithm-thinking.mp4' },
    { title: '数据结构与问题拆分', duration: '8分钟', localSrc: '/videos/courses/algorithm-structures-short.mp4' },
  ],
  htmlcss: [
    { title: 'Web 项目的结构化思路', duration: '15分钟', localSrc: '/videos/courses/web-programming.mp4' },
    { title: '页面交互与模块组织', duration: '8分钟', localSrc: '/videos/courses/web-interaction-short.mp4' },
  ],
  testing: [
    { title: '测试与调试入门', duration: '18分钟', localSrc: '/videos/courses/testing-debugging.mp4' },
    { title: '调试过程与错误定位', duration: '8分钟', localSrc: '/videos/courses/debugging-practice-short.mp4' },
  ],
  functions: [
    { title: '函数边界与抽象思维', duration: '14分钟', localSrc: '/videos/courses/functions-abstraction-short.mp4' },
    { title: '作用域、参数与复用', duration: '8分钟', localSrc: '/videos/courses/functions-scope-short.mp4' },
  ],
  data: [
    { title: '数据处理入门', duration: '15分钟', localSrc: '/videos/courses/data-processing-short.mp4' },
    { title: '集合数据与遍历处理', duration: '8分钟', localSrc: '/videos/courses/data-collections-short.mp4' },
  ],
  oop: [
    { title: '类、对象与封装', duration: '16分钟', localSrc: '/videos/courses/oop-basics-short.mp4' },
    { title: '对象建模与接口设计', duration: '8分钟', localSrc: '/videos/courses/oop-design-short.mp4' },
  ],
  recursion: [
    { title: '递归与问题拆解', duration: '14分钟', localSrc: '/videos/courses/recursion-problem-solving-short.mp4' },
    { title: '递归练习与边界条件', duration: '8分钟', localSrc: '/videos/courses/recursion-practice-short.mp4' },
  ],
};

export const notes = [
  {
    id: 'note-cs50',
    title: 'CS50 计算机基础',
    course: 'CS50 计算机基础',
    subjectId: 'cs50',
    updated: '今天 18:30',
    summary: '变量、条件、循环、函数和抽象思维整理。',
    tags: ['CS50', '计算机基础', '抽象思维'],
    content: '## CS50 计算机基础\n\n变量、条件、循环和函数是计算机科学导论里的核心基础。\n\n关联：[[React 组件与状态]]、[[软件开发练习题]]',
  },
  {
    id: 'note-web',
    title: 'React 组件与状态',
    course: 'Web 编程基础',
    subjectId: 'htmlcss',
    updated: '昨天 20:12',
    summary: '组件拆分、props、state 和交互状态记录。',
    tags: ['React', '组件', '状态'],
    content: '## React 组件与状态\n\n组件负责拆分界面，props 传递外部数据，state 保存交互变化。\n\n关联：[[Express API 设计]]、[[Web 项目的结构化思路]]',
  },
  {
    id: 'note-api',
    title: 'Express API 设计',
    course: '接口与数据交换',
    subjectId: 'htmlcss',
    updated: '周一 21:05',
    summary: '路由、中间件、错误处理和接口结构练习。',
    tags: ['Express', 'API', '后端'],
    content: '## Express API 设计\n\n路由负责资源入口，中间件处理鉴权、日志和错误，接口返回结构要稳定。\n\n关联：[[React 组件与状态]]、[[项目笔记整理]]',
  },
];

export const databaseStorageKeys = {
  folders: 'snowwave-database-folders',
  files: 'snowwave-database-files',
  notes: 'snowwave-notes',
  noteFolders: 'snowwave-note-folders',
  ragSettings: 'snowwave-rag-settings',
};

export const defaultRagSettings = {
  useDatabase: true,
  useNotes: true,
  useCourses: true,
  saveChatHistory: true,
  showCitations: true,
};

export const getCurrentUserBinding = () => {
  try {
    return JSON.parse(localStorage.getItem('snowwave-user-binding') || '{}');
  } catch {
    return {};
  }
};

export const getCurrentUserDisplayAccount = () => {
  const binding = getCurrentUserBinding();
  return binding.contact || binding.email || binding.nickname || '本地用户';
};

export const initialFolders = ['/我的资料', '/我的资料/视频', '/我的资料/文档', '/我的资料/笔记'];

export const initialFiles = [];

export const getCurrentUserDatabaseId = () => {
  try {
    const binding = getCurrentUserBinding();
    return encodeURIComponent(binding.id || `${binding.method || 'guest'}-${binding.contact || binding.nickname || 'local'}`);
  } catch {
    return 'guest-local';
  }
};

// Rule: personal data must be stored with this helper. Only auth records,
// global theme/nav preferences, course catalogs, and admin/system data stay unscoped.
export const getUserScopedStorageKey = (key) => `${key}:${getCurrentUserDatabaseId()}`;

export const getCurrentUserDatabaseLabel = () => {
  const binding = getCurrentUserBinding();
  return binding.contact || binding.nickname || '本地资料库';
};

export const getUserDatabaseStorageKeys = () => {
  const userId = getCurrentUserDatabaseId();
  return {
    folders: `${databaseStorageKeys.folders}:${userId}`,
    files: `${databaseStorageKeys.files}:${userId}`,
  };
};

export const loadDatabaseFiles = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(getUserDatabaseStorageKeys().files) || '[]');
    return saved.length ? saved : initialFiles;
  } catch {
    return initialFiles;
  }
};

export const loadDatabaseFolders = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(getUserDatabaseStorageKeys().folders) || '[]');
    return saved.length ? saved : initialFolders;
  } catch {
    return initialFolders;
  }
};

export const saveDatabaseFiles = (nextFiles) => {
  try {
    localStorage.setItem(getUserDatabaseStorageKeys().files, JSON.stringify(nextFiles));
  } catch {
    const lightweightFiles = nextFiles.map((file) => ({
      ...file,
      dataUrl: '',
      extractedText: file.extractedText ? file.extractedText.slice(0, 2000) : '',
    }));
    localStorage.setItem(getUserDatabaseStorageKeys().files, JSON.stringify(lightweightFiles));
  }
  window.dispatchEvent(new Event('snowwave-database-updated'));
};

export const saveDatabaseFolders = (nextFolders) => {
  localStorage.setItem(getUserDatabaseStorageKeys().folders, JSON.stringify(nextFolders));
};

export const loadNotes = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(getUserScopedStorageKey(databaseStorageKeys.notes)) || '[]');
    return saved;
  } catch {
    return [];
  }
};

export const saveNotes = (nextNotes) => {
  localStorage.setItem(getUserScopedStorageKey(databaseStorageKeys.notes), JSON.stringify(nextNotes));
};

export const loadNoteFolders = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(getUserScopedStorageKey(databaseStorageKeys.noteFolders)) || '[]');
    return saved.length ? saved : ['全部笔记'];
  } catch {
    return ['全部笔记'];
  }
};

export const saveNoteFolders = (nextFolders) => {
  localStorage.setItem(getUserScopedStorageKey(databaseStorageKeys.noteFolders), JSON.stringify(nextFolders));
};

export const loadRagSettings = () => {
  try {
    const key = getUserScopedStorageKey(databaseStorageKeys.ragSettings);
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    const safe = Object.fromEntries(Object.entries(saved).filter(([field]) => field in defaultRagSettings));
    if (Object.keys(safe).length !== Object.keys(saved).length) localStorage.setItem(key, JSON.stringify(safe));
    return { ...defaultRagSettings, ...safe };
  } catch {
    return defaultRagSettings;
  }
};

export const saveRagSettings = (nextSettings) => {
  const safe = Object.fromEntries(Object.entries(nextSettings).filter(([field]) => field in defaultRagSettings));
  localStorage.setItem(getUserScopedStorageKey(databaseStorageKeys.ragSettings), JSON.stringify({ ...defaultRagSettings, ...safe }));
};

const chunkText = (text, size = 260) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks = [];
  for (let index = 0; index < clean.length; index += size) {
    chunks.push(clean.slice(index, index + size));
  }
  return chunks;
};

const normalizeSearchText = value => String(value || '').toLowerCase().replace(/\s+/g, '');

export const splitSearchKeywords = question => normalizeSearchText(question)
  .split(/[,，。！？!?、:：;；\-_/\\|]+/)
  .flatMap(part => part.match(/[\u4e00-\u9fa5]{2,}|[a-z0-9]{2,}/g) || [])
  .filter(Boolean);

export const buildRagChunks = (settings = loadRagSettings()) => {
  const chunks = [];
  if (settings.useDatabase) {
    loadDatabaseFiles().forEach(file => {
      const text = file.extractedText || `${file.name} ${file.folder} ${file.type} ${file.status || ''}`;
      chunkText(text).forEach((content, index) => chunks.push({
        id: `file:${file.id}:${index}`,
        sourceId: file.id,
        sourceType: '数据库',
        title: file.name,
        folder: file.folder,
        content,
      }));
    });
  }
  if (settings.useNotes) {
    loadNotes().forEach(note => {
      const text = `${note.title} ${note.course} ${(note.tags || []).join(' ')} ${note.summary || ''} ${note.content || ''}`;
      chunkText(text).forEach((content, index) => chunks.push({
        id: `note:${note.id}:${index}`,
        sourceId: note.id,
        sourceType: '笔记',
        title: note.title,
        folder: note.folder || note.course,
        content,
      }));
    });
  }
  if (settings.useCourses) {
    Object.entries(lessonCatalog).forEach(([subjectId, lessons]) => {
      lessons.forEach((lesson, lessonIndex) => {
        const text = `${lesson.title} ${lesson.duration} ${subjectId}`;
        chunkText(text).forEach((content, index) => chunks.push({
          id: `course:${subjectId}:${lessonIndex}:${index}`,
          sourceId: `${subjectId}-${lessonIndex}`,
          sourceType: '课程',
          title: lesson.title,
          folder: subjectId,
          content,
        }));
      });
    });
  }
  return chunks;
};

export const retrieveRagChunks = (question, settings = loadRagSettings(), limit = 5) => {
  const keywords = splitSearchKeywords(question);
  if (!keywords.length) return [];
  return buildRagChunks(settings)
    .map(chunk => {
      const haystack = normalizeSearchText(`${chunk.title} ${chunk.folder} ${chunk.content}`);
      const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 2 : 0), 0)
        + keywords.reduce((total, keyword) => total + (chunk.title.toLowerCase().includes(keyword) ? 1 : 0), 0);
      return { ...chunk, score };
    })
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-Hans-CN'))
    .slice(0, limit);
};
