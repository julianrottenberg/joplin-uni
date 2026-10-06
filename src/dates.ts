// Date helpers.
//
// Storage format is ISO (YYYY-MM-DD). Everything the user types or sees is
// German (DD.MM.YYYY). parseUserDate accepts both, so old values keep working.

import { Lang, makeT } from './i18n';
const DAY_MS = 24 * 60 * 60 * 1000;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const GERMAN_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

function validDate(year: number, month: number, day: number): Date | null {
	const d = new Date(year, month - 1, day);
	if (Number.isNaN(d.getTime())) return null;
	if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
	return d;
}

/** Parse ISO (2026-10-12) or German (12.10.2026) into a local Date, or null. */
export function parseUserDate(s: string): Date | null {
	const t = (s ?? '').trim();
	if (ISO_RE.test(t)) {
		const d = new Date(`${t}T00:00:00`);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	const m = t.match(GERMAN_RE);
	if (m) return validDate(Number(m[3]), Number(m[2]), Number(m[1]));
	return null;
}

export function isValidUserDate(s: string): boolean {
	return parseUserDate(s) !== null;
}

export function toIso(d: Date): string {
	const y = d.getFullYear();
	const m = `${d.getMonth() + 1}`.padStart(2, '0');
	const day = `${d.getDate()}`.padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function toGerman(d: Date): string {
	const m = `${d.getMonth() + 1}`.padStart(2, '0');
	const day = `${d.getDate()}`.padStart(2, '0');
	return `${day}.${m}.${d.getFullYear()}`;
}

/** Today as DD.MM.YYYY, for pre-filling inputs. */
export function todayGerman(): string {
	return toGerman(new Date());
}

/** ISO stored value to German display value (empty stays empty). */
export function isoToGerman(iso: string): string {
	const d = parseUserDate(iso);
	return d ? toGerman(d) : (iso ?? '');
}

/** German (or ISO) user value to ISO for storage; null when invalid. */
export function germanToIso(value: string): string | null {
	const d = parseUserDate(value);
	return d ? toIso(d) : null;
}

/** Start of today, local time. */
export function startOfToday(): number {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/** Timestamp for the given local date at the given hour. */
export function dateInputToMs(s: string, hour = 8): number {
	const d = parseUserDate(s);
	if (!d) return 0;
	d.setHours(hour, 0, 0, 0);
	return d.getTime();
}

/** Current teaching week (1-based), or null if unknown / before semester. */
export function currentSemesterWeek(startInput: string, weeks: number): number | null {
	const start = parseUserDate(startInput);
	if (!start) return null;
	const diffDays = Math.floor((startOfToday() - start.getTime()) / DAY_MS);
	const week = Math.floor(diffDays / 7) + 1;
	if (week < 1) return null;
	return Math.min(week, weeks);
}

/** Days from today until the given timestamp (negative = past). */
export function daysUntil(ms: number): number {
	return Math.floor((ms - startOfToday()) / DAY_MS);
}

/** DD.MM.YYYY */
export function formatDate(ms: number): string {
	return toGerman(new Date(ms));
}

/** "today", "tomorrow", "in 3 days", "3 days overdue"… */
export function relativeDueLabel(ms: number, lang: Lang = 'en'): string {
	const t = makeT(lang);
	const days = daysUntil(ms);
	if (days === 0) return t('rel.today');
	if (days === 1) return t('rel.tomorrow');
	if (days === -1) return t('rel.yesterday');
	if (days > 1) return t('rel.inDays', { n: days });
	return t('rel.overdue', { n: -days });
}

/** "just now", "2h ago", "3d ago"… */
export function relativeUpdatedLabel(ms: number, lang: Lang = 'en'): string {
	const t = makeT(lang);
	const diff = Date.now() - ms;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return t('rel.justNow');
	if (mins < 60) return t('rel.minsAgo', { n: mins });
	const hours = Math.floor(mins / 60);
	if (hours < 24) return t('rel.hoursAgo', { n: hours });
	const days = Math.floor(hours / 24);
	if (days < 30) return t('rel.daysAgo', { n: days });
	return formatDate(ms);
}
