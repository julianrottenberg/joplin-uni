# Uni — a university workspace for Joplin

A Joplin plugin that sets up and organises Joplin for university, inspired by
[Zotero Syllabus](https://github.com/janbaykara/zotero-syllabus). Everything it
creates lives inside one notebook (default: "University"), so private notes stay
untouched.

## What it gives you

- **Set up semester** wizard: creates the notebook, per-course structure, week
  headings and the dashboard in one go.
- One notebook per **course**, containing:
  - *Course Info* — code, instructor, credits, schedule, grading, links
  - *Reading List* — one section per teaching week plus "Further reading",
    items tagged Essential / Recommended / Optional, ticked off as you read
  - *Lectures* — lecture notes (optional stubs for every week)
  - *Assignments* — deadline to-dos with a reminder on the due date, tagged
    `uni/deadline`
- A **dashboard** note in the notebook root, regenerated on demand and on
  Joplin start: current teaching week, a courses table with reading progress
  and next deadline, overdue and upcoming deadlines for the next 14 days,
  what to read next per course, and recently updated notes.

## Install

1. Open Joplin → Tools → Options → Plugins → gear icon → *Install plugin from
   file*, and pick `publish/io.github.julianrottenberg.uni.jpl`.
2. Restart Joplin.

## Use

Everything hangs off **Tools → Uni Workspace**:

| Command | What it does |
| --- | --- |
| Set up semester… | Notebook + semester settings + courses (batch input) |
| Add course… | One more course notebook |
| New lecture note… | Lecture note in the course's Lectures notebook |
| Add reading… | Appends an item under the right week heading |
| Add deadline… | To-do with reminder, in the course's Assignments notebook |
| Refresh dashboard | Rebuilds the dashboard note |
| Open dashboard | Jump to the dashboard |

Course input format: one per line, `Name | Code | Instructor | Credits` —
only the name is required.

Keyboard people: every command also shows up in the command palette
(Ctrl+P) as "Uni: …".

## Notes on how it works

- The plugin finds things by notebook/note titles and a marker in the
  dashboard body. Rename the notebook in Tools → Options → Uni and it will
  follow.
- Reading progress counts plain Markdown checkboxes in each course's
  *Reading List*, so you can also edit those notes by hand.
- The dashboard is generated content. Don't write into it; refresh it instead.
- Deadlines are ordinary Joplin to-dos with a due date, so alarms and sync
  work like for any to-do.

## Development

```sh
npm install
npm run dist          # builds publish/io.github.julianrottenberg.uni.jpl
node test/mock-test.js  # functional smoke test against a mocked Joplin API
```

Source layout: `src/index.ts` (commands, menu, toolbar), `setup.ts` (wizard,
course structure), `dashboard.ts` (dashboard generation), `actions.ts`
(lecture/reading/deadline), `dialogs.ts` (forms), `uni.ts` (workspace
discovery), `data.ts` (data API helpers), `dates.ts`, `settings.ts`.

To test live: Joplin → Options → Plugins → Advanced → Development plugins →
add the plugin directory (this repo), then restart Joplin.
