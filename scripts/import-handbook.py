#!/usr/bin/env python3
"""Import module-handbook data into the joplin-uni notebook structure.

Creates, inside the University notebook (default: "University"), one course
notebook per module with the same structure the plugin's setup wizard creates:
"Vorlesungen" and "Abgaben" subfolders, a "Kursinfo" note with the managed
uni-course block (the machine-readable JSON in an HTML comment that the
dashboard reads Status/ECTS from), and a "Literaturliste" note with weekly
sections.

Idempotent: anything that already exists (by title, within its parent) is
left untouched, so re-running after adding more modules to the JSON is safe.

Usage:
    python3 scripts/import-handbook.py [--dry-run] [--notebook NAME] [JSON ...]

JSON defaults to scripts/data/msc-psych-marburg.json next to this script.
Token/port come from JOPLIN_TOKEN / JOPLIN_PORT, falling back to
~/.config/joplin-desktop/settings.json (the Web Clipper API must be running,
i.e. Joplin desktop must be open).
"""

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

STATUS_MAP = {'Pflichtmodul': 'mandatory', 'Wahlpflichtmodul': 'elective'}

TURNUS_LABEL = {'winter': 'Wintersemester', 'summer': 'Sommersemester', 'both': 'Winter- und Sommersemester'}
STATUS_LABEL = {'mandatory': 'Pflichtmodul', 'elective': 'Wahlpflichtmodul'}

READING_HINT = ('Hake Einträge ab, sobald du sie gelesen hast — der Fortschritt erscheint im Uni-Dashboard. '
                'Einträge ergänzt du über die Befehlspalette (Strg+Umschalt+P, „Uni: Lesetext hinzufügen…") '
                'oder direkt als Markdown-Checkboxen.')

WEEKS = 14


def load_auth() -> tuple[str, int]:
    token = os.environ.get('JOPLIN_TOKEN', '')
    port = int(os.environ.get('JOPLIN_PORT', '0') or 0)
    if not token or not port:
        settings_path = os.path.expanduser('~/.config/joplin-desktop/settings.json')
        with open(settings_path, encoding='utf-8') as fh:
            settings = json.load(fh)
        token = token or settings['api.token']
        port = port or int(settings.get('api.port', 41184))
    return token, port


def api(token: str, port: int, method: str, path: str, body: dict | None = None,
        params: dict | None = None) -> dict:
    query = {'token': token, **(params or {})}
    url = f'http://localhost:{port}{path}?{urllib.parse.urlencode(query)}'
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8') or '{}')


def api_paged(token: str, port: int, path: str, params: dict | None = None) -> list[dict]:
    items, page = [], 1
    while True:
        res = api(token, port, 'GET', path, params={**(params or {}), 'page': page, 'limit': 100})
        items.extend(res.get('items', []))
        if not res.get('has_more'):
            return items
        page += 1


def map_turnus(raw: str) -> str:
    low = raw.lower()
    has_winter, has_sommer = 'winter' in low, 'sommer' in low
    if has_winter and has_sommer:
        return 'both'
    if has_winter:
        return 'winter'
    if has_sommer:
        return 'summer'
    return ''


def clean(text: str) -> str:
    # '-->' would terminate the HTML comment holding the JSON details.
    return (text or '').replace('-->', '→').strip()


