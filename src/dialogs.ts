import joplin from 'api';
import type { Course } from './uni';
import { DEADLINE_TYPES, READING_PRIORITIES } from './constants';
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
	.sheet.tall form { flex: 1 1 auto; min-height: 0; }
	label { display: block; margin: 12px 0 2px 0; font-size: 13px; font-weight: 600; }
	input[type="text"], input[type="date"], input[type="number"], textarea, select {
		width: 100%; padding: 8px 10px; margin-top: 5px;
		border: 1px solid #c5c5c5; border-radius: 6px; background: transparent;
		font: inherit; color: inherit;
	}
	textarea { resize: vertical; }
	textarea.grow { flex: 1 1 auto; min-height: 160px; }
	.row { display: flex; gap: 14px; }
	.row > label { flex: 1 1 0; min-width: 0; }
	label.check { display: flex; align-items: center; gap: 10px; font-weight: 400; margin-top: 16px; cursor: pointer; }
	label.check input { width: auto; margin: 0; }
	@media (prefers-color-scheme: dark) {
		input, textarea, select { border-color: #4a4a4a; }
		p.hint { color: #999; }
	}
`;

function pageHtml(title: string, hint: string, formHtml: string, tall: boolean): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${DIALOG_CSS}</style></head><body>
	<div class="sheet ${tall ? 'tall' : 'short'}">
		<h3>${escapeHtml(title)}</h3>
		<p class="hint">${hint}</p>
		<form>${formHtml}</form>
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
): Promise<Record<string, any> | null> {
	let handle = dialogHandles.get(dialogId);
	if (!handle) {
		handle = await joplin.views.dialogs.create(dialogId);
		dialogHandles.set(dialogId, handle);
	}
	await joplin.views.dialogs.setHtml(handle, pageHtml(title, hint, formHtml, tall));
	await joplin.views.dialogs.setButtons(handle, [
		{ id: 'ok', title: okLabel },
		{ id: 'cancel', title: 'Cancel' },
	]);
	// Fixed-size sheet: Joplin's auto-sizing mismeasures on HiDPI screens.
	await joplin.views.dialogs.setFitToContent(handle, false);
	const result = await joplin.views.dialogs.open(handle);
	if (result.id === 'ok') return result.formData ?? {};
	return null;
}

function courseSelect(courses: Course[], selected?: string): string {
	const options = courses
		.map((c) => `<option value="${c.folderId}" ${c.folderId === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
		.join('');
	return `<select name="course">${options}</select>`;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export interface SetupFormResult {
	notebookName: string;
	semesterName: string;
	semesterStart: string;
	semesterWeeks: number;
	coursesRaw: string;
	weeklyLectureNotes: boolean;
}

export async function showSetupForm(defaults: {
	notebookName: string;
	semesterName: string;
	semesterStart: string;
	semesterWeeks: number;
}): Promise<SetupFormResult | null> {
	const form = `
		<label>University notebook
			<input type="text" name="notebookName" value="${escapeHtml(defaults.notebookName)}" required>
		</label>
		<div class="row">
			<label>Semester
				<input type="text" name="semesterName" value="${escapeHtml(defaults.semesterName)}" placeholder="e.g. WiSe 2026/27">
			</label>
			<label>Start date
				<input type="text" name="semesterStart" value="${escapeHtml(isoToGerman(defaults.semesterStart))}" placeholder="TT.MM.JJJJ">
			</label>
			<label>Weeks
				<input type="number" name="semesterWeeks" min="1" max="40" value="${defaults.semesterWeeks}" required>
			</label>
		</div>
		<label>Courses — one per line: Name | Code | Instructor | Credits
			<textarea name="courses" class="grow" placeholder="Epistemology | PHI-301 | Dr. Smith | 5&#10;Linear Algebra | MATH-201 | Prof. Euler | 6"></textarea>
		</label>
		<label class="check"><input type="checkbox" name="weeklyLectureNotes"> Create a lecture note for every week</label>
	`;
	const data = await openFormDialog(
		'uni-setup',
		'Set up your Uni workspace',
		'Everything is created inside one notebook, so your private notes stay separate. You can add more courses later.',
		form,
		'Create',
		true,
	);
	if (!data) return null;

	const weeks = Number(data.semesterWeeks);
	return {
		notebookName: (data.notebookName || '').trim(),
		semesterName: (data.semesterName || '').trim(),
		semesterStart: (data.semesterStart || '').trim(),
		semesterWeeks: Number.isFinite(weeks) && weeks > 0 ? weeks : 14,
		coursesRaw: (data.courses || '').trim(),
		weeklyLectureNotes: data.weeklyLectureNotes === 'on',
	};
}

export interface CourseFormResult {
	name: string;
	code: string;
	instructor: string;
	credits: string;
}

export async function showAddCourseForm(semesterWeeks: number): Promise<CourseFormResult | null> {
	const form = `
		<label>Course name
			<input type="text" name="name" placeholder="e.g. Epistemology" required>
		</label>
		<div class="row">
			<label>Code
				<input type="text" name="code" placeholder="PHI-301">
			</label>
			<label>Instructor
				<input type="text" name="instructor" placeholder="Dr. Smith">
			</label>
			<label>Credits
				<input type="text" name="credits" placeholder="5 ECTS">
			</label>
		</div>
	`;
	const data = await openFormDialog(
		'uni-add-course',
		'Add a course',
		`Creates a course notebook with Course Info, Reading List (${semesterWeeks} week sections), Lectures and Assignments.`,
		form,
		'Add course',
	);
	if (!data) return null;
	const name = (data.name || '').trim();
	if (!name) return null;
	return {
		name,
		code: (data.code || '').trim(),
		instructor: (data.instructor || '').trim(),
		credits: (data.credits || '').trim(),
	};
}

export interface LectureFormResult {
	courseId: string;
	week: number;
	date: string;
	topic: string;
}

export async function showLectureForm(courses: Course[], defaultWeek: number | null): Promise<LectureFormResult | null> {
	const form = `
		<label>Course ${courseSelect(courses)}</label>
		<div class="row">
			<label>Week
				<input type="number" name="week" min="1" max="40" value="${defaultWeek ?? 1}" required>
			</label>
			<label>Date
				<input type="text" name="date" value="${todayGerman()}" placeholder="TT.MM.JJJJ">
			</label>
		</div>
		<label>Topic
			<input type="text" name="topic" placeholder="e.g. Gettier cases" required>
		</label>
	`;
	const data = await openFormDialog(
		'uni-new-lecture',
		'New lecture note',
		'Creates a lecture note in the course\'s Lectures notebook.',
		form,
		'Create note',
	);
	if (!data) return null;
	const week = Number(data.week);
	return {
		courseId: data.course,
		week: Number.isFinite(week) && week > 0 ? week : 1,
		date: (data.date || '').trim(),
		topic: (data.topic || '').trim(),
	};
}

export interface ReadingFormResult {
	courseId: string;
	week: number | null;
	priority: string;
	text: string;
}

export async function showReadingForm(courses: Course[], defaultWeek: number | null): Promise<ReadingFormResult | null> {
	const priorityOptions = READING_PRIORITIES.map(
		(p, i) => `<option value="${p}" ${i === 0 ? 'selected' : ''}>${p}</option>`,
	).join('');
	const form = `
		<label>Course ${courseSelect(courses)}</label>
		<div class="row">
			<label>Week (0 = further reading)
				<input type="number" name="week" min="0" max="40" value="${defaultWeek ?? 0}">
			</label>
			<label>Priority
				<select name="priority">${priorityOptions}</select>
			</label>
		</div>
		<label>Reading
			<textarea name="text" rows="3" placeholder="e.g. Gettier (1963) — Is Justified True Belief Knowledge?, pp. 121–123" required></textarea>
		</label>
	`;
	const data = await openFormDialog(
		'uni-add-reading',
		'Add a reading',
		'Appends the item to the course reading list. Add a link inside the text if you like: [PDF](https://…)',
		form,
		'Add',
	);
	if (!data) return null;
	const text = (data.text || '').trim();
	if (!text) return null;
	const week = Number(data.week);
	return {
		courseId: data.course,
		week: Number.isFinite(week) && week > 0 ? week : null,
		priority: data.priority || READING_PRIORITIES[0],
		text,
	};
}

export interface DeadlineFormResult {
	courseId: string;
	type: string;
	title: string;
	due: string;
}

export async function showDeadlineForm(courses: Course[]): Promise<DeadlineFormResult | null> {
	const typeOptions = DEADLINE_TYPES.map((t, i) => `<option value="${t}" ${i === 0 ? 'selected' : ''}>${t}</option>`).join('');
	const form = `
		<label>Course ${courseSelect(courses)}</label>
		<div class="row">
			<label>Type
				<select name="type">${typeOptions}</select>
			</label>
			<label>Due date
				<input type="text" name="due" value="${todayGerman()}" placeholder="TT.MM.JJJJ" required>
			</label>
		</div>
		<label>Title
			<input type="text" name="title" placeholder="e.g. Essay 1 — Skepticism" required>
		</label>
	`;
	const data = await openFormDialog(
		'uni-add-deadline',
		'Add a deadline',
		'Creates a to-do in the course\'s Assignments notebook with a reminder on the due date.',
		form,
		'Add',
	);
	if (!data) return null;
	const title = (data.title || '').trim();
	const due = (data.due || '').trim();
	if (!title || !due) return null;
	return {
		courseId: data.course,
		type: data.type || 'Assignment',
		title,
		due,
	};
}
