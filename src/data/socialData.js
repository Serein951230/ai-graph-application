export const discussionUsers = {
    lin: { id: 'lin', name: '林同学', avatar: '林', grade: '学习用户', email: 'lin@snowpaper.local', focus: 'lin@snowpaper.local', bio: '', stats: '学习用户 · 可私信交流' },
    qiao: { id: 'qiao', name: '乔同学', avatar: '乔', grade: '学习用户', email: 'qiao@snowpaper.local', focus: 'qiao@snowpaper.local', bio: '', stats: '学习用户 · 可私信交流' },
    chen: { id: 'chen', name: '陈同学', avatar: '陈', grade: '学习用户', email: 'chen@snowpaper.local', focus: 'chen@snowpaper.local', bio: '', stats: '学习用户 · 可私信交流' },
    wang: { id: 'wang', name: '王同学', avatar: '王', grade: '学习用户', email: 'wang@snowpaper.local', focus: 'wang@snowpaper.local', bio: '', stats: '学习用户 · 可私信交流' },
};

export const systemStudyBots = [
    { ...discussionUsers.lin, status: 'Python 和算法学习中', progress: 0, studyMinutes: 0, rankChange: '—' },
    { ...discussionUsers.qiao, status: 'Web 前端学习中', progress: 0, studyMinutes: 0, rankChange: '—' },
    { ...discussionUsers.chen, status: '课程复习中', progress: 0, studyMinutes: 0, rankChange: '—' },
];

export const systemStudyGroups = [
    { id: 'python-bots', name: 'Python 小练习群', avatar: '群', desc: '你和 2 位同学一起练习', members: 3, active: '等待你的第一条消息', memberIds: ['lin', 'chen'] },
    { id: 'frontend-bots', name: '前端作品互评群', avatar: '群', desc: '你和 2 位同学一起讨论页面', members: 3, active: '等待你的第一条消息', memberIds: ['qiao', 'chen'] },
];

export const currentChatUser = {
    id: 'me',
    name: '我',
    avatar: '我',
    grade: '当前账号',
    focus: '正在学习',
    bio: '正在学习这节视频。',
    stats: '保持今日学习进度',
};

export const chatEmojiSet = ['👍', '👏', '💡', '🔥', '🤔', '😊', '📝', '🚀'];
