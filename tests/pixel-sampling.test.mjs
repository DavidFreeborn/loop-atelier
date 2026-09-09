import test from 'node:test';import assert from 'node:assert/strict';
import {samplePattern} from '../src/renderer.js';
test('Pixel sampling covers independent centred strata at every supported count',()=>{
 for(let n=1;n<=64;n++){
  const p=samplePattern(n);assert.equal(p,samplePattern(n));assert.equal(p.length,n);
  for(let axis=0;axis<2;axis++){
   assert.ok(Math.abs(p.reduce((sum,v)=>sum+v[axis],0))<1e-12);
   assert.equal(new Set(p.map(v=>Math.floor((v[axis]+.5)*n+1e-8))).size,n);
  }
  if(n>=8){assert.ok(p.some((v,i)=>Math.abs(v[0]-((i+.5)/n-.5))>.1));assert.ok(p.some(v=>Math.abs(v[0]-v[1])>.1));}
 }
 assert.deepEqual(samplePattern(1),[[0,0]]);
});
