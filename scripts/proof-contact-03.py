from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'output/catalog.json').read_text(encoding='utf8'))
font_path=next((p for p in ['C:/Windows/Fonts/segoeui.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).is_file()),None)
font=ImageFont.truetype(font_path,20) if font_path else ImageFont.load_default(size=20)
scenes=[s for s in catalog if s.get('collection')==3]
for s in scenes:
    directory=root/'output/qa/03'/s['id']
    paths=list(directory.glob('proof-*.png'))
    if not paths: continue
    sheet=Image.new('RGB',(1500,1044),'#101113');d=ImageDraw.Draw(sheet)
    for i,p in enumerate(paths):
        im=Image.open(p).convert('RGB').resize((490,490),Image.Resampling.LANCZOS)
        x=(i%3)*500;y=(i//3)*522
        sheet.paste(im,(x,y));d.text((x+8,y+493),f"{s['title']} / phase {[0,.15,.3,.5,.7,.85][i]}",font=font,fill='#dfddd5')
    sheet.save(directory/'contact.png')
    frames=[Image.open(p).convert('RGB') for p in sorted(directory.glob('frame-*.png'))]
    if frames:
        frames[0].save(directory/'motion.webp',save_all=True,append_images=frames[1:],duration=round(s['duration']*1000/len(frames)),loop=0,quality=85)
print('Proof contacts and motion previews written.')
