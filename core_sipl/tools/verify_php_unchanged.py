"""Verify that the SIPL port never edits PHP or assets containing PHP."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / 'core_sipl/php-baseline.json').read_text())
changed = [name for name, digest in manifest['files'].items()
           if not (ROOT / name).is_file() or hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest]
if changed:
    raise SystemExit('Protected PHP content changed: ' + ', '.join(changed))
print(f"PASS {len(manifest['files'])} PHP files and PHP-containing assets are unchanged")
