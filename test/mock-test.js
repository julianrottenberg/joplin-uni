// Functional smoke test: loads the built plugin bundle (dist/index.js) against
// a mock of the Joplin plugin API and drives the full user flow.
//
// Run: node test/mock-test.js

'use strict';

function makeId() {
	return Math.random().toString(36).slice(2, 12);
}

const store = {
	folders: new Map(),
	notes: new Map(),
	tags: new Map(),
	noteTags: [], // {tagId, noteId}
};

const executed = [];
const toasts = [];
const messages = [];
const dialogQueue = []; // field objects, consumed FIFO; the mock nests them under the form name like real Joplin. {__raw: x} sends x as-is.
const dialogsCreated = [];

function paginate(items, query) {
	const limit = (query && query.limit) || 100;
	const page = (query && query.page) || 1;
	const slice = items.slice((page - 1) * limit, page * limit);
	return { items: slice, has_more: page * limit < items.length };
}

const joplin = {
	plugins: {
		register(def) {
			global.__pluginDef = def;
		},
	},
	settings: {
		_vals: {},
		async registerSection() {},
		async registerSettings(settings) {
			for (const [k, v] of Object.entries(settings)) this._vals[k] = v.value;
		},
		async values(keys) {
			const out = {};
			for (const k of keys) out[k] = this._vals[k];
			return out;
		},
		async setValue(k, v) {
			this._vals[k] = v;
		},
		async globalValue(key) {
			if (key === 'locale') return 'en_US';
			return '';
		},
	},
	commands: {
		_cmds: {},
		async register(cmd) {
			this._cmds[cmd.name] = cmd;
		},
		async execute(name, ...args) {
			executed.push([name, ...args]);
			if (this._cmds[name]) return this._cmds[name].execute(...args);
			return null;
		},
	},
	views: {
		dialogs: {
			async create(id) {
				dialogsCreated.push(id);
				return id;
			},
			async setHtml() {},
			async setButtons() {},
			async setFitToContent() {},
			async open() {
				let fd = dialogQueue.shift();
				if (fd === undefined) throw new Error('dialogQueue empty — test forgot to queue form data');
				// Real Joplin nests the fields under the form's name:
				// { [formName]: { field: value } }. An unnamed form lands
				// under the literal key "null". Mimic that here.
				if (fd && fd.__raw !== undefined) fd = fd.__raw;
				else fd = { uniForm: fd };
				return { id: 'ok', formData: fd };
			},
			async showMessageBox(message) {
				messages.push(message);
				return 0;
			},
			async showToast(toast) {
				toasts.push(toast);
			},
		},
		menus: { async create() {} },
		toolbarButtons: { async create() {} },
	},
	data: {
		async get(path, query) {
			const [res, id, link] = path;
			if (res === 'folders' && !id) return paginate([...store.folders.values()], query);
			if (res === 'folders' && id && !link) return store.folders.get(id);
			if (res === 'folders' && id && link === 'notes') {
				const notes = [...store.notes.values()].filter((n) => n.parent_id === id);
				return paginate(notes, query);
			}
			if (res === 'notes' && id) return store.notes.get(id);
			if (res === 'tags') return paginate([...store.tags.values()], query);
			throw new Error(`mock data.get not implemented: ${JSON.stringify(path)}`);
		},
		async post(path, _query, body) {
			const [res, id, link] = path;
			if (res === 'folders') {
				const folder = { id: makeId(), title: body.title, parent_id: body.parent_id || '' };
				store.folders.set(folder.id, folder);
				return folder;
			}
			if (res === 'notes') {
				const note = {
					id: makeId(),
					parent_id: body.parent_id,
					title: body.title || '',
					body: body.body || '',
					is_todo: body.is_todo || 0,
					todo_due: body.todo_due || 0,
					todo_completed: body.todo_completed || 0,
					updated_time: Date.now(),
				};
				store.notes.set(note.id, note);
				return note;
			}
			if (res === 'tags' && !id) {
				const tag = { id: makeId(), title: body.title };
				store.tags.set(tag.id, tag);
				return tag;
			}
			if (res === 'tags' && id && link === 'notes') {
				store.noteTags.push({ tagId: id, noteId: body.id });
				return {};
			}
			throw new Error(`mock data.post not implemented: ${JSON.stringify(path)}`);
		},
		async put(path, _query, body) {
			const [res, id] = path;
			if (res === 'notes' || res === 'folders') {
				const item = (res === 'notes' ? store.notes : store.folders).get(id);
				Object.assign(item, body);
				return item;
			}
			throw new Error(`mock data.put not implemented: ${JSON.stringify(path)}`);
		},
	},
};

