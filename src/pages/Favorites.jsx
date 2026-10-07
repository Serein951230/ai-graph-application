import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { subjects } from '../data/mockData';
import BackButton from '../components/BackButton';
import { getUserScopedStorageKey } from '../data/learningResources';
import { getUserSubjects } from '../utils/userProgress';

const favoriteCoursesKey = 'snowwave-favorite-courses';

export default function Favorites() {
    const favoriteIds = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem(getUserScopedStorageKey(favoriteCoursesKey)) || '[]');
        } catch {
            return [];
        }
    }, []);
    const favoriteSubjects = getUserSubjects(subjects).filter(subject => favoriteIds.includes(subject.id));

    return (
        <div>
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <h1>我的收藏</h1>
                    <p>快速进入已经收藏的课程。</p>
                </div>
            </div>

            {favoriteSubjects.length > 0 ? (
                <div className="subject-grid">
                    {favoriteSubjects.map(subject => (
                        <Link to={`/learning-video?subject=${subject.id}`} className="glass-card favorite-course-card" key={subject.id}>
                            <span>{subject.icon}</span>
                            <strong>{subject.name}</strong>
                            <p>{subject.progress}% 进度 · 下一主题：{subject.nextTopic}</p>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="glass-card empty-state">
                    <h2>还没有收藏课程</h2>
                    <p>进入课程学习页后，点击右上角“收藏课程”即可添加到这里。</p>
                    <Link to="/subjects" className="btn btn-primary">去选择课程</Link>
                </div>
            )}
        </div>
    );
}
