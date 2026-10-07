export const lmsUsers = [
    { id: 'u-admin-1', name: '平台管理员', email: 'admin@snowpaper.local', role: 'admin', status: '已启用', lastActive: '今天 20:10' },
    { id: 'u-admin-2', name: '课程管理员', email: 'course.admin@snowpaper.local', role: 'admin', status: '已启用', lastActive: '今天 18:42' },
    { id: 'u-user-1', name: '林同学', email: 'lin@snowpaper.local', role: 'user', status: '学习中', lastActive: '今天 19:30' },
    { id: 'u-user-2', name: '乔同学', email: 'qiao@snowpaper.local', role: 'user', status: '学习中', lastActive: '今天 17:05' },
    { id: 'u-user-3', name: '陈同学', email: 'chen@snowpaper.local', role: 'user', status: '待跟进', lastActive: '昨天 20:12' },
];

export const lmsCourses = [
    { id: 'c-software', title: '软件开发工程师路径', description: 'CS50、Python、Git、算法与项目实战', owner: '课程管理员', users: 26, lessons: 8, materials: 14, status: '已上线' },
    { id: 'c-frontend', title: '前端开发工程师路径', description: 'HTML、CSS、JavaScript、React 项目', owner: '平台管理员', users: 18, lessons: 6, materials: 11, status: '已上线' },
    { id: 'c-backend', title: '后端开发工程师路径', description: 'Node.js、Express、SQL、认证与上传', owner: '课程管理员', users: 21, lessons: 7, materials: 9, status: '整理中' },
];

export const lmsLessons = [
    { id: 'l-1', title: 'CS50 计算机基础', course: '软件开发工程师路径', videoUrl: '/uploads/cs50-intro.mp4', pdfUrl: '/uploads/cs50-notes.pdf', comments: 4, indexed: true },
    { id: 'l-2', title: 'Python 入门项目', course: '软件开发工程师路径', videoUrl: '/uploads/python-project.mp4', pdfUrl: '/uploads/python-project.pdf', comments: 2, indexed: true },
    { id: 'l-3', title: 'React 组件与状态', course: '前端开发工程师路径', videoUrl: '/uploads/react-state.mp4', pdfUrl: '/uploads/react-state.pdf', comments: 5, indexed: true },
    { id: 'l-4', title: 'Express API 设计', course: '后端开发工程师路径', videoUrl: '/uploads/express-api.mp4', pdfUrl: '/uploads/express-api.pdf', comments: 3, indexed: false },
];

export const lmsApiMap = [
    { module: '认证', method: 'POST', path: '/api/auth/register', usage: '注册用户或管理员账号' },
    { module: '认证', method: 'POST', path: '/api/auth/login', usage: '登录并返回 JWT' },
    { module: '后台统计', method: 'GET', path: '/api/admin/stats', usage: '统计用户、管理员、课程数量' },
    { module: '课程', method: 'POST', path: '/api/courses', usage: '管理员创建课程' },
    { module: '课程', method: 'GET', path: '/api/courses', usage: '获取课程列表' },
    { module: '上传', method: 'POST', path: '/api/lessons', usage: '上传视频和 PDF 课件' },
];

export const lmsRoleLabels = {
    admin: '管理员',
    user: '用户',
};
