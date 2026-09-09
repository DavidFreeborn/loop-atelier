"""Assemble the collection sheet and a portable delivery archive from finished assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
import zipfile
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
CATALOG = json.loads((OUT / 'catalog.json').read_text(encoding='utf-8'))

def font(size, serif=False):
    choices = ([Path('C:/Windows/Fonts/georgia.ttf')] if serif else [Path('C:/Windows/Fonts/segoeui.ttf')])
    choices += [Path('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf' if serif else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
    for p in choices:
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default(size=size)

def contact(collection, filename, title):
    scenes = [s for s in CATALOG if s.get('collection', 1) == collection]
    columns = 4 if len(scenes) == 8 else 3
    rows = (len(scenes) + columns - 1) // columns
    tile_size = (2260 - (columns - 1) * 50) // columns
    row_height = tile_size + 62
    height = 124 + rows * row_height + 40
    sheet = Image.new('RGB', (2400, height), '#101113')
    d = ImageDraw.Draw(sheet)
    d.text((68, 38), 'Loop atelier', fill='#e4e1da', font=font(43, True))
    for i, scene in enumerate(scenes):
        with Image.open(OUT / 'stills' / f'{scene["id"]}.png') as im:
            im.load()
            tile = im.convert('RGB').resize((tile_size, tile_size), Image.Resampling.LANCZOS)
        x, y = 70 + (i % columns) * (tile_size + 50), 124 + (i // columns) * row_height
        sheet.paste(tile, (x, y))
        d.text((x, y + tile_size + 12), scene['title'], fill='#e4e1da', font=font(27, True))
    sheet.save(OUT / filename, optimize=True)

contact(1, 'collection.png', 'Studies in periodic motion.')
contact(2, 'collection-02.png', 'Eight unfamiliar worlds.')
contact(3, 'collection-03.png', 'Structures beyond the surface.')
if any(s.get('collection') == 4 for s in CATALOG):
    contact(4, 'collection-04.png', 'Loop atelier')
if '--contact-only' in sys.argv:
    print('All collection contact sheets generated.')
    raise SystemExit(0)

files = [ROOT / name for name in ['README.md', 'PLAN.md', 'index.html', 'package.json', 'package-lock.json', '.gitignore', '.gitattributes']]
for name in ['.github', 'src', 'scripts', 'tests', 'docs', 'examples']:
    files.extend(p for p in (ROOT / name).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['stills', 'loops', 'thumbnails']:
    files.extend(p for p in (OUT / name).rglob('*') if p.is_file())
files.extend(OUT / name for name in ['loop-atelier.html', 'gallery.html', 'collection.png', 'collection-02.png', 'collection-03.png', 'catalog.json', 'validation-assets.json'])
if any(s.get('collection') == 4 for s in CATALOG):
    files.append(OUT / 'collection-04.png')
qa_names = ['motion-contact.png', 'browser-results.json', 'context-diagnostics.json',
            'geometry-performance.json', 'desktop-1440.png', 'mobile-390.png', 'mobile-320.png',
            'context-restored.png', 'package-qa.json', 'sampling-quality.json', 'video-appearance.json']
qa_names += ['edition-ui.json', 'edition-source-320.png', 'edition-standalone-320.png']
qa_names += ['inline-final.json', 'inline-final-320.png', 'inline-final-760.png', 'descent-preview.json', 'descent-preview-180k.png']
qa_names += ['video-appearance.new.json', '03/shader-checks.json', '03/space-numeric.json', '03/cold-start.json', '03/space-pair-optimization.json']
qa_names += ['03/composition-review.json', '03/independent-motion-qa.json']
qa_names += ['03/unit-tests.txt']
qa_names += ['export-headless-benchmark.json', 'exporter-2.1-edge-check.json', '03/cold-start-original-failure.json']
qa_names += ['exporter-2.1-bundled-runtime.png', 'exporter-2.1-bundled-runtime.png.manifest.json']
qa_names += ['03/caustic/quadrature-comparison.json', '03/caustic/optimization-source-variants.json',
             '03/caustic/optimization-benchmark-expanded-gauss224.json', '03/caustic/quadrature-rules.json']
qa_names += ['03/final-movie-contact.png']
qa_names += [f'03/{scene["id"]}/motion.webp' for scene in CATALOG if scene.get('collection') == 3]
qa_names += ['clean-studio-check.json', '04/shader-checks.json', '04/unit-tests.txt', '04/video-appearance.json', '03/video-appearance.json']
qa_names += [f'clean-studio-{surface}-{width}.png' for surface in ['source', 'standalone'] for width in [320, 760, 1280]]
qa_names += [f'clean-sources-{surface}-320.png' for surface in ['source', 'standalone']]
qa_names += ['clean-default-check.json']
qa_names += [f'clean-studio-default-{surface}-{width}.png' for surface in ['source', 'standalone'] for width in [320, 1280]]
qa_names += ['04/final-movie-contact.png']
qa_names += ['04/decoded-geometry-review.png', '04/decoded-fields-review.png']
files.extend(OUT / 'qa' / name for name in qa_names if (OUT / 'qa' / name).exists())
# New mathematical evidence stays together; large per-frame proof rasters are
# omitted because the publication movies and motion proofs are included.
for evidence_dir in ['04', '04-mathematics']:
    four = OUT / 'qa' / evidence_dir
    if four.exists():
        files.extend(p for p in four.rglob('*') if p.is_file() and p.suffix in ['.json', '.md', '.webp'] and p not in files)
missing = [str(p.relative_to(ROOT)) for p in files if not p.is_file()]
if missing:
    raise SystemExit('Incomplete delivery: ' + ', '.join(missing))
checksums = {p.relative_to(ROOT).as_posix(): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in sorted(files)}
(OUT / 'checksums.json').write_text(json.dumps(checksums, indent=2) + '\n', encoding='utf-8')
files.append(OUT / 'checksums.json')
archive = OUT / 'loop-atelier-toolkit.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, p.relative_to(ROOT))
with zipfile.ZipFile(archive) as z:
    bad = z.testzip()
    if bad:
        raise RuntimeError('Archive validation failed: ' + bad)
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'files': len(files), 'integrity': 'passed'}))
