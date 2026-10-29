"""Run the parallel backend checks. Works from WSL or native Windows Python."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', action='store_true', help='Also exercise the launcher in real Chrome')
parser.add_argument('--apache', action='store_true', help='Also test Apache using the existing disposable PHP image')
parser.add_argument('--integration', action='store_true', help='Also test PHP bcrypt interoperability, disposable TLS MySQL, and the installed native site')
parser.add_argument('--mysql', metavar='CONFIG', help='Run live native MySQL checks using only a temporary table')
parser.add_argument('--report', metavar='JSON', help='Write machine-readable verification results')
args = parser.parse_args()
os.chdir(ROOT)
runtime = str(ROOT / ('sipl.exe' if (ROOT / 'sipl.exe').exists() else 'sipl'))
node = shutil.which('node') or '/mnt/c/Program Files/nodejs/node.exe'
results = []

def run(name, command):
    result = subprocess.run(command, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout.rstrip(), flush=True)
    entry = {'name': name, 'status': 'passed' if result.returncode == 0 else 'failed'}
    count = re.search(r'(?:passed:|checks passed[^:]*:)\s*(\d+)', result.stdout)
    if count:
        entry['checks'] = int(count.group(1))
    results.append(entry)
    if result.returncode:
        print(result.stderr[-4000:], file=sys.stderr)
        raise RuntimeError(name + ' failed')
    return result.stdout

print('Runtime executable: ' + runtime, flush=True)
print('Runtime SHA256: ' + hashlib.sha256(Path(runtime).read_bytes()).hexdigest(), flush=True)

report = {'runtimeExecutable': runtime, 'testedAt': datetime.now(timezone.utc).isoformat(), 'runtimeSha256': hashlib.sha256(Path(runtime).read_bytes()).hexdigest(), 'results': results}
try:
    run('php-preservation', [sys.executable, 'core_sipl/tools/verify_php_unchanged.py'])
    for source in ('main.sipl', 'tests/unit.sipl', 'tests/native_params.sipl', 'tests/mysql.sipl', 'tests/passwords.sipl', 'tools/runtime_probe.sipl', 'tools/connection_check.sipl'):
        run('compile-' + source, [runtime, 'check', 'core_sipl/' + source])
    folder = ROOT / 'core_sipl/runtime'
    folder.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=folder, prefix='verify-') as temporary:
        editor = (Path(temporary) / 'editor.js').relative_to(ROOT).as_posix()
        run('unit-and-sql-contracts', [runtime, 'run', 'core_sipl/tests/unit.sipl', editor])
        run('generated-editor-js-syntax', [node, '-e', 'const fs=require("node:fs"),vm=require("node:vm");new vm.Script(fs.readFileSync(process.argv[1],"utf8")); console.log("Generated editor JavaScript syntax passed");', editor])
    run('native-parameter-binding', [runtime, 'run', 'core_sipl/tests/native_params.sipl'])
    probe = json.loads(run('runtime-probe', [runtime, 'run', 'core_sipl/tools/runtime_probe.sipl']).strip())
    report['runtimeProbe'] = probe
    command = [node, 'core_sipl/tests/http.cjs']
    if args.browser:
        command.append('--browser')
    run('native-http-session-and-browser' if args.browser else 'native-http-and-session', command)
    if args.apache:
        run('apache-launcher-isolation', [sys.executable, 'core_sipl/tests/apache.py'])
    if args.integration:
        run('php-bcrypt-interoperability', [sys.executable, 'core_sipl/tests/passwords.py'])
        results[-1]['checks'] = json.loads((ROOT / 'core_sipl/password-validation.json').read_text())['checks']
        run('disposable-tls-mysql', [sys.executable, 'core_sipl/tests/mysql_disposable.py', '--runtime', runtime, '--report', 'core_sipl/mysql-validation.json'])
        site_command = [sys.executable, 'core_sipl/tests/site_fixture.py']
        if args.browser:
            site_command.append('--browser')
        run('native-installed-site', site_command)
        results[-1]['checks'] = sum(item.get('checks', 0) for item in json.loads((ROOT / 'core_sipl/site-validation.json').read_text())['results'])
    if args.mysql:
        run('live-mysql-temporary-table', [runtime, 'run', 'core_sipl/tests/mysql.sipl', args.mysql])
    elif not args.integration:
        results.append({'name': 'live-mysql-temporary-table', 'status': 'blocked' if 'driver unavailable' in str(probe.get('mysqlProbe')) else 'not-run', 'reason': 'MySQL connector build unavailable' if 'driver unavailable' in str(probe.get('mysqlProbe')) else 'Pass --mysql CONFIG to test a configured server'})
    run('php-preservation-after-tests', [sys.executable, 'core_sipl/tools/verify_php_unchanged.py'])
    report['status'] = 'passed-with-cutover-blockers'
except Exception as error:
    report['status'] = 'failed'
    report['error'] = str(error)
    raise
finally:
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
