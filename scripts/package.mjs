/** Build a self-contained studio and an inline animated sampler from the source. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../src/scenes.js';
import { galleryHTML } from './gallery-template.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');
const clean=s=>s.replace(/^import .*?;\r?\n/gm,'').replace(/^export /gm,'');
const [html,css,baseSceneSource,rendererSource,appSource]=await Promise.all([read('index.html'),read('src/style.css'),read('src/scenes.js'),read('src/renderer.js'),read('src/app.js')]);
const modules=[['src/scenes-topology.js','TOPOLOGY_SCENES, TOPOLOGY_BUILDERS'],['src/scenes-fields.js','FIELD_SCENES, FIELD_BUILDERS'],['src/scenes-dynamics.js','DYNAMIC_SCENES, DYNAMIC_BUILDERS'],['src/shaders-space.js','SPACE_SHADERS'],['src/shaders-fields.js','COMPLEX_SHADERS'],['src/shaders-patterns.js','PATTERN_SHADERS'],['src/shaders-geometry-04.js','GEOMETRY_04_SHADERS'],['src/shaders-mathematics-04.js','MATHEMATICS_04_SHADERS']];
const moduleSource=await Promise.all(modules.map(async([file,names])=>`const {${names}}=(()=>{\n${clean(await read(file))}\nreturn {${names}};\n})();`));
const sceneSource=moduleSource.join('\n')+'\n'+clean(baseSceneSource);
const displayScenes=[...SCENES].sort((a,b)=>a.title.localeCompare(b.title));
const defaultScene=SCENES.some(s=>s.id==='hyperbolic')?'hyperbolic':'palimpsest';
const app=clean(appSource);
const bundled=`${clean(sceneSource)}\n${clean(rendererSource)}\n${app}`;
const standalone=html.replace('<link rel="stylesheet" href="src/style.css">',()=>`<style>\n${css}\n</style>`).replace('<script type="module" src="src/app.js"></script>',()=>`<script type="module">\n${bundled}\n</script>`);
await mkdir(path.join(root,'output'),{recursive:true});
await writeFile(path.join(root,'output/catalog.json'),JSON.stringify(SCENES,null,2)+'\n');
await writeFile(path.join(root,'output/loop-atelier.html'),standalone);

// Native controls retain offline playback, seeking and fullscreen.
await writeFile(path.join(root,'output/gallery.html'),galleryHTML(SCENES));

const inlinePath=process.argv[2];
if(inlinePath){
  const fragment=`<div id="loop-atelier-sampler">
  <div class="sampler-controls"><label class="form-label" for="sampler-select">Study</label><select class="form-select" id="sampler-select">${displayScenes.map(s=>`<option value="${s.id}"${s.id===defaultScene?' selected':''}>${s.title}</option>`).join('')}</select><button class="btn" id="sampler-play" type="button">Pause</button></div>
  <canvas id="sampler-art" role="img" aria-label="Original mathematical animation; choose a study, play or pause, and scrub through its cycle"></canvas>
  <div class="sampler-phase"><label class="form-label" for="sampler-phase">Phase</label><input class="form-range" id="sampler-phase" type="range" min="0" max="1000" value="150"><output class="text-small tabular-nums" for="sampler-phase" id="sampler-value">0.150</output></div>
  <p class="sr-only" id="sampler-status" role="status" aria-live="polite"></p>
</div>
<style>#loop-atelier-sampler .sampler-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}#loop-atelier-sampler .sampler-controls label{margin:0}#loop-atelier-sampler select{width:auto;flex:1;min-width:110px}#loop-atelier-sampler canvas{display:block;width:100%;aspect-ratio:1}#loop-atelier-sampler .sampler-phase{display:flex;gap:12px;align-items:center;margin-top:12px}#loop-atelier-sampler .sampler-phase label{margin:0}#loop-atelier-sampler .sampler-phase input{flex:1;min-width:50px}#loop-atelier-sampler .sampler-phase output{min-width:42px}</style>
<script>(()=>{
${clean(sceneSource)}
${clean(rendererSource)}
const root=document.getElementById('loop-atelier-sampler');
const c=root.querySelector('canvas'),select=root.querySelector('select'),button=root.querySelector('button'),slider=root.querySelector('input'),value=root.querySelector('output');
let r,scene,meta=SCENES.find(s=>s.id===select.value),phase=.15,last=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,visible=true,dirty=true;
function toggle(){button.textContent=playing?'Pause':'Play';}toggle();
try{r=new LoopRenderer(c);scene=createScene(meta.id,{count:meta.previewCount||180000});}catch(e){root.querySelector('#sampler-status').className='';root.querySelector('#sampler-status').textContent=e.message;return;}
function resizeSampler(){const field=meta.kind==='shader';r.resize(Math.max(320,Math.min(field?900:1200,Math.round(c.clientWidth*Math.min(devicePixelRatio,field?1.2:1.5)))));dirty=true;}
new ResizeObserver(resizeSampler).observe(c);
new IntersectionObserver(es=>{const entry=es[es.length-1];if(!entry)return;visible=entry.isIntersecting;last=0;if(visible)dirty=true;},{threshold:.05}).observe(c);
select.addEventListener('change',()=>{meta=SCENES.find(x=>x.id===select.value);scene=createScene(meta.id,{count:meta.previewCount||180000});phase=.15;resizeSampler();dirty=true;c.setAttribute('aria-label',meta.title+'. '+meta.description);root.querySelector('#sampler-status').textContent=meta.title+' selected.';});
button.addEventListener('click',()=>{playing=!playing;toggle();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){playing=false;toggle();}});
slider.addEventListener('input',()=>{playing=false;toggle();phase=Number(slider.value)/1000;dirty=true;});
function tick(now){if(!root.isConnected){r.dispose();return;}let dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(visible&&!document.hidden&&(playing||dirty)){if(playing)phase=wrap(phase+dt/meta.duration);r.render(scene,phase,{camera:meta.camera,pointSize:meta.pointSize,exposure:meta.exposure,variation:.5,palette:meta.palette||'silver'});slider.value=Math.round(phase*1000);value.value=phase.toFixed(3);dirty=false;}requestAnimationFrame(tick);}requestAnimationFrame(tick);
c.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;toggle();root.querySelector('#sampler-status').className='text-small';root.querySelector('#sampler-status').textContent='Graphics interrupted. Restoring the study…';});
c.addEventListener('webglcontextrestored',()=>{r=new LoopRenderer(c);dirty=true;root.querySelector('#sampler-status').className='sr-only';root.querySelector('#sampler-status').textContent='Study restored. Press play to continue.';});
})();</script>`;
  await mkdir(path.dirname(inlinePath),{recursive:true});await writeFile(inlinePath,fragment);
  console.log(`Inline sampler: ${inlinePath} (${Buffer.byteLength(fragment)} bytes)`);
}
console.log(`Standalone studio: ${path.join(root,'output/loop-atelier.html')} (${Buffer.byteLength(standalone)} bytes)`);
