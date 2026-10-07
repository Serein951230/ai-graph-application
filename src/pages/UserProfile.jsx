import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { discussionUsers } from '../data/socialData';
import { getUserScopedStorageKey } from '../data/learningResources';

const friendsStorageKey = 'snowwave-social-friends';
const usersStorageKey = 'snowwave-users';
const defaultProfilePrivacy = {
    studyStats: true,
    history: true,
    social: true,
    achievements: true,
};
const publicCards = [
    { key: 'studyStats', to: '/study-stats', icon: '📊', title: '学习统计', desc: '查看学习时间、练习题和课程进度。' },
    { key: 'history', to: '/history', icon: '◷', title: '历史记录', desc: '查看看过的视频，按时间从新到旧排序。' },
    { key: 'social', to: '/friends', icon: '☷', title: '社交', desc: '查看好友、群聊、回复和每日学习排行。' },
    { key: 'achievements', to: '/achievements', icon: '🏆', title: '我的成就', desc: '查看成就进度、勋章墙和解锁状态。' },
];

function loadPersonalFriends() {
    try {
        const friends = JSON.parse(localStorage.getItem(getUserScopedStorageKey(friendsStorageKey)) || '[]');
        return Array.isArray(friends) ? friends : [];
    } catch {
        return [];
    }
}

function loadRegisteredUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(usersStorageKey) || '[]');
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

export default function UserProfile() {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('user') || 'lin';
    const personalFriend = loadPersonalFriends().find(friend => friend.id === userId);
    const user = personalFriend || discussionUsers[userId] || discussionUsers.lin;
    const registeredFriend = personalFriend
        ? loadRegisteredUsers().find(item => item.id === personalFriend.accountId || item.email === personalFriend.email || item.contact === personalFriend.email)
        : null;
    const email = user.email || (personalFriend ? user.focus : '');
    const messageLink = `/messages?user=${encodeURIComponent(user.id)}`;
    const profilePrivacy = registeredFriend?.profilePrivacy ? { ...defaultProfilePrivacy, ...registeredFriend.profilePrivacy } : defaultProfilePrivacy;
    const visibleCards = publicCards.filter(card => profilePrivacy[card.key]);

    return (
        <div className="profile-page public-profile-page">
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <h1>个人中心</h1>
                </div>
            </div>

            <section className="profile-hero-card glass-card public-profile-card">
                <div className="profile-cover public-profile-cover" />
                <div className="profile-card-body">
                    <div className="profile-avatar profile-avatar-large public-profile-avatar">
                        <span className="profile-empty-avatar">{user.avatar}</span>
                    </div>
                    <div className="profile-identity">
                        <h1>{user.name}</h1>
                        <p className="profile-contact">{email || '普通学生'}</p>
                        {user.bio && <p className="profile-bio">{user.bio}</p>}
                        <div className="public-profile-actions-row">
                            <Link to={messageLink}>私信</Link>
                        </div>
                    </div>
                </div>
            </section>

            {visibleCards.length > 0 && (
                <aside className="profile-bottom-grid" aria-label="好友主页公开入口">
                    {visibleCards.map(card => <PublicProfileCard key={card.key} {...card} />)}
                </aside>
            )}
        </div>
    );
}

function PublicProfileCard({ to, icon, title, desc }) {
    return (
        <Link to={to} className="glass-card profile-nav-button">
            <span>{icon}</span>
            <div>
                <strong>{title}</strong>
                <p>{desc}</p>
            </div>
        </Link>
    );
}
