// Localization for the Uni plugin.
//
// Every user-visible string lives in the STRINGS table below. Two languages
// are supported: 'de' (German) and 'en' (English). The active language is a
// plugin setting, chosen in the setup wizard; new installs pick it up from
// the Joplin locale. Everything the plugin shows or creates follows it.

export type Lang = 'de' | 'en';

export function isLang(value: unknown): value is Lang {
	return value === 'de' || value === 'en';
}

/** Bilingual on purpose: the selector must be findable in either language. */
export const LANGUAGE_SELECT_LABEL = 'Sprache / Language';

export const LANG_LABELS: Record<Lang, string> = {
	de: 'Deutsch',
	en: 'English',
};

const STRINGS = {
	// --- Setup wizard ---
	'setup.title': { en: 'Set up your Uni workspace', de: 'Richte deinen Uni-Workspace ein' },
	'setup.hint': {
		en: 'Everything is created inside one notebook, so your private notes stay separate. More courses can be added later with "Uni: Add course…".',
		de: 'Alles wird in einem eigenen Notizbuch angelegt, damit deine privaten Notizen getrennt bleiben. Weitere Kurse kannst du später mit „Uni: Kurs hinzufügen…" ergänzen.',
	},
	'setup.langHint': {
		en: 'Applies to everything the plugin creates from now on. Palette labels follow after a Joplin restart.',
		de: 'Gilt für alles, was das Plugin ab jetzt anlegt. Die Einträge der Befehlspalette folgen nach einem Joplin-Neustart.',
	},
	'setup.notebook': { en: 'University notebook', de: 'Uni-Notizbuch' },
	'setup.semester': { en: 'Semester', de: 'Semester' },
	'setup.semesterPh': { en: 'e.g. WiSe 2026/27', de: 'z. B. WiSe 2026/27' },
	'setup.start': { en: 'Start date', de: 'Semesterbeginn' },
	'setup.weeks': { en: 'Weeks', de: 'Wochen' },
	'setup.courses': { en: 'Courses', de: 'Kurse' },
	'setup.coursesHint': {
		en: '— only the name is required; leave rows you don\'t need empty',
		de: '— nur der Name ist Pflicht; Zeilen, die du nicht brauchst, leer lassen',
	},
	'setup.head.name': { en: 'Course name', de: 'Kursname' },
	'setup.head.code': { en: 'Code', de: 'Nummer' },
	'setup.head.instructor': { en: 'Instructor', de: 'Dozent:in' },
	'setup.head.credits': { en: 'Credits', de: 'ECTS' },
	'setup.example.name': { en: 'e.g. Epistemology', de: 'z. B. Erkenntnistheorie' },
	'setup.example.instructor': { en: 'Dr. Smith', de: 'Prof. Schmidt' },
	'setup.weeklyNotes': { en: 'Create a lecture note for every week', de: 'Für jede Woche eine Vorlesungsnotiz anlegen' },
	'setup.partsHint': {
		en: 'Lectures, exercises, seminars? Add them as parts of the module later via "Uni: Add part…" — credits count once per module.',
		de: 'Vorlesung, Übung, Seminar? Leg sie später als Teile des Moduls an, mit „Uni: Modul-Teil hinzufügen…" — ECTS zählen einmal pro Modul.',
	},
	'setup.create': { en: 'Create', de: 'Erstellen' },
	'setup.aria.name': { en: 'Course {i} name', de: 'Kurs {i}: Name' },
	'setup.aria.code': { en: 'Course {i} code', de: 'Kurs {i}: Nummer' },
	'setup.aria.instructor': { en: 'Course {i} instructor', de: 'Kurs {i}: Dozent:in' },
	'setup.aria.credits': { en: 'Course {i} credits', de: 'Kurs {i}: ECTS' },
	'msg.datePattern': {
		en: 'Please enter the semester start as DD.MM.YYYY, for example 12.10.2026.',
		de: 'Bitte gib den Semesterbeginn als TT.MM.JJJJ ein, z. B. 12.10.2026.',
	},

	// --- Add course ---
	'addCourse.title': { en: 'Add a course', de: 'Kurs hinzufügen' },
	'addCourse.hint': {
		en: 'Creates a course notebook with Course Info, Reading List ({weeks} week sections), Lectures and Assignments.',
		de: 'Legt ein Kurs-Notizbuch an: „Kursinfo", „Literaturliste" ({weeks} Wochenabschnitte), „Vorlesungen" und „Abgaben".',
	},
	'addCourse.name': { en: 'Course name', de: 'Kursname' },
	'addCourse.code': { en: 'Code', de: 'Nummer' },
	'addCourse.instructor': { en: 'Instructor', de: 'Dozent:in' },
	'addCourse.credits': { en: 'Credits', de: 'ECTS' },
	'addCourse.button': { en: 'Add course', de: 'Kurs hinzufügen' },
	'msg.enterCourseName': { en: 'Please enter a course name.', de: 'Bitte gib einen Kursnamen ein.' },

	// --- Add part (Vorlesung, Übung, Seminar…) ---
	'part.title': { en: 'Add a module part', de: 'Modul-Teil hinzufügen' },
	'part.hint': {
		en: 'Creates a sub-notebook inside the course notebook, e.g. for a lecture, exercise or seminar. Credits and the reading list stay at module level.',
		de: 'Legt ein Unter-Notizbuch im Kurs-Notizbuch an, z. B. für Vorlesung, Übung oder Seminar. ECTS und Literaturliste bleiben beim Modul.',
	},
	'part.name': { en: 'Part name', de: 'Name des Teils' },
	'part.namePh': { en: 'e.g. Exercise, Seminar', de: 'z. B. Übung, Seminar' },
	'part.weeklyStubs': { en: 'Create a note for every week', de: 'Für jede Woche eine Notiz anlegen' },
	'part.button': { en: 'Create part', de: 'Teil anlegen' },
	'msg.enterPartName': { en: 'Please enter a part name.', de: 'Bitte gib einen Namen für den Teil ein.' },
	'toast.partCreated': { en: 'Created part "{name}" in {course}.', de: 'Teil „{name}" in {course} angelegt.' },
	'toast.partExists': { en: 'Part "{name}" already exists in {course}.', de: 'Teil „{name}" existiert bereits in {course}.' },

	// --- Lecture note ---
	'lecture.title': { en: 'New lecture note', de: 'Neue Vorlesungsnotiz' },
	'lecture.hint': {
		en: 'Creates a note in the course\'s "Lectures" notebook, or in the selected part (e.g. Übung, Seminar).',
		de: 'Legt eine Notiz im Ordner „Vorlesungen" des Kurses an — oder im gewählten Teil (z. B. Übung, Seminar).',
	},
	'lecture.course': { en: 'Course', de: 'Kurs' },
	'lecture.week': { en: 'Week', de: 'Woche' },
	'lecture.date': { en: 'Date', de: 'Datum' },
	'lecture.topic': { en: 'Topic', de: 'Thema' },
	'lecture.topicPh': { en: 'e.g. Gettier cases', de: 'z. B. Gettier-Fälle' },
	'lecture.button': { en: 'Create note', de: 'Notiz anlegen' },
	'msg.enterTopic': { en: 'Please enter a topic.', de: 'Bitte gib ein Thema ein.' },

	// --- Reading ---
	'reading.title': { en: 'Add a reading', de: 'Lesetext hinzufügen' },
	'reading.hint': {
		en: 'Appends the item to the course reading list. Add a link inside the text if you like: [PDF](https://…)',
		de: 'Hängt den Eintrag an die Literaturliste des Kurses an. Im Text kannst du auch einen Link ergänzen: [PDF](https://…)',
	},
	'reading.week': { en: 'Week (0 = further reading)', de: 'Woche (0 = weiterführende Literatur)' },
	'reading.priority': { en: 'Priority', de: 'Priorität' },
	'reading.label': { en: 'Reading', de: 'Lesetext' },
	'reading.ph': {
		en: 'e.g. Gettier (1963) — Is Justified True Belief Knowledge?, pp. 121–123',
		de: 'z. B. Gettier (1963) — Is Justified True Belief Knowledge?, S. 121–123',
	},
	'reading.button': { en: 'Add', de: 'Hinzufügen' },
	'msg.enterReading': { en: 'Please enter a reading.', de: 'Bitte gib einen Lesetext ein.' },

	// --- Deadline ---
	'deadline.title': { en: 'Add a deadline', de: 'Frist hinzufügen' },
	'deadline.hint': {
		en: 'Creates a to-do in the course\'s "Assignments" notebook with a reminder on the due date.',
		de: 'Legt ein To-do im Ordner „Abgaben" des Kurses an, mit Erinnerung am Fälligkeitsdatum.',
	},
	'deadline.type': { en: 'Type', de: 'Typ' },
	'deadline.due': { en: 'Due date', de: 'Fällig am' },
	'deadline.titleLabel': { en: 'Title', de: 'Titel' },
	'deadline.titlePh': { en: 'e.g. Essay 1 — Skepticism', de: 'z. B. Essay 1 — Skeptizismus' },
	'deadline.button': { en: 'Add', de: 'Hinzufügen' },
	'msg.enterTitleDue': { en: 'Please enter a title and a due date.', de: 'Bitte gib Titel und Fälligkeitsdatum an.' },

	// --- Buttons ---
	'btn.cancel': { en: 'Cancel', de: 'Abbrechen' },

	// --- Workspace errors / crash ---
	'err.noNotebookFirst': {
		en: 'No "{name}" notebook found. Run Ctrl+Shift+P, then **Uni: Set up semester…** first.',
		de: 'Kein Notizbuch „{name}" gefunden. Zuerst Strg+Umschalt+P, dann **Uni: Semester einrichten…** ausführen.',
	},
	'err.noNotebookCreate': {
		en: 'No "{name}" notebook found. Run Ctrl+Shift+P, then **Uni: Set up semester…** to create it.',
		de: 'Kein Notizbuch „{name}" gefunden. Führe Strg+Umschalt+P und dann **Uni: Semester einrichten…** aus, um es anzulegen.',
	},
	'err.noCourses': {
		en: 'No courses yet. Add one first via the command palette (Ctrl+Shift+P, "Uni: Add course…").',
		de: 'Noch keine Kurse. Leg zuerst einen an über die Befehlspalette (Strg+Umschalt+P, „Uni: Kurs hinzufügen…").',
	},
	'err.crashTitle': { en: 'Uni plugin: something went wrong.', de: 'Uni-Plugin: Etwas ist schiefgelaufen.' },

	// --- Toasts ---
	'toast.createdNotebook': {
		en: 'Created notebook "{name}" with {count} course(s).',
		de: 'Notizbuch „{name}" mit {count} Kurs(en) angelegt.',
	},
	'toast.addedCourses': { en: 'Added {count} course(s). ', de: '{count} Kurs(e) hinzugefügt. ' },
	'toast.settingsUpdated': { en: 'Semester settings updated.', de: 'Semestereinstellungen aktualisiert.' },
	'toast.addedCourse': { en: 'Added course "{name}".', de: 'Kurs „{name}" hinzugefügt.' },
	'toast.lectureCreated': { en: 'Created lecture note in {course}.', de: 'Vorlesungsnotiz in {course} angelegt.' },
	'toast.readingAdded': { en: 'Added reading to {course}.', de: 'Lesetext zu {course} hinzugefügt.' },
	'toast.deadlineAdded': { en: 'Deadline added to {course} (reminder on {date}).', de: 'Frist zu {course} hinzugefügt (Erinnerung am {date}).' },
	'toast.dashboardUpdated': { en: 'Uni dashboard updated.', de: 'Uni-Dashboard aktualisiert.' },

	// --- Module details (Course Info block) ---
	'mod.full.mandatory': { en: 'Mandatory module', de: 'Pflichtmodul' },
	'mod.full.elective': { en: 'Elective module', de: 'Wahlpflichtmodul' },
	'turnus.winter': { en: 'Winter semester', de: 'Wintersemester' },
	'turnus.summer': { en: 'Summer semester', de: 'Sommersemester' },
	'turnus.both': { en: 'Winter & summer semester', de: 'Winter- und Sommersemester' },

	// --- Course Info note ---
	'ci.code': { en: '**Code:**', de: '**Nummer:**' },
	'ci.instructor': { en: '**Instructor:**', de: '**Dozent:in:**' },
	'ci.credits': { en: '**Credits:**', de: '**ECTS:**' },
	'ci.semester': { en: '**Semester:**', de: '**Semester:**' },
	'ci.status': { en: '**Status:**', de: '**Status:**' },
	'ci.sws': { en: '**Hours/week:**', de: '**SWS:**' },
	'ci.turnus': { en: '**Offered:**', de: '**Turnus:**' },
	'ci.exam': { en: '**Assessment:**', de: '**Prüfungsleistung:**' },
	'ci.schedule': { en: '## Schedule', de: '## Zeitplan' },
	'ci.grading': { en: '## Grading', de: '## Benotung' },
	'ci.links': { en: '## Links', de: '## Links' },

	// --- Reading List note ---
	'rl.headingSuffix': { en: '— Reading List', de: '— Literaturliste' },
	'rl.hint': {
		en: 'Tick items as you read them — progress shows up on the Uni dashboard. Add items via the command palette (Ctrl+Shift+P, "Uni: Add reading…"), or type them directly as Markdown checkboxes.',
		de: 'Hake Einträge ab, sobald du sie gelesen hast — der Fortschritt erscheint im Uni-Dashboard. Einträge ergänzt du über die Befehlspalette (Strg+Umschalt+P, „Uni: Lesetext hinzufügen…") oder direkt als Markdown-Checkboxen.',
	},

	// --- Lecture template default ---
	'tpl.title': { en: '# {{course}} — Week {{week}}: {{topic}}', de: '# {{course}} — Woche {{week}}: {{topic}}' },
	'tpl.date': { en: '*Date: {{date}}*', de: '*Datum: {{date}}*' },
	'tpl.notes': { en: '## Notes', de: '## Notizen' },
	'tpl.keyPoints': { en: '## Key points', de: '## Kernpunkte' },
	'tpl.questions': { en: '## Open questions', de: '## Offene Fragen' },
	'tpl.todo': { en: '## To do', de: '## Aufgaben' },
	'tpl.todoItem': { en: '- [ ] Review this week\'s reading', de: '- [ ] Die Lektüre dieser Woche durchgehen' },

	// --- Dashboard ---
	'dash.weekOf': { en: 'Week {week} of {weeks}', de: 'Woche {week} von {weeks}' },
	'dash.noSemester': {
		en: '*Set your semester start under Options → Uni (or run the setup wizard) to see the current week here.*',
		de: '*Lege den Semesterbeginn unter Einstellungen → Uni fest (oder starte den Einrichtungs-Assistenten), um hier die aktuelle Woche zu sehen.*',
	},
	'dash.courses': { en: '## Courses', de: '## Kurse' },
	'dash.noCourses': {
		en: 'No courses yet — use the command palette (Ctrl+Shift+P, "Uni: Add course…").',
		de: 'Noch keine Kurse — ergänze sie über die Befehlspalette (Strg+Umschalt+P, „Uni: Kurs hinzufügen…").',
	},
	'dash.tableHead': {
		en: '| Course | Status | ECTS | Readings | Open to-dos | Next deadline |',
		de: '| Kurs | Status | LP | Lesetexte | Offene To-dos | Nächste Frist |',
	},
	'dash.creditSummary': { en: '**{sum} ECTS**', de: '**{sum} LP**' },
	'dash.deadlines': { en: '## Deadlines', de: '## Fristen' },
	'dash.overdue': { en: '**Overdue**', de: '**Überfällig**' },
	'dash.next14': { en: '**Next 14 days**', de: '**Nächste 14 Tage**' },
	'dash.noDeadlines': {
		en: 'Nothing due in the next 14 days. Add deadlines via the command palette (Ctrl+Shift+P, "Uni: Add deadline…").',
		de: 'Nichts fällig in den nächsten 14 Tagen. Fristen ergänzt du über die Befehlspalette (Strg+Umschalt+P, „Uni: Frist hinzufügen…").',
	},
	'dash.readingNext': { en: '## Reading next up', de: '## Als Nächstes lesen' },
	'dash.readProgress': { en: '{done}/{total} read', de: '{done}/{total} gelesen' },
	'dash.recent': { en: '## Recently updated', de: '## Kürzlich aktualisiert' },
	'dash.dueWord': { en: 'due {date}', de: 'fällig am {date}' },
	'dash.footer': {
		en: '*Generated by the Uni plugin — edits are overwritten on refresh. Refresh via Ctrl+Shift+P, "Uni: Refresh dashboard". Last updated {time}.*',
		de: '*Erzeugt vom Uni-Plugin — manuelle Änderungen werden beim Aktualisieren überschrieben. Aktualisieren über Strg+Umschalt+P, „Uni: Dashboard aktualisieren". Zuletzt aktualisiert: {time}.*',
	},

	// --- Relative date labels ---
	'rel.today': { en: 'today', de: 'heute' },
	'rel.tomorrow': { en: 'tomorrow', de: 'morgen' },
	'rel.yesterday': { en: 'yesterday', de: 'gestern' },
	'rel.inDays': { en: 'in {n} days', de: 'in {n} Tagen' },
	'rel.overdue': { en: '{n} days overdue', de: 'seit {n} Tagen überfällig' },
	'rel.justNow': { en: 'just now', de: 'gerade eben' },
	'rel.minsAgo': { en: '{n}m ago', de: 'vor {n} Min.' },
	'rel.hoursAgo': { en: '{n}h ago', de: 'vor {n} Std.' },
	'rel.daysAgo': { en: '{n}d ago', de: 'vor {n} Tagen' },

	// --- Settings section (registered labels) ---
	'set.sectionDesc': {
		en: 'University workspace. Most of this is set up by the wizard in the command palette (Ctrl+Shift+P, "Uni: Set up semester…").',
		de: 'Uni-Workspace. Das meiste richtet der Assistent über die Befehlspalette ein (Strg+Umschalt+P, „Uni: Semester einrichten…").',
	},
	'set.notebook': { en: 'University notebook', de: 'Uni-Notizbuch' },
	'set.notebookDesc': {
		en: 'All uni notes are kept inside this one notebook, so private notes stay separate.',
		de: 'Alle Uni-Notizen liegen in diesem einen Notizbuch, damit private Notizen getrennt bleiben.',
	},
	'set.dashboardTitle': { en: 'Dashboard note title', de: 'Dashboard-Notiz (Titel)' },
	'set.semesterName': { en: 'Semester name', de: 'Semester' },
	'set.semesterNameDesc': { en: 'For example "WiSe 2026/27" or "Fall 2026".', de: 'z. B. „WiSe 2026/27" oder „SoSe 2027".' },
	'set.semesterStart': { en: 'Semester start (DD.MM.YYYY)', de: 'Semesterbeginn (TT.MM.JJJJ)' },
	'set.semesterStartDesc': {
		en: 'First day of the semester, for example 12.10.2026. Used to calculate the current week on the dashboard.',
		de: 'Erster Semestertag, z. B. 12.10.2026. Dient zur Berechnung der aktuellen Woche im Dashboard.',
	},
	'set.semesterWeeks': { en: 'Teaching weeks', de: 'Lehrwochen' },
	'set.autoRefresh': { en: 'Refresh the dashboard when Joplin starts', de: 'Dashboard beim Joplin-Start aktualisieren' },
	'set.lectureTemplate': { en: 'Lecture note template', de: 'Vorlage für Vorlesungsnotizen' },
	'set.lectureTemplateDesc': {
		en: 'Placeholders: {{course}}, {{week}}, {{date}}, {{topic}}.',
		de: 'Platzhalter: {{course}}, {{week}}, {{date}}, {{topic}}.',
	},
	'set.tagDeadlines': { en: 'Tag deadlines', de: 'Fristen taggen' },
	'set.tagDeadlinesDesc': {
		en: 'Attach the "uni/deadline" tag to deadline to-dos so you can filter them in search.',
		de: 'Hängt den Tag „uni/deadline" an Frist-To-dos, damit du sie in der Suche filtern kannst.',
	},
	'set.language': { en: 'Sprache / Language', de: 'Sprache / Language' },
	'set.languageDesc': {
		en: '"de" = Deutsch, "en" = English. Usually set in the setup wizard; palette labels follow after a Joplin restart.',
		de: '„de" = Deutsch, „en" = English. Meist im Einrichtungs-Assistenten gesetzt; die Einträge der Befehlspalette folgen nach einem Joplin-Neustart.',
	},
} as const;

