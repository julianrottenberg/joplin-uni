// Course Info managed region: module-handbook details for one course.
//
// The top of the Course Info note is a plugin-managed block framed by two
// HTML comments (invisible in the rendered note). The opening comment holds
// the details as compact JSON — the machine-readable source of truth for the
// dashboard — followed by a human-readable rendering. Everything below the
// closing comment belongs to the user and survives every save untouched.
//
// Notes written before this block existed (heading + "- **Label:** value"
// lines) are migrated on the first save: the known fields are absorbed into
// the details record and the remaining sections kept as user content.

import { Lang, makeT, MODULE_STATUSES, TURNUS_OPTIONS } from './i18n';

export type ModuleStatus = (typeof MODULE_STATUSES)[number] | '';
export type Turnus = (typeof TURNUS_OPTIONS)[number] | '';

/** Handbook metadata for one course (module). */
export interface CourseDetails {
	code: string;
	status: ModuleStatus;
	ects: string;
	sws: string;
	turnus: Turnus;
	exam: string;
	instructor: string;
	semester: string;
}

export const DETAILS_MARKER_START = '<!-- uni-course:';
export const DETAILS_MARKER_END = '<!-- /uni-course -->';

export function emptyCourseDetails(): CourseDetails {
	return { code: '', status: '', ects: '', sws: '', turnus: '', exam: '', instructor: '', semester: '' };
}

/** Extract a number from a free-text credits value ("6", "6 LP", "4,5"). */
export function parseCredits(value: string): number | null {
	const m = (value || '').match(/(\d+(?:[.,]\d+)?)/);
	if (!m) return null;
	const n = Number(m[1].replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function sanitize(raw: Partial<CourseDetails>): CourseDetails {
	return {
		code: str(raw.code),
		status: MODULE_STATUSES.includes(raw.status as never) ? (raw.status as ModuleStatus) : '',
		ects: str(raw.ects),
		sws: str(raw.sws),
		turnus: TURNUS_OPTIONS.includes(raw.turnus as never) ? (raw.turnus as Turnus) : '',
		exam: str(raw.exam),
		instructor: str(raw.instructor),
		semester: str(raw.semester),
	};
}

/** Which known legacy field ("- **Label:** value") a line matches, if any. */
const LEGACY_FIELDS: Array<[keyof CourseDetails, RegExp]> = [
	['code', /^- \*\*(?:Nummer|Code|Modulnummer):\*\*\s*/],
	['instructor', /^- \*\*(?:Dozent:in|Instructor):\*\*\s*/],
	['ects', /^- \*\*(?:ECTS|Credits|Leistungspunkte):\*\*\s*/],
	['semester', /^- \*\*Semester:\*\*\s*/],
];

export interface ParsedCourseInfo {
	details: CourseDetails;
	/** Everything the plugin must preserve: user sections below the block. */
	userContent: string;
}

export function parseCourseDetails(body: string): ParsedCourseInfo {
	const raw = body || '';

	const markerIdx = raw.indexOf(DETAILS_MARKER_START);
	if (markerIdx >= 0) {
		const closeIdx = raw.indexOf('-->', markerIdx);
		const json = closeIdx > markerIdx ? raw.slice(markerIdx + DETAILS_MARKER_START.length, closeIdx) : '';
		let details = emptyCourseDetails();
		try {
			const parsed = JSON.parse(json);
			if (parsed && typeof parsed === 'object') details = sanitize(parsed);
		} catch {
			// Corrupt JSON: keep empty details; the block is regenerated on save.
		}
		const endIdx = raw.indexOf(DETAILS_MARKER_END, markerIdx);
		const userContent = endIdx >= 0
			? raw.slice(endIdx + DETAILS_MARKER_END.length).replace(/^(?:[ \t]*\r?\n)+/, '')
			: '';
		return { details, userContent };
	}

	// Legacy (pre-1.2) note: heading, blank lines, then "- **Label:** value" lines.
	const lines = raw.split(/\r?\n/);
	let i = 0;
	if (i < lines.length && /^#\s/.test(lines[i])) i++;
	while (i < lines.length && lines[i].trim() === '') i++;
	const details = emptyCourseDetails();
	while (i < lines.length) {
		const line = lines[i];
		if (!/^- \*\*[^*]+\*\*:/.test(line)) break;
		for (const [key, re] of LEGACY_FIELDS) {
			const m = line.match(re);
			if (m) {
				(details as unknown as Record<string, string>)[key] = line.slice(m[0].length).trim();
				break;
			}
		}
		i++;
	}
	return { details, userContent: lines.slice(i).join('\n').replace(/^(?:[ \t]*\r?\n)+/, '') };
}

/** Localized label of a module status, e.g. "Pflichtmodul". */
export function moduleStatusLabel(status: ModuleStatus, lang: Lang): string {
	const t = makeT(lang);
	if (status === 'mandatory') return t('mod.full.mandatory');
	if (status === 'elective') return t('mod.full.elective');
	return '';
}

/** Localized label of a turnus, e.g. "Wintersemester". */
export function turnusLabel(turnus: Turnus, lang: Lang): string {
	const t = makeT(lang);
	if (turnus === 'winter') return t('turnus.winter');
	if (turnus === 'summer') return t('turnus.summer');
	if (turnus === 'both') return t('turnus.both');
	return '';
}

/**
 * The managed block at the top of a Course Info note: JSON marker line,
 * heading, visible fields (empty ones omitted), closing marker.
 */
export function renderCourseInfoBlock(name: string, details: CourseDetails, lang: Lang): string {
	const t = makeT(lang);
	const fields: string[] = [];
	const push = (label: string, value: string) => {
		if (value && value.trim()) fields.push(`- ${label} ${value.trim()}`);
	};
	push(t('ci.status'), moduleStatusLabel(details.status, lang));
	push(t('ci.credits'), details.ects);
	push(t('ci.sws'), details.sws);
	push(t('ci.turnus'), turnusLabel(details.turnus, lang));
	push(t('ci.exam'), details.exam);
	push(t('ci.code'), details.code);
	push(t('ci.instructor'), details.instructor);
	push(t('ci.semester'), details.semester);
	return [
		`${DETAILS_MARKER_START}${JSON.stringify(details)} -->`,
		`# ${name}`,
		...fields,
		DETAILS_MARKER_END,
	].join('\n');
}