def kursinfo_body(mod: dict, semester: str) -> str:
    details = {
        'code': clean(mod.get('code', '')),
        'status': STATUS_MAP.get(mod.get('status', ''), ''),
        'ects': (mod.get('lp', '').split() or [''])[0],
        'sws': str(mod.get('sws') or ''),
        'turnus': map_turnus(mod.get('turnus', '')),
        'exam': clean(mod.get('exam', '')),
        'instructor': clean(mod.get('instructor', '')),
        'semester': semester,
    }
    json_line = json.dumps(details, ensure_ascii=False, separators=(',', ':'))

    fields = []
    def push(label: str, value: str) -> None:
        if value:
            fields.append(f'- **{label}:** {value}')
    push('Status', STATUS_LABEL.get(details['status'], ''))
    push('ECTS', details['ects'])
    push('SWS', details['sws'])
    push('Turnus', TURNUS_LABEL.get(details['turnus'], ''))
    push('Prüfungsleistung', details['exam'])
    push('Nummer', details['code'])
    push('Dozent:in', details['instructor'])
    push('Semester', details['semester'])

    extra = []
    for label, key in (('Niveaustufe', 'level'), ('Veranstaltungen', 'vtypes'),
                       ('Dauer', 'dur'), ('Häufigkeit', 'freq')):
        value = clean(mod.get(key, ''))
        if value:
            extra.append(f'**{label}:** {value}')

    parts = [f'<!-- uni-course:{json_line} -->', f"# {mod['name']}", *fields,
             '<!-- /uni-course -->']
    if extra:
        parts += ['', *extra]
    parts += ['', '## Zeitplan', '', '## Benotung', '', '## Links', '']
    return '\n'.join(parts)


def reading_list_body(name: str) -> str:
    parts = [f'# {name} — Literaturliste', '', READING_HINT]
    for week in range(1, WEEKS + 1):
        parts += ['', f'## Woche {week}']
    parts += ['', '## Weiterführende Literatur', '']
    return '\n'.join(parts)


class Importer:
    def __init__(self, token: str, port: int, dry_run: bool) -> None:
        self.token, self.port, self.dry_run = token, port, dry_run
        self.created: list[str] = []
        self.existing: list[str] = []

    def log_created(self, what: str) -> None:
        self.created.append(what)
        print(f'  + {what}')

    def log_existing(self, what: str) -> None:
        self.existing.append(what)
        print(f'  = {what} (exists)')

    def ensure_folder(self, title: str, parent_id: str) -> str:
        for folder in api_paged(self.token, self.port, '/folders', {'fields': 'id,title,parent_id'}):
            if folder['title'] == title and folder.get('parent_id', '') == parent_id:
                self.log_existing(f'folder "{title}"')
                return folder['id']
        if self.dry_run:
            self.log_created(f'folder "{title}" (dry run)')
            return 'dry-run'
        res = api(self.token, self.port, 'POST', '/folders', {'title': title, 'parent_id': parent_id})
        self.log_created(f'folder "{title}"')
        return res['id']

    def ensure_note(self, title: str, parent_id: str, body: str) -> None:
        notes = api_paged(self.token, self.port, f'/folders/{parent_id}/notes',
                          {'fields': 'id,title'})
        if any(n['title'] == title for n in notes):
            self.log_existing(f'note "{title}"')
            return
        if self.dry_run:
            self.log_created(f'note "{title}" (dry run)')
            return
        api(self.token, self.port, 'POST', '/notes',
            {'title': title, 'body': body, 'parent_id': parent_id})
        self.log_created(f'note "{title}"')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('json_files', nargs='*')
    parser.add_argument('--notebook', default='University')
    parser.add_argument('--semester', default='')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    default_json = os.path.join(os.path.dirname(__file__), 'data', 'msc-psych-marburg.json')
    json_files = args.json_files or [default_json]
    modules: list[dict] = []
    for path in json_files:
        with open(path, encoding='utf-8') as fh:
            modules.extend(json.load(fh))
    print(f'{len(modules)} modules from {len(json_files)} file(s)')

    token, port = load_auth()
    imp = Importer(token, port, args.dry_run)

    uni_id = imp.ensure_folder(args.notebook, '')
    for mod in modules:
        print(f"{mod['code']}: {mod['name']}")
        course_id = imp.ensure_folder(mod['name'], uni_id)
        if course_id != 'dry-run':
            imp.ensure_folder('Vorlesungen', course_id)
            imp.ensure_folder('Abgaben', course_id)
            imp.ensure_note('Kursinfo', course_id, kursinfo_body(mod, args.semester))
            imp.ensure_note('Literaturliste', course_id, reading_list_body(mod['name']))

    print(f'\nDone: {len(imp.created)} created, {len(imp.existing)} already existed.')
    if not args.dry_run:
        print('Refresh the dashboard in Joplin: Strg+Umschalt+P → „Uni: Dashboard aktualisieren".')


if __name__ == '__main__':
    main()
