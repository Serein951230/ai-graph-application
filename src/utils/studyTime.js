import { getUserScopedStorageKey } from '../data/learningResources';

const STUDY_TIME_KEY = 'snowwave-study-time-log';

export const dateKey = (date = new Date()) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return localDate.toISOString().slice(0, 10);
};

export const todayKey = () => dateKey();

export function readStudyTimeLog() {
    try {
        return JSON.parse(localStorage.getItem(getUserScopedStorageKey(STUDY_TIME_KEY)) || '{}');
    } catch {
        return {};
    }
}

export function saveStudyTimeLog(nextLog) {
    localStorage.setItem(getUserScopedStorageKey(STUDY_TIME_KEY), JSON.stringify(nextLog));
    window.dispatchEvent(new Event('snowwave-local-data-updated'));
}

export function recordStudySeconds(subjectId, seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    if (!safeSeconds) return readStudyTimeLog();
    const date = todayKey();
    const log = readStudyTimeLog();
    const today = log[date] || { totalSeconds: 0, subjects: {} };
    const nextToday = {
        totalSeconds: Number(((today.totalSeconds || 0) + safeSeconds).toFixed(2)),
        subjects: {
            ...(today.subjects || {}),
            [subjectId]: Number((((today.subjects || {})[subjectId] || 0) + safeSeconds).toFixed(2)),
        },
    };
    const nextLog = { ...log, [date]: nextToday };
    saveStudyTimeLog(nextLog);
    window.dispatchEvent(new CustomEvent('snowwave-study-time-updated', { detail: nextToday }));
    return nextLog;
}

export function getTodayStudySeconds(log = readStudyTimeLog()) {
    return log[todayKey()]?.totalSeconds || 0;
}

export function getTotalStudyHours(log = readStudyTimeLog(), fallbackHours = 0) {
    const trackedHours = Object.values(log).reduce((sum, item) => sum + ((item?.totalSeconds || 0) / 3600), 0);
    return Math.max(Number(fallbackHours) || 0, trackedHours);
}

export function formatStudyMinutes(seconds) {
    const safeSeconds = Math.floor(Number(seconds) || 0);
    if (safeSeconds > 0 && safeSeconds < 60) return `${safeSeconds}秒`;
    const minutes = Math.floor(safeSeconds / 60);
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
}
