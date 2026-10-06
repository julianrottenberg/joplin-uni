import joplin from 'api';
import { ToastType } from 'api/types';
import {
	furtherReadingHeading,
	makeT,
	weekHeading,
	weekLabel,
} from './i18n';
import type { Lang } from './i18n';
import { createFolder, createNote, Folder, getAllFolders, getFolderNotes } from './data';
import { germanToIso, isValidUserDate } from './dates';
import { showAddCourseForm, showSetupForm } from './dialogs';
import { getUniSettings, setUniSetting, UniSettings } from './settings';
import { findUniFolder, getOrCreateAutoFolder, getOrCreateAutoNote, getOrCreateFolder } from './uni';
import type { CourseFields } from './uni';
import { refreshDashboard } from './dashboard';

import { emptyCourseDetails, renderCourseInfoBlock } from './course-info';
async function toast(message: string, type: ToastType = ToastType.Success): Promise<void> {
	await joplin.views.dialogs.showToast({ message, type, duration: 4000 });
}

function courseInfoBody(course: CourseFields, semesterName: string, lang: Lang): string {
	return renderCourseInfoBlock(course.name, {
		...emptyCourseDetails(),
		code: course.code,
		instructor: course.instructor,
		ects: course.credits,
		semester: semesterName,
	}, lang);
}

export function readingListBody(courseName: string, weeks: number, lang: Lang): string {
	const t = makeT(lang);
	const parts = [
		`# ${courseName} ${t('rl.headingSuffix')}`,
		'',
		t('rl.hint'),
	];
	for (let w = 1; w <= weeks; w++) {
		parts.push('', weekHeading(lang, w));
	}
	parts.push('', furtherReadingHeading(lang), '');
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

	await getOrCreateAutoNote(courseFolder.id, 'courseInfo', courseInfoBody(course, settings.semesterName, settings.language), settings.language);
	await getOrCreateAutoNote(courseFolder.id, 'readingList', readingListBody(course.name, settings.semesterWeeks, settings.language), settings.language);

	const lecturesFolder = await getOrCreateAutoFolder(courseFolder.id, 'lecturesFolder', settings.language);
	await getOrCreateAutoFolder(courseFolder.id, 'assignmentsFolder', settings.language);

	if (weeklyLectureNotes) {
		// Only create stubs when the Lectures notebook is still empty.
		const existing = await getFolderNotes(lecturesFolder.id, ['id']);
		if (!existing.length) {
			for (let w = 1; w <= settings.semesterWeeks; w++) {
				const body = renderLectureBody(settings, course.name, w, '', '');
				const title = weekLabel(settings.language, w);
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
		language: settings.language,
	});
	if (!form) return;

	const t = makeT(form.language);

	if (form.semesterStart && !isValidUserDate(form.semesterStart)) {
		await joplin.views.dialogs.showMessageBox(t('msg.datePattern'));
		return;
	}
	const semesterStartIso = form.semesterStart ? (germanToIso(form.semesterStart) ?? '') : '';

	await setUniSetting('notebookName', form.notebookName || 'University');
	await setUniSetting('semesterName', form.semesterName);
	await setUniSetting('semesterStart', semesterStartIso);
	await setUniSetting('semesterWeeks', form.semesterWeeks);
	await setUniSetting('language', form.language);

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
		? t('toast.createdNotebook', { name: settingsNow.notebookName, count: parsedCourses.length })
		: `${parsedCourses.length ? t('toast.addedCourses', { count: parsedCourses.length }) : ''}${t('toast.settingsUpdated')}`;
	await toast(summary);
}

export async function addCourse(): Promise<void> {
	const settings = await getUniSettings();
	const folders = await getAllFolders();
	const uniFolder = await findUniFolder(settings, folders);
	if (!uniFolder) {
		await joplin.views.dialogs.showMessageBox(
			makeT(settings.language)('err.noNotebookFirst', { name: settings.notebookName }),
		);
		return;
	}

	const form = await showAddCourseForm(settings.semesterWeeks, settings.language);
	if (!form) return;

	await createCourseStructure(uniFolder.id, form, settings, false);
	await refreshDashboard({ silent: true });
	await toast(makeT(settings.language)('toast.addedCourse', { name: form.name }));
}
