import joplin from 'api';
import { ToastType } from 'api/types';
import { CMD } from './constants';
import { getUniSettings, registerUniSettings } from './settings';
import { refreshDashboard } from './dashboard';
import { runSetupWizard, addCourse } from './setup';
import { newLectureNote, addReading, addDeadline } from './actions';
import { findDashboardNote, findUniFolder } from './uni';
import { getAllFolders } from './data';

async function refreshDashboardCommand(): Promise<void> {
	const id = await refreshDashboard();
	if (id) {
		await joplin.views.dialogs.showToast({
			message: 'Uni dashboard updated.',
			type: ToastType.Success,
			duration: 3000,
		});
	}
}

async function openDashboard(): Promise<void> {
	const settings = await getUniSettings();
	const folders = await getAllFolders();
	const uniFolder = await findUniFolder(settings, folders);
	if (!uniFolder) {
		await joplin.views.dialogs.showMessageBox(
			`No "${settings.notebookName}" notebook found. Run Ctrl+P, then **Uni: Set up semester…** to create it.`,
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

async function registerCommands(): Promise<void> {
	await joplin.commands.register({
		name: CMD.setup,
		label: 'Uni: Set up semester…',
		execute: runSetupWizard,
	});
	await joplin.commands.register({
		name: CMD.addCourse,
		label: 'Uni: Add course…',
		execute: addCourse,
	});
	await joplin.commands.register({
		name: CMD.newLectureNote,
		label: 'Uni: New lecture note…',
		execute: newLectureNote,
	});
	await joplin.commands.register({
		name: CMD.addReading,
		label: 'Uni: Add reading…',
		execute: addReading,
	});
	await joplin.commands.register({
		name: CMD.addDeadline,
		label: 'Uni: Add deadline…',
		execute: addDeadline,
	});
	await joplin.commands.register({
		name: CMD.refreshDashboard,
		label: 'Uni: Refresh dashboard',
		execute: refreshDashboardCommand,
	});
	await joplin.commands.register({
		name: CMD.openDashboard,
		label: 'Uni: Open dashboard',
		execute: openDashboard,
	});
}

joplin.plugins.register({
	onStart: async function() {
		await registerUniSettings();
		await registerCommands();

		// No menus, no toolbar buttons, no icons: the plugin is reachable only
		// through the command palette (Ctrl+P, "Uni: …") and Options → Uni.

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
