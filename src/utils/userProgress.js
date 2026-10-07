import { getUserScopedStorageKey, lessonCatalog } from '../data/learningResources';
import { readStudyTimeLog } from './studyTime';
import { isVideoComplete } from './videoCompletion';

const VIDEO_PROGRESS_KEY = 'snowwave-video-progress';

export function readVideoProgressLog() {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(VIDEO_PROGRESS_KEY)) || '{}');
    } catch {
        return {};
    }
}

function getLessonProgress(subjectId, lessonIndex, progressLog) {
    const item = progressLog[`${subjectId}-${lessonIndex}`];
    if (!item) return 0;
    if (typeof item === 'number') return 0;
    if (item.completed || isVideoComplete(item.currentTime, item.duration)) return 100;
    const duration = Number(item.duration || 0);
    if (!duration) return item.currentTime ? 1 : 0;
    return Math.min(99, Math.round((Number(item.currentTime || 0) / duration) * 100));
}

export function getUserSubjectStats(subject, progressLog = readVideoProgressLog(), studyTimeLog = readStudyTimeLog()) {
    const lessons = lessonCatalog[subject.id] || [];
    const lessonCount = lessons.length || subject.totalTopics || 1;
    const lessonProgress = Array.from({ length: lessonCount }, (_, index) => getLessonProgress(subject.id, index, progressLog));
    const allCompleted = lessonProgress.length > 0 && lessonProgress.every(value => value === 100);
    const progress = lessonProgress.length
        ? (allCompleted ? 100 : Math.min(99, Math.round(lessonProgress.reduce((sum, value) => sum + value, 0) / lessonProgress.length)))
        : 0;
    const topicsCompleted = lessonProgress.filter(value => value === 100).length;
    const nextLessonIndex = lessonProgress.findIndex(value => value < 100);
    const totalSeconds = Object.values(studyTimeLog).reduce((sum, day) => (
        sum + Number(day?.subjects?.[subject.id] || 0)
    ), 0);

    return {
        ...subject,
        progress,
        topicsCompleted,
        totalTopics: lessonCount,
        timeSpent: Number((totalSeconds / 3600).toFixed(1)),
        nextTopic: lessons[nextLessonIndex]?.title || (progress >= 100 ? '已完成' : lessons[0]?.title || subject.nextTopic),
    };
}

export function getUserSubjects(subjects) {
    const progressLog = readVideoProgressLog();
    const studyTimeLog = readStudyTimeLog();
    return subjects.map(subject => getUserSubjectStats(subject, progressLog, studyTimeLog));
}
