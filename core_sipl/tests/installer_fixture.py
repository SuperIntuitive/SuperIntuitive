"""Test extracted release ZIPs against a disposable TLS MariaDB, never the real site."""
from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager
import argparse
import hashlib
import json
import os
import re
import secrets
import shutil
import subprocess
import tempfile
import threading
import time
import zipfile

ROOT=Path(__file__).resolve().parents[2]
NODE=shutil.which('node') or '/mnt/c/Program Files/nodejs/node.exe'
ENV={k:v for k,v in os.environ.items() if not k.startswith('SI_SIPL_') and k!='SI_SETUP_TOKEN'}
NAME='si-native-installer-'+str(os.getpid())+'-'+secrets.token_hex(3)
report={'testedAt':datetime.now(timezone.utc).isoformat(),'results':[]}
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--mode',choices=['existing','privileged'])
parser.add_argument('--runtime',default=str(ROOT/'sipl.exe'),help='Separately installed SIPL executable used to test the application ZIP')
parser.add_argument('--diagnostic',action='store_true',help='Print fixture-only failure kinds and messages; never use a real configuration')
args=parser.parse_args()
RUNTIME=Path(args.runtime).resolve()


def run(command, source=None, check=True, cwd=ROOT):
    result=subprocess.run(command,cwd=cwd,input=source,text=True,capture_output=True,env=ENV)
    if check and result.returncode:raise RuntimeError((result.stdout+'\n'+result.stderr)[-6000:])
    return result


def windows(path):
    return run(['wslpath','-w',str(path)]).stdout.strip() if os.name!='nt' else str(path)


def start(site):
    assert not (site/'sipl.exe').exists(),'Application ZIP must not contain the SIPL runtime'
    process=subprocess.Popen([str(RUNTIME),'run','core_sipl/main.sipl'],cwd=site,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env=ENV)
    output=[]
    def collect():
        for line in process.stdout:output.append(line)
    threading.Thread(target=collect,daemon=True).start()
    until=time.monotonic()+25
    while time.monotonic()<until:
        match=re.search(r'https?://127\.0\.0\.1:\d+',''.join(output))
        if match:return process,match[0],output
        if process.poll() is not None:break
        time.sleep(.05)
    stop(process)
    raise RuntimeError('Native installer startup failed: '+''.join(output)[-2000:])


def stop(process):
    if process and process.poll() is None:
        process.terminate()
        try:process.wait(timeout=5)
        except subprocess.TimeoutExpired:process.kill();process.wait()


@contextmanager
def disposable_folder():
    with tempfile.TemporaryDirectory(prefix='installer-',dir=ROOT/'core_sipl/runtime') as folder:
        try:yield folder
        finally:stop(process)


def test(config):
    result=run([NODE,'core_sipl/tests/native_installer.cjs'],json.dumps(config))
    print(result.stdout,flush=True,end='')
    count=re.search(r'checks passed:\s*(\d+)',result.stdout)
    report['results'].append({'name':config.get('phase',config['mode']),'status':'passed','checks':int(count[1])})


