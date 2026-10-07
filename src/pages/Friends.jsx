import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { discussionUsers, systemStudyBots, systemStudyGroups } from '../data/socialData';
import { getCurrentUserBinding, getUserScopedStorageKey } from '../data/learningResources';
import { formatStudyMinutes, getTodayStudySeconds, readStudyTimeLog } from '../utils/studyTime';

const USERS_STORAGE_KEY = 'snowwave-users';
const friendsStorageKey = 'snowwave-social-friends';
const groupsStorageKey = 'snowwave-social-groups';
const hiddenDefaultFriendsKey = 'snowwave-social-hidden-default-friends';

const socialTabs = [
    { id: 'friends', label: '好友' },
    { id: 'groups', label: '群聊' },
    { id: 'replies', label: '回复' },
    { id: 'ranking', label: '每日排行' },
];

const readScopedList = (key) => {
    try {
        const saved = JSON.parse(localStorage.getItem(getUserScopedStorageKey(key)) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const writeScopedList = (key, value) => {
    localStorage.setItem(getUserScopedStorageKey(key), JSON.stringify(value));
};

const normalizeEmail = value => String(value || '').trim().toLowerCase();

const readRegisteredUsers = () => {
    try {
        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
};

const userStorageId = user => user.id || `${user.method || 'email'}-${user.contact || user.email || user.phone || user.nickname || 'local'}`;

const buildFriendFromUser = user => {
    const email = user.email || (user.method === 'email' ? user.contact : '');
    const name = user.nickname || email?.split('@')[0] || user.contact || '学习用户';
    return {
        id: `user:${userStorageId(user)}`,
        accountId: userStorageId(user),
        source: 'registered-user',
        name,
        avatar: name.trim().slice(0, 1) || '?',
        grade: '学习用户',
        focus: email || user.contact || '已注册账号',
        email,
        status: '已添加好友',
        progress: 0,
        studyMinutes: 0,
        rankChange: '—',
    };
};

const friendContactText = friend => friend.email || (friend.source === 'registered-user' ? friend.focus : '普通学生');

const readCurrentProfile = () => {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey('snowwave-profile')) || '{}');
    } catch {
        return {};
    }
};

export default function Friends() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('friends');
    const [inviteGroupId, setInviteGroupId] = useState('');
    const [friendEmail, setFriendEmail] = useState('');
    const [friendNotice, setFriendNotice] = useState('');
    const [friendError, setFriendError] = useState('');
    const [groupName, setGroupName] = useState('');
    const [groupNotice, setGroupNotice] = useState('');
    const [personalFriends, setPersonalFriends] = useState(() => readScopedList(friendsStorageKey));
    const [hiddenDefaultFriends, setHiddenDefaultFriends] = useState(() => readScopedList(hiddenDefaultFriendsKey));
    const defaultFriends = systemStudyBots.filter(friend => !hiddenDefaultFriends.includes(friend.id));
    const friends = [...personalFriends, ...defaultFriends];
    const [personalGroups, setPersonalGroups] = useState(() => readScopedList(groupsStorageKey));
    const groups = [...personalGroups, ...systemStudyGroups];
    const [replies] = useState(() => readScopedList('snowwave-social-replies'));
    const currentBinding = getCurrentUserBinding();
    const currentProfile = readCurrentProfile();
    const todayStudySeconds = getTodayStudySeconds(readStudyTimeLog());
    const currentUserRank = {
        id: 'me',
        name: currentProfile.nickname || currentBinding.nickname || currentBinding.contact || '我',
        avatar: (currentProfile.nickname || currentBinding.nickname || currentBinding.contact || '我').trim().slice(0, 1),
        studySeconds: todayStudySeconds,
        rankChange: '我',
    };
    const rankingUsers = [
        currentUserRank,
        ...friends.map(friend => ({ ...friend, studySeconds: (Number(friend.studyMinutes) || 0) * 60 })),
    ].sort((a, b) => b.studySeconds - a.studySeconds);

    const openUserProfile = (user) => {
        if (discussionUsers[user.id]) {
            navigate(`/user-profile?user=${encodeURIComponent(user.id)}`);
            return;
        }
        if (user.source === 'registered-user') {
            navigate(`/user-profile?user=${encodeURIComponent(user.id)}`);
            return;
        }
        navigate('/profile');
    };
    const removeFriend = (friendId) => {
        if (personalFriends.some(friend => friend.id === friendId)) {
            const nextFriends = personalFriends.filter(friend => friend.id !== friendId);
            setPersonalFriends(nextFriends);
            writeScopedList(friendsStorageKey, nextFriends);
            return;
        }
        const nextHidden = [...new Set([...hiddenDefaultFriends, friendId])];
        setHiddenDefaultFriends(nextHidden);
        writeScopedList(hiddenDefaultFriendsKey, nextHidden);
    };
    const addFriendByEmail = (event) => {
        event.preventDefault();
        const email = normalizeEmail(friendEmail);
        setFriendNotice('');
        setFriendError('');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFriendError('请输入有效的好友邮箱。');
            return;
        }
        const currentUser = getCurrentUserBinding();
        const currentEmail = normalizeEmail(currentUser.email || currentUser.contact);
        if (email === currentEmail) {
            setFriendError('不能添加自己。');
            return;
        }
        const matchedUser = readRegisteredUsers().find(user => normalizeEmail(user.email || (user.method === 'email' ? user.contact : '')) === email);
        if (!matchedUser) {
            setFriendError('没有找到这个邮箱对应的注册用户。');
            return;
        }
        const nextFriend = buildFriendFromUser(matchedUser);
        if (personalFriends.some(friend => friend.id === nextFriend.id || normalizeEmail(friend.email) === email)) {
            setFriendError('这个用户已经在好友列表里。');
            return;
        }
        const nextFriends = [nextFriend, ...personalFriends];
        setPersonalFriends(nextFriends);
        writeScopedList(friendsStorageKey, nextFriends);
        setFriendEmail('');
        setFriendNotice(`已添加 ${nextFriend.name}。`);
    };
    const createGroup = (event) => {
        event.preventDefault();
        const name = groupName.trim();
        if (!name) {
            setGroupNotice('先输入群聊名称。');
            return;
        }
        const nextGroup = {
            id: `custom-${Date.now()}`,
            avatar: '群',
            name,
            desc: '当前账号创建的小群',
            members: 1,
            active: '刚刚创建',
            memberIds: [],
            source: 'custom',
        };
        const nextGroups = [nextGroup, ...personalGroups];
        setPersonalGroups(nextGroups);
        writeScopedList(groupsStorageKey, nextGroups);
        setGroupName('');
        setGroupNotice(`已创建 ${name}。`);
        setInviteGroupId(nextGroup.id);
    };

    return (
        <div className="social-page">
            <div className="page-header social-header">
                <div>
                    <h1>社交</h1>
                    <p>查看好友、群聊、回复和每日学习排行。</p>
                </div>
            </div>

            <div className="social-layout">
                <main className="social-main">
                    <form className="social-add-friend" onSubmit={addFriendByEmail}>
                        <div>
                            <strong>添加好友</strong>
                            <span>输入已注册用户的邮箱查找并添加。</span>
                        </div>
                        <input value={friendEmail} onChange={event => { setFriendEmail(event.target.value); setFriendError(''); setFriendNotice(''); }} placeholder="好友邮箱" inputMode="email" />
                        <button type="submit">添加</button>
                        {(friendError || friendNotice) && <p className={friendError ? 'error' : 'success'}>{friendError || friendNotice}</p>}
                    </form>
                    <nav className="social-tabs" aria-label="社交栏目">
                        {socialTabs.map(tab => (
                            <button
                                className={activeTab === tab.id ? 'active' : ''}
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {activeTab === 'friends' && (
                        <section className="social-panel">
                            {friends.length ? (
                                <div className="social-card-grid">
                                    {friends.map(friend => (
                                    <article className="glass-card social-friend-card" key={friend.id}>
                                        <button className="social-avatar" type="button" onClick={() => openUserProfile(friend)} aria-label={`查看${friend.name}主页`}>
                                            {friend.avatar}
                                        </button>
                                        <div>
                                            <div className="social-card-title">
                                                <strong>{friend.name}</strong>
                                            </div>
                                            <p>{friendContactText(friend)}</p>
                                        </div>
                                        <Link to={`/messages?user=${encodeURIComponent(friend.id)}`}>私信</Link>
                                        <button className="social-remove-friend" type="button" onClick={() => removeFriend(friend.id)}>删除</button>
                                    </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state social-empty-state">
                                    <h2>暂无好友</h2>
                                    <p>新账号不会带入其他账号的好友关系。</p>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'groups' && (
                        <section className="social-panel">
                            <form className="social-create-group" onSubmit={createGroup}>
                                <div>
                                    <strong>创建群聊</strong>
                                    <span>新群只保存在当前账号下，创建后可以邀请已有好友。</span>
                                </div>
                                <input value={groupName} onChange={event => { setGroupName(event.target.value); setGroupNotice(''); }} placeholder="群聊名称" />
                                <button type="submit">创建</button>
                                {groupNotice && <p>{groupNotice}</p>}
                            </form>
                            {groups.length ? (
                                <div className="social-message-list">
                                    {groups.map(group => (
                                    <article className="glass-card social-group-card" key={group.id}>
                                        <Link className="social-message-row" to={`/messages?group=${encodeURIComponent(group.id)}`}>
                                            <span className="social-avatar">群</span>
                                            <div>
                                                <strong>{group.name}</strong>
                                                <p>{group.desc} · {group.members} 人</p>
                                            </div>
                                            <em>{group.active}</em>
                                        </Link>
                                        <button className="social-invite-button" type="button" onClick={() => setInviteGroupId(current => current === group.id ? '' : group.id)} aria-label={`邀请好友加入${group.name}`}>
                                            +
                                        </button>
                                        {inviteGroupId === group.id && (
                                            <div className="social-invite-panel">
                                                <strong>邀请好友进群</strong>
                                                <div>
                                                    {friends.map(friend => (
                                                        <button type="button" key={friend.id}>
                                                            <span className="social-mini-avatar">{friend.avatar}</span>
                                                            {friend.name}
                                                            <em>邀请</em>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state social-empty-state">
                                    <h2>暂无群聊</h2>
                                    <p>加入或创建群聊后，群聊列表会只保存在当前账号下。</p>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'replies' && (
                        <section className="social-panel">
                            {replies.length ? (
                                <div className="social-reply-list">
                                    {replies.map(reply => (
                                    <article className="glass-card social-reply-card" key={reply.id}>
                                        <button className="social-avatar" type="button" onClick={() => openUserProfile(reply.user)} aria-label={`查看${reply.user.name}主页`}>
                                            {reply.user.avatar}
                                        </button>
                                        <div>
                                            <div className="social-card-title">
                                                <strong>{reply.user.name}</strong>
                                                <span>{reply.time}</span>
                                            </div>
                                            <p>{reply.text}</p>
                                            <small>{reply.source}</small>
                                        </div>
                                    </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state social-empty-state">
                                    <h2>暂无回复</h2>
                                    <p>当前账号被回复、被提到后才会在这里显示。</p>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'ranking' && (
                        <section className="social-panel">
                            <div className="social-rank-list social-rank-list-wide">
                                {rankingUsers.map((friend, index) => (
                                    <button className="glass-card social-rank-row" type="button" key={friend.id} onClick={() => friend.id === 'me' ? navigate('/profile') : openUserProfile(friend)}>
                                        <span>{index + 1}</span>
                                        <strong>{friend.name}</strong>
                                        <small>{friend.studySeconds ? formatStudyMinutes(friend.studySeconds) : '暂无学习记录'}</small>
                                        <em>{friend.rankChange}</em>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
