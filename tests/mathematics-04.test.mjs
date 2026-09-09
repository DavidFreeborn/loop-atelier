/** Mathematical invariants plus actual, unwrapped GLSL evaluation on Chromium. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {MATHEMATICS_04_SHADERS} from '../src/shaders-mathematics-04.js';

const TAU=2*Math.PI, dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const scale=(a,k)=>[a[0]*k,a[1]*k], cis=a=>[Math.cos(a),Math.sin(a)];
const conjugate=a=>[a[0],-a[1]], div=(a,b)=>scale(mul(a,conjugate(b)),1/dot(b,b));
const mobius=(z,a)=>div(sub(z,a),sub([1,0],mul(conjugate(a),z)));
const coshDistance=(a,b)=>1+2*dot(sub(a,b),sub(a,b))/((1-dot(a,a))*(1-dot(b,b)));
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const A=Math.PI/7,B=Math.PI/3,D=Math.sqrt(Math.cos(B)**2-Math.sin(A)**2);
const C=Math.cos(B)/D,R=Math.sin(A)/D;
const reflect=z=>add([C,0],scale(sub(z,[C,0]),R*R/dot(sub(z,[C,0]),sub(z,[C,0]))));

test('{7,3}: orthogonal sides, correct vertex angles, and Möbius metric invariance',()=>{
  near(C*C-R*R,1);
  const separation2=2*C*C*(1-Math.cos(TAU/7));
  near((separation2-2*R*R)/(2*R*R),Math.cos(2*Math.PI/3));
  for(let i=0;i<180;i++){
    const z=scale(cis(i*2.399963229728653),.91*Math.sqrt((i+.5)/180));
    const w=scale(cis(i*.913+.7),.71),a=scale(cis(i*.21),.62);
    assert.ok(dot(mobius(z,a),mobius(z,a))<1);
    near(coshDistance(z,w),coshDistance(mobius(z,a),mobius(w,a)),2e-9);
    near(coshDistance(z,w),coshDistance(reflect(z),reflect(w)),2e-9);
    const twice=reflect(reflect(z));near(twice[0],z[0]);near(twice[1],z[1]);
  }
});

test('Hyperbolic: the actual D7 fold uses the (2,3,7) triangle chamber, including odd q=3',()=>{
  const ray=(z,angle)=>mul(cis(2*angle),conjugate(z));
  // Pairwise products of the three side reflections have orders 7, 2 and 3.
  for(let i=0;i<60;i++){
    const original=scale(cis(i*2.399963229728653),.93*Math.sqrt((i+.5)/60));
    for(const [left,right,order]of[[z=>ray(z,0),z=>ray(z,A),7],[z=>ray(z,0),reflect,2],[z=>ray(z,A),reflect,3]]){
      let z=original;for(let j=0;j<order;j++)z=left(right(z));
      near(z[0],original[0],2e-9);near(z[1],original[1],2e-9);
    }
  }
  const vertexRadius=C*Math.cos(A)-Math.sqrt(C*C*Math.cos(A)**2-1),vertex=scale(cis(A),vertexRadius);
  const adjacent=z=>mul(cis(2*A),reflect(mul(cis(-2*A),z)));
  const walls=Array.from({length:7},(_,j)=>scale(cis(TAU*j/7),C));
  const inside=z=>walls.every(c=>dot(sub(z,c),sub(z,c))>=R*R-1e-12);
  const wallDistance=z=>Math.min(...walls.map(c=>Math.abs(Math.asinh((dot(sub(z,c),sub(z,c))-R*R)/(R*(1-dot(z,z)))))));
  const foldedDistance=point=>{
    let z=point;
    for(let j=0;j<36;j++){
      const sector=Math.floor((Math.atan2(z[1],z[0])+A)/(2*A));z=mul(z,cis(-sector*2*A));z[1]=Math.abs(z[1]);
      if(dot(sub(z,[C,0]),sub(z,[C,0]))>=R*R)break;z=reflect(z);
    }
    return Math.asinh((dot(sub(z,[C,0]),sub(z,[C,0]))-R*R)/(R*(1-dot(z,z))));
  };
  const ownership=[0,0,0];
  for(let i=0;i<720;i++){
    const p=add(vertex,scale(cis(TAU*(i+.271)/720),1e-5));
    const positions=[p,reflect(p),adjacent(p)],owners=positions.map(inside);
    assert.equal(owners.filter(Boolean).length,1,'three heptagons must meet without a gap or overlap');
    const owner=owners.indexOf(true);ownership[owner]++;
    near(foldedDistance(p),wallDistance(positions[owner]),1e-10);
  }
  for(const count of ownership)assert.ok(Math.abs(count-240)<=1,'each heptagon occupies 120 degrees at the vertex');
});

test('Hyperbolic: triangle-chamber folding terminates throughout the visible disk',t=>{
  let maximum=0;
  for(const variation of[0,.5,1])for(let i=0;i<12000;i++){
    const time=(i%37)/37,a=scale([Math.cos(TAU*time),.72*Math.sin(TAU*time)],.38+.24*variation);
    let z=mobius(scale(cis(i*2.399963229728653),.9999*Math.sqrt((i+.5)/12000)),a),n=0;
    for(;n<36;n++){
      const sector=Math.floor((Math.atan2(z[1],z[0])+A)/(2*A));
      z=mul(z,cis(-sector*2*A));z[1]=Math.abs(z[1]);
      const delta=sub(z,[C,0]);
      if(dot(delta,delta)>=R*R)break;
      z=reflect(z);
    }
    maximum=Math.max(maximum,n);
    assert.ok(n<36,`fold failed at sample ${i}, variation ${variation}`);
    assert.ok(Math.atan2(z[1],z[0])<=A+1e-9);
    assert.ok(dot(sub(z,[C,0]),sub(z,[C,0]))>=R*R-1e-9);
  }
  t.diagnostic(`36,000 visible-disk samples: maximum ${maximum} circle reflections`);
});

test('Phason: internal offsets preserve the zero-sum condition and are orthogonal to translations',()=>{
  const physical=Array.from({length:5},(_,j)=>cis(TAU*j/5));
  const internal=Array.from({length:5},(_,j)=>cis(2*TAU*j/5));
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)near(physical.reduce((s,v,j)=>s+v[a]*internal[j][b],0),0);
  near(internal.reduce((s,v)=>s+v[0],0),0);near(internal.reduce((s,v)=>s+v[1],0),0);
  const golden=(1+Math.sqrt(5))/2;
  for(let j=0;j<5;j++){
    const p=add(add(physical[j],physical[(j+4)%5]),physical[(j+1)%5]);
    const q=add(add(internal[j],internal[(j+4)%5]),internal[(j+1)%5]);
    for(let k=0;k<2;k++){near(p[k],golden*physical[j][k]);near(q[k],-internal[j][k]/golden);}
  }
});

test('Phason: exact dual rhombi have equal unit edges, two acute angles, and golden-ratio areas',()=>{
  const u=Array.from({length:5},(_,j)=>cis(TAU*j/5));
  const areas=[];
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
    const vertices=[[0,0],u[i],add(u[i],u[j]),u[j]];
    for(let k=0;k<4;k++)near(Math.hypot(...sub(vertices[(k+1)%4],vertices[k])),1);
    const angle=Math.acos(Math.abs(dot(u[i],u[j])));
    assert.ok(Math.min(Math.abs(angle-Math.PI/5),Math.abs(angle-2*Math.PI/5))<1e-10);
    areas.push(Math.abs(cross(u[i],u[j])));
  }
  near(Math.max(...areas)/Math.min(...areas),(1+Math.sqrt(5))/2);
});

const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function pentagridCover(x,phase,variation,soft=true,wide=false){
  const u=Array.from({length:5},(_,j)=>cis(TAU*j/5)),v=Array.from({length:5},(_,j)=>cis(2*TAU*j/5));
  const w=add([.137,.091],scale(cis(TAU*phase),.18+.35*variation)),gamma=v.map(e=>dot(e,w));
  let total=0,count=0;
  const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
    const determinant=cross(u[i],u[j]);
    const estimate=[Math.floor(.4*dot(u[i],x)+gamma[i]),Math.floor(.4*dot(u[j],x)+gamma[j])];
    for(let ni=wide?-1:0;ni<(wide?3:2);ni++)for(let nj=wide?-1:0;nj<(wide?3:2);nj++){
      const levels=add(estimate,[ni,nj]),grid=sub(levels,[gamma[i],gamma[j]]);
      const r=scale([grid[0]*u[j][1]-grid[1]*u[i][1],u[i][0]*grid[1]-u[j][0]*grid[0]],1/determinant);
      let base=add(scale(u[i],levels[0]),scale(u[j],levels[1]));const rest=[],blend=[];
      for(let k=0;k<5;k++)if(k!==i&&k!==j){
        const h=dot(u[k],r)+gamma[k],integer=Math.floor(h+.5);
        const derivative=sub(sub(v[k],scale(v[i],cross(u[k],u[j])/determinant)),scale(v[j],cross(u[i],u[k])/determinant));
        const width=.014*Math.hypot(...derivative);
        rest.push(u[k]);blend.push(soft?smooth((h-integer+width)/(2*width)):Number(h>=integer));base=add(base,scale(u[k],integer));
      }
      for(let state=0;state<8;state++){
        let b=base,weight=1;
        for(let k=0;k<3;k++){const bit=(state>>k)&1;b=add(b,scale(rest[k],bit));weight*=bit?blend[k]:1-blend[k];}
        if(weight<1e-12)continue;
        const d=sub(x,add(b,scale(add(u[i],u[j]),.5)));
        const local=[cross(d,u[j])/determinant,cross(u[i],d)/determinant];
        if(Math.max(...local.map(Math.abs))<.5-1e-10){total+=weight;count++;}
      }
    }
  }
  return {total,count};
}
test('Phason: exact dual tiles cover once; the bounded level search matches a wider reference',t=>{
  let worstPartition=0,maximumCandidates=0;
  for(let i=0;i<1100;i++){
    const x=[7.5*Math.sin(i*1.8191+.127),7.5*Math.sin(i*2.9171+.381)],phase=(i%71)/71,variation=(i%11)/10;
    const exact=pentagridCover(x,phase,variation,false);
    assert.equal(exact.count,1,`a regular dual tiling must cover exactly once: ${JSON.stringify({i,x,exact})}`);
    if(i<100){const repeated=pentagridCover(x,phase+1,variation);near(repeated.total,pentagridCover(x,phase,variation).total,1e-9);}
    const soft=pentagridCover(x,phase,variation),reference=pentagridCover(x,phase,variation,true,true);
    near(soft.total,reference.total,1e-9);assert.equal(soft.count,reference.count);
    assert.ok(soft.total>.5&&soft.total<2,'soft acceptance must retain positive, well-conditioned coverage before normalization');
    worstPartition=Math.max(worstPartition,Math.abs(soft.total-1));maximumCandidates=Math.max(maximumCandidates,soft.count);
  }
  // A product of independently softened half-spaces is an optical interpolation,
  // not an assertion that fractional rhombi still form an exact tiling.
  t.diagnostic(`1,100 control/position samples: ${maximumCandidates} simultaneous rhombi; worst soft coverage deviation ${worstPartition}`);
  // The shader divides by accepted coverage. This measured nonunity is why
  // normalization is required, rather than pretending soft half-spaces tile.
});

function cores(phase,variation){
  const t=TAU*phase,separation=.35+.22*variation;
  return Array.from({length:3},(_,j)=>{
    const a=TAU*j/3;
    return {positive:scale(cis(a+t),.59+.08*Math.sin(t+a)),negative:add(scale(cis(a-t+.7),separation),scale([Math.sin(t),Math.cos(2*t)],.13))};
  });
}
test('Vortices: six analytic paths close with velocity; isolated cores carry charge +3/-3',()=>{
  const wave=(z,points)=>points.reduce((value,{positive,negative})=>{
    const pair=mul(sub(z,positive),conjugate(sub(z,negative)));return mul(value,mul(pair,mul(pair,pair)));
  },[1,0]);
  for(const variation of[0,.5,1])for(const phase of[.17,.5,.83]){
    const points=cores(phase,variation),repeated=cores(phase+1,variation);
    for(let j=0;j<3;j++)for(const [name,charge]of[['positive',3],['negative',-3]]){
      for(let k=0;k<2;k++)near(points[j][name][k],repeated[j][name][k]);
      let total=0,previous;
      for(let i=0;i<=256;i++){
        const value=wave(add(points[j][name],scale(cis(TAU*i/256),1e-4)),points),angle=Math.atan2(value[1],value[0]);
        if(previous!==undefined)total+=Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));previous=angle;
      }
      near(total/TAU,charge,1e-7);
    }
  }
  const h=1e-5;
  for(const variation of[0,.5,1])for(let j=0;j<3;j++)for(const key of['positive','negative'])for(let k=0;k<2;k++){
    const forward=(cores(h,variation)[j][key][k]-cores(0,variation)[j][key][k])/h;
    const backward=(cores(1,variation)[j][key][k]-cores(1-h,variation)[j][key][k])/h;
    assert.ok(Math.abs(forward-backward)<.001);
  }
});

const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
test('Mathematics 04 GLSL: unwrapped phase, finite radiance, reproducible seed and variation',async t=>{
  const browser=await chromium.launch({channel:'chromium',headless:true}),report={};
  try{
    const page=await browser.newPage();
    for(const shader of MATHEMATICS_04_SHADERS)await t.test(shader.id,async()=>{
      await page.setContent('<canvas width="320" height="320"></canvas>');
      const result=await page.evaluate(({source})=>{
        const size=320,canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});
        if(!gl)throw Error('WebGL 2 unavailable');
        const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
        const vs=compile(gl.VERTEX_SHADER,`#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`);
        const fs=compile(gl.FRAGMENT_SHADER,`#version 300 es
          precision highp float;uniform float uPhase,uVariation,uSeed,uResolution;uniform int inspect;out vec4 colour;
          ${source}
          void main(){vec3 c=artwork(gl_FragCoord.xy/uResolution*2.-1.);
          bool invalid=any(isnan(c))||any(isinf(c))||any(lessThan(c,vec3(0.)))||any(greaterThan(c,vec3(32.)));
          if(inspect==1){colour=vec4(invalid?vec3(1.):vec3(0.),1.);return;}
          vec3 v=1.-exp(-max(c,vec3(0.)));colour=vec4(mix(12.92*v,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v)),1.);}`);
        const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);gl.bindVertexArray(gl.createVertexArray());gl.viewport(0,0,size,size);
        const uniforms=Object.fromEntries(['uPhase','uVariation','uSeed','uResolution','inspect'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.uniform1f(uniforms.uResolution,size);
        const render=(phase,variation=.5,seed=601.1037519201636,inspect=false)=>{
          gl.uniform1f(uniforms.uPhase,phase);gl.uniform1f(uniforms.uVariation,variation);gl.uniform1f(uniforms.uSeed,seed);gl.uniform1i(uniforms.inspect,inspect?1:0);
          gl.drawArrays(gl.TRIANGLES,0,3);const data=new Uint8Array(size*size*4);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,data);
          if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL validation error');return data;
        };
        const diff=(a,b)=>{let sum=0,maximum=0,large=0;for(let i=0;i<a.length;i++)if(i%4!==3){const d=Math.abs(a[i]-b[i]);sum+=d;maximum=Math.max(maximum,d);if(d>8)large++;}return{mean:sum/(size*size*3),maximum,largeFraction:large/(size*size*3)};};
        const periods=[],invalid=[];
        for(const variation of[0,.5,1])for(const seed of[7,601.1037519201636])for(const phase of[-1/360,0,.173,.5,.917]){
          periods.push({phase,variation,seed,...diff(render(phase,variation,seed),render(phase+1,variation,seed))});
          const flags=render(phase,variation,seed,true);let count=0;for(let i=0;i<flags.length;i+=4)if(flags[i])count++;
          if(count)invalid.push({phase,variation,seed,count});
        }
        const canonical=render(.173),repeat=diff(canonical,render(.173));
        const seedDifference=diff(canonical,render(.173,.5,75));
        const variationDifference=diff(render(.173,0),render(.173,1));
        return {periods,invalid,repeat,seedDifference,variationDifference};
      },{source:shader.source});
      report[shader.id]=result;
      assert.deepEqual(result.invalid,[],'nonnegative finite radiance within HDR range');assert.equal(result.repeat.maximum,0);
      assert.ok(result.seedDifference.mean>.1,'seed must visibly affect composition');assert.ok(result.variationDifference.mean>.1,'variation must visibly affect motion or structure');
      for(const p of result.periods){assert.ok(p.mean<.12,`period mismatch: ${JSON.stringify(p)}`);assert.ok(p.largeFraction<.004,`period changes too many pixels: ${JSON.stringify(p)}`);}
      t.diagnostic(`${shader.id}: worst raw-phase MAE ${Math.max(...result.periods.map(p=>p.mean)).toFixed(6)}/255, zero invalid HDR pixels`);
    });
  }finally{await browser.close();await mkdir('output/qa/04-mathematics',{recursive:true});await writeFile('output/qa/04-mathematics/math-report.json',JSON.stringify(report,null,2));}
});
