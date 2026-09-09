"""Create inspectable motion proofs from finished publication movies.

Requires Pillow, NumPy and imageio-ffmpeg. By default, selects the newest
collection in output/catalog.json. No source rendering is involved.
"""
import argparse
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--collection', type=int)
args = parser.parse_args()
catalog = json.loads((OUT / 'catalog.json').read_text(encoding='utf-8'))
edition = args.collection or max(s.get('collection', 1) for s in catalog)
scenes = [s for s in catalog if s.get('collection', 1) == edition]
if not scenes:
    raise SystemExit('No studies in the selected collection.')
directory = OUT / 'qa' / f'{edition:02d}'
directory.mkdir(parents=True, exist_ok=True)
phases = [0, .15, .30, .50, .70, .85]
size, fps = 384, 10
contact = Image.new('RGB', (6 * size, len(scenes) * (size + 40)), '#101113')
draw = ImageDraw.Draw(contact)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 21) if Path('C:/Windows/Fonts/segoeui.ttf').exists() else ImageFont.load_default(size=21)
reports = []
for row, scene in enumerate(scenes):
    movie = OUT / 'loops' / f'{scene["id"]}.mp4'
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-xerror', '-i', str(movie),
                          '-vf', f'fps={fps},scale={size}:{size}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         check=True, capture_output=True).stdout
    pixels = np.frombuffer(raw, dtype=np.uint8).reshape((-1, size, size, 3))
    expected = round(scene['duration'] * fps)
    if len(pixels) != expected:
        raise RuntimeError(f'{scene["id"]}: decoded {len(pixels)} frames, expected {expected}')
    frames = [Image.fromarray(p) for p in pixels]
    dest = directory / scene['id']
    dest.mkdir(exist_ok=True)
    frames[0].save(dest / 'motion.webp', save_all=True, append_images=frames[1:], duration=1000 // fps, loop=0, quality=87, method=4)
    diffs = np.array([np.abs(pixels[(i + 1) % len(pixels)].astype(np.int16) - p.astype(np.int16)).mean() for i, p in enumerate(pixels)])
    reports.append({'scene': scene['id'], 'source': str(movie.relative_to(ROOT)), 'frames': len(frames), 'fps': fps,
                    'size': size, 'adjacentMAEMedian': float(np.median(diffs[:-1])), 'adjacentMAE95': float(np.quantile(diffs[:-1], .95)),
                    'wrapMAE': float(diffs[-1]), 'wrapRelativeTo95': float(diffs[-1] / max(np.quantile(diffs[:-1], .95), 1e-6))})
    for col, phase in enumerate(phases):
        x, y = col * size, row * (size + 40)
        contact.paste(frames[round(phase * len(frames))], (x, y))
        draw.text((x + 7, y + size + 5), f'{scene["title"]}  {phase:.2f}', fill='#c5c6c2', font=font)
    print(scene['id'] + ': decoded proof complete', flush=True)
contact.save(directory / 'final-movie-contact.png', optimize=True)
(directory / 'decoded-motion.json').write_text(json.dumps(reports, indent=2) + '\n', encoding='utf-8')
