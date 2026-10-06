import joplin from 'api';
import type { Course, CourseFields } from './uni';
import {
	autoTitle,
	DEADLINE_TYPES,
	isLang,
	LANG_LABELS,
	LANGUAGE_SELECT_LABEL,
	Lang,
	makeT,
	READING_PRIORITIES,
	T,
} from './i18n';
import { isoToGerman, todayGerman } from './dates';

const DIALOG_CSS = `
	* { box-sizing: border-box; }
	html, body { margin: 0; padding: 0; }
	body {
		width: 100%; height: 100vh; overflow: auto;
		font: 14px/1.5 -apple-system, "Segoe UI", Ubuntu, sans-serif;
	}
	/* The sheet fills the fixed-size dialog window. */
	.sheet {
		display: flex; flex-direction: column;
		width: 100%; max-width: 700px; min-height: 100vh;
		margin: 0 auto; padding: 28px 32px 32px 32px;
	}
	.sheet.short { justify-content: center; }
	.sheet h3 { margin: 0 0 6px 0; font-size: 18px; }
	p.hint { margin: 0 0 16px 0; color: #888; }
	.sheet form { display: flex; flex-direction: column; }
	.sheet.tall form { flex: 1 1 auto; }
	label { display: block; margin: 12px 0 2px 0; font-size: 13px; font-weight: 600; }
	input[type="text"], input[type="date"], input[type="number"], textarea, select {
		width: 100%; padding: 8px 10px; margin-top: 5px;
		border: 1px solid #c5c5c5; border-radius: 6px; background: transparent;
		font: inherit; color: inherit;
	}
	textarea { resize: vertical; }
	.row { display: flex; gap: 14px; }
	.row > label { flex: 1 1 0; min-width: 0; }
	/* Course entry: one row of separate fields per course. */
	.courses { display: flex; flex-direction: column; flex: 1 1 auto; margin-top: 18px; }
	.courses-title { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; }
	.courses-title .muted { font-weight: 400; color: #888; }
	.courses-head { display: flex; gap: 10px; padding: 0 2px; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #888; }
	.course-rows { display: flex; flex-direction: column; justify-content: space-evenly; flex: 1 1 auto; }
	.course-row { display: flex; gap: 10px; align-items: center; min-height: 38px; }
	.course-row input { margin-top: 0; }
	.num { flex: 0 0 16px; text-align: right; font-size: 12px; color: #999; }
	.c-name { flex: 2.2 1 0; min-width: 0; }
	.c-code { flex: 1 1 0; min-width: 0; }
	.c-instructor { flex: 1.3 1 0; min-width: 0; }
	.c-credits { flex: 0.9 1 0; min-width: 0; }
	label.check { display: flex; align-items: center; gap: 10px; font-weight: 400; margin-top: 16px; cursor: pointer; }
	label.check input { width: auto; margin: 0; }
	@media (prefers-color-scheme: dark) {
		input, textarea, select { border-color: #4a4a4a; }
		p.hint, .courses-title .muted, .courses-head { color: #999; }
	}
`;

function pageHtml(title: string, hint: string, formHtml: string, tall: boolean): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${DIALOG_CSS}</style></head><body>
	<div class="sheet ${tall ? 'tall' : 'short'}">
		<h3>${escapeHtml(title)}</h3>
		<p class="hint">${hint}</p>
		<form name="uniForm">${formHtml}</form>
	</div>
	</body></html>`;
}

export function escapeHtml(s: string): string {
	return (s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Dialog form values after unwrapping: field name → serialized value. */
export type FormDataRecord = Record<string, string>;

/**
 * Joplin nests dialog form values under each form's name attribute:
 * `{ [formName]: { field: value } }` — an unnamed form lands under the
 * literal key "null" (see serializeForms in UserWebviewIndex.js in the
 * Joplin repo). This unwraps that shape; flat values are passed through.
 */
export function unwrapFormData(raw: Record<string, unknown> | null | undefined): FormDataRecord {
	if (!raw || typeof raw !== 'object') return {};
	const keys = Object.keys(raw);
	const nested = keys.length > 0 && keys.every((k) => {
		const value = raw[k];
		return !!value && typeof value === 'object' && !Array.isArray(value);
	});
	if (!nested) return raw as FormDataRecord;
	const merged: FormDataRecord = {};
	for (const k of keys) Object.assign(merged, raw[k]);
	return merged;
}

const dialogHandles = new Map<string, string>();

/**
 * Opens a form dialog. Returns the form data when the user confirms, or null
 * when cancelled. Inputs need a `name` attribute to appear in formData.
 */
export async function openFormDialog(
	dialogId: string,
	title: string,
	hint: string,
	formHtml: string,
	okLabel = 'OK',
	tall = false,
	cancelLabel = 'Cancel',
): Promise<FormDataRecord | null> {
	let handle = dialogHandles.get(dialogId);
	if (!handle) {
		handle = await joplin.views.dialogs.create(dialogId);
		dialogHandles.set(dialogId, handle);
	}
	await joplin.views.dialogs.setHtml(handle, pageHtml(title, hint, formHtml, tall));
	await joplin.views.dialogs.setButtons(handle, [
		{ id: 'ok', title: okLabel },
		{ id: 'cancel', title: cancelLabel },
	]);
	// Fixed-size sheet: Joplin's auto-sizing mismeasures on HiDPI screens.
	await joplin.views.dialogs.setFitToContent(handle, false);
	const result = await joplin.views.dialogs.open(handle);
	if (result.id === 'ok') return unwrapFormData(result.formData);
	return null;
}

function courseSelect(courses: Course[], selected?: string): string {
	const options = courses
		.map((c) => `<option value="${c.folderId}" ${c.folderId === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
		.join('');
	return `<select name="course">${options}</select>`;
}

