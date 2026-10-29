"""Compile the readable default theme into installer blocks and a local preview.

Run python3 scripts/build_default_theme.py after editing core/setup/default-theme/.
The generated default-page-preview.html is available before running the installer.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / 'core/setup/default-theme'
SEED = ROOT / 'core/setup/super_intuitive_install.sql'
TOKEN = re.compile(r"'(?:\\.|[^'\\])*'|NULL|_SI_GUID_\d+|-?\d+")


def quote(value):
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '\\r').replace('\n', '\\n') + "'"


def patch_row(line, columns, values):
    tokens = list(TOKEN.finditer(line))
    if len(tokens) != len(columns):
        raise ValueError('Unexpected seed row shape: ' + line[:40])
    for name, value in sorted(values.items(), key=lambda item: columns.index(item[0]), reverse=True):
        token = tokens[columns.index(name)]
        line = line[:token.start()] + quote(value) + line[token.end():]
    return line


def build():
    header, home, footer, css, script = [(THEME / name).read_text().strip() for name in
                                         ('header.html', 'home.html', 'footer.html', 'site.css', 'site.js')]
    options = json.dumps({'tag': 'div', 'style': {'position': 'relative', 'width': '100%', 'height': 'auto'}}, separators=(',', ':'))
    login_css = (THEME / 'login.css').read_text().strip()
    login_script = (THEME / 'login.js').read_text().strip()
    blocks = {'_SI_GUID_5': (header, css, script), '_SI_GUID_6': (home, '', ''), '_SI_GUID_2': (footer, '', '')}
    table, columns = None, []
    lines = []
    updated = set()
    for line in SEED.read_text().splitlines(keepends=True):
        insert = re.match(r'INSERT INTO `(\w+)`', line)
        if insert:
            table = insert[1]
            columns = re.findall(r'`([^`]+)`', line)[1:]
        if table == 'blocks' and line.startswith('('):
            guid = line[1:line.index(',')]
            if guid in blocks:
                markup, style, behavior = blocks[guid]
                values = {}
                for stage in ('live', 'test', 'dev', 'rollback'):
                    values.update({stage + '-html': markup, stage + '-style': style,
                                   stage + '-script': behavior, stage + '-options': options})
                line = patch_row(line, columns, values)
                updated.add(guid)
            elif guid == '_SI_GUID_8':
                values = {}
                for stage in ('live', 'test', 'dev', 'rollback'):
                    values.update({stage + '-style': login_css, stage + '-script': login_script})
                line = patch_row(line, columns, values)
                updated.add(guid)
        elif table == 'relations' and line.startswith('('):
            tokens = list(TOKEN.finditer(line))
            if len(tokens) == len(columns):
                row = dict(zip(columns, (token[0] for token in tokens)))
                if row['parent_id'] == '_SI_GUID_40' and row['child_id'] in blocks:
                    relation_options = json.dumps({'tag': 'div', 'style': {'position': 'relative', 'width': '100%', 'height': 'auto'}, 'options': []}, separators=(',', ':'))
                    line = patch_row(line, columns, {stage + '-options': relation_options for stage in ('live', 'test', 'dev')})
        elif table == 'pages' and line.startswith('(_SI_GUID_40,'):
            line = line.replace('#101827', '#0b1120')
        lines.append(line)
    if updated != set(blocks) | {'_SI_GUID_8'}:
        raise ValueError('Did not find all default theme blocks')
    SEED.write_text(''.join(lines))
    preview = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
               '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
               '<meta name="theme-color" content="#0b1120">\n'
               '<meta name="description" content="Super Intuitive: a visual workspace for building your own website.">\n'
               '<title>Super Intuitive — Visual website platform</title>\n'
               '<style>\n' + css + '\n</style>\n</head>\n<body class="si-home" data-si-preview>\n'
               '<div id="si_block_Header" class="si-block">' + header + '</div>\n'
               '<div id="si_block_Menu" class="si-block">' + home + '</div>\n'
               '<div id="si_block_Footer" class="si-block">' + footer + '</div>\n'
               '<script>\n' + script + '\n</script>\n</body>\n</html>\n')
    (ROOT / 'default-page-preview.html').write_text(preview)
    print('Updated default theme in installer (all deployment stages) and default-page-preview.html.')


if __name__ == '__main__':
    build()
