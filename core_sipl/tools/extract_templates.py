"""Extract PHP-free assets and static lookup data without executing or changing PHP."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'core_sipl/generated'
OUT.mkdir(exist_ok=True)
widgets = (ROOT / 'style/widgets.css').read_text().lstrip('\ufeff')
header, widgets = widgets.split('?>', 1)
comment = header.removeprefix('<?php').strip()
if not (comment.startswith('/*') and comment.endswith('*/')) or '<?php' in widgets or '<?=' in widgets:
    raise SystemExit('Widget CSS needs an explicit native port; unexpected PHP header')
(OUT / 'widgets.css').write_text(widgets)
source = (ROOT / 'editor/editor.js').read_text()
body = source[source.index('?>') + 2:source.rindex('<?php')]
body = re.sub(r'DataAge\s*:\s*\{\s*<\?=\s*\$dataage\s*\?>\s*\}', 'DataAge: __SIPL_DATA_AGE__', body)
body = re.sub(r'`<\?php\s+echo\s+Tools::GetPhpInfo\(\)\s*\?>`', '__SIPL_RUNTIME_INFO__', body)
slots = {'__SIPL_DATA_AGE__': '$dataage', '__SIPL_RUNTIME_INFO__': 'runtime_info'}

def replace_slot(match):
    expression = (match.group(2) or match.group(3)).strip()
    marker = '__SIPL_SLOT_' + str(len(slots)) + '__'
    slots[marker] = expression
    return marker

body = re.sub(r'''(["'])<\?=\s*(.*?)\s*\?>\1|<\?=\s*(.*?)\s*\?>''', replace_slot, body, flags=re.S)
if re.search(r'<\?(?:php|=)', body):
    raise SystemExit('Unconverted PHP: ' + repr(body[max(0, body.index('<?')-40):body.index('<?')+120]))
(OUT / 'editor.js.tmpl').write_text(body)
(OUT / 'editor-slots.json').write_text(json.dumps(slots, indent=2) + '\n')

# Parse only literal PHP arrays. No evaluation, includes, PHP process, or credentials.
text = (ROOT / 'core/MiscData.php').read_text()
token = re.compile(r'''\s*(?:(?P<string>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(?P<arrow>=>)|(?P<word>array|true|false|null)|(?P<number>-?\d+(?:\.\d+)?)|(?P<punct>[(),]))''', re.S)

def parse_value(position):
    match = token.match(text, position)
    if not match:
        raise ValueError('Unsupported nonliteral static data near ' + text[position:position + 40])
    kind, value = match.lastgroup, match.group(match.lastgroup)
    position = match.end()
    if kind == 'string':
        quote = value[0]
        value = value[1:-1]
        value = value.replace('\\' + quote, quote).replace('\\\\', '\\')
        if quote == '"':
            value = value.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t')
        return value, position
    if kind == 'number':
        return (float(value) if '.' in value else int(value)), position
    if kind == 'word' and value != 'array':
        return {'true': True, 'false': False, 'null': None}[value], position
    if value != 'array':
        raise ValueError('Expected array literal')
    opening = token.match(text, position)
    assert opening and opening.group() .strip() == '('
    position = opening.end()
    pairs, values = {}, []
    while True:
        ending = token.match(text, position)
        if ending and ending.group().strip() == ')':
            return (pairs if pairs else values), ending.end()
        first, position = parse_value(position)
        arrow = token.match(text, position)
        if arrow and arrow.lastgroup == 'arrow':
            second, position = parse_value(arrow.end())
            pairs[str(first)] = second
        else:
            values.append(first)
        comma = token.match(text, position)
        if comma and comma.group().strip() == ',':
            position = comma.end()

lookups = {}
for name in ('Languages', 'TimeZones', 'Currencies', 'MimeTypes', 'ColorNames'):
    declaration = re.search(r'public\s+\$' + name + r'\s*=\s*', text)
    if declaration:
        lookups[name] = parse_value(declaration.end())[0]
quick = re.search(r"public\s+\$UserDefaultQuickmenu\s*=\s*'(.*?)';", text, re.S)
lookups['QuickMenu'] = json.loads(re.sub(r',(\s*[}\]])', r'\1', quick.group(1))) if quick else []
lookups['DataAge'] = {name: int((ROOT / ('editor/media/data/' + name + '.json')).stat().st_mtime)
                      for name in ('html_elements', 'html_attributes', 'css_properties', 'js_methods', 'php_methods', 'sql_methods', 'css_new', 'css_pseudo')}
(OUT / 'lookups.json').write_text(json.dumps(lookups, ensure_ascii=False, indent=2) + '\n')
print(f'Extracted PHP-free editor template, {len(slots)} data slots, and static lookup tables')
