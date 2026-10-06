import joplin from 'api';
import { ToastType } from 'api/types';
import { CMD } from './constants';
import { getUniSettings, registerUniSettings, startupLanguage } from './settings';
import { refreshDashboard } from './dashboard';
import { runSetupWizard, addCourse } from './setup';
import { addDeadline, addPart, addReading, newLectureNote } from './actions';
import { findDashboardNote, findUniFolder } from './uni';
import { getAllFolders } from './data';
import { commandLabel, makeT } from './i18n';
import type { Lang, T } from './i18n';

/**
 * Wraps a command so that any failure surfaces as a dialog instead of the
 * command silently doing nothing — the plugin's worst failure mode.
 */
function runCommand(t: T, execute: () => Promise<void>): () => Promise<void> {
	return async () => {
		try {
			await execute();
		} catch (error) {
			console.error('uni: command failed', error);
			await joplin.views.dialogs.showMessageBox(
				`${t('err.crashTitle')}\n\n${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};
}
async function refreshDashboardCommand(t: T): Promise<void> {
	const id = await refreshDashboard();
	if (id) {
		await joplin.views.dialogs.showToast({
			message: t('toast.dashboardUpdated'),
			type: ToastType.Success,
			duration: 3000,
		});
	}
}

async function openDashboard(t: T): Promise<void> {
	const settings = await getUniSettings();
	const folders = await getAllFolders();
	const uniFolder = await findUniFolder(settings, folders);
	if (!uniFolder) {
		await joplin.views.dialogs.showMessageBox(
			t('err.noNotebookCreate', { name: settings.notebookName }),
		);
		return;
	}

	let dashboard = await findDashboardNote(uniFolder.id, settings.dashboardTitle);
	if (!dashboard) {
		const id = await refreshDashboard({ silent: true });
		if (!id) return;
		dashboard = { id };
	}

	await joplin.commands.execute('openNote', dashboard.id);
}
async function registerCommands(lang: Lang): Promise<void> {
	const t = makeT(lang);
	await joplin.commands.register({
		name: CMD.setup,
		label: commandLabel(CMD.setup, lang),
		execute: runCommand(t, runSetupWizard),
	});
	await joplin.commands.register({
		name: CMD.addCourse,
		label: commandLabel(CMD.addCourse, lang),
		execute: runCommand(t, addCourse),
	});
	await joplin.commands.register({
		name: CMD.addPart,
		label: commandLabel(CMD.addPart, lang),
		execute: runCommand(t, addPart),
	});
	await joplin.commands.register({
		name: CMD.newLectureNote,
		label: commandLabel(CMD.newLectureNote, lang),
		execute: runCommand(t, newLectureNote),
	});
	await joplin.commands.register({
		name: CMD.addReading,
		label: commandLabel(CMD.addReading, lang),
		execute: runCommand(t, addReading),
	});
	await joplin.commands.register({
		name: CMD.addDeadline,
		label: commandLabel(CMD.addDeadline, lang),
		execute: runCommand(t, addDeadline),
	});
	await joplin.commands.register({
		name: CMD.refreshDashboard,
		label: commandLabel(CMD.refreshDashboard, lang),
		execute: runCommand(t, () => refreshDashboardCommand(t)),
	});
	await joplin.commands.register({
		name: CMD.openDashboard,
		label: commandLabel(CMD.openDashboard, lang),
		execute: runCommand(t, () => openDashboard(t)),
	});
}

joplin.plugins.register({
	onStart: async function() {
		const lang = await startupLanguage();
		await registerUniSettings(lang);
		await registerCommands(lang);

		// No menus, no toolbar buttons, no icons: the plugin is reachable only
		// through the command palette (Ctrl+Shift+P, "Uni: …") and Options → Uni.

		const settings = await getUniSettings();
		if (settings.autoRefresh) {
			try {
				await refreshDashboard({ silent: true });
			} catch (error) {
				console.warn('uni: dashboard auto-refresh failed', error);
			}
		}
	},
});
