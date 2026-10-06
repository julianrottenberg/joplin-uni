import joplin from 'api';

export interface Folder {
	id: string;
	title: string;
	parent_id: string;
}

interface Paginated<T> {
	items: T[];
	has_more: boolean;
}

const PAGE_SIZE = 100;

/** All folders in the database (flat list, tree via parent_id), sorted by title. */
export async function getAllFolders(): Promise<Folder[]> {
	const out: Folder[] = [];
	let page = 1;
	for (;;) {
		const res: Paginated<Folder> = await joplin.data.get(['folders'], {
			page,
			limit: PAGE_SIZE,
			fields: ['id', 'title', 'parent_id'],
		});
		out.push(...res.items);
		if (!res.has_more) break;
		page++;
	}
	out.sort((a, b) => a.title.localeCompare(b.title));
	return out;
}

/** All notes in a folder (non-recursive). */
export async function getFolderNotes(folderId: string, fields: string[]): Promise<any[]> {
	const out: any[] = [];
	let page = 1;
	for (;;) {
		const res: Paginated<any> = await joplin.data.get(['folders', folderId, 'notes'], {
			page,
			limit: PAGE_SIZE,
			fields,
		});
		out.push(...res.items);
		if (!res.has_more) break;
		page++;
	}
	return out;
}

export async function getNote(noteId: string, fields: string[]): Promise<any> {
	return joplin.data.get(['notes', noteId], { fields });
}

export async function createFolder(title: string, parentId: string): Promise<Folder> {
	let folder: any;
	if (parentId) {
		// The data API accepts parent_id on folder creation. Fallback: create
		// top-level, then move it with a PUT.
		try {
			folder = await joplin.data.post(['folders'], null, { title, parent_id: parentId });
		} catch (error) {
			folder = await joplin.data.post(['folders'], null, { title });
		}
		if (!folder.parent_id || folder.parent_id !== parentId) {
			await joplin.data.put(['folders', folder.id], null, { parent_id: parentId });
			folder.parent_id = parentId;
		}
	} else {
		folder = await joplin.data.post(['folders'], null, { title });
	}
	return folder as Folder;
}

export async function createNote(properties: Record<string, any>): Promise<any> {
	return joplin.data.post(['notes'], null, properties);
}

export async function updateNote(noteId: string, properties: Record<string, any>): Promise<void> {
	await joplin.data.put(['notes', noteId], null, properties);
}

/** Rename a folder (PUT /folders/:id). */
export async function updateFolder(folderId: string, properties: Record<string, any>): Promise<void> {
	await joplin.data.put(['folders', folderId], null, properties);
}

/** Find-or-create a tag by title; returns the tag id. */
export async function findOrCreateTag(title: string): Promise<string> {
	let page = 1;
	for (;;) {
		const res: Paginated<any> = await joplin.data.get(['tags'], { page, limit: PAGE_SIZE, fields: ['id', 'title'] });
		const found = res.items.find((t: any) => t.title === title);
		if (found) return found.id;
		if (!res.has_more) break;
		page++;
	}
	const tag = await joplin.data.post(['tags'], null, { title });
	return tag.id;
}

export async function attachTagToNote(tagId: string, noteId: string): Promise<void> {
	await joplin.data.post(['tags', tagId, 'notes'], null, { id: noteId });
}
