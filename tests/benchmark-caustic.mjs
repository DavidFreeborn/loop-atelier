/** Compare preserved Caustic source against mathematically equivalent paired rules. */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { COMPLEX_SHADERS } from '../src/shaders-fields.js';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const source = COMPLEX_SHADERS.find(s => s.id === 'caustic').source;
const start = source.indexOf('  // Fixed, independent quadrature:');
const end = source.indexOf('  float angle=', start);
if(start<0 || end<0) throw new Error('The preserved baseline quadrature was not found.');
const variants = [{ id: 'baseline-midpoint256', source }];
for(const n of [192,224,256]) {
  const values=[];
  for(let i=n/2;i<n;i++) {
    const s=-1.7+(i+.5)*3.4/n;
    const weight=(1+Math.cos(Math.PI*s/1.7))*3.4/n;
    values.push(`vec4(${s.toPrecision(12)},${(.5*s*s).toPrecision(12)},${(.25*s**4).toPrecision(12)},${weight.toPrecision(12)})`);
  }
  const constant=`const vec4 CAUSTIC_RULE[${n/2}]=vec4[${n/2}](\n${values.join(',\n')}\n);\n`;
  const loop=`  // Pair the even aperture at ±s: 2w exp(i evenPhase) cos(oddPhase).\n  for(int i=0;i<${n/2};i++) {\n    vec4 v=CAUSTIC_RULE[i];\n    waveA+=v.w*phaseUnit(k*(v.z+first.x*v.y))*cos(k*first.y*v.x);\n    waveB+=v.w*phaseUnit(k*(v.z+second.x*v.y))*cos(k*second.y*v.x);\n  }\n`;
  variants.push({ id:`paired-midpoint${n}`, source:constant+source.slice(0,start)+loop+source.slice(end) });
}
const rule=JSON.parse(await readFile('output/qa/03/caustic/quadrature-rules.json','utf8'))['224'];
const values=rule.nodes.map((s,i)=>`vec4(${s.toPrecision(12)},${(.5*s*s).toPrecision(12)},${(.25*s**4).toPrecision(12)},${rule.weights[i].toPrecision(12)})`);
const constant=`const vec4 CAUSTIC_RULE[112]=vec4[112](\n${values.join(',\n')}\n);\n`;
const loop=`  // Paired 224-node Gauss–Legendre rule with its Hann aperture precomputed.\n  for(int i=0;i<112;i++) {\n    vec4 v=CAUSTIC_RULE[i];\n    waveA+=v.w*phaseUnit(k*(v.z+first.x*v.y))*cos(k*first.y*v.x);\n    waveB+=v.w*phaseUnit(k*(v.z+second.x*v.y))*cos(k*second.y*v.x);\n  }\n`;
variants.push({id:'paired-gauss224',source:constant+source.slice(0,start)+loop+source.slice(end)});
const expanded=rule.nodes.map((s,i)=>{
  const weight=rule.weights[i].toPrecision(12), squared=(.5*s*s).toPrecision(12), quartic=(.25*s**4).toPrecision(12), node=s.toPrecision(12);
  return `  waveA+=${weight}*phaseUnit(k*(${quartic}+first.x*${squared}))*cos(k*first.y*${node});\n  waveB+=${weight}*phaseUnit(k*(${quartic}+second.x*${squared}))*cos(k*second.y*${node});`;
}).join('\n');
variants.push({id:'expanded-gauss224',source:source.slice(0,start)+'  // Expanded symmetric Gaussian quadrature.\n'+expanded+'\n'+source.slice(end)});
await writeFile('output/qa/03/caustic/optimization-source-variants.json',JSON.stringify(variants,null,2));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/?export=1');
  const result=await page.evaluate(async variants=>{
    const {LoopRenderer}=await import('/src/renderer.js');
    const canvas=document.createElement('canvas');canvas.width=1440;
    const renderer=new LoopRenderer(canvas), gl=renderer.gl;
    const options={samples:8,duration:12,fps:30,shutter:.65,palette:'native',variation:.5};
    const results=[];let baseline;
    for(const variant of variants) {
      const scene={kind:'shader',source:variant.source,seed:601.1037519201636};
      renderer.render(scene,.5,{...options,samples:1});gl.finish();
      const pixels=new Uint8Array(1440*1440*4);gl.readPixels(0,0,1440,1440,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      const times=[];
      for(let repeat=0;repeat<2;repeat++) {
        const begun=performance.now();renderer.render(scene,.5,options);gl.readPixels(0,0,1440,1440,gl.RGBA,gl.UNSIGNED_BYTE,pixels);times.push(performance.now()-begun);
      }
      if(!baseline) baseline=pixels;
      let sum=0,maximum=0,over2=0;
      for(let i=0;i<pixels.length;i++)if(i%4!==3){const d=Math.abs(pixels[i]-baseline[i]);sum+=d;maximum=Math.max(maximum,d);if(d>2)over2++;}
      results.push({id:variant.id,timesMs:times,meanByteDifference:sum/(1440*1440*3),maximumByteDifference:maximum,fractionChannelsOver2:over2/(1440*1440*3),glError:gl.getError()});
    }
    renderer.dispose();return results;
  },process.env.CAUSTIC_RULES?variants.filter(v=>v.id==='baseline-midpoint256'||v.id===process.env.CAUSTIC_RULES):variants);
  await writeFile(`output/qa/03/caustic/optimization-benchmark${process.env.CAUSTIC_RULES?'-'+process.env.CAUSTIC_RULES:''}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
