import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { chatEmojiSet, discussionUsers, systemStudyGroups } from '../data/socialData';
import { getCurrentUserBinding, getUserScopedStorageKey } from '../data/learningResources';

const messageStorageKey = 'snowwave-private-messages';
const friendsStorageKey = 'snowwave-social-friends';
const groupsStorageKey = 'snowwave-social-groups';

function loadMessages() {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(messageStorageKey)) || '{}');
    } catch {
        return {};
    }
}

function saveMessages(nextMessages) {
    localStorage.setItem(getUserScopedStorageKey(messageStorageKey), JSON.stringify(nextMessages));
}

function loadFriends() {
    try {
        const friends = JSON.parse(localStorage.getItem(getUserScopedStorageKey(friendsStorageKey)) || '[]');
        return Array.isArray(friends) ? friends : [];
    } catch {
        return [];
    }
}

function loadGroups() {
    try {
        const groups = JSON.parse(localStorage.getItem(getUserScopedStorageKey(groupsStorageKey)) || '[]');
        return Array.isArray(groups) ? groups : [];
    } catch {
        return [];
    }
}

export default function Messages() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedUserId = searchParams.get('user') || searchParams.get('member') || '';
    const requestedGroupId = searchParams.get('group') || '';
    const [messageStore, setMessageStore] = useState(loadMessages);
    const [personalFriends] = useState(loadFriends);
    const [personalGroups] = useState(loadGroups);
    const personalFriendById = useMemo(() => Object.fromEntries(personalFriends.map(friend => [friend.id, friend])), [personalFriends]);
    const groupById = useMemo(() => Object.fromEntries([...personalGroups, ...systemStudyGroups].map(group => [group.id, group])), [personalGroups]);
    const contacts = useMemo(() => {
        const ids = Object.keys(messageStore).filter(id => discussionUsers[id] || personalFriendById[id] || id.startsWith('group:'));
        const canUseRequestedUser = requestedUserId && (discussionUsers[requestedUserId] || personalFriendById[requestedUserId]);
        const withRequested = canUseRequestedUser ? [requestedUserId, ...ids] : ids;
        const withGroup = requestedGroupId && groupById[requestedGroupId] ? [`group:${requestedGroupId}`, ...withRequested] : withRequested;
        return [...new Set(withGroup)]
            .map(id => id.startsWith('group:')
                ? { ...groupById[id.slice(6)], id, isGroup: true, focus: `${groupById[id.slice(6)]?.members || 3} 人小群` }
                : discussionUsers[id] || personalFriendById[id])
            .filter(Boolean);
    }, [groupById, messageStore, personalFriendById, requestedGroupId, requestedUserId]);
    const activeUser = useMemo(() => {
        if (requestedGroupId && groupById[requestedGroupId]) {
            return { ...groupById[requestedGroupId], id: `group:${requestedGroupId}`, isGroup: true, grade: '小群', focus: `${groupById[requestedGroupId].members} 人小群` };
        }
        if (requestedUserId && discussionUsers[requestedUserId]) return discussionUsers[requestedUserId];
        if (requestedUserId && personalFriendById[requestedUserId]) return personalFriendById[requestedUserId];
        return contacts[0] || null;
    }, [contacts, groupById, personalFriendById, requestedGroupId, requestedUserId]);
    const [draft, setDraft] = useState('');
    const messages = useMemo(() => activeUser ? messageStore[activeUser.id] || [] : [], [activeUser, messageStore]);
    const currentUserBinding = getCurrentUserBinding();
    const myAvatar = (currentUserBinding.nickname || currentUserBinding.contact || currentUserBinding.email || '?').trim().slice(0, 1);

    const sendMessage = (event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !activeUser) return;
        const nextThread = [
            ...messages,
            { id: `msg-${Date.now()}`, sender: 'me', text, time: '刚刚' },
        ];
        const nextStore = { ...messageStore, [activeUser.id]: nextThread };
        setMessageStore(nextStore);
        saveMessages(nextStore);
        setDraft('');
    };

    const appendEmoji = emoji => {
        setDraft(current => `${current}${emoji}`);
    };
    const openUserProfile = user => {
        if (user.isGroup) return;
        navigate(`/user-profile?user=${encodeURIComponent(user.id)}`);
    };

    return (
        <div className="messages-page">
            <section className="messages-shell">
                <aside className="messages-contacts">
                    <Link className="messages-contact-back" to="/friends" aria-label="返回社交">←</Link>
                    <div className="messages-contact-list">
                        {contacts.length ? contacts.map(contact => (
                            <div className={`messages-contact-row ${contact.id === activeUser.id ? 'active' : ''}`} key={contact.id}>
                                <button className="messages-contact-avatar" type="button" onClick={() => openUserProfile(contact)} aria-label={`查看${contact.name}个人中心`}>
                                    {contact.avatar}
                                </button>
                                <button className="messages-contact-main" type="button" onClick={() => contact.isGroup ? setSearchParams({ group: contact.id.slice(6) }) : setSearchParams({ user: contact.id })}>
                                    <strong>{contact.name}</strong>
                                    <small>{contact.focus}</small>
                                </button>
                            </div>
                        )) : (
                            <div className="messages-empty-state compact">
                                <strong>暂无私信联系人</strong>
                                <p>新账号不会带入其他账号的私信列表。</p>
                            </div>
                        )}
                    </div>
                </aside>

                <div className="messages-chat">
                    {activeUser ? (
                        <header className="messages-chat-header">
                            <button className="message-avatar-button" type="button" onClick={() => openUserProfile(activeUser)} aria-label={activeUser.isGroup ? activeUser.name : `查看${activeUser.name}个人中心`}>
                                {activeUser.avatar}
                            </button>
                            <div>
                                <h2>{activeUser.name}</h2>
                                <p>{activeUser.grade} · {activeUser.focus}</p>
                            </div>
                        </header>
                    ) : (
                        <header className="messages-chat-header">
                            <div>
                                <h2>私信</h2>
                                <p>当前账号暂无私信记录。</p>
                            </div>
                        </header>
                    )}

                    <div className="messages-list">
                        {messages.length > 0 ? messages.map((message, index) => {
                            const isMe = message.sender === 'me';
                            const showTime = index === 0 || message.time === '刚刚';
                            return (
                                <React.Fragment key={message.id}>
                                    {showTime && <div className="message-time-divider">{message.time}</div>}
                                    <article className={`message-row ${isMe ? 'me' : ''}`}>
                                        {!isMe && (
                                            <button className="message-avatar message-avatar-clickable" type="button" onClick={() => openUserProfile(activeUser)} aria-label={`查看${activeUser.name}个人中心`}>
                                                {activeUser.avatar}
                                            </button>
                                        )}
                                        <div className="message-bubble">
                                            <p>{message.text}</p>
                                        </div>
                                        {isMe && (
                                            <button className="message-avatar message-avatar-clickable" type="button" onClick={() => navigate('/profile')} aria-label="查看我的个人中心">
                                                {myAvatar}
                                            </button>
                                        )}
                                    </article>
                                </React.Fragment>
                            );
                        }) : (
                            <div className="messages-empty-state">
                                <strong>还没有私信记录</strong>
                                <p>{activeUser ? `给 ${activeUser.name} 发送第一条消息后，对话会保存在当前账号下。` : '从社交页进入某个用户或小群后，可以开始当前账号自己的对话。'}</p>
                            </div>
                        )}
                    </div>

                    <form className="messages-composer" onSubmit={sendMessage}>
                        <div className="messages-emoji-row" aria-label="表情">
                            {chatEmojiSet.map(emoji => (
                                <button key={emoji} type="button" onClick={() => appendEmoji(emoji)}>{emoji}</button>
                            ))}
                        </div>
                        <div className="messages-input-row">
                            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={activeUser ? `给 ${activeUser.name} 发消息...` : '暂无可发送对象'} disabled={!activeUser} />
                            <button type="submit" disabled={!activeUser}>发送</button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
