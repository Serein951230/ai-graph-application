import React, { useMemo, useState } from 'react';
import { quizDatabase } from '../data/mockData';
import { getUserScopedStorageKey } from '../data/learningResources';
import { todayKey } from '../utils/studyTime';

const practiceStatsKey = 'snowwave-practice-stats';

const recordPracticeStats = (subjectId, questionCount, correctCount) => {
  try {
    const key = getUserScopedStorageKey(practiceStatsKey);
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    const date = todayKey();
    const today = saved[date] || { totalQuestions: 0, correctQuestions: 0, subjects: {} };
    const subjectStats = today.subjects?.[subjectId] || { totalQuestions: 0, correctQuestions: 0 };
    const next = {
      ...saved,
      [date]: {
        totalQuestions: (today.totalQuestions || 0) + questionCount,
        correctQuestions: (today.correctQuestions || 0) + correctCount,
        subjects: {
          ...(today.subjects || {}),
          [subjectId]: {
            totalQuestions: (subjectStats.totalQuestions || 0) + questionCount,
            correctQuestions: (subjectStats.correctQuestions || 0) + correctCount,
          },
        },
      },
    };
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event('snowwave-practice-stats-updated'));
    window.dispatchEvent(new Event('snowwave-local-data-updated'));
  } catch {
    // Practice completion should keep working even if localStorage is unavailable.
  }
};

const markPracticeTasksComplete = (subjectId, taskId) => {
  try {
    const taskKey = getUserScopedStorageKey('snowwave-today-tasks');
    const savedTasks = JSON.parse(localStorage.getItem(taskKey) || '[]');
    if (!savedTasks.length) return;
    const nextTasks = savedTasks.map((task) => {
      const matchesDirectTask = taskId && task.id === taskId;
      const matchesSubjectQuiz = task.actionType === 'quiz' && task.path?.includes(`subject=${subjectId}`);
      return matchesDirectTask || matchesSubjectQuiz ? { ...task, completed: true, status: '已完成' } : task;
    });
    localStorage.setItem(taskKey, JSON.stringify(nextTasks));
    window.dispatchEvent(new Event('snowwave-tasks-updated'));
    window.dispatchEvent(new Event('snowwave-local-data-updated'));
  } catch {
    // Keep the quiz usable if localStorage is unavailable.
  }
};

export default function CoursePractice({ subject, taskId = '', questions: lessonQuestions, practiceTitle = '', practiceLabel = '课程习题' }) {
  const questions = useMemo(() => (
    lessonQuestions?.length ? lessonQuestions : quizDatabase[subject.id] || quizDatabase.cs50 || []
  ), [lessonQuestions, subject.id]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const correctCount = questions.reduce((sum, question) => (
    answers[question.id] === question.answer ? sum + 1 : sum
  ), 0);
  const scorePercent = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  const chooseAnswer = (questionId, optionIndex) => {
    if (submitted) return;
    setAnswers(current => ({ ...current, [questionId]: optionIndex }));
  };

  const submitPractice = () => {
    if (!allAnswered) return;
    markPracticeTasksComplete(subject.id, taskId);
    recordPracticeStats(subject.id, questions.length, correctCount);
    setSubmitted(true);
  };

  return (
    <section className="course-practice-panel">
      <header className="course-practice-header">
        <div>
          <span>{practiceLabel}</span>
          <h2>{practiceTitle || subject.name}</h2>
          <p>完成全部题目并提交后，相关今日任务会自动出现绿色对勾。</p>
        </div>
        <div className="course-practice-progress">
          <strong>{answeredCount}</strong>
          <span>/ {questions.length} 已作答</span>
        </div>
      </header>

      <div className="course-practice-list">
        {questions.map((question, index) => {
          const selectedAnswer = answers[question.id];
          const isCorrect = submitted && selectedAnswer === question.answer;
          const isWrong = submitted && selectedAnswer !== question.answer;

          return (
            <article className={`course-practice-question ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`} key={question.id}>
              <div className="course-question-heading">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{question.question}</h3>
              </div>
              <div className="course-practice-options">
                {question.options.map((option, optionIndex) => {
                  const selected = selectedAnswer === optionIndex;
                  const answer = submitted && question.answer === optionIndex;
                  return (
                    <button
                      type="button"
                      key={option}
                      className={`${selected ? 'active' : ''} ${answer ? 'answer' : ''}`}
                      onClick={() => chooseAnswer(question.id, optionIndex)}
                      disabled={submitted}
                    >
                      <span>{String.fromCharCode(65 + optionIndex)}.</span>
                      <strong>{option}</strong>
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="course-practice-explain">
                  {isCorrect ? '回答正确' : '需要复习'}：{question.explanation}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <footer className="course-practice-footer">
        {submitted ? (
          <div className="course-practice-result">
            <span>✓</span>
            <div>
              <strong>已完成练习</strong>
              <p>正确 {correctCount}/{questions.length}，得分 {scorePercent}%</p>
            </div>
          </div>
        ) : (
          <button type="button" onClick={submitPractice} disabled={!allAnswered}>
            提交
          </button>
        )}
      </footer>
    </section>
  );
}
