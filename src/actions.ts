import joplin from 'api';
import { ToastType } from 'api/types';
import { DEADLINE_TAG } from './constants';
import {
	furtherReadingHeading,
	furtherReadingRegex,
	makeT,
	weekHeading,
	weekHeadingRegex,
	weekLabel,
} from './i18n';
import type { Lang } from './i18n';
import { attachTagToNote, createNote, findOrCreateTag, getAllFolders, updateNote } from './data';
import { currentSemesterWeek, dateInputToMs } from './dates';
import { showDeadlineForm, showLectureForm, showReadingForm } from './dialogs';
import { getUniSettings } from './settings';
import { findUniFolder, getOrCreateAutoFolder, getOrCreateAutoNote, loadCourses } from './uni';
import { readingListBody, renderLectureBody } from './setup';
import { refreshDashboard } from './dashboard';

async function toast(message: string, type: ToastType = ToastType.Success): Promise<void> {
	await joplin.views.dialogs.showToast({ message, type, duration: 4000 });
}

/** Ensure the workspace exists and return the course list; null when the user must run setup. */
async function requireWorkspace() {
	const settings = await getUniSettings();
	const folders = await getAllFolders();
	const uniFolder = await findUniFolder(settings, folders);
	const t = makeT(settings.language);
	if (!uniFolder) {
		await joplin.views.dialogs.showMessageBox(
			t('err.noNotebookFirst', { name: settings.notebookName }),
		);
		return null;
	}
	const courses = await loadCourses(uniFolder.id, folders);
	if (!courses.length) {
		await joplin.views.dialogs.showMessageBox(t('err.noCourses'));
		return null;
	}
	return { settings, uniFolder, courses };
}

export async function newLectureNote(): Promise<void> {
	const ctx = await requireWorkspace();
	if (!ctx) return;
	const t = makeT(ctx.settings.language);

	const week = currentSemesterWeek(ctx.settings.semesterStart, ctx.settings.semesterWeeks) ?? 1;
	const form = await showLectureForm(ctx.courses, week, ctx.settings.language);
	if (!form) return;

	const course = ctx.courses.find((c) => c.folderId === form.courseId) ?? ctx.courses[0];
	const lecturesFolder = await getOrCreateAutoFolder(course.folderId, 'lecturesFolder', ctx.settings.language);

	const body = renderLectureBody(ctx.settings, course.name, form.week, form.date, form.topic);
	const note = await createNote({
		title: `${weekLabel(ctx.settings.language, form.week)} — ${form.topic}`,
		body,
		parent_id: lecturesFolder.id,
	});

	await refreshDashboard({ silent: true });
	await joplin.commands.execute('openNote', note.id);
	await toast(t('toast.lectureCreated', { course: course.name }));
}

/** Insert a reading item under its week heading (or Further reading). */
export function insertReadingLine(body: string, line: string, week: number | null, lang: Lang): string {
	const lines = body.split(/\r?\n/);
	let headingIdx = -1;

	if (week != null) {
		const re = weekHeadingRegex(week);
		headingIdx = lines.findIndex((l) => re.test(l));
		if (headingIdx < 0) {
			const frIdx = lines.findIndex((l) => furtherReadingRegex().test(l));
			lines.splice(frIdx >= 0 ? frIdx : lines.length, 0, weekHeading(lang, week));
			headingIdx = lines.findIndex((l) => re.test(l));
		}
	} else {
		headingIdx = lines.findIndex((l) => furtherReadingRegex().test(l));
		if (headingIdx < 0) {
			lines.push('', furtherReadingHeading(lang));
			headingIdx = lines.length - 1;
		}
	}

	// Append at the end of the section, before any trailing blank lines.
	let sectionEnd = lines.length;
	for (let i = headingIdx + 1; i < lines.length; i++) {
		if (/^#{1,6}\s/.test(lines[i])) {
			sectionEnd = i;
			break;
		}
	}
	let insertAt = sectionEnd;
	while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === '') insertAt--;
	lines.splice(insertAt, 0, line);

	return lines.join('\n');
}

export async function addReading(): Promise<void> {
	const ctx = await requireWorkspace();
	if (!ctx) return;
	const t = makeT(ctx.settings.language);

	const week = currentSemesterWeek(ctx.settings.semesterStart, ctx.settings.semesterWeeks);
	const form = await showReadingForm(ctx.courses, week ?? 0, ctx.settings.language);
	if (!form) return;

	const course = ctx.courses.find((c) => c.folderId === form.courseId) ?? ctx.courses[0];
	const readingNote = await getOrCreateAutoNote(
		course.folderId,
		'readingList',
		readingListBody(course.name, ctx.settings.semesterWeeks, ctx.settings.language),
		ctx.settings.language,
	);

	const { body } = await joplin.data.get(['notes', readingNote.id], { fields: ['body'] });
	const line = `- [ ] **${form.priority}** · ${form.text}`;
	const updated = insertReadingLine(body || '', line, form.week, ctx.settings.language);
	await updateNote(readingNote.id, { body: updated });

	await refreshDashboard({ silent: true });
	await toast(t('toast.readingAdded', { course: course.name }));
}

export async function addDeadline(): Promise<void> {
	const ctx = await requireWorkspace();
	if (!ctx) return;
	const t = makeT(ctx.settings.language);

	const form = await showDeadlineForm(ctx.courses, ctx.settings.language);
	if (!form) return;

	const course = ctx.courses.find((c) => c.folderId === form.courseId) ?? ctx.courses[0];
	const assignmentsFolder = await getOrCreateAutoFolder(course.folderId, 'assignmentsFolder', ctx.settings.language);

	const title = `${form.type}: ${form.title}`;
	const todo = await createNote({
		title,
		body: title,
		parent_id: assignmentsFolder.id,
		is_todo: 1,
		todo_due: dateInputToMs(form.due, 8),
	});

	if (ctx.settings.tagDeadlines) {
		try {
			const tagId = await findOrCreateTag(DEADLINE_TAG);
			await attachTagToNote(tagId, todo.id);
		} catch (error) {
			// Tagging is cosmetic — never block deadline creation.
			console.warn('uni: could not tag deadline', error);
		}
	}

	await refreshDashboard({ silent: true });
	await joplin.commands.execute('openNote', todo.id);
	await toast(t('toast.deadlineAdded', { course: course.name, date: form.due }));
}
