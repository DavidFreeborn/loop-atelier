"""Summarize the captured temporal-sampling comparisons quantitatively."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[1]
parameters = json.loads((root/'output/qa/sampling/parameters.json').read_text(encoding='utf-8'))
results = []
for p in parameters:
    arrays = []
    for samples in [8,16]:
        with Image.open(root/f'output/qa/sampling/{p["scene"]}-{samples}.png') as im:
            arrays.append(np.asarray(im.convert('RGB'),dtype=np.float32))
    difference = np.abs(arrays[0]-arrays[1])
    results.append({'scene':p['scene'],'phase':p['time'],'mean_absolute_byte_difference':float(difference.mean()),'p99_byte_difference':float(np.quantile(difference,.99))})
report = {'method':'8 versus 16 centred shutter samples at the selected phase, 900px, 360,000 particles. Byte differences after tone mapping; not a formal bound over the full loop.','results':results}
(root/'output/qa/sampling-quality.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
