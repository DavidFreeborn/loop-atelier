"""Prepare public release assets from the assembled toolkit, preserving local QA.

Run scripts/assemble.py first. Public diagnostics use portable path labels;
artwork bytes, recipes and their hashes are unchanged. The public archive gets
new checksums for its actual contents.
"""
from pathlib import Path
from urllib.parse import quote
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / '.publish' / 'release'
DEST.mkdir(parents=True, exist_ok=True)
source = ROOT / 'output' / 'loop-atelier-toolkit.zip'
target = DEST / 'loop-atelier-toolkit.zip'

replacements = []
for location, label in [(ROOT, '<project>'), (Path.home(), '<home>')]:
    variants = {str(location), location.as_posix(), quote(location.as_posix(), safe='/:'), location.as_uri()}
    replacements.extend((variant, label) for variant in variants)
replacements.sort(key=lambda pair: len(pair[0]), reverse=True)

def portable_text(value):
    for original, label in replacements:
        value = value.replace(original, label)
    return value

def portable_json(value):
    if isinstance(value, str):
        return portable_text(value)
    if isinstance(value, list):
        return [portable_json(item) for item in value]
    if isinstance(value, dict):
        return {portable_text(key): portable_json(item) for key, item in value.items()}
    return value

checksums = {}
with zipfile.ZipFile(source) as archive, zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as public:
    for entry in archive.infolist():
        if entry.filename == 'output/checksums.json':
            continue
        data = archive.read(entry)
        suffix = Path(entry.filename).suffix.lower()
        # Change only textual provenance, never executable source or media.
        if suffix in {'.json', '.md', '.txt'}:
            encoding = 'utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'
            original = data.decode(encoding)
            if suffix == '.json':
                parsed = json.loads(original)
                updated = portable_json(parsed)
                if parsed != updated:
                    data = (json.dumps(updated, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
            else:
                updated = portable_text(original)
                if original != updated:
                    data = updated.encode('utf-8')
        public.writestr(entry.filename, data)
        checksums[entry.filename] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
    public.writestr('output/checksums.json', json.dumps(checksums, indent=2) + '\n')

with zipfile.ZipFile(source) as original, zipfile.ZipFile(target) as public:
    assert public.testzip() is None
    for filename in checksums:
        data = public.read(filename)
        assert hashlib.sha256(data).hexdigest() == checksums[filename]['sha256']
        if filename.startswith(('output/stills/', 'output/loops/')):
            assert data == original.read(filename), filename

html = DEST / 'loop-atelier.html'
html.write_bytes((ROOT / 'output' / 'loop-atelier.html').read_bytes())
lines = [f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}' for p in [target, html]]
(DEST / 'SHA256SUMS').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(json.dumps({'archive': target.name, 'bytes': target.stat().st_size, 'files': len(checksums) + 1,
                  'publication_media_unchanged': True, 'checksums': 'verified'}))
