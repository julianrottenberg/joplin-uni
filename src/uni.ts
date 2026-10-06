import joplin from 'api';
import { UniSettings } from './settings';
import { DASHBOARD_MARKER } from './constants';
import { autoAliases, autoFolderTitleAliases, autoTitle, AutoTitleKey, Lang } from './i18n';
import { createFolder, createNote, Folder, getAllFolders, getFolderNotes, updateFolder, updateNote } from './data';

/** The per-course fields a user types in a form. */
export interface CourseFields {
	name: string;
	code: string;
	instructor: string;
	credits: string;
}

export interface Course {
	/** Course notebook id. */
	folderId: string;
	name: string;
	infoNoteId: string | null;
	readingNoteId: string | null;
	lecturesFolderId: string | null;
	assignmentsFolderId: string | null;
	/** User-created sub-notebooks (parts), e.g. Vorlesung, Übung, Seminar. */
	parts: Part[];
}

/** A user-created sub-notebook of a course (e.g. Vorlesung, Übung, Seminar). */
export interface Part {
	id: string;
	name: string;
}

/**
 * Find the Uni notebook: the shallowest folder whose title matches the
 * configured notebook name.
 */
export async function findUniFolder(settings: UniSettings, folders?: Folder[]): Promise<Folder | null> {
	const all = folders ?? (await getAllFolders());
	const matches = all.filter((f) => f.title === settings.notebookName);
	if (!matches.length) return null;
	matches.sort((a, b) => (depth(all, a) - depth(all, b)) || a.title.localeCompare(b.title));
	return matches[0];
}

function depth(folders: Folder[], folder: Folder): number {
	let d = 0;
	let current: Folder | undefined = folder;
	while (current && current.parent_id) {
		const parent = folders.find((f) => f.id === current!.parent_id);
		if (!parent) break;
		d++;
		current = parent;
	}
	return d;
}

/** All folder ids in the Uni subtree, including the root. */
export function subtreeFolderIds(uniFolderId: string, folders: Folder[]): Set<string> {
	const out = new Set<string>([uniFolderId]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const f of folders) {
			if (!out.has(f.id) && out.has(f.parent_id)) {
				out.add(f.id);
				grew = true;
			}
		}
	}
	return out;
}

/** Course notebooks: direct children of the Uni notebook, minus auto-managed folders. */
export function courseFolders(uniFolderId: string, folders: Folder[]): Folder[] {
	return folders
		.filter((f) => f.parent_id === uniFolderId && !autoFolderTitleAliases().includes(f.title))
		.sort((a, b) => a.title.localeCompare(b.title));
}

/** Map folderId -> course name, for all folders inside a course (the course folder itself and below). */
export function buildCourseNameMap(uniFolderId: string, folders: Folder[]): Map<string, string> {
	const map = new Map<string, string>();
	const courses = courseFolders(uniFolderId, folders);
	for (const course of courses) {
		for (const fid of subtreeFolderIds(course.id, folders)) {
			map.set(fid, course.title);
		}
	}
	return map;
}

/** Look up the standard structure of every course in one pass. */
export async function loadCourses(uniFolderId: string, folders: Folder[]): Promise<Course[]> {
	const courses = courseFolders(uniFolderId, folders);
	const out: Course[] = [];
	for (const folder of courses) {
		const childFolders = folders.filter((f) => f.parent_id === folder.id);
		const notes = await getFolderNotes(folder.id, ['id', 'title']);
		out.push({
			folderId: folder.id,
			name: folder.title,
			infoNoteId: notes.find((n: any) => autoAliases('courseInfo').includes(n.title))?.id ?? null,
			readingNoteId: notes.find((n: any) => autoAliases('readingList').includes(n.title))?.id ?? null,
			lecturesFolderId: childFolders.find((f) => autoAliases('lecturesFolder').includes(f.title))?.id ?? null,
			assignmentsFolderId: childFolders.find((f) => autoAliases('assignmentsFolder').includes(f.title))?.id ?? null,
			parts: childFolders
				.filter((f) => !autoFolderTitleAliases().includes(f.title))
				.map((f) => ({ id: f.id, name: f.title }))
				.sort((a, b) => a.name.localeCompare(b.name)),
		});
	}
	return out;
}

export async function getOrCreateFolder(parentId: string, title: string, folders?: Folder[]): Promise<Folder> {
	const all = folders ?? (await getAllFolders());
	const existing = all.find((f) => f.parent_id === parentId && f.title === title);
	if (existing) return existing;
	return createFolder(title, parentId);
}

export async function getOrCreateAutoFolder(
	parentId: string,
	key: AutoTitleKey,
	lang: Lang,
	folders?: Folder[],
): Promise<Folder> {
	const title = autoTitle(key, lang);
	const all = folders ?? (await getAllFolders());
	const existing = all.find((f) => f.parent_id === parentId && autoAliases(key).includes(f.title));
	if (existing) {
		// Normalize the title to the active language.
		if (existing.title !== title) await updateFolder(existing.id, { title });
		return existing;
	}
	return createFolder(title, parentId);
}

export async function getOrCreateAutoNote(
	parentId: string,
	key: AutoTitleKey,
	body: string,
	lang: Lang,
): Promise<{ id: string; created: boolean }> {
	const title = autoTitle(key, lang);
	const notes = await getFolderNotes(parentId, ['id', 'title']);
	const existing = notes.find((n: any) => autoAliases(key).includes(n.title));
	if (existing) {
		// Rename to the active language, but never touch the body — the note
		// may hold user content (the reading list does).
		if (existing.title !== title) await updateNote(existing.id, { title });
		return { id: existing.id, created: false };
	}
	const note = await createNote({ title, body, parent_id: parentId });
	return { id: note.id, created: true };
}

/** Find the dashboard note inside the Uni notebook (by title and marker). */
export async function findDashboardNote(uniFolderId: string, dashboardTitle: string): Promise<any | null> {
	const notes = await getFolderNotes(uniFolderId, ['id', 'title']);
	const candidates = notes.filter((n: any) => n.title === dashboardTitle);
	for (const n of candidates) {
		const full = await joplin.data.get(['notes', n.id], { fields: ['id', 'body'] });
		if ((full.body || '').includes(DASHBOARD_MARKER)) return { id: full.id, title: n.title };
	}
	return null;
}

export async function writeDashboardNote(uniFolderId: string, dashboardTitle: string, body: string): Promise<string> {
	const existing = await findDashboardNote(uniFolderId, dashboardTitle);
	if (existing) {
		await updateNote(existing.id, { body });
		return existing.id;
	}
	const note = await createNote({ title: dashboardTitle, body, parent_id: uniFolderId });
	return note.id;
}
