// Shared constants for the Uni plugin.

/** Marker placed at the top of the generated dashboard note body. */
export const DASHBOARD_MARKER = '<!-- uni-dashboard -->';

// Well-known note / folder titles used inside a course folder.
export const COURSE_INFO_TITLE = 'Course Info';
export const READING_LIST_TITLE = 'Reading List';
export const LECTURES_FOLDER_TITLE = 'Lectures';
export const ASSIGNMENTS_FOLDER_TITLE = 'Assignments';
export const FURTHER_READING_HEADING = '## Further reading';

/** Auto-managed folder titles that never count as courses. */
export const AUTO_FOLDER_TITLES = [LECTURES_FOLDER_TITLE, ASSIGNMENTS_FOLDER_TITLE];

export const READING_PRIORITIES = ['Essential', 'Recommended', 'Optional'] as const;

export const DEADLINE_TYPES = ['Assignment', 'Exam', 'Presentation', 'Essay', 'Reading', 'Meeting', 'Other'] as const;

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