/**
 * Grouped select for the lecture form: one optgroup per course, with the
 * module's Lectures notebook first and every part below it.
 * Value format: `${courseId}|${partId}` (empty partId = Lectures folder).
 */
function coursePartSelect(courses: Course[], lang: Lang): string {
	const groups = courses
		.map((c) => {
			const options = [
				`<option value="${c.folderId}|">${escapeHtml(autoTitle('lecturesFolder', lang))}</option>`,
				...c.parts.map((p) => `<option value="${c.folderId}|${p.id}">${escapeHtml(p.name)}</option>`),
			].join('');
			return `<optgroup label="${escapeHtml(c.name)}">${options}</optgroup>`;
		})
		.join('');
	return `<select name="course">${groups}</select>`;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export interface SetupFormResult {
	notebookName: string;
	semesterName: string;
	semesterStart: string;
	semesterWeeks: number;
	courses: CourseFields[];
	weeklyLectureNotes: boolean;
	language: Lang;
}

/** Course rows shown in the setup wizard. Empty rows are ignored. */
const COURSE_ROWS = 8;

function courseFieldsHtml(t: T): string {
	const rows: string[] = [];
	for (let i = 1; i <= COURSE_ROWS; i++) {
		const example = i === 1;
		rows.push(`
			<div class="course-row">
				<span class="num">${i}</span>
				<input class="c-name" type="text" name="courseName${i}" placeholder="${example ? escapeHtml(t('setup.example.name')) : ''}" aria-label="${escapeHtml(t('setup.aria.name', { i }))}">
				<input class="c-code" type="text" name="courseCode${i}" placeholder="${example ? 'PHI-301' : ''}" aria-label="${escapeHtml(t('setup.aria.code', { i }))}">
				<input class="c-instructor" type="text" name="courseInstructor${i}" placeholder="${example ? escapeHtml(t('setup.example.instructor')) : ''}" aria-label="${escapeHtml(t('setup.aria.instructor', { i }))}">
				<input class="c-credits" type="text" name="courseCredits${i}" placeholder="${example ? '5 ECTS' : ''}" aria-label="${escapeHtml(t('setup.aria.credits', { i }))}">
			</div>`);
	}
	return `
		<div class="courses">
			<div class="courses-title">${t('setup.courses')} <span class="muted">${t('setup.coursesHint')}</span></div>
			<div class="courses-head">
				<span class="num"></span>
				<span class="c-name">${t('setup.head.name')}</span>
				<span class="c-code">${t('setup.head.code')}</span>
				<span class="c-instructor">${t('setup.head.instructor')}</span>
				<span class="c-credits">${t('setup.head.credits')}</span>
			</div>
			<div class="course-rows">${rows.join('')}</div>
		</div>`;
}

export async function showSetupForm(defaults: {
	notebookName: string;
	semesterName: string;
	semesterStart: string;
	semesterWeeks: number;
	language: Lang;
}): Promise<SetupFormResult | null> {
	const t = makeT(defaults.language);
	const langOptions = (['de', 'en'] as Lang[])
		.map((l) => `<option value="${l}" ${defaults.language === l ? 'selected' : ''}>${LANG_LABELS[l]}</option>`)
		.join('');
	const form = `
		<label>${LANGUAGE_SELECT_LABEL}
			<select name="language">${langOptions}</select>
		</label>
		<p class="hint">${t('setup.langHint')}</p>
		<label>${t('setup.notebook')}
			<input type="text" name="notebookName" value="${escapeHtml(defaults.notebookName)}" required>
		</label>
		<div class="row">
			<label>${t('setup.semester')}
				<input type="text" name="semesterName" value="${escapeHtml(defaults.semesterName)}" placeholder="${escapeHtml(t('setup.semesterPh'))}">
			</label>
			<label>${t('setup.start')}
				<input type="text" name="semesterStart" value="${escapeHtml(isoToGerman(defaults.semesterStart))}" placeholder="TT.MM.JJJJ">
			</label>
			<label>${t('setup.weeks')}
				<input type="number" name="semesterWeeks" min="1" max="40" value="${defaults.semesterWeeks}" required>
			</label>
		</div>
		${courseFieldsHtml(t)}
		<p class="hint">${t('setup.partsHint')}</p>
		<label class="check"><input type="checkbox" name="weeklyLectureNotes"> ${t('setup.weeklyNotes')}</label>
	`;
	const data = await openFormDialog(
		'uni-setup',
		t('setup.title'),
		t('setup.hint'),
		form,
		t('setup.create'),
		true,
		t('btn.cancel'),
	);
	if (!data) return null;

	const weeks = Number(data.semesterWeeks);
	const courses: CourseFields[] = [];
	for (let i = 1; i <= COURSE_ROWS; i++) {
		const name = String(data[`courseName${i}`] ?? '').trim();
		if (!name) continue;
		courses.push({
			name,
			code: String(data[`courseCode${i}`] ?? '').trim(),
			instructor: String(data[`courseInstructor${i}`] ?? '').trim(),
			credits: String(data[`courseCredits${i}`] ?? '').trim(),
		});
	}
	return {
		notebookName: (data.notebookName || '').trim(),
		semesterName: (data.semesterName || '').trim(),
		semesterStart: (data.semesterStart || '').trim(),
		semesterWeeks: Number.isFinite(weeks) && weeks > 0 ? weeks : 14,
		courses,
		weeklyLectureNotes: data.weeklyLectureNotes === 'on',
		language: isLang(data.language) ? data.language : defaults.language,
	};
}

export async function showAddCourseForm(semesterWeeks: number, lang: Lang): Promise<CourseFields | null> {
	const t = makeT(lang);
	const form = `
		<label>${t('addCourse.name')}
			<input type="text" name="name" placeholder="${escapeHtml(t('setup.example.name'))}" required>
		</label>
		<div class="row">
			<label>${t('addCourse.code')}
				<input type="text" name="code" placeholder="PHI-301">
			</label>
			<label>${t('addCourse.instructor')}
				<input type="text" name="instructor" placeholder="${escapeHtml(t('setup.example.instructor'))}">
			</label>
			<label>${t('addCourse.credits')}
				<input type="text" name="credits" placeholder="5 ECTS">
			</label>
		</div>
	`;
	const data = await openFormDialog(
		'uni-add-course',
		t('addCourse.title'),
		t('addCourse.hint', { weeks: semesterWeeks }),
		form,
		t('addCourse.button'),
		false,
		t('btn.cancel'),
	);
	if (!data) return null;
	const name = (data.name || '').trim();
	if (!name) {
		await joplin.views.dialogs.showMessageBox(t('msg.enterCourseName'));
		return null;
	}
	return {
		name,
		code: (data.code || '').trim(),
		instructor: (data.instructor || '').trim(),
		credits: (data.credits || '').trim(),
	};
}

export interface AddPartFormResult {
	courseId: string;
	name: string;
	weeklyStubs: boolean;
}

export async function showAddPartForm(courses: Course[], lang: Lang): Promise<AddPartFormResult | null> {
	const t = makeT(lang);
	const form = `
		<label>${t('lecture.course')} ${courseSelect(courses)}</label>
		<label>${t('part.name')}
			<input type="text" name="name" placeholder="${escapeHtml(t('part.namePh'))}" required>
		</label>
		<label class="check"><input type="checkbox" name="weeklyStubs"> ${t('part.weeklyStubs')}</label>
	`;
	const data = await openFormDialog(
		'uni-add-part',
		t('part.title'),
		t('part.hint'),
		form,
		t('part.button'),
		false,
		t('btn.cancel'),
	);
	if (!data) return null;

	const name = (data.name || '').trim();
	if (!name) {
		await joplin.views.dialogs.showMessageBox(t('msg.enterPartName'));
		return null;
	}
	return {
		courseId: data.course,
		name,
		weeklyStubs: data.weeklyStubs === 'on',
	};
}

export interface LectureFormResult {
	courseId: string;
	week: number;
	partId: string;
	date: string;
	topic: string;
}

export async function showLectureForm(courses: Course[], defaultWeek: number | null, lang: Lang): Promise<LectureFormResult | null> {
	const t = makeT(lang);
	const form = `
		<label>${t('lecture.course')} ${coursePartSelect(courses, lang)}</label>
		<div class="row">
			<label>${t('lecture.week')}
				<input type="number" name="week" min="1" max="40" value="${defaultWeek ?? 1}" required>
			</label>
			<label>${t('lecture.date')}
				<input type="text" name="date" value="${todayGerman()}" placeholder="TT.MM.JJJJ">
			</label>
		</div>
		<label>${t('lecture.topic')}
			<input type="text" name="topic" placeholder="${escapeHtml(t('lecture.topicPh'))}" required>
		</label>
	`;
	const data = await openFormDialog(
		'uni-new-lecture',
		t('lecture.title'),
		t('lecture.hint'),
		form,
		t('lecture.button'),
		false,
		t('btn.cancel'),
	);
	if (!data) return null;
	const topic = (data.topic || '').trim();
	if (!topic) {
		await joplin.views.dialogs.showMessageBox(t('msg.enterTopic'));
		return null;
	}
	const week = Number(data.week);
	const [courseId, partId = ''] = String(data.course || '').split('|');
	return {
		courseId,
		partId,
		week: Number.isFinite(week) && week > 0 ? week : 1,
		date: (data.date || '').trim(),
		topic,
	};
}

export interface ReadingFormResult {
	courseId: string;
	week: number | null;
	priority: string;
	text: string;
}

export async function showReadingForm(courses: Course[], defaultWeek: number | null, lang: Lang): Promise<ReadingFormResult | null> {
	const t = makeT(lang);
	const priorities = READING_PRIORITIES[lang];
	const priorityOptions = priorities.map(
		(p, i) => `<option value="${p}" ${i === 0 ? 'selected' : ''}>${p}</option>`,
	).join('');
	const form = `
		<label>${t('lecture.course')} ${courseSelect(courses)}</label>
		<div class="row">
			<label>${t('reading.week')}
				<input type="number" name="week" min="0" max="40" value="${defaultWeek ?? 0}">
			</label>
			<label>${t('reading.priority')}
				<select name="priority">${priorityOptions}</select>
			</label>
		</div>
		<label>${t('reading.label')}
			<textarea name="text" rows="3" placeholder="${escapeHtml(t('reading.ph'))}" required></textarea>
		</label>
	`;
	const data = await openFormDialog(
		'uni-add-reading',
		t('reading.title'),
		t('reading.hint'),
		form,
		t('reading.button'),
		false,
		t('btn.cancel'),
	);
	if (!data) return null;
	const text = (data.text || '').trim();
	if (!text) {
		await joplin.views.dialogs.showMessageBox(t('msg.enterReading'));
		return null;
	}
	const week = Number(data.week);
	return {
		courseId: data.course,
		week: Number.isFinite(week) && week > 0 ? week : null,
		priority: data.priority || priorities[0],
		text,
	};
}

export interface DeadlineFormResult {
	courseId: string;
	type: string;
	title: string;
	due: string;
}

export async function showDeadlineForm(courses: Course[], lang: Lang): Promise<DeadlineFormResult | null> {
	const t = makeT(lang);
	const types = DEADLINE_TYPES[lang];
	const typeOptions = types.map((type, i) => `<option value="${type}" ${i === 0 ? 'selected' : ''}>${type}</option>`).join('');
	const form = `
		<label>${t('lecture.course')} ${courseSelect(courses)}</label>
		<div class="row">
			<label>${t('deadline.type')}
				<select name="type">${typeOptions}</select>
			</label>
			<label>${t('deadline.due')}
				<input type="text" name="due" value="${todayGerman()}" placeholder="TT.MM.JJJJ" required>
			</label>
		</div>
		<label>${t('deadline.titleLabel')}
			<input type="text" name="title" placeholder="${escapeHtml(t('deadline.titlePh'))}" required>
		</label>
	`;
	const data = await openFormDialog(
		'uni-add-deadline',
		t('deadline.title'),
		t('deadline.hint'),
		form,
		t('deadline.button'),
		false,
		t('btn.cancel'),
	);
	if (!data) return null;
	const title = (data.title || '').trim();
	const due = (data.due || '').trim();
	if (!title || !due) {
		await joplin.views.dialogs.showMessageBox(t('msg.enterTitleDue'));
		return null;
	}
	return {
		courseId: data.course,
		type: data.type || types[0],
		title,
		due,
	};
}
