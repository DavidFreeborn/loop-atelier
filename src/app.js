import { SCENES, createScene } from './scenes.js';
import { LoopRenderer, wrap, VERSION } from './renderer.js';

const $=id=>document.getElementById(id);
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const defaults={scene:'hyperbolic',seed:42,variation:.5,exposure:1,duration:SCENES.find(s=>s.id==='hyperbolic').duration,count:180000,palette:'native',time:.15};
let state={...defaults};
let playing=!reducedMotion.matches && !new URLSearchParams(location.search).has('export'), scene, renderer, lastTime=0, dirty=true, guideOpen=false, exportBusy=false;
let captureCanvas, captureRenderer, captureScene, captureKey='';
let movingAverage=0, measuredFrames=0;

function metadata(id=state.scene) { return SCENES.find(s=>s.id===id); }
function resizeArtwork() {
  if(!renderer)return;
  const shader=metadata()?.kind==='shader';
  const size=Math.max(320,Math.min(shader?1000:1400,Math.round($('art-canvas').getBoundingClientRect().width*Math.min(devicePixelRatio,shader?1.2:1.6))));
  renderer.resize(size);dirty=true;
}
function announce(message) { $('status').textContent=message; $('error-message').hidden=true; }
function showError(message) { $('error-message').textContent=message; $('error-message').hidden=false; }
function fail(error) { showError(error.message || String(error)); console.error(error); }
function updatePlayback() {
  $('play-icon').textContent=playing?'Ⅱ':'▶';
  $('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');
  if(metadata()) $('art-canvas').setAttribute('aria-label',`${metadata().title}. ${metadata().description} ${playing?'Animated':'Paused'} generative study; use the playback and phase controls below.`);
}
function syncControls() {
  $('variation').value=Math.round(state.variation*100); $('variation-value').value=`${Math.round(state.variation*100)}%`;
  $('exposure').value=Math.round(state.exposure*100); $('exposure-value').value=state.exposure.toFixed(2);
  $('duration').value=state.duration; $('duration-value').value=`${state.duration} s`;
  $('seed').value=state.seed; $('density').value=state.count; $('palette').value=state.palette;
  $('timeline').value=Math.round(state.time*1000); $('phase-display').value=state.time.toFixed(3);
  updatePlayback();
}
function setScene(id,{reset=true}={}) {
  const meta=metadata(id);
  if(!meta) throw new Error('Unknown study.');
  state.scene=id;
  if(reset) { state={...defaults,scene:id,duration:meta.duration,count:meta.previewCount||defaults.count,palette:meta.palette||'silver'}; }
  scene=createScene(id,state);
  $('scene-select').value=id;
  $('technique-description').textContent=meta.technique; $('formula').textContent=meta.formula;
  $('art-canvas').setAttribute('aria-label',`${meta.title}. ${meta.description} ${playing?'Animated':'Paused'} generative study; use the playback and phase controls below.`);
  $('density').closest('div').hidden=meta.kind==='shader';
  resizeArtwork();
  syncControls(); dirty=true;
}
function rebuild() { scene=createScene(state.scene,state); dirty=true; }
function draw() {
  if(!renderer) return;
  const meta=metadata();
  renderer.render(scene,state.time,{...state,camera:meta.camera,pointSize:meta.pointSize,exposure:state.exposure*meta.exposure,samples:1});
}
function frame(now) {
  if(!lastTime) lastTime=now;
  const elapsed=Math.min(.1,(now-lastTime)/1000); lastTime=now;
  if(!document.hidden && !guideOpen && !exportBusy && renderer && (playing||dirty)) {
    if(playing) state.time=wrap(state.time+elapsed/state.duration);
    const started=performance.now(); draw();
    movingAverage=movingAverage ? .95*movingAverage+.05*(performance.now()-started) : performance.now()-started;
    measuredFrames++;
    $('timeline').value=Math.round(state.time*1000); $('phase-display').value=state.time.toFixed(3); dirty=false;
  }
  requestAnimationFrame(frame);
}
function download(blob,filename) {
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download=filename;
  document.body.appendChild(a); a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function recipe() { return {schema:'loop-atelier/recipe',version:1,engine:VERSION,...state}; }
function validateRecipe(value) {
  if(!value || typeof value!=='object' || value.schema!=='loop-atelier/recipe' || value.version!==1) throw new Error('Choose a Loop Atelier version 1 recipe JSON file.');
  if(!SCENES.some(s=>s.id===value.scene)) throw new Error('This recipe names an unknown study.');
  const ranges={seed:[0,4294967295],variation:[0,1],exposure:[.35,2.5],duration:[3,16],count:[60000,360000],time:[0,1]};
  for(const [key,[min,max]] of Object.entries(ranges)) if(typeof value[key]!=='number'||!Number.isFinite(value[key])||value[key]<min||value[key]>max) throw new Error(`Recipe ${key} must be between ${min} and ${max}.`);
  if(!Number.isInteger(value.seed)||!Number.isInteger(value.duration)||![60000,180000,360000].includes(value.count)) throw new Error('Recipe seed and duration must be integers; use one of the studio particle counts.');
  if(!['silver','amber','paper','native'].includes(value.palette)) throw new Error('Unknown recipe palette.');
  return Object.fromEntries(Object.keys(defaults).map(k=>[k,value[k]]));
}

/** Deterministic API used by the offline renderer. Returns a lossless PNG. */
function capture(options={}) {
  const o={...defaults,count:360000,size:1920,samples:8,shutter:.65,fps:30,...options};
  const meta=metadata(o.scene); if(!meta) throw new Error('Unknown capture scene.');
  if(options.duration===undefined) o.duration=meta.duration;
  if(options.palette===undefined) o.palette=meta.palette||'silver';
  for(const key of ['size','samples','fps','duration','shutter','exposure','count','seed','variation','time']) if(!Number.isFinite(o[key])) throw new Error(`Invalid capture ${key}.`);
  if(o.size<64||o.size>8192||!Number.isInteger(o.size)||o.count<100||o.count>1000000||!Number.isInteger(o.count)||o.samples<1||o.samples>64||o.fps<=0||o.duration<=0||o.shutter<0||o.shutter>1||o.variation<0||o.variation>1||o.exposure<=0) throw new Error('Capture settings are outside the supported range.');
  if(!['silver','amber','paper','native'].includes(o.palette)) throw new Error('Unknown capture palette.');
  if(!captureRenderer) {captureCanvas=document.createElement('canvas'); captureRenderer=new LoopRenderer(captureCanvas);}
  if(!captureRenderer.hdr) throw new Error('Publication export requires floating-point graphics. Please use a browser and device supporting EXT_color_buffer_float.');
  const key=`${o.scene}/${o.seed}/${o.count}`;
  if(key!==captureKey) {captureScene=createScene(o.scene,o);captureKey=key;}
  captureRenderer.resize(o.size);
  if(captureRenderer.size!==o.size) throw new Error('Requested resolution exceeds this graphics device’s maximum texture size.');
  captureRenderer.render(captureScene,o.time,{...o,camera:meta.camera,pointSize:meta.pointSize,exposure:o.exposure*meta.exposure});
  if(captureRenderer.gl.isContextLost()) {captureRenderer=null;captureKey='';throw new Error('The graphics context was interrupted during export. Try again, or use a smaller output size.');}
  const result=captureCanvas.toDataURL('image/png');
  if(!result.startsWith('data:image/png;base64,')) throw new Error('The graphics device could not capture this size.');
  return result;
}

try {
  renderer=new LoopRenderer($('art-canvas'));
  for(const meta of [...SCENES].sort((a,b)=>a.title.localeCompare(b.title,'en'))) {
    const option=document.createElement('option');option.value=meta.id;option.textContent=meta.title;
    $('scene-select').appendChild(option);
  }
  $('scene-select').addEventListener('change',()=>{setScene($('scene-select').value);announce(`${metadata().title} selected.`);});
  setScene(defaults.scene);
  const observer=new ResizeObserver(resizeArtwork); observer.observe($('art-canvas').parentElement);
  $('art-canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();playing=false;renderer=null;updatePlayback();$('canvas-error').hidden=false;$('canvas-error').textContent='The graphics device was interrupted. Restoring the artwork…';announce('Playback paused while the graphics device recovers.');});
  $('art-canvas').addEventListener('webglcontextrestored',()=>{try{renderer=new LoopRenderer($('art-canvas'));dirty=true;$('canvas-error').hidden=true;announce('Artwork restored. Press play to continue.');}catch(error){$('canvas-error').textContent=error.message;fail(error);}});
  $('play').addEventListener('click',()=>{playing=!playing;updatePlayback();});
  $('timeline').addEventListener('input',()=>{playing=false;state.time=Number($('timeline').value)/1000;updatePlayback();dirty=true;});
  for(const [id,key,scale] of [['variation','variation',.01],['exposure','exposure',.01],['duration','duration',1]]) $(id).addEventListener('input',()=>{state[key]=Number($(id).value)*scale;syncControls();dirty=true;});
  $('seed').addEventListener('change',()=>{const n=Number($('seed').value);if(!Number.isInteger(n)||n<0||n>4294967295){$('seed').value=state.seed;showError('Seed must be an integer from 0 to 4,294,967,295.');return;}state.seed=n;rebuild();announce(`Seed ${n}.`);});
  $('new-seed').addEventListener('click',()=>{state.seed=crypto.getRandomValues(new Uint32Array(1))[0];$('seed').value=state.seed;rebuild();announce(`Seed ${state.seed}.`);});
  $('density').addEventListener('change',()=>{state.count=Number($('density').value);rebuild();});
  $('palette').addEventListener('change',()=>{state.palette=$('palette').value;dirty=true;});
  $('reset').addEventListener('click',()=>{setScene(state.scene);announce('Curated study restored.');});
  $('save-preset').addEventListener('click',()=>{download(new Blob([JSON.stringify(recipe(),null,2)+'\n'],{type:'application/json'}),`${state.scene}-${state.seed}.recipe.json`);announce('Recipe saved, including the selected phase.');});
  $('load-preset').addEventListener('click',()=>$('preset-file').click());
  $('preset-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>100000)throw new Error('Recipe file is too large.');const next=validateRecipe(JSON.parse(await file.text()));state=next;playing=false;setScene(state.scene,{reset:false});announce('Recipe loaded. Press play to animate.');}catch(error){fail(error);}finally{e.target.value='';}});
  $('export-png').addEventListener('click',async()=>{
    if(exportBusy)return; exportBusy=true;$('export-png').disabled=true;announce('Rendering a lossless still…');
    const captured={...state};
    try{await new Promise(r=>setTimeout(r,40));const url=capture({...captured,size:Number($('export-size').value),samples:Number($('samples').value),shutter:Number($('shutter').value)});const raw=atob(url.split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));download(new Blob([bytes],{type:'image/png'}),`${captured.scene}-${captured.seed}-${captured.time.toFixed(3)}.png`);announce(`${$('export-size').value} px still saved at phase ${captured.time.toFixed(3)}.`);}catch(error){fail(error);}finally{exportBusy=false;$('export-png').disabled=false;}
  });
  function changeView(showGuide,writeHash=true) {guideOpen=showGuide;$('studio-view').hidden=showGuide;$('guide-view').hidden=!showGuide;$('studio-tab').classList.toggle('active',!showGuide);$('guide-tab').classList.toggle('active',showGuide);$('studio-tab').setAttribute('aria-pressed',String(!showGuide));$('guide-tab').setAttribute('aria-pressed',String(showGuide));if(writeHash){const next=location.href.split('#')[0]+(showGuide?'#sources':'');history.replaceState(null,'',next);}dirty=true;}
  $('studio-tab').addEventListener('click',()=>changeView(false));$('guide-tab').addEventListener('click',()=>changeView(true));document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();changeView(false);});
  window.addEventListener('hashchange',()=>changeView(location.hash==='#sources',false));
  if(location.hash==='#sources')changeView(true,false);
  $('art-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('art-canvas').parentElement.requestFullscreen();}catch{showError('Fullscreen is unavailable here. Open the standalone studio in your browser.');}});
  document.addEventListener('fullscreenchange',()=>{$('art-fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit artwork fullscreen':'Enter artwork fullscreen');});
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!guideOpen&&!['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY','A'].includes(document.activeElement.tagName)){e.preventDefault();playing=!playing;updatePlayback();}});
  document.addEventListener('visibilitychange',()=>{lastTime=0;dirty=true;});
  reducedMotion.addEventListener('change',e=>{if(e.matches){playing=false;updatePlayback();}});
  if(reducedMotion.matches)announce('Motion is paused to respect your reduced-motion preference.');
  else if(!renderer.hdr)announce('Standard precision rendering; use a device with floating-point graphics for final masters.');
  window.loopStudio={ready:true,version:VERSION,defaults:{count:360000},capture,getState:()=>({...state,playing}),getRecipe:recipe,loadRecipe:v=>{state=validateRecipe(v);playing=false;setScene(state.scene,{reset:false});},selectScene:id=>setScene(id),pause:()=>{playing=false;updatePlayback();},play:()=>{playing=true;updatePlayback();},setPhase:t=>{if(!Number.isFinite(t))throw new Error('Phase must be finite.');state.time=wrap(t);dirty=true;},getStats:()=>({cpuRenderMs:movingAverage,measuredFrames,hdr:renderer?.hdr ?? null,displaySize:renderer?.size ?? null,contextLost:!renderer || renderer.gl.isContextLost(),renderer:renderer?.gl.getParameter(renderer.gl.RENDERER) ?? null}),scenes:SCENES};
  draw();requestAnimationFrame(frame);
} catch(error) {
  $('canvas-error').hidden=false;$('canvas-error').textContent=error.message;
  window.loopStudio={ready:false,error:error.message};fail(error);
}
