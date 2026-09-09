"""Contact sheets and full-cycle temporal evidence for the three shader studies."""
from pathlib import Path
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw
import imageio_ffmpeg

root = Path('output/qa/04-mathematics')
report = {}
for scene in ['hyperbolic', 'phason', 'vortices']:
    directory = root / scene
    files = sorted(directory.glob('frame-*.png'))
    assert len(files) == 120, f'{scene}: expected all 120 motion-proof frames'
    frames = [np.asarray(Image.open(p).convert('RGB'), dtype=np.int16) for p in files]
    differences = np.array([np.abs(frames[(i+1) % 120] - frames[i]).mean() for i in range(120)])
    means = np.array([f.mean() for f in frames])
    report[scene] = {
        'frames': len(frames), 'resolution': [480,480], 'fps': 10, 'duration': 12,
        'adjacent_mae_median': float(np.median(differences)),
        'adjacent_mae_maximum': float(differences.max()),
        'largest_change_frame': int(differences.argmax()),
        'wrap_mae': float(differences[-1]),
        'wrap_relative_to_median': float(differences[-1] / np.median(differences)),
        'mean_brightness_minimum': float(means.min()), 'mean_brightness_maximum': float(means.max()),
    }
    assert differences[-1] < 1.8 * np.quantile(differences[:-1], .95), f'{scene}: anomalous wrap'
    contact = Image.new('RGB', (1200, 872), '#081018')
    draw = ImageDraw.Draw(contact)
    for j, i in enumerate(range(0,120,5)):
        im = Image.open(files[i]).convert('RGB').resize((198,198),Image.Resampling.LANCZOS)
        x,y=(j%6)*200,(j//6)*218
        contact.paste(im,(x,y));draw.text((x+6,y+201),f'{scene}  {i/120:.3f}',fill='#b8c7c7')
    contact.save(directory/'motion-contact.jpg',quality=94)
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-framerate','10','-i',str(directory/'frame-%03d.png'),
                    '-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(directory/'motion-proof.mp4')],check=True)
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-xerror','-i',str(directory/'motion-proof.mp4'),'-f','null','-'],check=True)

(root/'motion-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
