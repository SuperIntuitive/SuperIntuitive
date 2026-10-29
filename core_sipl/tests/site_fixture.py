"""Install the original schema in a disposable TLS database and test the native site."""
from pathlib import Path
from datetime import datetime, timezone
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

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser',action='store_true')
args=parser.parse_args()
fixture_environment = {key: value for key, value in os.environ.items() if not key.startswith('SI_SIPL_') and key != 'SI_SETUP_TOKEN'}
runtime=ROOT/'sipl.exe'
node=shutil.which('node') or '/mnt/c/Program Files/nodejs/node.exe'
container='si-sipl-site-'+str(os.getpid())+'-'+secrets.token_hex(3)
server=None
created=False
report={'testedAt':datetime.now(timezone.utc).isoformat(),'runtimeSha256':hashlib.sha256(runtime.read_bytes()).hexdigest(),'results':[]}

def run(command,source=None,check=True):
 result=subprocess.run(command,cwd=ROOT,input=source,text=True,capture_output=True,env=fixture_environment)
 if check and result.returncode: raise RuntimeError((result.stdout+'\n'+result.stderr)[-7000:])
 return result

def windows_path(value):
 if os.name!='nt' and str(runtime).endswith('.exe'):
  return run(['wslpath','-w',str(value)]).stdout.strip()
 return str(value)

folder=ROOT/'core_sipl/runtime'
folder.mkdir(exist_ok=True)
try:
 with tempfile.TemporaryDirectory(prefix='site-',dir=folder) as temporary:
  temporary=Path(temporary)
  root=temporary/'site'
  root.mkdir()
  for name in ['editor','scripts','style','core_sipl']:
   shutil.copytree(ROOT/name,root/name,ignore=shutil.ignore_patterns('runtime','config.local.json','config.*.local.json','__pycache__'))
  (root/'core').mkdir()
  (root/'core/install.lock').write_text('disposable installed fixture')
  (root/'domains/localhost').mkdir(parents=True)
  password='Sipl-fixture-2026!'
  php='$p=json_decode(stream_get_contents(STDIN),true);echo password_hash($p,PASSWORD_BCRYPT,["cost"=>10]);'
  php_hash=run(['docker','run','--rm','-i','--entrypoint','php','superintuitive-security-check','-r',php],json.dumps(password)).stdout
  database_password=secrets.token_urlsafe(32)
  environment=temporary/'container.env'
  environment.write_text('MARIADB_DATABASE=si_sipl_site\nMARIADB_USER=si_sipl_site\nMARIADB_PASSWORD='+database_password+'\nMARIADB_ROOT_PASSWORD='+secrets.token_urlsafe(32)+'\n')
  run(['docker','run','-d','--name',container,'--env-file',str(environment),'-p','127.0.0.1::3306','mariadb:11.4','--require-secure-transport=ON'])
  created=True
  deadline=time.monotonic()+60
  while run(['docker','exec',container,'healthcheck.sh','--connect','--innodb_initialized'],check=False).returncode:
   if time.monotonic()>deadline: raise RuntimeError('Fixture MariaDB did not become ready')
   time.sleep(.25)
  port=int(run(['docker','port',container,'3306/tcp']).stdout.strip().rsplit(':',1)[1])
  sql=(ROOT/'core/setup/super_intuitive_install.sql').read_text()
  ids={token:secrets.token_hex(16) for token in set(re.findall(r'_SI_GUID_\d+',sql))}
  sql=re.sub(r'_SI_GUID_\d+',lambda m:'0x'+ids[m[0]],sql)
  sql=sql.replace("'_SI_NOWTIME_'",'CURRENT_TIMESTAMP()')
  for key,value in {'DOMAIN_NAME':'localhost','USER_NAME':'Native Administrator','USER_EMAIL':'admin@example.test','USER_PASSWORD':php_hash,'DEFAULT_NOTEEMAIL':'info@example.test','DEFAULT_LANGUAGE':'en','DEFAULT_TIMEZONE':'UTC','DEFAULT_CURRENCY':'USD'}.items():
   sql=sql.replace("'__SI_"+key+"__'",'0x'+value.encode().hex())
  assert not re.search(r'__SI_[A-Z_]+__|_SI_GUID_',sql)
  # The legacy seed has a dangling sample user-role relation; the disposable
  # fixture explicitly assigns its generated administrator to the Admin role.
  sql+="\nUPDATE relations SET parent_id=0x"+ids['_SI_GUID_53']+" WHERE child_id=0x"+ids['_SI_GUID_54']+" AND note='users_securityroles';\nCOMMIT;\n"
  # Valid sparse ranks must survive opening tools and saving one block.
  sql+="UPDATE relations r INNER JOIN pages p ON p.id=r.parent_id AND p.entity_id=r.parententity_id SET r.`dev-order`=r.`dev-order`*10+10 WHERE p.path='';\nCOMMIT;\n"
  sql_command=['docker','exec','-i',container,'sh','-c','exec mariadb --user="$MARIADB_USER" --password="$MARIADB_PASSWORD" "$MARIADB_DATABASE"']
  run(sql_command,sql)
  configuration=temporary/'config.local.json'
  configuration.write_text(json.dumps({'root':windows_path(root),'host':'127.0.0.1','port':0,'domain':'localhost','dsn':'mysql:host=127.0.0.1;port='+str(port)+';dbname=si_sipl_site;charset=utf8mb4','dbUser':'si_sipl_site','dbPassword':database_password}))
  server=subprocess.Popen([str(runtime),'run','core_sipl/main.sipl',configuration.relative_to(ROOT).as_posix()],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env=fixture_environment)
  output=[]
  def collect():
   for line in server.stdout: output.append(line)
  threading.Thread(target=collect,daemon=True).start()
  deadline=time.monotonic()+25
  base=None
  while not base:
   match=re.search(r'https?://(?:127\.0\.0\.1|localhost):\d+',''.join(output))
   if match: base=match[0]
   elif server.poll() is not None or time.monotonic()>deadline: raise RuntimeError('Native fixture startup failed: '+''.join(output)[-1500:])
   else: time.sleep(.05)
  hash_result=temporary/'generated-passwords.json'
  test_config={'disposable':True,'base':base,'email':'admin@example.test','password':password,'hashResult':windows_path(hash_result)}
  for name,path in [('http','core_sipl/tests/native_site.cjs')]+([('browser','core_sipl/tests/native_editor_browser.cjs')] if args.browser else []):
   result=run([node,path],json.dumps(test_config))
   print(result.stdout.strip(),flush=True)
   count=re.search(r'checks passed:\s*(\d+)',result.stdout)
   report['results'].append({'name':name,'status':'passed','checks':int(count.group(1)) if count else result.stdout.count('PASS ')})
  verify='$v=json_decode(stream_get_contents(STDIN),true);foreach($v as $r){if(!password_verify($r["password"],$r["hash"]))exit(1);}echo "PHP verifies the native-created account password";'
  print(run(['docker','run','--rm','-i','--entrypoint','php','superintuitive-security-check','-r',verify],hash_result.read_text()).stdout,flush=True)
  report['status']='passed'
except Exception as error:
 report['status']='failed'
 report['error']=str(error)
 raise
finally:
 if server and server.poll() is None:
  server.terminate()
  try: server.wait(timeout=5)
  except subprocess.TimeoutExpired: server.kill();server.wait()
 if created: run(['docker','rm','-f','-v',container],check=False)
 (ROOT/'core_sipl/site-validation.json').write_text(json.dumps(report,indent=2)+'\n')
