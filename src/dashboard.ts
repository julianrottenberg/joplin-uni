import joplin from 'api';
import { DASHBOARD_MARKER } from './constants';
import { getAllFolders, getFolderNotes, getNote } from './data';
import {
	currentSemesterWeek,
	formatDate,
	relativeDueLabel,
	relativeUpdatedLabel,
	startOfToday,
} from './dates';
import { getUniSettings, UniSettings } from './settings';
import {
	buildCourseNameMap,
	findDashboardNote,
	findUniFolder,
	loadCourses,
	subtreeFolderIds,
	writeDashboardNote,
	Course,
} from './uni';

const DAY_MS = 24 * 60 * 60 * 1000;

interface NoteRow {
	id: string;
	title: string;
	parent_id: string;
	is_todo: number;
	todo_due: number;
	todo_completed: number;
	updated_time: number;
}

interface ReadingStats {
	total: number;
	done: number;
	nextUp: string[];
}

function parseReadingBody(body: string): ReadingStats {
	const stats: ReadingStats = { total: 0, done: 0, nextUp: [] };
	const lines = body.split(/\r?\n/);
	for (const line of lines) {
		const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s?(.*)$/);
		if (!m) continue;
		stats.total++;
		if (m[1].toLowerCase() === 'x') {
			stats.done++;
		} else if (stats.nextUp.length < 3) {
			stats.nextUp.push(m[2].trim());
		}
	}
	return stats;
}

