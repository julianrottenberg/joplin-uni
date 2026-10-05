import joplin from 'api';
import { ToastType } from 'api/types';
import {
	COURSE_INFO_TITLE,
	LECTURES_FOLDER_TITLE,
	READING_LIST_TITLE,
	ASSIGNMENTS_FOLDER_TITLE,
	FURTHER_READING_HEADING,
} from './constants';
import { createFolder, createNote, Folder, getAllFolders, getFolderNotes } from './data';
import { germanToIso, isValidUserDate } from './dates';
import { showAddCourseForm, showSetupForm } from './dialogs';
import { getUniSettings, setUniSetting, UniSettings } from './settings';
import { getOrCreateFolder, getOrCreateNote, findUniFolder } from './uni';
import type { CourseFields } from './uni';
import { refreshDashboard } from './dashboard';

async function toast(message: string, type: ToastType = ToastType.Success): Promise<void> {
	await joplin.views.dialogs.showToast({ message, type, duration: 4000 });
}

function courseInfoBody(course: CourseFields, semesterName: string): string {
	return [
		`# ${course.name}`,
		'',
		`- **Code:** ${course.code || '—'}`,
		`- **Instructor:** ${course.instructor || '—'}`,
		`- **Credits:** ${course.credits || '—'}`,
		`- **Semester:** ${semesterName || '—'}`,
		'',
		'## Schedule',
		'',
		'## Grading',
		'',
		'## Links',
		'',
	].join('\n');
}

export function readingListBody(courseName: string, weeks: number): string {
	const parts = [
		`# ${courseName} — Reading List`,
		'',
		'Tick items as you read them — progress shows up on the Uni dashboard. Add items via the command palette (Ctrl+Shift+P, "Uni: Add reading…"), or type them directly as Markdown checkboxes.',
	];
	for (let w = 1; w <= weeks; w++) {
		parts.push('', `## Week ${w}`);
	}
	parts.push('', FURTHER_READING_HEADING, '');
	return parts.join('\n');
}

/**
 * Creates (or tops up) one course notebook with its standard structure.
 * Returns the course folder.
 */
export async function createCourseStructure(
	uniFolderId: string,
	course: CourseFields,
	settings: UniSettings,
	weeklyLectureNotes: boolean,
): Promise<Folder> {
	const courseFolder = await getOrCreateFolder(uniFolderId, course.name);

	await getOrCreateNote(courseFolder.id, COURSE_INFO_TITLE, courseInfoBody(course, settings.semesterName));
	await getOrCreateNote(courseFolder.id, READING_LIST_TITLE, readingListBody(course.name, settings.semesterWeeks));

	const lecturesFolder = await getOrCreateFolder(courseFolder.id, LECTURES_FOLDER_TITLE);
	await getOrCreateFolder(courseFolder.id, ASSIGNMENTS_FOLDER_TITLE);

	if (weeklyLectureNotes) {
		// Only create stubs when the Lectures notebook is still empty.
		const existing = await getFolderNotes(lecturesFolder.id, ['id']);
		if (!existing.length) {
			for (let w = 1; w <= settings.semesterWeeks; w++) {
				const body = renderLectureBody(settings, course.name, w, '', '');
				const title = `Week ${w}`;
				await createNote({ title, body, parent_id: lecturesFolder.id });
			}
		}
	}

	return courseFolder;
}

function renderLectureBody(settings: UniSettings, courseName: string, week: number, date: string, topic: string): string {
	let body = settings.lectureTemplate;
	body = body.replace(/\{\{course\}\}/g, courseName);
	body = body.replace(/\{\{week\}\}/g, String(week));
	body = body.replace(/\{\{date\}\}/g, date || '—');
	body = body.replace(/\{\{topic\}\}/g, topic || '');
	body = body.replace(/:\s*$/m, ''); // trim trailing colon when topic is empty
	return body;
}

export { renderLectureBody };

export async function runSetupWizard(): Promise<void> {
	const settings = await getUniSettings();

	const form = await showSetupForm({
		notebookName: settings.notebookName,
		semesterName: settings.semesterName,
		semesterStart: settings.semesterStart,
		semesterWeeks: settings.semesterWeeks,
	});
	if (!form) return;

	if (form.semesterStart && !isValidUserDate(form.semesterStart)) {
		await joplin.views.dialogs.showMessageBox('Please enter the semester start as DD.MM.YYYY, for example 12.10.2026.');
		return;
	}
	const semesterStartIso = form.semesterStart ? (germanToIso(form.semesterStart) ?? '') : '';

	await setUniSetting('notebookName', form.notebookName || 'University');
	await setUniSetting('semesterName', form.semesterName);
	await setUniSetting('semesterStart', semesterStartIso);
	await setUniSetting('semesterWeeks', form.semesterWeeks);

	const settingsNow = await getUniSettings();
	const folders = await getAllFolders();
	let uniFolder = await findUniFolder(settingsNow, folders);
	let createdNotebook = false;
	if (!uniFolder) {
		uniFolder = await createFolder(settingsNow.notebookName, '');
		createdNotebook = true;
	}

	const parsedCourses = form.courses;

	for (const course of parsedCourses) {
		await createCourseStructure(uniFolder.id, course, settingsNow, form.weeklyLectureNotes);
	}

	const dashboardId = await refreshDashboard({ silent: true });
	if (dashboardId) await joplin.commands.execute('openNote', dashboardId);

	const summary = createdNotebook
		? `Created notebook "${settingsNow.notebookName}" with ${parsedCourses.length} course(s).`
		: `${parsedCourses.length ? `Added ${parsedCourses.length} course(s). ` : ''}Semester settings updated.`;
	await toast(summary);
}

export async function addCourse(): Promise<void> {
	const settings = await getUniSettings();
	const folders = await getAllFolders();
	const uniFolder = await findUniFolder(settings, folders);
	if (!uniFolder) {
		await joplin.views.dialogs.showMessageBox(
			`No "${settings.notebookName}" notebook found. Run Ctrl+Shift+P, then "Uni: Set up semester…" first.`,
		);
		return;
	}

	const form = await showAddCourseForm(settings.semesterWeeks);
	if (!form) return;

	await createCourseStructure(uniFolder.id, form, settings, false);
	await refreshDashboard({ silent: true });
	await toast(`Added course "${form.name}".`);
}
