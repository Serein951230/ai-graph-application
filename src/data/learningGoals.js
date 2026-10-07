import { getUserScopedStorageKey } from './learningResources';

const storageKey = 'snowwave-learning-goals';

export function loadLearningGoals() {
    try {
        const goals = JSON.parse(localStorage.getItem(getUserScopedStorageKey(storageKey)) || '[]');
        return Array.isArray(goals) ? goals.filter(goal => goal && typeof goal.title === 'string').slice(0, 30) : [];
    } catch { return []; }
}

export function saveLearningGoals(goals) {
    localStorage.setItem(getUserScopedStorageKey(storageKey), JSON.stringify(goals));
    window.dispatchEvent(new Event('snowwave-learning-goals-updated'));
}
