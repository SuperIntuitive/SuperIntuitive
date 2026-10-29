"""Verify the new launcher on Apache using a disposable, database-free fixture."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]

def docker(*args, check=True):
    result = subprocess.run(['docker', *args], text=True, capture_output=True, check=check)
    return result.stdout.strip()

with tempfile.TemporaryDirectory(prefix='si-sipl-apache-') as temporary:
    site = Path(temporary) / 'site'
    site.mkdir()
    os.chmod(temporary, 0o755)
    for name in ('.htaccess', 'si403.php'):
        shutil.copy2(ROOT / name, site / name)
    shutil.copytree(ROOT / 'core_sipl', site / 'core_sipl', ignore=shutil.ignore_patterns('config.local.json', 'config.*.local.json', 'runtime', '__pycache__'))
    (site / 'core_sipl/config.local.json').write_text('PRIVATE SIPL CONFIG SENTINEL')
    (site / 'logs').mkdir(mode=0o777)
    name = 'si-sipl-apache-' + str(os.getpid())
    try:
        docker('run', '-d', '--name', name, '--entrypoint', 'apache2-foreground',
               '-p', '127.0.0.1::80', '--mount', 'type=bind,source=' + str(site) + ',target=/var/www/html',
               'superintuitive-security-check')
        port = docker('port', name, '80/tcp').rsplit(':', 1)[1]
        base = 'http://127.0.0.1:' + port
        def request(path):
            try:
                response = urllib.request.urlopen(base + path, timeout=10)
            except urllib.error.HTTPError as error:
                response = error
            return response.status, response.read().decode(errors='replace')
        for attempt in range(40):
            try:
                request('/core_sipl/switch.html')
                break
            except OSError:
                time.sleep(.1)
        checks = 0
        for path in ('switch.html', 'public/backend-switch.js', 'public/switch.css'):
            status, body = request('/core_sipl/' + path)
            assert status == 200, (path, status, body[:300])
            checks += 1
        for path in ('main.sipl', 'config.local.json', 'php-baseline.json', 'generated/editor.js.tmpl',
                     'src/Accounts.sipl', 'tests/unit.sipl', 'tools/runtime_probe.sipl', '.htaccess'):
            status, body = request('/core_sipl/' + path)
            assert status == 403 and 'PRIVATE SIPL CONFIG SENTINEL' not in body, (path, status)
            checks += 1
        print('SIPL Apache launcher/isolation checks passed: ' + str(checks))
    finally:
        docker('rm', '-f', name, check=False)
