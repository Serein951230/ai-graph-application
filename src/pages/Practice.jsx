import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import CoursePractice from '../components/CoursePractice';
import { subjects } from '../data/mockData';

export default function Practice() {
    const [searchParams] = useSearchParams();
    const subjectId = searchParams.get('subject') || 'python';
    const taskId = searchParams.get('task') || '';
    const subject = subjects.find(item => item.id === subjectId) || subjects[0];

    return (
        <div className="practice-page">
            <div className="page-header">
                <div className="page-title-stack">
                    <BackButton />
                    <h1>{subject.name}练习题</h1>
                    <p>完成全部题目后，今日任务会自动显示绿色对号。</p>
                </div>
                <Link to="/" className="btn btn-secondary">返回首页</Link>
            </div>

            <CoursePractice subject={subject} taskId={taskId} />
        </div>
    );
}