export const MODULE_STATUSES = ['mandatory', 'elective'] as const;

export const TURNUS_OPTIONS = ['winter', 'summer', 'both'] as const;

export type StringKey = keyof typeof STRINGS;

/**
 * Translator for one language. `{param}` placeholders in the string are
 * replaced from the optional params object.
 */
export function makeT(lang: Lang) {
	return (key: StringKey, params?: Record<string, string | number>): string => {
		const entry: { en: string; de: string } = STRINGS[key];
		let value = entry[lang] ?? entry.en;
		if (params) {
			value = value.replace(/\{(\w+)\}/g, (m, k: string) => (
				Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m
			));
		}
		return value;
	};
}

export type T = ReturnType<typeof makeT>;

// ---------------------------------------------------------------------------
// Auto-managed titles (Course Info, Reading List, Lectures, Assignments…).
//
// Both languages are accepted when MATCHING (so switching never duplicates
// existing structure); the active language is used when CREATING, and
// existing items are renamed to the active language on the next touch.
// ---------------------------------------------------------------------------

export const AUTO_TITLES = {
	courseInfo: { en: 'Course Info', de: 'Kursinfo' },
	readingList: { en: 'Reading List', de: 'Literaturliste' },
	lecturesFolder: { en: 'Lectures', de: 'Vorlesungen' },
	assignmentsFolder: { en: 'Assignments', de: 'Abgaben' },
} as const;

