"""Run after docker build -t superintuitive-security-check .
Creates only disposable containers and removes them when finished.
"""
import secrets
import http.cookiejar
import base64
import json
import os
import sys
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

repo = Path(__file__).resolve().parents[1]
run_id = 'si-security-' + str(os.getpid())
web, db, network = run_id+'-web', run_id+'-db', run_id+'-net'
checks = 0

def docker(*args, check=True):
    r = subprocess.run(['docker', *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and r.returncode:
        raise RuntimeError('Docker '+args[0]+' failed: '+r.stderr[-2000:])
    return r.stdout.strip()

def check(condition, message):
    global checks
    if not condition:
        raise AssertionError(message)
    checks += 1
    print('PASS '+message, flush=True)

with tempfile.TemporaryDirectory(prefix='si-security-http-') as temp:
    site = Path(temp)/'SuperIntuitive'
    site.mkdir()
    for folder in ('core', 'scripts', 'style', 'editor'):
        shutil.copytree(repo/folder, site/folder, ignore=shutil.ignore_patterns('DbCreds*', '*.lock'))
    for name in ('.htaccess', 'index.php', 'delegate.php', 'delegate-admin.php', 'api.v1.php', 'filehandeler.php', 'si403.php'):
        shutil.copy2(repo/name, site/name)
    environment_key = secrets.token_hex(32) if '--environment-key' in sys.argv else None
    (site/'.env').write_text('SI_SETUP_TOKEN='+environment_key+'\n' if environment_key else 'SENSITIVE ENV DATA')
    (site/'.git').mkdir()
    (site/'.git/config').write_text('SENSITIVE GIT DATA')
    (site/'admin-cookies.txt').write_text('SENSITIVE COOKIE DATA')
    os.chmod(temp, 0o755)
    # Seed the checkout's starter folder before Docker assigns ownership to runtime directories.
    (site/'domains').mkdir()
    shutil.copytree(site/'core/setup/domaintemplate', site/'domains/localhost')
    starter_files = {str(path.relative_to(site/'domains/localhost')): (path.read_bytes(), path.stat().st_mtime_ns)
                     for path in (site/'domains/localhost').rglob('*') if path.is_file()}
    dbpass = 'test"quote\\$credential!'
    rootpass = 'isolated-root-test!'
    try:
        docker('network', 'create', network)
        docker('run', '-d', '--name', db, '--network', network, '--network-alias', 'db',
               '-e', 'MARIADB_DATABASE=si_test', '-e', 'MARIADB_USER=si_test',
               '-e', 'MARIADB_PASSWORD='+dbpass, '-e', 'MARIADB_ROOT_PASSWORD='+rootpass,
               'mariadb:10.11')
        environment_args = []
        if environment_key:
            compose_environment = dict(os.environ)
            compose_environment.pop('SI_SETUP_TOKEN', None)
            resolved = json.loads(subprocess.run(['docker', 'compose', '--env-file', str(site/'.env'), '-f', str(repo/'docker-compose.yml'), 'config', '--format', 'json'],
                env=compose_environment, text=True, capture_output=True, check=True).stdout)
            check(resolved['services']['web']['environment']['SI_SETUP_TOKEN'] == environment_key, 'Compose loads the installation key from .env')
            environment_args = ['-e', 'SI_SETUP_TOKEN='+environment_key]
        docker('run', '-d', '--name', web, '--network', network, *environment_args, '-p', '127.0.0.1::80',
               '--mount', 'type=bind,source='+str(site)+',target=/var/www/html',
               'superintuitive-security-check')
        port = docker('port', web, '80/tcp').rsplit(':', 1)[1]
        base = 'http://127.0.0.1:'+port
        cookies = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
        setup_secret = ''
        last_headers = None
        def request(path='/', data=None, token=None, client=opener, extra_headers=None):
            global last_headers
            headers = {'Host': 'localhost'}
            if data is not None:
                data = json.dumps(data).encode()
                headers['Content-Type'] = 'application/json'
            if token is not None:
                headers['X-SI-CSRF'] = token
            headers.update(extra_headers or {})
            req = urllib.request.Request(base+path, data=data, headers=headers)
            try:
                r = client.open(req, timeout=30)
            except urllib.error.HTTPError as e:
                r = e
            last_headers = r.headers
            return r.status, r.read().decode(errors='replace')
        for _ in range(40):
            ready = docker('exec', db, 'healthcheck.sh', '--connect', '--innodb_initialized', check=False)
            state = subprocess.run(['docker', 'exec', db, 'healthcheck.sh', '--connect', '--innodb_initialized'], capture_output=True).returncode
            if state == 0:
                break
            time.sleep(0.5)
        for _ in range(40):
            setup_secret = docker('exec', web, 'cat', '/var/www/html/core/setup.token', check=False)
            if len(setup_secret) >= 32:
                break
            time.sleep(0.25)
        assert len(setup_secret) >= 32, 'Web startup did not initialize its private installation key'
        generated_key = setup_secret
        if environment_key:
            setup_secret = environment_key
        status, html = request(extra_headers={'Accept-Language': 'en-US,en;q=0.9'})
        check(status == 200 and 'si_setup_form' in html, 'Fresh installer renders on patched PHP')
        language_select = re.search(r"<select[^>]*id='si_setup_lang'[^>]*>(.*?)</select>", html, re.S).group(1)
        check(re.search(r"value='en'[^>]*selected", language_select) is not None, 'An en-US browser defaults to the supported en language')
        check(all(re.fullmatch(r'[a-z]{2,3}', value) for value in re.findall(r"value='([^']+)'", language_select)), 'Language options match the server-supported language format')
        token = re.search(r"id='si_setup_csrf'[^>]*value='([^']+)'", html).group(1)
        check(setup_secret not in html and 'si_setup_key' in html, 'Installer key is required and never disclosed in HTML')
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, token)[0] == 403, 'CSRF token alone cannot authorize installation')
        check(request('/delegate.php', {'KEY': 'TestDatabase'}, token, extra_headers={'X-SI-Setup': setup_secret})[0] == 403, 'An action cannot bypass Step 1 even with the correct key header')
        check(request('/delegate.php', {'KEY': 'AuthorizeSetup'}, token, extra_headers={'X-SI-Setup': 'wrong'})[0] == 403, 'Step 1 rejects an incorrect installation key')
        check(request('/delegate.php', {'KEY': 'AuthorizeSetup'}, extra_headers={'X-SI-Setup': setup_secret})[0] == 403, 'Step 1 requires session CSRF protection')
        if environment_key:
            check(request('/delegate.php', {'KEY': 'AuthorizeSetup'}, token, extra_headers={'X-SI-Setup': generated_key})[0] == 403, 'Environment key takes precedence over a generated key file')
        # Authorization guessing is limited independently of legitimate wizard requests.
        clear_limits = 'foreach(glob("/var/www/html/logs/security-rate-limit/*.json") as $f){unlink($f);}'
        docker('exec', web, 'php', '-r', clear_limits)
        for attempt in range(30):
            status, body = request('/delegate.php', {'KEY': 'AuthorizeSetup'}, token, extra_headers={'X-SI-Setup': 'wrong'})
            assert status == 403, 'Unexpected authorization response before throttle limit'
        status, body = request('/delegate.php', {'KEY': 'AuthorizeSetup'}, token, extra_headers={'X-SI-Setup': setup_secret})
        check(status == 429 and json.loads(body).get('code') == 'SETUP_RATE_LIMIT' and last_headers.get('Retry-After'), 'Authorization throttling is distinct from an incorrect key')
        docker('exec', web, 'php', '-r', clear_limits)
        before_auth_id = next(c.value for c in cookies if c.name == 'PHPSESSID')
        before_auth_csrf = token
        status, body = request('/delegate.php', {'KEY': 'AuthorizeSetup'}, token, extra_headers={'X-SI-Setup': setup_secret})
        authorization = json.loads(body)
        check(status == 200 and authorization.get('authorized') is True, 'Step 1 validates the key and authorizes the session')
        token = authorization['csrf']
        check(next(c.value for c in cookies if c.name == 'PHPSESSID') != before_auth_id and token != before_auth_csrf, 'Authorization rotates the session and CSRF token')
        check(setup_secret not in body, 'Authorization response does not echo the secret')
        status, resumed_html = request()
        check("data-setup-authorized='true'" in resumed_html and setup_secret not in resumed_html, 'Reload preserves authorization without rendering the key')
        unauthorized = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        _, unauthorized_html = request(client=unauthorized)
        unauthorized_csrf = re.search(r"id='si_setup_csrf'[^>]*value='([^']+)'", unauthorized_html).group(1)
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, unauthorized_csrf, unauthorized)[0] == 403, 'Authorization cannot be borrowed by another session')
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, before_auth_csrf, unauthorized,
                      extra_headers={'Cookie': 'PHPSESSID='+before_auth_id})[0] == 403, 'Pre-authorization session ID cannot be replayed')
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, token,
                      extra_headers={'X-SI-Setup': 'wrong'})[0] == 200, 'Later steps rely on session authorization instead of rechecking the key')
        check(json.loads(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, token)[1]).get('outcome') is True, 'An authorized domain check needs no key header')
        auth_id = next(c.value for c in cookies if c.name == 'PHPSESSID')
        for field, seconds in (('last_activity', 1800), ('authorized_at', 43200)):
            script = 'session_id($argv[1]); session_start(); $_SESSION["SI"]["security"]["setup"][$argv[2]]=time()-(int)$argv[3]; session_write_close();'
            docker('exec', '--user', 'www-data', web, 'php', '-r', script, auth_id, field, str(seconds))
            status, body = request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, token)
            check(status == 403 and json.loads(body).get('code') == 'SETUP_AUTH_REQUIRED', 'Expired setup authorization is rejected: '+field)
            status, body = request('/delegate.php', {'KEY': 'AuthorizeSetup'}, token, extra_headers={'X-SI-Setup': setup_secret})
            check(status == 200 and json.loads(body).get('authorized') is True, 'An expired setup session can authorize again')
            token = json.loads(body)['csrf']
            auth_id = next(c.value for c in cookies if c.name == 'PHPSESSID')
        for path in ('/.env', '/.git/config', '/logs/dev.log', '/sql/backups/dump.sql', '/core/DbCreds.php', '/core/setup.token', '/admin-cookies.txt', '/media/images/recycle/secret.jpg'):
            status, body = request(path)
            check(status == 403 and 'SENSITIVE' not in body, 'Private path blocked: '+path)
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'})[0] == 403, 'Setup requires CSRF token')
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, 'wrong')[0] == 403, 'Setup rejects incorrect token')
        stranger = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        check(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'new.test'}, token, stranger)[0] == 403, 'Setup rejects another session token')
        check(json.loads(request('/delegate.php', {'KEY': 'TestDomain', 'domain': '../core'}, token)[1])['outcome'] is False, 'Domain traversal rejected over HTTP')
        check(request('/delegate.php', [], token)[0] == 400, 'Malformed request rejected')
        post = dict(KEY='SetupSuperIntuitive', dbtype='mysql', dbserver='db', dbport='3306', dbuserradio='existuser',
                    existdb='si_test', existuser='si_test', existpass=dbpass, domain='localhost',
                    adminuser="admin');\nDROP TABLE users; -- __SI_DOMAIN_NAME__", adminpw='Ten-chars!', adminemail='admin@example.test',
                    noteemail='info@example.test', language='en-us', timezone='America/New_York', currency='usd')
        status, body = request('/delegate.php', dict(post, dbport='3306;dbname=other'), token)
        check(status == 400 and 'protected' not in docker('exec', web, 'cat', '/var/www/html/core/DbCreds.php'), 'Invalid DSN rejected before writing configuration')
        status, body = request('/delegate.php', dict(post, noteemail='info@localhost'), token)
        invalid = json.loads(body)
        check(status == 400 and invalid.get('field') == 'si_setup_hostemail' and invalid.get('code') == 'SETUP_VALIDATION_FAILED', 'Final validation names the rejected field without losing setup authorization')
        status, body = request('/delegate.php', dict(post, KEY='TestDatabase', existuser='si_missing_account', existpass='wrong'), token)
        check(json.loads(body).get('code') == 'DB_LOGIN_DENIED' and 'si_missing_account' in json.loads(body).get('message', ''), 'Connection test identifies the submitted account when MariaDB rejects login')
        status, body = request('/delegate.php', dict(post, KEY='TestDatabase', existdb='si_missing_database'), token)
        check(json.loads(body).get('code') == 'DB_ACCESS_DENIED', 'Connection test distinguishes a database grant failure from login failure')
        status, body = request('/delegate.php', dict(post, KEY='TestDatabase', existdb='si_missing_database', existuser='root', existpass=rootpass), token)
        check(json.loads(body).get('code') == 'DB_NOT_FOUND', 'Connection test identifies a missing database when the account has permission to access it')
        if '--privileged' in sys.argv:
            post.update(dbuserradio='privuser', privuser='root', privpass=rootpass, newdbname='si_created', newuser='si_created')
        check(json.loads(request('/delegate.php', {'KEY': 'TestDomain', 'domain': 'localhost'}, token)[1]).get('outcome') is True,
              'An authenticated fresh install accepts the preexisting starter domain folder')
        database_name = 'si_created' if '--privileged' in sys.argv else 'si_test'
        def dbsql(statement):
            return docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, '--batch', '--skip-column-names', database_name, '-e', statement)
        def fresh_client():
            return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        def csrf_for(client):
            status, document = request('/404', client=client)
            assert status == 200, 'Public page did not render for test session'
            return re.search(r'SI.CSRF.Token = "([a-f0-9]+)"', document).group(1)
        status, body = request('/delegate.php', dict(post, KEY='TestDatabase'), token)
        check(json.loads(body).get('outcome') is True, 'Authorized database connection succeeds without resending the installation key')
        status, body = request('/delegate.php', post, token)
        check(status == 200 and json.loads(body).get('outcome') is True, 'Full installation succeeds using session authorization without the key')
        check((site/'core/install.lock').exists(), 'Successful install writes lock')
        check(all((site/'domains/localhost'/name).read_bytes() == data and (site/'domains/localhost'/name).stat().st_mtime_ns == modified
                  for name, (data, modified) in starter_files.items()), 'Full installation preserves all preexisting starter files without rewriting them')
        check(dbsql("SELECT settingvalue FROM settings WHERE settingname='DefaultLanguage'") == 'en', 'An existing form with en-us installs successfully and stores the normalized language')
        check(not (site/'logs/setup.log').exists() and not (site/'logs/dev.log').exists(), 'Installation does not dump credentials to logs')
        if '--browser' in sys.argv:
            node = os.environ.get('SI_NODE_BIN') or shutil.which('node')
            if not node and Path('/mnt/c/Program Files/nodejs/node.exe').is_file():
                node = '/mnt/c/Program Files/nodejs/node.exe'
            if not node:
                raise RuntimeError('The --browser checks require Node.js 22+ and Chrome; set SI_NODE_BIN and CHROME when needed.')
            browser = subprocess.run([node, 'tests/editor_browser.cjs'], cwd=str(repo), text=True, capture_output=True,
                input=json.dumps(dict(base=base, email=post['adminemail'], password=post['adminpw'], disposable=True)))
            print(browser.stdout, end='', flush=True)
            if browser.returncode:
                raise RuntimeError('Editor browser regression failed: '+browser.stderr[-4000:])
            check(True, 'Browser right-click, element editing, block save, and reload succeed')

        count = docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, '--batch', '--skip-column-names', database_name, '-e', 'SELECT COUNT(*) FROM users;')
        check(count == '1', 'SQL payload did not alter users table')
        actual_name = docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, '--batch', '--skip-column-names', database_name, '-e', 'SELECT HEX(name) FROM users;')
        check(bytes.fromhex(actual_name).decode() == post['adminuser'], 'Installer preserves submitted username as data')
        status, body = request('/delegate.php', dict(post, domain='second.test'), token)
        check(status == 403, 'Installation clears the old setup token')
        status, html = request()
        check(status == 200 and 'si_setup_form' not in html, 'Installed page loads successfully')
        csrf = re.search(r'SI.CSRF.Token = "([a-f0-9]+)"', html).group(1)
        check('no-store' in last_headers.get('Cache-Control', ''), 'Session HTML cannot be stored in shared caches')
        check(last_headers.get('X-Content-Type-Options') == 'nosniff', 'Application sends MIME sniffing protection')
        check(request('/delegate.php', dict(post, domain='second.test'), csrf)[0] == 409, 'Installed site rejects setup even with valid CSRF token')
        for action in ('AuthorizeSetup', 'TestDatabase', 'TestDomain'):
            check(request('/delegate.php', dict(post, KEY=action), csrf, extra_headers={'X-SI-Setup': setup_secret})[0] == 409, 'Installation lock rejects '+action+' even with the correct key')
        docker('exec', web, 'php', '-r', 'copy("/var/www/html/core/DbCreds.php", "/var/www/html/core/.lock-test-creds"); file_put_contents("/var/www/html/core/DbCreds.php", "<?php namespace SuperIntuitive; class DbCreds {}"); if(function_exists("opcache_invalidate")){opcache_invalidate("/var/www/html/core/DbCreds.php",true);}')
        # Apache's OPcache needs its timestamp revalidation interval after an external fixture edit.
        time.sleep(3)
        check(request()[0] == 503 and request('/delegate.php', {'KEY': 'AuthorizeSetup'}, csrf, extra_headers={'X-SI-Setup': setup_secret})[0] == 503, 'Persistent lock prevents reopening setup if database credentials disappear')
        docker('exec', web, 'php', '-r', 'rename("/var/www/html/core/.lock-test-creds", "/var/www/html/core/DbCreds.php"); touch("/var/www/html/core/DbCreds.php"); if(function_exists("opcache_invalidate")){opcache_invalidate("/var/www/html/core/DbCreds.php",true);}')
        time.sleep(3)
        guest_client = fresh_client()
        guest_csrf = csrf_for(guest_client)
        for endpoint in ('/api.v1.php', '/delegate-admin.php', '/filehandeler.php'):
            check(request(endpoint, {'KEY': 'NewUser'}, guest_csrf, guest_client)[0] == 403, 'Guest blocked from '+endpoint)
            check(request(endpoint, client=guest_client)[0] == 405, 'GET cannot mutate '+endpoint)
        check(request('/editor/editor.js', client=guest_client)[0] == 403, 'Guest cannot retrieve generated editor data')
        check(request('/delegate.php', {'KEY': 'LoginAttempt'}, guest_csrf, guest_client, extra_headers={'Host': 'localhost:99999'})[0] == 400, 'Out-of-range Host port rejected')
        anonymous_id = next(c.value for c in cookies if c.name == 'PHPSESSID')
        status, body = request('/delegate.php', {'KEY':'LoginAttempt','email':'admin@example.test','password':post['adminpw'],'rememberme':True}, csrf)
        check(status == 200 and 'REFRESH' in body, 'Admin login works after security changes')
        check(next(c.value for c in cookies if c.name == 'PHPSESSID') != anonymous_id, 'Successful login rotates the session identifier')
        cookie_headers = ' '.join(last_headers.get_all('Set-Cookie') or [])
        check('HttpOnly' in cookie_headers and 'SameSite=Lax' in cookie_headers, 'Authentication cookies have HttpOnly and SameSite flags')
        remember_cookie = next(c.value for c in cookies if c.name == 'remembermetoken')
        stored_token = docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, '--batch', '--skip-column-names', database_name, '-e', 'SELECT remembertoken FROM users;')
        import hashlib
        check(len(remember_cookie) == 64 and stored_token == hashlib.sha256(remember_cookie.encode()).hexdigest()[:32], 'Remember token is stored as digest within existing schema')
        check(request()[0] == 200, 'Admin page refresh populates authorized entity schema')
        if '--deployment' in sys.argv:
            from deployment_http import run_checks
            run_checks(request, dbsql, check, csrf, fresh_client, csrf_for, post['adminpw'])
        for endpoint in ('/api.v1.php', '/delegate-admin.php', '/filehandeler.php'):
            check(request(endpoint, {'KEY': 'NewUser'})[0] == 403, 'Admin mutation requires CSRF at '+endpoint)
        payload = "text'); DROP TABLE users; --"
        entity = {'Name': 'settings', 'Attributes': {'settingname': 'SecurityRegression', 'settingvalue': payload}}
        status, body = request('/api.v1.php', {'Entity': entity, 'Operation': 'Create'}, csrf)
        created_id = json.loads(body).get('CreatedId')
        check(status == 200 and isinstance(created_id, str) and created_id.startswith('0x'), 'Entity creation works with bound SQL values')
        status, body = request('/api.v1.php', {'Entity': {'Name': 'settings', 'Id': created_id}, 'Operation': 'Retrieve', 'Columns': 'id,settingname,settingvalue'}, csrf)
        check(json.loads(body).get('0', {}).get('settingvalue') == payload, 'Entity retrieval preserves SQL syntax as data')
        status, body = request('/api.v1.php', {'Entity': {'Name': 'settings', 'Id': created_id, 'Attributes': {'settingvalue': 'updated'}}, 'Operation': 'Update'}, csrf)
        check(status == 200 and json.loads(body).get('Success') is True, 'Entity update works with bound SQL values')
        status, body = request('/api.v1.php', {'Entity': {'Name': 'settings', 'Id': '0x' + 'z' * 32}, 'Operation': 'Retrieve'}, csrf)
        check(status == 200 and json.loads(body).get('Success') is False, 'Entity API rejects malformed GUIDs')
        count = docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, '--batch', '--skip-column-names', database_name, '-e', 'SELECT COUNT(*) FROM users;')
        check(count == '1', 'Entity SQL payload did not alter users table')
        # Create a second site to prove that a record ID is never sufficient authorization.
        dbsql("INSERT INTO domains(id,name) VALUES(UNHEX(REPEAT('b',32)),'other.test'); INSERT INTO subdomains(id,domain_id,name) VALUES(UNHEX(REPEAT('c',32)),UNHEX(REPEAT('b',32)),''); INSERT INTO entities(id,domain_id,subdomain_id,name,options) VALUES(UNHEX(REPEAT('d',32)),UNHEX(REPEAT('b',32)),UNHEX(REPEAT('c',32)),'users',''),(UNHEX(REPEAT('e',32)),UNHEX(REPEAT('b',32)),UNHEX(REPEAT('c',32)),'settings',''); INSERT INTO settings(id,entity_id,settingname,settingvalue) VALUES(UNHEX(REPEAT('7',32)),UNHEX(REPEAT('e',32)),'Foreign','unchanged'); INSERT INTO users(id,entity_id,name,email,password,remembertoken,preferences) SELECT UNHEX(REPEAT('8',32)),UNHEX(REPEAT('d',32)),'Foreign user','foreign@example.test',password,'','{}' FROM users LIMIT 1;")
        foreign_id = '0x'+'7'*32
        request('/api.v1.php', {'Entity': {'Name': 'settings', 'Id': foreign_id, 'Attributes': {'settingvalue': 'tampered'}}, 'Operation': 'Update'}, csrf)
        check(dbsql("SELECT settingvalue FROM settings WHERE id=UNHEX(REPEAT('7',32))") == 'unchanged', 'Admin cannot update another site record by ID')
        status, body = request('/api.v1.php', {'Entity': {'Name': 'settings', 'Id': foreign_id}, 'Operation': 'Retrieve', 'Columns': 'settingname,settingvalue'}, csrf)
        check('unchanged' not in body, 'Admin cannot retrieve another site record by ID')
        own_scope = dbsql("SELECT HEX(id) FROM entities WHERE name='settings' AND domain_id != UNHEX(REPEAT('b',32)) LIMIT 1")
        status, body = request('/api.v1.php', {'Entity': {'Name': 'settings', 'Id': created_id, 'Attributes': {'entity_id': '0x'+'e'*32}}, 'Operation': 'Update'}, csrf)
        check(json.loads(body).get('Success') is False and dbsql("SELECT HEX(entity_id) FROM settings WHERE id=UNHEX('"+created_id[2:]+"')") == own_scope, 'Entity ownership cannot be reassigned through attributes')
        request('/delegate-admin.php', {'KEY': 'ChangePassword', 'userid': '0x'+'8'*32, 'newpassword': 'Foreign-tamper-password!'}, csrf)
        check(dbsql("SELECT (u.password=f.password) FROM users u,users f WHERE u.email='admin@example.test' AND f.email='foreign@example.test'") == '1', 'Admin password reset cannot target another site')
        status, body = request('/delegate.php', {'KEY': 'LoginAttempt', 'email': 'foreign@example.test', 'password': post['adminpw']}, guest_csrf, guest_client)
        check('LOGINFAIL' in body, 'Foreign-site account cannot log in on this site')
        status, body = request('/delegate.php', {'KEY': 'LoginAttempt', 'email': 'admin@example.test', 'password': post['adminpw']}, guest_csrf, guest_client, extra_headers={'Host': 'other.test'})
        check('LOGINFAIL' in body, 'Login lookup is scoped to the requested site')
        # Reject SQL identifiers before any DDL is executed.
        request('/delegate-admin.php', {'KEY': 'AddLanguage', 'langcode': "xx` TEXT; DROP TABLE users; --", 'name': 'Unsafe'}, csrf)
        check(dbsql('SELECT COUNT(*) FROM users') == '2', 'Language identifiers cannot inject SQL')
        request('/delegate-admin.php', {'KEY': 'NewEntity', 'sname': 'injected', 'pname': 'injected', 'attributes': [{'name': 'value', 'type': 'TEXT); DROP TABLE users; --', 'deploy': 'false'}]}, csrf)
        check(dbsql("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='injected'") == '0', 'Schema field types cannot inject SQL')
        default_payload = "text'); DROP TABLE users; --"
        request('/delegate-admin.php', {'KEY': 'NewEntity', 'sname': 'safe_item', 'pname': 'safe_items', 'attributes': [{'name': 'description', 'type': 'VARCHAR', 'size': '255', 'def': default_payload, 'deploy': 'false'}]}, csrf)
        dbsql("INSERT INTO safe_items(id,entity_id,name) SELECT UNHEX(REPEAT('6',32)),id,'Test' FROM entities WHERE name='users' LIMIT 1")
        check(dbsql('SELECT HEX(description) FROM safe_items') == default_payload.encode().hex().upper(), 'Schema defaults preserve SQL syntax as data')
        status, body = request('/delegate-admin.php', {'KEY': 'NewUser', 'name': 'Weak', 'email': 'weak@example.test', 'newpassword': 'short'}, csrf)
        check('ERROR' in body and dbsql("SELECT COUNT(*) FROM users WHERE email='weak@example.test'") == '0', 'Admin-created users require strong passwords')
        docker('exec', web, 'php', '-r', 'file_put_contents("/var/www/html/domains/localhost/media/images/shell.php", \'<?php echo "EXECUTED_UPLOAD";\');')
        check(request('/media/images/shell.php')[0] == 403, 'PHP execution blocked through media alias')
        check(request('/domains/localhost/media/images/shell.php')[0] == 403, 'PHP execution blocked through direct media path')
        # Actually upload media: the default Docker image has no optional EXIF extension.
        boundary = 'security-test-boundary'
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=')
        def upload(filename, content, mime='image/png'):
            payload = ('--'+boundary+'\r\nContent-Disposition: form-data; name="files[]"; filename="'+filename+'"\r\nContent-Type: '+mime+'\r\n\r\n').encode()+content+('\r\n--'+boundary+'--\r\n').encode()
            req = urllib.request.Request(base+'/filehandeler.php', data=payload, headers={'Host': 'localhost', 'X-SI-CSRF': csrf, 'Content-Type': 'multipart/form-data; boundary='+boundary})
            with opener.open(req) as response:
                return response.status, json.loads(response.read())
        status, uploaded = upload('safe.png', png)
        check(status == 200 and len(uploaded) == 1 and uploaded[0]['name'] == 'safe.png', 'Real PNG upload works without EXIF extension')
        check(request(uploaded[0]['path'])[0] == 200, 'Uploaded media remains available')
        check('sandbox' in last_headers.get('Content-Security-Policy', ''), 'Uploaded content is sandboxed on the site origin')
        check(upload('disguised.png', b'<?php echo "UNSAFE_UPLOAD";')[1] == [], 'Executable content disguised as PNG is rejected')
        # Restrict an existing public page to Admin, then verify a guest cannot retrieve it.
        sql = "INSERT INTO relations (id,status,createdon,entity_id,parententity_id,childentity_id,parent_id,child_id,note,`live-order`,`test-order`,`dev-order`,`live-options`,`test-options`,`dev-options`) SELECT UNHEX(REPEAT('a',32)), 'active', NOW(), e.id,pe.id,ce.id,p.id,r.id,'',0,0,0,'','','' FROM entities e,entities pe,entities ce,pages p,securityroles r WHERE e.name='relations' AND pe.name='pages' AND ce.name='securityroles' AND p.path='' AND r.name='Admin' LIMIT 1;"
        docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, database_name, '-e', sql)
        guest = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, body = request(client=guest)
        check(status == 403, 'Guest cannot view a page restricted to Admin')
        check(request()[0] == 200, 'Admin can still view restricted page')
        # Remember-me restoration must rotate the bearer token and preserve authorization.
        remembered = fresh_client()
        remember_header = 'remembermetoken='+remember_cookie+'; remembermetime='+next(c.value for c in cookies if c.name == 'remembermetime')
        check(request(client=remembered, extra_headers={'Cookie': remember_header})[0] == 200, 'Remember cookie restores the authorized account')
        check('remembermetoken=' in ' '.join(last_headers.get_all('Set-Cookie') or []), 'Remember restoration issues a rotated token')
        check(request(client=fresh_client(), extra_headers={'Cookie': remember_header})[0] == 403, 'Replayed remember token is rejected after rotation')
        # Removing a role must affect existing sessions without a page refresh first.
        dbsql("UPDATE securityroles SET status='inactive' WHERE name='Admin'")
        check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, csrf)[0] == 403, 'Disabled admin role revokes API access immediately')
        check(request('/editor/editor.js')[0] == 403, 'Disabled admin role revokes editor access immediately')
        check(request()[0] == 403, 'Disabling a required role does not make its page public')
        dbsql("UPDATE securityroles SET status='active' WHERE name='Admin'")
        check(request()[0] == 200, 'Restored role is reflected in the existing session')
        dbsql("UPDATE relations r INNER JOIN users u ON u.id=r.parent_id INNER JOIN securityroles s ON s.id=r.child_id SET r.status='inactive' WHERE u.email='admin@example.test' AND s.name='Admin'")
        check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, csrf)[0] == 403, 'Removed role assignment revokes an existing session')
        dbsql("UPDATE relations r INNER JOIN users u ON u.id=r.parent_id INNER JOIN securityroles s ON s.id=r.child_id SET r.status='active' WHERE u.email='admin@example.test' AND s.name='Admin'")
        check(request()[0] == 200, 'Restoring a role assignment restores authorized access')
        # Changing the password invalidates other authenticated sessions.
        second = fresh_client()
        second_csrf = csrf_for(second)
        check('REFRESH' in request('/delegate.php', {'KEY': 'LoginAttempt', 'email': 'admin@example.test', 'password': post['adminpw']}, second_csrf, second)[1], 'Second session authenticates before password change')
        new_password = 'New-long-test-password!'
        status, body = request('/delegate.php', {'KEY': 'ChangePassword', 'email': 'admin@example.test', 'password': post['adminpw'], 'newpassword': new_password}, csrf)
        check('"PASSWORDCHANGED":true' in body.replace(' ', ''), 'Current account can change its password')
        check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, second_csrf, second)[0] == 403, 'Password change revokes another active session')
        check(request()[0] == 200, 'Password change preserves the initiating session')
        # Resetting a password through the admin endpoint revokes the old session too.
        admin_id = '0x'+dbsql("SELECT HEX(id) FROM users WHERE email='admin@example.test'")
        request('/delegate-admin.php', {'KEY': 'ChangePassword', 'userid': admin_id, 'newpassword': new_password}, csrf)
        check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, csrf)[0] == 403, 'Administrator reset invalidates pre-reset sessions')
        def authenticated_client(remember=False):
            client = fresh_client()
            token = csrf_for(client)
            status, body = request('/delegate.php', {'KEY': 'LoginAttempt', 'email': 'admin@example.test', 'password': new_password, 'rememberme': remember}, token, client)
            assert status == 200 and 'REFRESH' in body, 'Fixture login failed'
            return client, token
        def session_id_for(client):
            jar = next(h.cookiejar for h in client.handlers if isinstance(h, urllib.request.HTTPCookieProcessor))
            return next(c.value for c in jar if c.name == 'PHPSESSID')
        disabled, disabled_csrf = authenticated_client()
        dbsql("UPDATE users SET status='inactive' WHERE email='admin@example.test'")
        check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, disabled_csrf, disabled)[0] == 403, 'Deactivating an account revokes its existing session')
        dbsql("UPDATE users SET status='active' WHERE email='admin@example.test'")
        for field, seconds, description in (('last_activity', 1801, 'Idle session expires after 30 minutes'), ('authenticated_at', 43201, 'Session absolute lifetime is limited to 12 hours')):
            expired, expired_csrf = authenticated_client()
            script = 'session_id($argv[1]); session_start(); if(empty($_SESSION["SI"]["domains"]["localhost"]["subdomains"][""]["user"]["loggedin"])){fwrite(STDERR,"Test session was not found in CLI save path: ".session_save_path()); exit(1);} $_SESSION["SI"]["domains"]["localhost"]["subdomains"][""]["user"][$argv[2]]=time()-(int)$argv[3]; session_write_close();'
            docker('exec', '--user', 'www-data', web, 'php', '-r', script, session_id_for(expired), field, str(seconds))
            check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, expired_csrf, expired)[0] == 403, description)
        logged_out, logout_csrf = authenticated_client(remember=True)
        old_session_id = session_id_for(logged_out)
        check('REFRESH' in request('/delegate.php', {'KEY': 'Logout'}, logout_csrf, logged_out)[1], 'Logout succeeds')
        check(request('/api.v1.php', {'Entity': {'Name': 'settings'}, 'Operation': 'Retrieve'}, logout_csrf, fresh_client(), extra_headers={'Cookie': 'PHPSESSID='+old_session_id})[0] == 403, 'Logged-out session identifier cannot be replayed')
        check(dbsql("SELECT LENGTH(remembertoken) FROM users WHERE email='admin@example.test'") == '0', 'Logout revokes persistent authentication')
        check(dbsql('SELECT COUNT(*) FROM sessions WHERE LENGTH(sessionid)=26') != '0', 'Session audit records fit the existing schema')
        check(dbsql("SELECT COUNT(*) FROM sessions WHERE sessionid='"+old_session_id+"'") == '0', 'Session audit records do not store bearer cookie values')
        # The throttle is shared by browser sessions and ignores forged proxy headers.
        docker('exec', web, 'php', '-r', 'foreach(glob("/var/www/html/logs/security-rate-limit/*.json") as $f){unlink($f);}')
        for attempt in range(10):
            brute = fresh_client()
            brute_csrf = csrf_for(brute)
            status, body = request('/delegate.php', {'KEY': 'LoginAttempt', 'email': 'absent@example.test', 'password': 'wrong-password'}, brute_csrf, brute, extra_headers={'X-Forwarded-For': '198.51.100.'+str(attempt+1)})
            assert status == 200 and 'LOGINFAIL' in body
        brute = fresh_client()
        brute_csrf = csrf_for(brute)
        check(request('/delegate.php', {'KEY': 'LoginAttempt', 'email': 'absent@example.test', 'password': 'wrong-password'}, brute_csrf, brute, extra_headers={'X-Forwarded-For': '203.0.113.99'})[0] == 429, 'New sessions and forged proxy headers cannot bypass login throttling')
        print('HTTP security checks passed: '+str(checks), flush=True)
    except Exception:
        print(docker('exec', web, 'cat', '/var/www/html/logs/dev.err', check=False), flush=True)
        print(docker('exec', db, 'mariadb', '-uroot', '-p'+rootpass, '--batch', '--skip-column-names', 'si_test', '-e', 'SHOW TABLES;', check=False), flush=True)
        print(docker('logs', '--tail', '25', web, check=False), flush=True)
        raise
    finally:
        docker('exec', web, 'chown', '-R', str(os.getuid())+':'+str(os.getgid()), '/var/www/html', check=False)
        docker('rm', '-f', '-v', web, db, check=False)
        docker('network', 'rm', network, check=False)
