"""Check both distribution ZIPs, including private-file exclusion and failed builds."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--negative',action='store_true',help='Build a synthetic checkout with fake secrets and missing files')
args=parser.parse_args()
checks=0


def check(condition,label):
    global checks
    if not condition:raise AssertionError(label)
    checks+=1
    print('PASS '+label,flush=True)


def inspect(folder,trap=None):
    for backend in ('php','sipl'):
        file=folder/('SuperIntuitive-'+backend+'.zip')
        with zipfile.ZipFile(file) as archive:
            names=archive.namelist()
            files={name for name in names if not name.endswith('/')}
            check(all(name.startswith('SuperIntuitive/') and '\\' not in name and '..' not in PurePosixPath(name).parts for name in names),backend+' ZIP uses portable, contained entry paths')
            metadata=json.loads(archive.read('SuperIntuitive/PACKAGE.json'))
            expected={'SuperIntuitive/'+item['path'] for item in metadata['files']}
            check(files==expected|{'SuperIntuitive/PACKAGE.json'},backend+' manifest lists every packaged file')
            for item in metadata['files']:
                data=archive.read('SuperIntuitive/'+item['path'])
                assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256'],item['path']
                if trap:assert trap not in data,item['path']
            check(True,backend+' file lengths and SHA-256 hashes match')
            forbidden=('/.env','/config.local.json','/runtime/','/logs/','/domains/','/plugins/installed/','/plugins/downloaded/','/sql/backups/','/sql/installer/','/DbCreds.php.old','/DbCreds_backup.php')
            check(not any(any(part in name for part in forbidden) for name in files),backend+' ZIP excludes deployment state, credentials and backups')
            if backend=='php':
                check(archive.read('SuperIntuitive/core/DbCreds.php')==b'<?php\nnamespace SuperIntuitive;\nclass DbCreds { }\n','PHP credentials are replaced with a clean bootstrap class')
                check(all('SuperIntuitive/'+name in files for name in ['.htaccess','editor/.htaccess','scripts/.htaccess','style/.htaccess','core/setup/installer.php','core/setup/super_intuitive_install.sql','Dockerfile','docker-compose.yml']),'PHP package preserves Apache handlers, installer and Docker support')
                check(not any(PurePosixPath(name).suffix.lower() in {'.exe','.dll','.msi'} or '/core_sipl/' in name for name in files),'PHP package excludes language runtimes, runtime installers and the SIPL backend')
            else:
                check(not any(name.lower().endswith('.php') for name in files),'SIPL package contains no PHP files')
                required=['start-sipl.bat','core_sipl/main.sipl','core_sipl/generated/editor.js.tmpl','core_sipl/generated/installer-schema.json','core_sipl/generated/installer.html.tmpl','core_sipl/generated/installer-media.zip','scripts/setup.js','style/setup.css','core_sipl/config.example.json']
                check(all('SuperIntuitive/'+name in files for name in required),'SIPL package includes its native installer, templates and editor assets')
                check(not any(PurePosixPath(name).suffix.lower() in {'.exe','.dll','.msi'} for name in files),'SIPL package excludes language runtimes and runtime installers')


def windows(path):
    return subprocess.check_output(['wslpath','-w',str(path)],text=True).strip() if os.name!='nt' else str(path)


inspect(ROOT/'dist')
if args.negative:
    with tempfile.TemporaryDirectory(prefix='package checks ',dir=ROOT/'core_sipl/runtime') as temporary:
        fixture=Path(temporary)/'source with spaces'
        fixture.mkdir()
        for backend in ('php','sipl'):
            with zipfile.ZipFile(ROOT/f'dist/SuperIntuitive-{backend}.zip') as archive:
                for name in archive.namelist():
                    if name.endswith('/'):continue
                    relative=name.removeprefix('SuperIntuitive/')
                    target=fixture/relative
                    target.parent.mkdir(parents=True,exist_ok=True)
                    target.write_bytes(archive.read(name))
        shutil.copytree(ROOT/'packaging',fixture/'packaging')
        for name in ['package.bat','scripts/package.ps1']:
            shutil.copy2(ROOT/name,fixture/name)
        trap=b'PACKAGING-PRIVATE-SENTINEL-DO-NOT-SHIP'
        for name in ['.env','core/DbCreds.php','core/DbCreds.php.old','core/DbCreds_backup.php','core/install.lock','core/setup.token','core_sipl/config.local.json','core_sipl/setup-config.pending.json','core_sipl/runtime/secret.json','core_sipl/generated/runtime/secret.json','editor/media/data/config.secret.local.json','domains/customer/media/private.json','plugins/installed/private/script.js','sql/backups/private.sql','logs/private.log']:
            target=fixture/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(trap)
        output=Path(temporary)/'output with spaces'
        wrapper=Path(temporary)/'without file hash.ps1'
        wrapper.write_text('''param([string]$PackageScript, [string]$SourceRoot, [string]$OutputDirectory)
function Get-FileHash { throw 'Regression: packaging must not require Get-FileHash' }
$global:LASTEXITCODE = 0
& $PackageScript -SourceRoot $SourceRoot -OutputDirectory $OutputDirectory
exit $LASTEXITCODE
''')
        command=['powershell.exe','-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',windows(wrapper),'-PackageScript',windows(ROOT/'scripts/package.ps1'),'-SourceRoot',windows(fixture),'-OutputDirectory',windows(output)]
        result=subprocess.run(command,text=True,capture_output=True,cwd=temporary)
        check(result.returncode==0 and not (fixture/'sipl.exe').exists(),'Build works without a runtime or Get-FileHash, including paths containing spaces')
        inspect(output,trap)
        previous={file.name:hashlib.sha256(file.read_bytes()).hexdigest() for file in output.glob('*.zip')}
        entry=fixture/'core_sipl/main.sipl'
        entry.rename(fixture/'core_sipl/main.missing.sipl')
        result=subprocess.run(command,text=True,capture_output=True,cwd=temporary)
        check(result.returncode!=0,'Missing application entry point fails the build')
        check(previous=={file.name:hashlib.sha256(file.read_bytes()).hexdigest() for file in output.glob('*.zip')},'Failed build preserves both previous release ZIPs')
        check(not list(output.glob('.package-*')),'Failed build cleans its staging files')
        (fixture/'core_sipl/main.missing.sipl').rename(entry)
        file=fixture/'core/setup/installer.php'
        file.write_bytes(file.read_bytes()+b'\n<!-- changed source -->\n')
        result=subprocess.run(command,text=True,capture_output=True,cwd=temporary)
        check(result.returncode!=0 and 'stale' in result.stderr,'Changed installer source cannot ship stale compiled native assets')
        check(previous=={file.name:hashlib.sha256(file.read_bytes()).hexdigest() for file in output.glob('*.zip')},'Stale installer build preserves both previous release ZIPs')
print('Distribution packaging checks passed: '+str(checks))
