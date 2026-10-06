import joplin from 'api';
import { SettingItemType } from 'api/types';

import { isLang, Lang, makeT } from './i18n';
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
	language: Lang;
}

export function defaultLectureTemplate(lang: Lang): string {
	const t = makeT(lang);
	return [
		t('tpl.title'),
		'',
		t('tpl.date'),
		'',
		t('tpl.notes'),
		'',
		t('tpl.keyPoints'),
		'',
		'- [ ] ',
		'',
		t('tpl.questions'),
		'',
		t('tpl.todo'),
		'',
		t('tpl.todoItem'),
		'',
	].join('\n');
}
const SETTING_SECTION = 'uniSettings';

export async function registerUniSettings(lang: Lang = 'en'): Promise<void> {
	const t = makeT(lang);

	await joplin.settings.registerSection(SETTING_SECTION, {
		label: 'Uni',
		description: t('set.sectionDesc'),
	});

	await joplin.settings.registerSettings({
		notebookName: {
			type: SettingItemType.String,
			value: 'University',
			label: t('set.notebook'),
			description: t('set.notebookDesc'),
			public: true,
			section: SETTING_SECTION,
		},
		dashboardTitle: {
			type: SettingItemType.String,
			value: 'Uni Dashboard',
			label: t('set.dashboardTitle'),
			public: true,
			section: SETTING_SECTION,
		},
		semesterName: {
			type: SettingItemType.String,
			value: '',
			label: t('set.semesterName'),
			description: t('set.semesterNameDesc'),
			public: true,
			section: SETTING_SECTION,
		},
		semesterStart: {
			type: SettingItemType.String,
			value: '',
			label: t('set.semesterStart'),
			description: t('set.semesterStartDesc'),
			public: true,
			section: SETTING_SECTION,
		},
		semesterWeeks: {
			type: SettingItemType.Int,
			value: 14,
			label: t('set.semesterWeeks'),
			public: true,
			section: SETTING_SECTION,
			minimum: 1,
			maximum: 40,
		},
		autoRefresh: {
			type: SettingItemType.Bool,
			value: true,
			label: t('set.autoRefresh'),
			public: true,
			section: SETTING_SECTION,
		},
		lectureTemplate: {
			type: SettingItemType.String,
			value: defaultLectureTemplate(lang),
			label: t('set.lectureTemplate'),
			description: t('set.lectureTemplateDesc'),
			public: true,
			section: SETTING_SECTION,
		},
		tagDeadlines: {
			type: SettingItemType.Bool,
			value: true,
			label: t('set.tagDeadlines'),
			description: t('set.tagDeadlinesDesc'),
			public: true,
			section: SETTING_SECTION,
		},
		language: {
			type: SettingItemType.String,
			value: '',
			label: t('set.language'),
			description: t('set.languageDesc'),
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
		'language',
	]);

	const num = Number(values.semesterWeeks);
	const language = await resolveLanguage(values.language);
	return {
		notebookName: (values.notebookName || 'University').trim() || 'University',
		dashboardTitle: (values.dashboardTitle || 'Uni Dashboard').trim() || 'Uni Dashboard',
		semesterName: (values.semesterName || '').trim(),
		semesterStart: (values.semesterStart || '').trim(),
		semesterWeeks: Number.isFinite(num) && num > 0 ? num : 14,
		autoRefresh: values.autoRefresh !== false,
		lectureTemplate: values.lectureTemplate || defaultLectureTemplate(language),
		tagDeadlines: values.tagDeadlines !== false,
		language,
	};
}

/** Language implied by the Joplin locale (fallback: English). */
export async function localeLang(): Promise<Lang> {
	try {
		const locale = await joplin.settings.globalValue('locale');
		return typeof locale === 'string' && locale.toLowerCase().startsWith('de') ? 'de' : 'en';
	} catch {
		return 'en';
	}
}

async function resolveLanguage(stored: unknown): Promise<Lang> {
	return isLang(stored) ? stored : localeLang();
}

/**
 * Language to register labels with at startup: the stored choice when it is
 * already readable, otherwise the Joplin locale.
 */
export async function startupLanguage(): Promise<Lang> {
	try {
		const values = await joplin.settings.values(['language']);
		if (isLang(values.language)) return values.language;
	} catch {
		// Settings not registered yet — fall back to the locale.
	}
	return localeLang();
}

export async function setUniSetting(key: string, value: any): Promise<void> {
	await joplin.settings.setValue(key, value);
}
