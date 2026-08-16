/**
 * LocalStorage state manager for Learn Module enhancements:
 * - Bookmarked lessons
 * - Personal lesson notes
 * - Daily learning streak tracking
 */

const BOOKMARKS_KEY = "cdctf_bookmarked_lessons";
const NOTES_PREFIX = "cdctf_lesson_note_";
const STREAK_KEY = "cdctf_learning_streak";

export function getBookmarkedLessonIds(): number[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleBookmarkLesson(lessonId: number): boolean {
  const current = getBookmarkedLessonIds();
  const exists = current.includes(lessonId);
  const updated = exists ? current.filter(id => id !== lessonId) : [...current, lessonId];
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch {
    /* ignore storage quota limits */
  }
  return !exists;
}

export function isLessonBookmarked(lessonId: number): boolean {
  return getBookmarkedLessonIds().includes(lessonId);
}

export function getLessonNote(lessonId: number): string {
  try {
    return localStorage.getItem(`${NOTES_PREFIX}${lessonId}`) || "";
  } catch {
    return "";
  }
}

export function saveLessonNote(lessonId: number, noteText: string): void {
  try {
    localStorage.setItem(`${NOTES_PREFIX}${lessonId}`, noteText);
  } catch {
    /* ignore storage quota limits */
  }
}

export type StreakData = {
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
};

export function updateLearningStreak(): StreakData {
  const today = new Date().toISOString().split("T")[0];
  let data: StreakData = { currentStreak: 1, lastActiveDate: today };

  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed: StreakData = JSON.parse(raw);
      if (parsed.lastActiveDate === today) {
        return parsed;
      }
      
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (parsed.lastActiveDate === yesterday) {
        data = { currentStreak: parsed.currentStreak + 1, lastActiveDate: today };
      } else {
        data = { currentStreak: 1, lastActiveDate: today };
      }
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {
    /* fallback default */
  }

  return data;
}

export function getLearningStreak(): number {
  return updateLearningStreak().currentStreak;
}
