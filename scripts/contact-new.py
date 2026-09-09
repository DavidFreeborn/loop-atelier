"""Contact sheets for new study art direction; optional scene ids."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
catalog = json.loads((root/'output/catalog.json').read_text(encoding='utf-8'))
scenes = [s for s in catalog if s.get('collection') == 2 and (not sys.argv[1:] or s['id'] in sys.argv[1:])]
font_path = next((p for p in ['C:/Windows/Fonts/segoeui.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).is_file()), None)
font = ImageFont.truetype(font_path,22) if font_path else ImageFont.load_default(size=22)
for s in scenes:
    sheet = Image.new('RGB',(1540,574),'#101113')
    d = ImageDraw.Draw(sheet)
    for k,t in enumerate([.15,.4,.7]):
        with Image.open(root/f'output/qa/new/{s["id"]}-{t}.png') as im:
            sheet.paste(im.convert('RGB').resize((500,500),Image.Resampling.LANCZOS),(10+k*510,58))
        d.text((16+k*510,16),f'{s["title"]} / {t:.2f}',font=font,fill='#ddd9cf')
    sheet.save(root/f'output/qa/new/{s["id"]}-contact.png')
print('Contact sheets complete.')
