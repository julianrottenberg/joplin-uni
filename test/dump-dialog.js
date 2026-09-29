// Dumps the setup dialog HTML produced by the built plugin, so it can be
// rendered in a headless browser and inspected visually.
'use strict';

const fs = require('fs');
const path = require('path');

let captured = null;

const joplin = {
	plugins: { register(def) { global.__pluginDef = def; } },
	settings: {
		_vals: {},
		async registerSection() {},
		async registerSettings(s) { for (const [k, v] of Object.entries(s)) this._vals[k] = v.value; },
		async values(keys) { const o = {}; for (const k of keys) o[k] = this._vals[k]; return o; },
		async setValue(k, v) { this._vals[k] = v; },
	},
	commands: {
		_cmds: {},
		async register(c) { this._cmds[c.name] = c; },
		async execute(n, ...a) { if (this._cmds[n]) return this._cmds[n].execute(...a); return null; },
	},
	views: {
		dialogs: {
			async create(id) { return id; },
			async setHtml(handle, html) { if (handle === 'uni-setup') captured = html; },
			async setButtons() {},
			async setFitToContent() {},
			async open() { return { id: 'cancel', formData: {} }; },
			async showMessageBox() { return 0; },
			async showToast() {},
		},
		menus: { async create() {} },
		toolbarButtons: { async create() {} },
	},
	data: {
		async get(path) {
			const [res, id, link] = path;
			if (res === 'folders' && !id) return { items: [], has_more: false };
			if (res === 'folders' && link === 'notes') return { items: [], has_more: false };
			if (res === 'notes') return {};
			return { items: [], has_more: false };
		},
		async post() { return { id: 'x' }; },
		async put() { return {}; },
	},
};

global.joplin = joplin;

(async () => {
	require(path.resolve(__dirname, '../dist/index.js'));
	await global.__pluginDef.onStart();
	await joplin.commands.execute('uni.setup');
	if (!captured) throw new Error('setup dialog HTML was not captured');
	const out = '/home/julian/tmp/uni-setup.html';
	fs.writeFileSync(out, captured);
	console.log('wrote', out, captured.length, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
