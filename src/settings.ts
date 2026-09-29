import joplin from 'api';
import { SettingItemType } from 'api/types';

export interface UniSettings {
	notebookName: string;
	dashboardTitle: string;
	semesterName: string;
	/** Semester start as YYYY-MM-DD ('' if not set). */
	semesterStart: string;
	semesterWeeks: number;
	autoRefresh: boolean;
	lectureTemplate: string;
	tagDeadlines: boolean;
}

export const DEFAULT_LECTURE_TEMPLATE = [
	'# {{course}} — Week {{week}}: {{topic}}',
	'',
	'*Date: {{date}}*',
	'',
	'## Notes',
	'',
	'## Key points',
	'',
	'- [ ] ',
	'',
	'## Open questions',
	'',
	'## To do',
	'',
	'- [ ] Review this week\'s reading',
	'',
].join('\n');

const SETTING_SECTION = 'uniSettings';

export async function registerUniSettings(): Promise<void> {
	await joplin.settings.registerSection(SETTING_SECTION, {
		label: 'Uni',
		description: 'University workspace. Most of this is set up by the wizard in the command palette (Ctrl+P, "Uni: Set up semester…").',
	});

	await joplin.settings.registerSettings({
		notebookName: {
			type: SettingItemType.String,
			value: 'University',
			label: 'University notebook',
			description: 'All uni notes are kept inside this one notebook, so private notes stay separate.',
			public: true,
			section: SETTING_SECTION,
		},
		dashboardTitle: {
			type: SettingItemType.String,
			value: 'Uni Dashboard',
			label: 'Dashboard note title',
			public: true,
			section: SETTING_SECTION,
		},
		semesterName: {
			type: SettingItemType.String,
			value: '',
			label: 'Semester name',
			description: 'For example "WiSe 2026/27" or "Fall 2026".',
			public: true,
			section: SETTING_SECTION,
		},
		semesterStart: {
			type: SettingItemType.String,
			value: '',
			label: 'Semester start (DD.MM.YYYY)',
			description: 'First day of the semester, for example 12.10.2026. Used to calculate the current week on the dashboard.',
			public: true,
			section: SETTING_SECTION,
		},
		semesterWeeks: {
			type: SettingItemType.Int,
			value: 14,
			label: 'Teaching weeks',
			public: true,
			section: SETTING_SECTION,
			minimum: 1,
			maximum: 40,
		},
		autoRefresh: {
			type: SettingItemType.Bool,
			value: true,
			label: 'Refresh the dashboard when Joplin starts',
			public: true,
			section: SETTING_SECTION,
		},
		lectureTemplate: {
			type: SettingItemType.String,
			value: DEFAULT_LECTURE_TEMPLATE,
			label: 'Lecture note template',
			description: 'Placeholders: {{course}}, {{week}}, {{date}}, {{topic}}.',
			public: true,
			section: SETTING_SECTION,
		},
		tagDeadlines: {
			type: SettingItemType.Bool,
			value: true,
			label: 'Tag deadlines',
			description: `Attach the "${'uni/deadline'}" tag to deadline to-dos so you can filter them in search.`,
			public: true,
			section: SETTING_SECTION,
		},
	});
}

export async function getUniSettings(): Promise<UniSettings> {
	const values = await joplin.settings.values([
		'notebookName',
		'dashboardTitle',
		'semesterName',
		'semesterStart',
		'semesterWeeks',
		'autoRefresh',
		'lectureTemplate',
		'tagDeadlines',
	]);

	const num = Number(values.semesterWeeks);
	return {
		notebookName: (values.notebookName || 'University').trim() || 'University',
		dashboardTitle: (values.dashboardTitle || 'Uni Dashboard').trim() || 'Uni Dashboard',
		semesterName: (values.semesterName || '').trim(),
		semesterStart: (values.semesterStart || '').trim(),
		semesterWeeks: Number.isFinite(num) && num > 0 ? num : 14,
		autoRefresh: values.autoRefresh !== false,
		lectureTemplate: values.lectureTemplate || DEFAULT_LECTURE_TEMPLATE,
		tagDeadlines: values.tagDeadlines !== false,
	};
}

export async function setUniSetting(key: string, value: any): Promise<void> {
	await joplin.settings.setValue(key, value);
}