global.joplin = joplin;

let failures = 0;
function check(label, condition, extra) {
	if (condition) {
		console.log(`ok    ${label}`);
	} else {
		failures++;
		console.log(`FAIL  ${label}`);
		if (extra !== undefined) console.log(extra);
	}
}

function folderByTitle(title, parentId) {
	for (const f of store.folders.values()) {
		if (f.title === title && (parentId === undefined || f.parent_id === parentId)) return f;
	}
	return null;
}

function notesInFolder(folderId) {
	return [...store.notes.values()].filter((n) => n.parent_id === folderId);
}

async function main() {
	require('../dist/index.js');
	const plugin = global.__pluginDef;
	check('plugin registered', !!plugin && typeof plugin.onStart === 'function');

	await plugin.onStart();
	check('commands registered', Object.keys(joplin.commands._cmds).length === 7);

	// --- 1. Setup wizard ---
	dialogQueue.push({
		language: 'en',
		notebookName: 'University',
		semesterName: 'WiSe 2026/27',
		semesterStart: '21.09.2026',
		semesterWeeks: 3,
		courseName1: 'Epistemology', courseCode1: 'PHI-301', courseInstructor1: 'Dr. Smith', courseCredits1: '5',
		courseName2: 'Linear Algebra', courseCode2: 'MATH-201', courseInstructor2: 'Prof. Euler', courseCredits2: '6',
		// Rows without a name are ignored, even when other fields are filled in.
		courseCode4: 'GHOST-100', courseInstructor4: 'Nobody',
		weeklyLectureNotes: undefined, // unchecked
	});
	await joplin.commands.execute('uni.setup');

	const uni = folderByTitle('University', '');
	check('uni notebook created', !!uni);
	check('two course notebooks', folderByTitle('Epistemology', uni.id) !== null && folderByTitle('Linear Algebra', uni.id) !== null);
	check('empty course rows skipped', ![...store.folders.values()].some((f) => f.parent_id === uni.id && (!f.title || f.title === 'GHOST-100')));

	const epi = folderByTitle('Epistemology', uni.id);
	const epiNotes = notesInFolder(epi.id);
	check('course info note', epiNotes.some((n) => n.title === 'Course Info' && n.body.includes('PHI-301')));
	const reading = epiNotes.find((n) => n.title === 'Reading List');
	check('reading list note with week headings', !!reading && reading.body.includes('## Week 1') && reading.body.includes('## Week 3'));
	check('no weekly lecture stubs (unchecked)', !notesInFolder(folderByTitle('Lectures', epi.id).id).length);
	check('assignments folder', folderByTitle('Assignments', epi.id) !== null);
	check('dashboard opened', executed.some(([cmd]) => cmd === 'openNote'));

	// --- 2. Add reading ---
	dialogQueue.push({
		course: epi.id,
		week: 2,
		priority: 'Essential',
		text: 'Gettier (1963) — Is Justified True Belief Knowledge? (pp. 121–123)',
	});
	await joplin.commands.execute('uni.addReading');
	const readingAfter = notesInFolder(epi.id).find((n) => n.title === 'Reading List');
	check('reading inserted under Week 2', readingAfter.body.includes('- [ ] **Essential** · Gettier (1963)'));
	check('reading inserted before Week 3 heading', readingAfter.body.indexOf('## Week 2') < readingAfter.body.indexOf('Gettier (1963)') && readingAfter.body.indexOf('Gettier (1963)') < readingAfter.body.indexOf('## Week 3'));

	// --- 3. Add deadline ---
	dialogQueue.push({
		course: epi.id,
		type: 'Essay',
		title: 'Essay 1 — Skepticism',
		due: '15.10.2026',
	});
	await joplin.commands.execute('uni.addDeadline');
	const assignments = folderByTitle('Assignments', epi.id);
	const todos = notesInFolder(assignments.id).filter((n) => n.is_todo === 1);
	check('deadline todo created', todos.length === 1 && todos[0].title === 'Essay: Essay 1 — Skepticism');
	check('todo due set to 08:00 local', todos[0].todo_due === new Date('2026-10-15T08:00:00').getTime());
	check('deadline tagged', store.noteTags.some((t) => t.noteId === todos[0].id));

	// --- 4. New lecture note ---
	dialogQueue.push({
		course: epi.id,
		week: 2,
		date: '13.10.2026',
		topic: 'Gettier cases',
	});
	await joplin.commands.execute('uni.newLectureNote');
	const lectures = folderByTitle('Lectures', epi.id);
	const lecture = notesInFolder(lectures.id).find((n) => n.title === 'Week 2 — Gettier cases');
	check('lecture note created', !!lecture && lecture.body.includes('# Epistemology — Week 2: Gettier cases') && lecture.body.includes('*Date: 13.10.2026*'));

	// --- 5. Add a third course ---
	dialogQueue.push({ name: 'Französisch C1', code: 'FRE-110', instructor: 'Mme. Dubois', credits: '3 ECTS' });
	await joplin.commands.execute('uni.addCourse');
	const fr = folderByTitle('Französisch C1', uni.id);
	check('third course added', !!fr && notesInFolder(fr.id).some((n) => n.title === 'Course Info'));

	// --- 6. Refresh dashboard and inspect it ---
	await joplin.commands.execute('uni.refreshDashboard');
	const dashboard = notesInFolder(uni.id).find((n) => n.body.includes('uni-dashboard'));
	check('dashboard note exists', !!dashboard);
	if (dashboard) {
		console.log('\n===== DASHBOARD BODY =====');
		console.log(dashboard.body);
		console.log('==========================\n');
		check('dashboard shows week', /Week \*\*\d+\*\*\s*of\s*3/.test(dashboard.body));
		check('dashboard lists deadline', dashboard.body.includes('Essay: Essay 1 — Skepticism'));
		check('dashboard reading progress', dashboard.body.includes('1/1') || /0\/\d+/.test(dashboard.body));
		check('dashboard links course info', dashboard.body.includes(`[Epistemology](:/${epiNotes.find((n) => n.title === 'Course Info').id})`));
		check('dashboard has 3 courses', (dashboard.body.match(/\|\s*\[?Französisch/g) || []).length === 1 && dashboard.body.includes('Linear Algebra'));
	}

	// --- 7. Regression: Joplin's nested form data must be unwrapped ---
	// Reading fields flat used to make every lookup come back undefined,
	// so no course was created (the user-visible bug). This is the exact
	// shape an unnamed <form> produces in real Joplin.
	dialogQueue.push({ __raw: { null: { name: 'Statistik', code: 'STA-201', instructor: 'Prof. Gauss', credits: '5' } } });
	await joplin.commands.execute('uni.addCourse');
	const sta = folderByTitle('Statistik', uni.id);
	check('nested form data unwrapped (course created)', !!sta && notesInFolder(sta.id).some((n) => n.title === 'Course Info'));

	// --- 8. German language scenario ---
	// The wizard's language selector must switch every created item;
	// the mock locale above stays en_US, so only the form choice can do it.
	dialogQueue.push({
		language: 'de',
		notebookName: 'Universität',
		semesterName: 'WiSe 2026/27',
		semesterStart: '21.09.2026',
		semesterWeeks: 2,
		courseName1: 'Erkenntnistheorie',
		weeklyLectureNotes: 'on',
	});
	await joplin.commands.execute('uni.setup');

	const deUni = folderByTitle('Universität', '');
	check('German uni notebook created', !!deUni);
	const deCourse = folderByTitle('Erkenntnistheorie', deUni.id);
	check('German course notebook created', !!deCourse);
	check('German course info note', notesInFolder(deCourse.id).some((n) => n.title === 'Kursinfo'));
	const deReading = notesInFolder(deCourse.id).find((n) => n.title === 'Literaturliste');
	check('German reading list with Woche headings', !!deReading && deReading.body.includes('## Woche 1') && deReading.body.includes('## Woche 2'));
	check('German lectures folder', folderByTitle('Vorlesungen', deCourse.id) !== null);
	check('German assignments folder', folderByTitle('Abgaben', deCourse.id) !== null);
	check('German toast shown', toasts.some((toast) => toast.message.includes('angelegt')));

	await joplin.commands.execute('uni.refreshDashboard');
	const deDashboard = notesInFolder(deUni.id).find((n) => n.body.includes('uni-dashboard'));
	check('German dashboard headings', !!deDashboard && deDashboard.body.includes('## Kurse') && deDashboard.body.includes('## Fristen'));
	console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
	return failures === 0;
}

async function idempotencyScenario() {
	failures = 0;

	// Setup with weekly lecture stubs on.
	dialogQueue.push({
		language: 'en',
		notebookName: 'University',
		semesterName: 'WiSe 2026/27',
		semesterStart: '21.09.2026',
		semesterWeeks: 3,
		courseName1: 'Logic', courseCode1: 'LOG-101', courseInstructor1: 'Dr. Tarski', courseCredits1: '5',
		weeklyLectureNotes: 'on',
	});
	await joplin.commands.execute('uni.setup');

	const uniB = folderByTitle('University', '');
	const logic = folderByTitle('Logic', uniB.id);
	const logicLectures = notesInFolder(folderByTitle('Lectures', logic.id).id);
	check('weekly lecture stubs created (3)', logicLectures.length === 3 && logicLectures.every((n) => /Week \d/.test(n.title)));

	// Re-run the same setup: nothing should be duplicated.
	dialogQueue.push({
		language: 'en',
		notebookName: 'University',
		semesterName: 'WiSe 2026/27',
		semesterStart: '21.09.2026',
		semesterWeeks: 3,
		courseName1: 'Logic', courseCode1: 'LOG-101', courseInstructor1: 'Dr. Tarski', courseCredits1: '5',
		weeklyLectureNotes: 'on',
	});
	await joplin.commands.execute('uni.setup');

	check('uni notebook not duplicated', [...store.folders.values()].filter((f) => f.title === 'University' && !f.parent_id).length === 1);
	check('course notebook not duplicated', [...store.folders.values()].filter((f) => f.title === 'Logic').length === 1);
	check('course info not duplicated', notesInFolder(logic.id).filter((n) => n.title === 'Course Info').length === 1);
	check('lecture stubs not duplicated', notesInFolder(folderByTitle('Lectures', logic.id).id).length === 3);

	// Reading with week 0 -> Further reading section.
	dialogQueue.push({ course: logic.id, week: 0, priority: 'Optional', text: 'Priest — Logic: A Very Short Introduction' });
	await joplin.commands.execute('uni.addReading');
	const logicReading = notesInFolder(logic.id).find((n) => n.title === 'Reading List');
	check('further-reading item inserted', logicReading.body.includes('## Further reading') && logicReading.body.indexOf('Priest — Logic') > logicReading.body.indexOf('## Further reading'));

	console.log(`\n${failures === 0 ? 'IDEMPOTENCY CHECKS PASSED' : failures + ' IDEMPOTENCY CHECK(S) FAILED'}`);
	return failures === 0;
}

module.exports = main().then(() => idempotencyScenario()).then((ok) => {
	process.exit(ok ? 0 : 1);
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