function progressBar(done: number, total: number, width = 16): string {
	if (total <= 0) return '';
	const filled = Math.round((done / total) * width);
	return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Collects everything shown on the dashboard, then (re)writes the dashboard
 * note. Returns the dashboard note id, or null when the Uni notebook does
 * not exist.
 */
export async function refreshDashboard(options: { silent?: boolean } = {}): Promise<string | null> {
	const silent = options.silent === true;
	const settings = await getUniSettings();

	const folders = await getAllFolders();
	const uniFolder = await findUniFolder(settings, folders);
	if (!uniFolder) {
		if (!silent) {
			await joplin.views.dialogs.showMessageBox(
				`No "${settings.notebookName}" notebook found. Run Ctrl+P, then **Uni: Set up semester…** to create it.`,
			);
		}
		return null;
	}

	const dashboard = await findDashboardNote(uniFolder.id, settings.dashboardTitle);
	const courses = await loadCourses(uniFolder.id, folders);
	const courseNameMap = buildCourseNameMap(uniFolder.id, folders);

	// All notes in the Uni subtree.
	const uniSubtree = subtreeFolderIds(uniFolder.id, folders);
	const allNotes: NoteRow[] = [];
	for (const folderId of uniSubtree) {
		const notes = await getFolderNotes(folderId, [
			'id',
			'title',
			'parent_id',
			'is_todo',
			'todo_due',
			'todo_completed',
			'updated_time',
		]);
		for (const n of notes) allNotes.push(n as NoteRow);
	}

	// Reading stats per course.
	const readingByCourse = new Map<string, ReadingStats>();
	for (const course of courses) {
		if (!course.readingNoteId) {
			readingByCourse.set(course.folderId, { total: 0, done: 0, nextUp: [] });
			continue;
		}
		const note = await getNote(course.readingNoteId, ['body']);
		readingByCourse.set(course.folderId, parseReadingBody(note.body || ''));
	}

	// Open to-dos with a due date.
	const openTodos = allNotes
		.filter((n) => n.is_todo === 1 && n.todo_due > 0 && !n.todo_completed)
		.sort((a, b) => a.todo_due - b.todo_due);

	const todayMs = startOfToday();
	const overdue = openTodos.filter((n) => n.todo_due < todayMs);
	const upcoming = openTodos.filter((n) => n.todo_due >= todayMs && n.todo_due <= todayMs + 14 * DAY_MS);

	// Open to-dos per course (any todo in the course subtree).
	const openByCourse = new Map<string, number>();
	for (const n of allNotes) {
		if (n.is_todo === 1 && !n.todo_completed) {
			const course = courseNameMap.get(n.parent_id);
			if (course) openByCourse.set(course, (openByCourse.get(course) ?? 0) + 1);
		}
	}

	// Next deadline per course.
	const nextDeadlineByCourse = new Map<string, NoteRow>();
	for (const n of openTodos) {
		const course = courseNameMap.get(n.parent_id);
		if (!course) continue;
		if (!nextDeadlineByCourse.has(course)) nextDeadlineByCourse.set(course, n);
	}

	const body = buildDashboardBody({
		settings,
		courses,
		readingByCourse,
		overdue,
		upcoming,
		openByCourse,
		nextDeadlineByCourse,
		allNotes,
		dashboardId: dashboard?.id ?? null,
		courseNameMap,
	});

	const dashboardId = await writeDashboardNote(uniFolder.id, settings.dashboardTitle, body);
	return dashboardId;
}

interface DashboardContext {
	settings: UniSettings;
	courses: Course[];
	readingByCourse: Map<string, ReadingStats>;
	overdue: NoteRow[];
	upcoming: NoteRow[];
	openByCourse: Map<string, number>;
	nextDeadlineByCourse: Map<string, NoteRow>;
	allNotes: NoteRow[];
	dashboardId: string | null;
	courseNameMap: Map<string, string>;
}

function buildDashboardBody(ctx: DashboardContext): string {
	const { settings, courses } = ctx;
	const lines: string[] = [];

	lines.push(DASHBOARD_MARKER, '');

	lines.push('# Uni Dashboard', '');

	// --- Semester header ---
	const week = currentSemesterWeek(settings.semesterStart, settings.semesterWeeks);
	if (settings.semesterName || week) {
		const bits: string[] = [];
		if (settings.semesterName) bits.push(`**${settings.semesterName}**`);
		if (week) bits.push(`Week **${week}** of ${settings.semesterWeeks}`);
		bits.push(formatDate(Date.now()));
		lines.push(bits.join(' · '), '');
	} else {
		lines.push(
			`*Set your semester start under Options → Uni (or run the setup wizard) to see the current week here.*`,
			'',
		);
	}

	// --- Courses table ---
	lines.push('## Courses', '');
	if (!courses.length) {
		lines.push('No courses yet — use the command palette (Ctrl+P, "Uni: Add course…").', '');
	} else {
		lines.push('| Course | Readings | Open to-dos | Next deadline |', '| --- | --- | --- | --- |');
		for (const course of courses) {
			const reading = ctx.readingByCourse.get(course.folderId) ?? { total: 0, done: 0, nextUp: [] };
			const readingCell = reading.total
				? `${reading.done}/${reading.total}`
				: '—';
			const openCount = ctx.openByCourse.get(course.name) ?? 0;
			const next = ctx.nextDeadlineByCourse.get(course.name);
			const nextCell = next
				? `${formatDate(next.todo_due)} — [${next.title}](:/${next.id})`
				: '—';
			const nameCell = course.infoNoteId
				? `[${course.name}](:/${course.infoNoteId})`
				: course.name;
			lines.push(`| ${nameCell} | ${readingCell} | ${openCount || '—'} | ${nextCell} |`);
		}
		lines.push('');
	}

	// --- Deadlines ---
	lines.push('## Deadlines', '');
	if (ctx.overdue.length) {
		lines.push('**Overdue**', '');
		for (const n of ctx.overdue) {
			lines.push(`- [${n.title}](:/${n.id}) — due ${formatDate(n.todo_due)}, ${relativeDueLabel(n.todo_due)}${courseSuffix(ctx, n)}`);
		}
		lines.push('');
	}
	if (ctx.upcoming.length) {
		lines.push('**Next 14 days**', '');
		for (const n of ctx.upcoming) {
			lines.push(`- [${n.title}](:/${n.id}) — due ${formatDate(n.todo_due)}, ${relativeDueLabel(n.todo_due)}${courseSuffix(ctx, n)}`);
		}
		lines.push('');
	}
	if (!ctx.overdue.length && !ctx.upcoming.length) {
		lines.push('Nothing due in the next 14 days. Add deadlines via the command palette (Ctrl+P, "Uni: Add deadline…").', '');
	}

	// --- Reading next up ---
	const withReadings = courses.filter((c) => {
		const r = ctx.readingByCourse.get(c.folderId);
		return r && r.nextUp.length;
	});
	if (withReadings.length) {
		lines.push('## Reading next up', '');
		for (const course of withReadings) {
			const r = ctx.readingByCourse.get(course.folderId)!;
			const bar = progressBar(r.done, r.total);
			lines.push(`### ${course.name} — ${r.done}/${r.total} read`, '', `\`${bar}\``, '');
			for (const item of r.nextUp) {
				lines.push(`- ${item}`);
			}
			lines.push('');
		}
	}

	// --- Recently updated ---
	const recent = ctx.allNotes
		.filter((n) => !n.is_todo && n.id !== ctx.dashboardId)
		.sort((a, b) => b.updated_time - a.updated_time)
		.slice(0, 5);
	if (recent.length) {
		lines.push('## Recently updated', '');
		for (const n of recent) {
			lines.push(`- [${n.title}](:/${n.id}) — ${relativeUpdatedLabel(n.updated_time)}${courseSuffix(ctx, n)}`);
		}
		lines.push('');
	}

	// --- Footer ---
	lines.push('---', '');
	lines.push(
		`*Generated by the Uni plugin — edits are overwritten on refresh. Refresh via Ctrl+P, "Uni: Refresh dashboard". Last updated ${new Date().toLocaleString()}.*`,
		'',
	);

	return lines.join('\n');
}

function courseSuffix(ctx: DashboardContext, note: NoteRow): string {
	const course = ctx.courseNameMap.get(note.parent_id);
	return course ? ` (${course})` : '';
}