export type AutoTitleKey = keyof typeof AUTO_TITLES;

export function autoTitle(key: AutoTitleKey, lang: Lang): string {
	return AUTO_TITLES[key][lang];
}

/** All accepted spellings of an auto-managed title (both languages). */
export function autoAliases(key: AutoTitleKey): string[] {
	return [AUTO_TITLES[key].en, AUTO_TITLES[key].de];
}

/** Every auto-managed folder title, in both languages. */
export function autoFolderTitleAliases(): string[] {
	return [...autoAliases('lecturesFolder'), ...autoAliases('assignmentsFolder')];
}

// ---------------------------------------------------------------------------
// Week / further-reading headings
// ---------------------------------------------------------------------------

export function weekLabel(lang: Lang, week: number): string {
	return (lang === 'de' ? 'Woche' : 'Week') + ` ${week}`;
}

/** `## Week 3` / `## Woche 3` */
export function weekHeading(lang: Lang, week: number): string {
	return `## ${weekLabel(lang, week)}`;
}

/** Matches the week heading in either language. */
export function weekHeadingRegex(week: number): RegExp {
	return new RegExp(`^#{1,6}\\s*(?:Week|Woche)\\s*${week}\\b`, 'i');
}

/** `## Further reading` / `## Weiterführende Literatur` */
export function furtherReadingHeading(lang: Lang): string {
	return lang === 'de' ? '## Weiterführende Literatur' : '## Further reading';
}

