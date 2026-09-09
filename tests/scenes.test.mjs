import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, createScene } from '../src/scenes.js';

function rms(a,b) { let n=0;for(let i=0;i<a.length;i++)n+=(a[i]-b[i])**2;return Math.sqrt(n/a.length); }
function copy(scene,t,v) { return scene.update(t,v).slice(); }

for(const meta of SCENES.filter(s=>s.kind!=='shader')) {
  test(`${meta.title}: seeded repeatability, persistent buffer, and out-of-order evaluation`,()=>{
    const a=createScene(meta.id,{count:4096,seed:717}),b=createScene(meta.id,{count:4096,seed:717}),c=createScene(meta.id,{count:4096,seed:718});
    const expected=copy(a,.317,.72);
    a.update(.84,0);a.update(-2,.1);
    assert.equal(a.update(.317,.72),a.data);
    assert.deepEqual(a.data,expected);assert.deepEqual(b.update(.317,.72),expected);
    assert.ok(rms(c.update(.317,.72),expected)>1e-5,'Seed must have a visible geometric or intensity effect.');
  });
  test(`${meta.title}: no discontinuity or velocity cusp at the seam`,{
    skip: meta.loopTopology==='permutation'
      ? 'Visible loop is a documented gallery permutation; dynamics.test.mjs checks permutation-aligned radiance and its seam derivatives.'
      : false,
  },()=>{
    const s=createScene(meta.id,{count:4096,seed:42});
    // Second-order one-sided differences separate a true seam cusp from the
    // large, smooth temporal curvature of narrow moving intensity contours.
    const h=.00005;
    for(const variation of [0,.5,1]) {
      const before=copy(s,1-h,variation),end=copy(s,0,variation),after=copy(s,h,variation);
      const before2=copy(s,1-2*h,variation),after2=copy(s,2*h,variation);
      assert.deepEqual(end,copy(s,1,variation));
      const velocityLeft=new Float64Array(end.length),velocityRight=new Float64Array(end.length);
      for(let i=0;i<end.length;i++){velocityLeft[i]=(3*end[i]-4*before[i]+before2[i])/(2*h);velocityRight[i]=(-3*end[i]+4*after[i]-after2[i])/(2*h);}
      const disagreement=rms(velocityLeft,velocityRight);
      assert.ok(disagreement<.02,`Velocity cusp: RMS disagreement ${disagreement}`);
      const seamStep=rms(copy(s,1-1/240,variation),end);
      const regularStep=rms(copy(s,.5-1/240,variation),copy(s,.5,variation));
      assert.ok(seamStep<Math.max(.02,regularStep*4),`Abnormal seam jump: ${seamStep} vs ${regularStep}`);
    }
  });
  test(`${meta.title}: finite, bounded, safely framed across time and deformation`,()=>{
    const s=createScene(meta.id,{count:2048,seed:4294967295});
    const {yaw,pitch,distance}=meta.camera,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    for(const variation of [0,.5,1]) for(let frame=0;frame<48;frame++) {
      const d=s.update(frame/48,variation);
      for(let i=0;i<d.length;i+=4) {
        const [x,y,z,l]=d.subarray(i,i+4);
        assert.ok(Number.isFinite(x+y+z+l));assert.ok(l>=0&&l<=1);
        const xx=cy*x+sy*z,zz=-sy*x+cy*z,yy=cp*y-sp*zz,z2=sp*y+cp*zz;
        const px=xx*2.65/(distance-z2),py=yy*2.65/(distance-z2);
        assert.ok(Math.abs(px)<.95&&Math.abs(py)<.95,`Clipped composition at ${frame}/48: ${px},${py}`);
      }
    }
  });
}

test('Invalid scene ids and allocation sizes fail explicitly',()=>{
  assert.throws(()=>createScene('missing'),RangeError);
  for(const count of [NaN,Infinity,0,-10,2000001]) assert.throws(()=>createScene('meridian',{count}),RangeError);
});
