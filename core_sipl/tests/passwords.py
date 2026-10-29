"""Bidirectional PHP/SIPL bcrypt compatibility using synthetic passwords only."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / 'sipl.exe'
PHP_IMAGE = 'superintuitive-security-check'

def run(command, source=None):
    result = subprocess.run(command, cwd=ROOT, input=source, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout

# Passwords are disposable fixtures, never application credentials.
passwords = ['Sipl-interop-2026', 'abcdefghij', 'é' * 36, 'Quotes-\\-"-日本語']
create = '$out=[];foreach(json_decode(stream_get_contents(STDIN),true) as $p){$out[]=["password"=>$p,"hash"=>password_hash($p,PASSWORD_BCRYPT,["cost"=>10])];}echo json_encode($out);'
verify = '$n=0;foreach(json_decode(stream_get_contents(STDIN),true) as $v){if(!password_verify($v["password"],$v["hash"])||password_verify("wrong",$v["hash"]))exit(1);$n++;}echo $n;'
folder = ROOT / 'core_sipl/runtime'
folder.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='bcrypt-', dir=folder) as temporary:
    temporary = Path(temporary)
    vectors = run(['docker', 'run', '--rm', '-i', '--entrypoint', 'php', PHP_IMAGE, '-r', create], json.dumps(passwords))
    source = temporary / 'vectors.json'
    source.write_text(vectors)
    target = temporary / 'native.json'
    output = run([str(RUNTIME), 'run', 'core_sipl/tests/passwords.sipl', source.relative_to(ROOT).as_posix(), target.relative_to(ROOT).as_posix()])
    print(output.strip())
    count = int(run(['docker', 'run', '--rm', '-i', '--entrypoint', 'php', PHP_IMAGE, '-r', verify], target.read_text()))
    assert count == len(passwords)
    print('PHP verification of SIPL-generated bcrypt passed: ' + str(count))
    checks = int(re.search(r'checks passed:\s*(\d+)', output).group(1)) + count
    (ROOT / 'core_sipl/password-validation.json').write_text(json.dumps({'runtimeSha256': hashlib.sha256(RUNTIME.read_bytes()).hexdigest(), 'status': 'passed', 'checks': checks, 'phpToSipl': len(passwords), 'siplToPhp': count}, indent=2) + '\n')
