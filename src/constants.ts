// Shared constants for the Uni plugin.

/** Marker placed at the top of the generated dashboard note body. */
export const DASHBOARD_MARKER = '<!-- uni-dashboard -->';



/** Tag attached to deadline todos (so they can be filtered in search). */
export const DEADLINE_TAG = 'uni/deadline';

/** Command names. */
export const CMD = {
	setup: 'uni.setup',
	addCourse: 'uni.addCourse',
	newLectureNote: 'uni.newLectureNote',
	addReading: 'uni.addReading',
	addDeadline: 'uni.addDeadline',
	refreshDashboard: 'uni.refreshDashboard',
	openDashboard: 'uni.openDashboard',
} as const;