process=None
created=False
try:
    with disposable_folder() as folder:
        folder=Path(folder)
        password=secrets.token_urlsafe(32)
        root_password=secrets.token_urlsafe(32)
        envfile=folder/'database.env'
        envfile.write_text('MARIADB_DATABASE=si_native_install\nMARIADB_USER=si_install\nMARIADB_PASSWORD='+password+'\nMARIADB_ROOT_PASSWORD='+root_password+'\nMARIADB_ROOT_HOST=%\n')
        run(['docker','run','-d','--name',NAME,'--env-file',str(envfile),'-p','127.0.0.1::3306','mariadb:11.4','--require-secure-transport=ON'])
        created=True
        until=time.monotonic()+60
        while run(['docker','exec',NAME,'healthcheck.sh','--connect','--innodb_initialized'],check=False).returncode:
            if time.monotonic()>until:raise RuntimeError('Installer fixture database did not start')
            time.sleep(.25)
        port=int(run(['docker','port',NAME,'3306/tcp']).stdout.strip().rsplit(':',1)[1])
        database=['docker','exec','-i',NAME,'sh','-c','exec mariadb --user="$MARIADB_USER" --password="$MARIADB_PASSWORD" "$MARIADB_DATABASE"']
        root_database=['docker','exec','-i',NAME,'sh','-c','exec mariadb --user=root --password="$MARIADB_ROOT_PASSWORD" --batch --skip-column-names']
        for mode in ([args.mode] if args.mode else ('existing','privileged')):
            destination=folder/mode
            with zipfile.ZipFile(ROOT/'dist/SuperIntuitive-sipl.zip') as archive:archive.extractall(destination)
            site=destination/'SuperIntuitive'
            if args.diagnostic:
                # Only the extracted disposable fixture gets diagnostic output.
                file=site/'core_sipl/src/Setup.sipl'
                text=file.read_text().replace('"code": "INSTALLATION_INCOMPLETE", "message":', '"detail": fail.why, "code": "INSTALLATION_INCOMPLETE", "message":')
                assert text!=file.read_text(),'Fixture diagnostic hook changed'
                file.write_text(text)
            (site/'core_sipl/config.local.json').write_text(json.dumps({'host':'127.0.0.1','port':0}))
            process,base,output=start(site)
            config={'disposable':True,'base':base,'root':windows(site),'mode':mode,'dbPort':port,'dbName':'si_native_install','dbUser':'si_install' if mode=='existing' else 'root','dbPassword':password if mode=='existing' else root_password,'browser':mode=='existing'}
            if mode=='existing':
                run(database,'CREATE TABLE keep_existing (id INT); INSERT INTO keep_existing VALUES (47);')
                test({**config,'phase':'nonempty','browser':False})
                assert '47' in run(database,'SELECT id FROM keep_existing;').stdout
                run(database,'DROP TABLE keep_existing;')
            try:test(config)
            except Exception:
                if args.diagnostic:
                    diagnostic=''.join(output)
                    for secret in (password,root_password,'Tenchars!1'):diagnostic=diagnostic.replace(secret,'[redacted]')
                    print(diagnostic[-3000:],flush=True)
                raise
            installed_database='si_native_created' if mode=='privileged' else 'si_native_install'
            count=run(root_database,'USE '+installed_database+"; SELECT COUNT(*) FROM relations r INNER JOIN users u ON u.id=r.parent_id INNER JOIN securityroles s ON s.id=r.child_id WHERE u.email='installer@example.test' AND s.name='Admin';").stdout.strip()
            assert count=='1','Fresh administrator must have exactly one Admin assignment'
            stop(process);process=None
            if mode=='existing':
                # Reproduce a crash after the seed commits but before its lock
                # and configuration are published. Restart must only finalize.
                (site/'core/install.lock').unlink()
                journal=json.loads((site/'core/setup.lock').read_text())
                journal['stage']='schema-and-seed'
                (site/'core/setup.lock').write_text(json.dumps(journal))
                (site/'core_sipl/config.local.json').write_text(journal['previousConfiguration'])
                process,base,output=start(site)
                test({**config,'base':base,'phase':'recovered','browser':False})
                stop(process);process=None
                journal=json.loads((site/'core/setup.lock').read_text())
                journal['installation']='0'*32
                (site/'core/setup.lock').write_text(json.dumps(journal))
                (site/'core/install.lock').unlink()
                (site/'core_sipl/config.local.json').write_text(journal['previousConfiguration'])
                process,base,output=start(site)
                test({**config,'base':base,'phase':'partial-restart','browser':False})
                stop(process);process=None
        if not args.mode:
            run(root_database,'CREATE DATABASE si_native_partial;')
            destination=folder/'partial'
            with zipfile.ZipFile(ROOT/'dist/SuperIntuitive-sipl.zip') as archive:archive.extractall(destination)
            site=destination/'SuperIntuitive'
            (site/'core_sipl/config.local.json').write_text(json.dumps({'host':'127.0.0.1','port':0}))
            file=site/'core_sipl/generated/installer-schema.json'
            schema=json.loads(file.read_text());schema['schema'][2]='INVALID INSTALLER SQL';file.write_text(json.dumps(schema))
            process,base,output=start(site)
            config={'disposable':True,'base':base,'root':windows(site),'mode':'existing','phase':'partial','dbPort':port,'dbName':'si_native_partial','dbUser':'root','dbPassword':root_password,'browser':False}
            test(config)
            before=run(root_database,"SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='si_native_partial' ORDER BY TABLE_NAME;").stdout
            assert before.strip() and 'users' not in before
            stop(process);process=None
            process,base,output=start(site)
            test({**config,'base':base,'phase':'partial-restart'})
            after=run(root_database,"SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='si_native_partial' ORDER BY TABLE_NAME;").stdout
            assert before==after,'Restart must preserve the partial schema without creating/dropping tables'
            stop(process);process=None
        report['status']='passed'
except Exception as error:
    report['status']='failed';report['error']=str(error)
    raise
finally:
    stop(process)
    if created:run(['docker','rm','-f','-v',NAME],check=False)
    (ROOT/'core_sipl/installer-validation.json').write_text(json.dumps(report,indent=2)+'\n')
