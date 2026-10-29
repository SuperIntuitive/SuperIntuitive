"""Compile the existing PHP installer's static inputs without executing/changing PHP."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'core_sipl/generated'


def statements(source):
    """Split trusted MySQL source outside literals, identifiers and comments."""
    parts, current, quote, i = [], [], None, 0
    while i < len(source):
        char = source[i]
        if quote:
            current.append(char)
            if char == '\\' and quote != '`' and i + 1 < len(source):
                i += 1
                current.append(source[i])
            elif char == quote:
                if i + 1 < len(source) and source[i + 1] == quote:
                    i += 1
                    current.append(source[i])
                else:
                    quote = None
        elif char in "'\"`":
            quote = char
            current.append(char)
        elif source.startswith('/*', i):
            end = source.find('*/', i + 2)
            if end < 0:
                raise ValueError('Unclosed SQL comment')
            i = end + 1
            current.append(' ')
        elif source.startswith('--', i) and (i + 2 == len(source) or source[i + 2].isspace()):
            end = source.find('\n', i + 2)
            i = len(source) if end < 0 else end
            current.append('\n')
        elif char == ';':
            statement = ''.join(current).strip()
            if statement:
                parts.append(statement)
            current = []
        else:
            current.append(char)
        i += 1
    if quote:
        raise ValueError('Unclosed SQL literal')
    if ''.join(current).strip():
        parts.append(''.join(current).strip())
    return parts


def build():
    OUT.mkdir(exist_ok=True)
    source = (ROOT / 'core/setup/super_intuitive_install.sql').read_text()
    schema, data, tables = [], [], []
    for command in statements(source):
        if command.startswith('CREATE TABLE '):
            tables.append(re.match(r'CREATE TABLE `(\w+)`', command)[1])
            schema.append(command)
        elif command.startswith('ALTER TABLE '):
            schema.append(command)
        elif command.startswith('INSERT INTO '):
            data.append(command)
        elif not re.match(r'^(SET |START TRANSACTION|COMMIT\b)', command):
            raise ValueError('Unexpected installer SQL operation: ' + command[:60])
    if len(tables) != 16 or len(schema) != 32 or len(data) != 12:
        raise ValueError('Installer schema changed; review the compiler')
    inputs = {}
    for name in ('core/setup/super_intuitive_install.sql', 'core/setup/installer.php'):
        inputs[name] = {'sha256': hashlib.sha256((ROOT/name).read_text().encode()).hexdigest(), 'text': True}
    for file in sorted((ROOT/'core/setup/domaintemplate').rglob('*')):
        if file.is_file():
            inputs[file.relative_to(ROOT).as_posix()] = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'text': False}
    payload = {'format': 1, 'sourceSha256': hashlib.sha256(source.encode()).hexdigest(), 'inputs': inputs,
               'schema': schema, 'data': data, 'tables': tables,
               'guidTokens': sorted(set(re.findall(r'_SI_GUID_\d+', source)))}
    (OUT / 'installer-schema.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')

    template = (ROOT / 'core/setup/installer.php').read_text()
    template = re.sub(r'^<\?php.*?\?>\s*', '', template, count=1, flags=re.S)
    replacements = {
        '$csrf': '__CSRF__', '$host': '__HOST__', '$notificationEmail': '',
        '$dboptions': '<option value="mysql">mysql</option>', '$langoptions': '__LANGUAGES__',
        '$timezonesoptions': '__TIMEZONES__', '$currenciesoptions': '__CURRENCIES__', '$year': '__YEAR__',
        "$setupAuthorized ? 'true' : 'false'": '__AUTHORIZED__',
        "$setupAuthorized ? 'hidden' : ''": '__KEY_HIDDEN__',
        "$setupAuthorized ? 'disabled' : 'required'": '__KEY_REQUIRED__',
        '''$setupAuthorized ? "data-state='success'" : 'hidden' ''': '__AUTH_STATUS__',
        "$setupAuthorized ? 'Installation authorized for this session.' : ''": '__AUTH_MESSAGE__'
    }
    replacements = {key.strip(): value for key, value in replacements.items()}
    def replace(match):
        return replacements[match[1].strip()]
    template = re.sub(r'<\?=\s*(.*?)\s*\?>', replace, template)
    if '<?' in template:
        raise ValueError('Unexpected PHP in installer template')
    template = template.replace('FIRST-TIME SETUP', 'SIPL / FIRST-TIME SETUP')
    template = template.replace('Enter the installation key configured for this server.',
                                'Enter the key from core/setup.token on this server, or your configured SI_SETUP_TOKEN.')
    # Default to the simpler existing-database path; server still supports creation.
    template = template.replace("value='privuser' checked", "value='privuser'")
    template = template.replace("value='existuser' name=", "value='existuser' checked name=")
    template = template.replace("id='si_prevuserbox' class='setup-credential-fields'", "id='si_prevuserbox' class='setup-credential-fields' style='display:none'")
    template = template.replace("id='si_existuserbox' class='setup-credential-fields' style='display:none'", "id='si_existuserbox' class='setup-credential-fields'")
    template = template.replace('<script>SI.Setup.Init();</script>',
                                '<script>SI.Setup.Init();SI.Setup.ChangeDbLoginType(document.getElementById("si_setup_existuser"));</script>')
    (OUT / 'installer.html.tmpl').write_text(template)
    with zipfile.ZipFile(OUT / 'installer-media.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted((ROOT / 'core/setup/domaintemplate').rglob('*')):
            if file.is_file():
                relative = file.relative_to(ROOT / 'core/setup/domaintemplate').as_posix()
                info = zipfile.ZipInfo(relative, (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, file.read_bytes())
    print('Compiled SIPL installer: 16 tables, 32 schema statements, 12 seed statements, native wizard and starter media')


if __name__ == '__main__':
    build()
