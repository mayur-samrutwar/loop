import {
  PREVIEW_COOKIE_KEY,
  PREVIEW_LOCALSTORAGE_KEY,
} from './userIdConstants';

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `preview-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function persistCookie(value: string) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${PREVIEW_COOKIE_KEY}=${value}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

export function getPreviewUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(PREVIEW_LOCALSTORAGE_KEY);
    if (existing) {
      persistCookie(existing);
      return existing;
    }
    const next = generateId();
    window.localStorage.setItem(PREVIEW_LOCALSTORAGE_KEY, next);
    persistCookie(next);
    return next;
  } catch {
    const fallback = generateId();
    persistCookie(fallback);
    return fallback;
  }
}
