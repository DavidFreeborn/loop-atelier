"""Downsample publication stills for the studio. --draft permits QA proofs."""
from pathlib import Path
import json
import sys
from PIL import Image
root = Path(__file__).resolve().parents[1]
catalog = json.loads((root/'output/catalog.json').read_text(encoding='utf-8'))
destination = root/'output/thumbnails'
destination.mkdir(parents=True, exist_ok=True)
for s in catalog:
    source = root/f'output/stills/{s["id"]}.png'
    if not source.exists() and '--draft' in sys.argv:
        source = root/f'output/qa/03/{s["id"]}/proof-001.png' if s.get('collection')==3 else root/f'output/qa/new/{s["id"]}-0.15.png'
    with Image.open(source) as im:
        im.convert('RGB').resize((240,240),Image.Resampling.LANCZOS).save(destination/f'{s["id"]}.png',optimize=True)
print(f'{len(catalog)} thumbnails generated from stills' + (' or explicitly permitted drafts.' if '--draft' in sys.argv else '.'))