/** Matches the further-reading heading in either language. */
export function furtherReadingRegex(): RegExp {
	return /^#{1,6}\s*(?:Further\s+reading|Weiterf(?:ü|ue)hrende\s+Literatur)\b/i;
}

// ---------------------------------------------------------------------------
// Pick lists (selects in the forms; values are stored as typed)
// ---------------------------------------------------------------------------

export const READING_PRIORITIES: Record<Lang, readonly string[]> = {
	en: ['Essential', 'Recommended', 'Optional'],
	de: ['Essenziell', 'Empfohlen', 'Optional'],
};

export const DEADLINE_TYPES: Record<Lang, readonly string[]> = {
	en: ['Assignment', 'Exam', 'Presentation', 'Essay', 'Reading', 'Meeting', 'Other'],
	de: ['Abgabe', 'Prüfung', 'Präsentation', 'Essay', 'Lektüre', 'Termin', 'Sonstiges'],
};

// ---------------------------------------------------------------------------
// Command palette labels (applied at startup; follow after a restart)
// ---------------------------------------------------------------------------

export const COMMAND_LABELS: Record<string, Record<Lang, string>> = {
	'uni.setup': { en: 'Uni: Set up semester…', de: 'Uni: Semester einrichten…' },
	'uni.addCourse': { en: 'Uni: Add course…', de: 'Uni: Kurs hinzufügen…' },
	'uni.addPart': { en: 'Uni: Add part…', de: 'Uni: Modul-Teil hinzufügen…' },
	'uni.newLectureNote': { en: 'Uni: New lecture note…', de: 'Uni: Neue Vorlesungsnotiz…' },
	'uni.addReading': { en: 'Uni: Add reading…', de: 'Uni: Lesetext hinzufügen…' },
	'uni.addDeadline': { en: 'Uni: Add deadline…', de: 'Uni: Frist hinzufügen…' },
	'uni.refreshDashboard': { en: 'Uni: Refresh dashboard', de: 'Uni: Dashboard aktualisieren' },
	'uni.openDashboard': { en: 'Uni: Open dashboard', de: 'Uni: Dashboard öffnen' },
};

export function commandLabel(name: string, lang: Lang): string {
	return COMMAND_LABELS[name]?.[lang] ?? name;
}
