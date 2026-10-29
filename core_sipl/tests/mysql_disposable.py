"""Exercise an explicitly selected SIPL runtime against a disposable MariaDB container."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
import re
import secrets
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--runtime', required=True, help='Path to the exact SIPL executable to test')
parser.add_argument('--report', help='Write the result as JSON')
parser.add_argument('--image', default='mariadb:11.4', help='TLS-capable disposable MariaDB image')
args = parser.parse_args()
fixture_environment = {key: value for key, value in os.environ.items() if not key.startswith('SI_SIPL_') and key != 'SI_SETUP_TOKEN'}
runtime = Path(args.runtime).resolve()
report = {'testedAt': datetime.now(timezone.utc).isoformat(), 'runtimeExecutable': str(runtime),
          'runtimeSha256': hashlib.sha256(runtime.read_bytes()).hexdigest(),
          'database': 'disposable-mariadb-container', 'databaseImage': args.image, 'requireTls': True, 'results': []}
container = 'si-sipl-mysql-' + str(os.getpid()) + '-' + secrets.token_hex(3)
created = False

def run(command, check=True):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, env=fixture_environment)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or 'Command failed')
    return result

try:
    print('Testing runtime: ' + str(runtime), flush=True)
    probe = json.loads(run([str(runtime), 'run', 'core_sipl/tools/runtime_probe.sipl']).stdout)
    report['runtimeProbe'] = probe
    if 'driver unavailable' in str(probe.get('mysqlProbe', '')):
        raise RuntimeError('Selected executable was built without the MySQL connector')
    folder = ROOT / 'core_sipl/runtime'
    folder.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='mysql-', dir=folder) as temporary:
        temporary = Path(temporary)
        password = secrets.token_urlsafe(32)
        environment = temporary / 'container.env'
        environment.write_text('MARIADB_ROOT_PASSWORD=' + secrets.token_urlsafe(32) + '\nMARIADB_DATABASE=si_sipl_test\nMARIADB_USER=si_sipl_test\nMARIADB_PASSWORD=' + password + '\n')
        os.chmod(environment, 0o600)
        run(['docker', 'run', '-d', '--name', container, '--env-file', str(environment),
             '-p', '127.0.0.1::3306', args.image, '--require-secure-transport=ON'])
        created = True
        deadline = time.monotonic() + 60
        while True:
            ready = run(['docker', 'exec', container, 'healthcheck.sh', '--connect', '--innodb_initialized'], check=False)
            if ready.returncode == 0:
                break
            if time.monotonic() >= deadline:
                raise RuntimeError('Disposable MariaDB startup timed out')
            time.sleep(.25)
        port = int(run(['docker', 'port', container, '3306/tcp']).stdout.strip().rsplit(':', 1)[1])
        configuration = temporary / 'config.local.json'
        configuration.write_text(json.dumps({'dsn': 'mysql:host=127.0.0.1;port=' + str(port) + ';dbname=si_sipl_test;charset=utf8mb4', 'dbUser': 'si_sipl_test', 'dbPassword': password, 'requireTls': True}))
        os.chmod(configuration, 0o600)
        result = run([str(runtime), 'run', 'core_sipl/tests/mysql.sipl', configuration.relative_to(ROOT).as_posix()])
        print(result.stdout.strip(), flush=True)
        count = re.search(r'checks passed:\s*(\d+)', result.stdout)
        if not count:
            raise RuntimeError('The MySQL test did not report completed checks')
        report['results'].append({'name': 'live-mysql-temporary-table', 'status': 'passed', 'checks': int(count.group(1))})
        report['status'] = 'passed'
except Exception as error:
    report['status'] = 'failed'
    report['error'] = str(error)
    raise
finally:
    if created:
        run(['docker', 'rm', '-f', '-v', container], check=False)
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
