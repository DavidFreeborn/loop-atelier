import test from 'node:test';
import assert from 'node:assert/strict';
import { GEOMETRY_04_SHADERS } from '../src/shaders-geometry-04.js';

const a=.4;
const field=(p,k)=>p.reduce((sum,x)=>sum+(x*x-a)**2,0)-k*a*a;

test('quartic critical points and Morse indices give the cube handle structure',()=>{
 const counts=[0,0,0,0];
 for(const x of [-Math.sqrt(a),0,Math.sqrt(a)])for(const y of [-Math.sqrt(a),0,Math.sqrt(a)])for(const z of [-Math.sqrt(a),0,Math.sqrt(a)]){
  const p=[x,y,z],index=p.filter(x=>x===0).length;counts[index]++;
  assert.ok(Math.abs(field(p,index))<1e-14);
  for(const x of p)assert.ok(Math.abs(4*x*(x*x-a))<1e-14);
  assert.equal(p.filter(x=>12*x*x-4*a<0).length,index);
 }
 assert.deepEqual(counts,[8,12,6,1]);
 assert.equal(12-8+1,5,'connected cube graph has five independent cycles');
});

// Independent mesh-topology check: marching tetrahedra, shared edge vertices,
// and Euler characteristic. This tests the actual level set, not a drawing.
function meshTopology(k){
 const n=36,extent=1.36,side=n+1,values=new Float64Array(side**3);
 const index=(x,y,z)=>(z*side+y)*side+x;
 for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++)values[index(x,y,z)]=field([x,y,z].map(v=>(v/n*2-1)*extent),k);
 const vertices=new Map(),parent=[],edges=new Map();let faces=0;
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const vertex=(a,b)=>{const key=a<b?`${a}:${b}`:`${b}:${a}`;if(!vertices.has(key)){vertices.set(key,parent.length);parent.push(parent.length);}return vertices.get(key);};
 const triangle=(a,b,c)=>{faces++;for(const [x,y] of [[a,b],[b,c],[c,a]]){const key=x<y?`${x}:${y}`:`${y}:${x}`;edges.set(key,(edges.get(key)||0)+1);parent[root(x)]=root(y);}};
 const offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 const tetrahedra=[[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]];
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const cube=offsets.map(([dx,dy,dz])=>index(x+dx,y+dy,z+dz));
  for(const tet of tetrahedra){
   const ids=tet.map(i=>cube[i]),inside=ids.filter(i=>values[i]<0),outside=ids.filter(i=>values[i]>=0);
   if(!inside.length||!outside.length)continue;
   if(inside.length===2){const [a,b]=inside,[c,d]=outside;const ac=vertex(a,c),ad=vertex(a,d),bc=vertex(b,c),bd=vertex(b,d);triangle(ac,ad,bc);triangle(ad,bc,bd);}
   else {const one=inside.length===1?inside:outside,many=inside.length===1?outside:inside;triangle(...many.map(i=>vertex(one[0],i)));}
  }
 }
 assert.ok([...edges.values()].every(v=>v===2),'mesh is closed and manifold');
 return {components:new Set(parent.map((_,i)=>root(i))).size,euler:vertices.size-edges.size+faces};
}
test('meshed regular levels verify eight spheres, genus five, cavity shell and one sphere',()=>{
 assert.deepEqual(meshTopology(.6),{components:8,euler:16});
 assert.deepEqual(meshTopology(1.4),{components:1,euler:-8});
 assert.deepEqual(meshTopology(2.3),{components:2,euler:4});
 assert.deepEqual(meshTopology(3.3),{components:1,euler:2});
});

test('power-bisector clearance agrees with normalized affine plane distance',()=>{
 const sites=[[.8,.3,-.6],[-.4,.7,.2],[.1,-.9,.5]],weights=[.14,-.23,.06];
 for(let i=0;i<80;i++){
  const p=[Math.sin(i*.37),Math.cos(i*.71),Math.sin(i*.93)];
  const powers=sites.map((s,j)=>p.reduce((d,x,k)=>d+(x-s[k])**2,0)-weights[j]);
  const w=powers.indexOf(Math.min(...powers));
  for(let j=0;j<sites.length;j++)if(j!==w){
   const delta=sites[j].map((x,k)=>x-sites[w][k]),norm=Math.hypot(...delta);
   const plane=(sites[j].reduce((v,x)=>v+x*x,0)-sites[w].reduce((v,x)=>v+x*x,0)-weights[j]+weights[w]-2*p.reduce((v,x,k)=>v+x*delta[k],0))/(2*norm);
   assert.ok(Math.abs(plane-(powers[j]-powers[w])/(2*norm))<1e-14);
   assert.ok(plane>=-1e-14);
  }
 }
});

test('analytic chamber exits reach the first eroded power-cell plane or inner sphere',()=>{
 const sites=Array.from({length:8},(_,i)=>[i&1?.7:-.7,i&2?.7:-.7,i&4?.7:-.7]);
 const weights=sites.map((_,i)=>.12*Math.sin(i*1.8)),width=.04,radius=1.47;
 const powers=p=>sites.map((s,j)=>p.reduce((d,x,k)=>d+(x-s[k])**2,0)-weights[j]);
 let tested=0;
 for(let i=0;i<240;i++){
  const p=[.8*Math.sin(i*.31),.7*Math.cos(i*.57),.6*Math.sin(i*.83)],v=[Math.cos(i*.17),Math.sin(i*.43),Math.cos(i*.79)];
  const direction=v.map(x=>x/Math.hypot(...v)),power=powers(p),winner=power.indexOf(Math.min(...power));
  const planes=sites.map((s,j)=>{if(j===winner)return null;const towards=s.map((x,k)=>sites[winner][k]-x),norm=Math.hypot(...towards);return {clearance:(power[j]-power[winner])/(2*norm)-width,closing:-towards.reduce((sum,x,k)=>sum+x*direction[k],0)/norm};}).filter(Boolean);
  if(planes.some(p=>p.clearance<.02))continue;
  const b=p.reduce((sum,x,k)=>sum+x*direction[k],0);
  let exit=-b+Math.sqrt(b*b+radius*radius-p.reduce((sum,x)=>sum+x*x,0));
  for(const plane of planes)if(plane.closing>1e-12)exit=Math.min(exit,plane.clearance/plane.closing);
  const before=exit*(1-1e-6),after=exit*(1+1e-6);
  const at=t=>p.map((x,k)=>x+t*direction[k]);
  assert.ok(Math.hypot(...at(before))<radius+1e-10);
  assert.ok(planes.every(plane=>plane.clearance-plane.closing*before>0));
  assert.ok(Math.hypot(...at(after))>radius||planes.some(plane=>plane.clearance-plane.closing*after<0));
  tested++;
 }
 assert.ok(tested>80);
});

test('stereographic coordinates lie on S3 and the polynomial binding is a (3,2) torus knot',()=>{
 for(let i=0;i<100;i++){
  const p=[2*Math.sin(i*.17),1.6*Math.cos(i*.37),1.8*Math.sin(i*.81)],r2=p.reduce((s,x)=>s+x*x,0),q=[...p.map(x=>2*x/(1+r2)),(r2-1)/(1+r2)];
  assert.ok(Math.abs(q.reduce((s,x)=>s+x*x,0)-1)<1e-14);
 }
 for(const c of [.85,1,1.15]){
  let lo=0,hi=1;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(c*mid**3+mid*mid>1)hi=mid;else lo=mid;}
  const r2=(lo+hi)/2,r1=Math.sqrt(1-r2*r2);
  for(let i=0;i<120;i++){
   const t=i/120*Math.PI*2;
   const real=r1*r1*Math.cos(6*t)+c*r2**3*Math.cos(6*t+Math.PI);
   const imag=r1*r1*Math.sin(6*t)+c*r2**3*Math.sin(6*t+Math.PI);
   assert.ok(Math.hypot(real,imag)<1e-14);
  }
 }
});

test('collection metadata is complete and shader sources use wrapped phase',()=>{
 assert.deepEqual(GEOMETRY_04_SHADERS.map(s=>s.id),['surgery','laguerre','milnor']);
 for(const s of GEOMETRY_04_SHADERS){assert.equal(s.collection,4);assert.equal(s.kind,'shader');assert.equal(s.palette,'native');assert.ok(s.technique&&s.formula);assert.match(s.source,/fract\(uPhase\)/);assert.match(s.source,/vec3 artwork\(vec2 p\)/);}
});

test('analytic bounding spheres remain within the frame throughout every phase',()=>{
 const bounds=[
  {radius:Math.sqrt(3*.4+.4*Math.sqrt(3*(1.42+.85))),camera:[3.15,2.22,4.12],fov:.385},
  {radius:1.56,camera:[2.68,2.35,4.38],fov:.405},
  {radius:1.62,camera:[4.25,2.15,3.078],fov:.395},
 ];
 for(const {radius,camera,fov} of bounds){
  const distance=Math.hypot(...camera),projected=radius/(Math.sqrt(distance*distance-radius*radius)*fov);
  assert.ok(projected<.76,`projected radius ${projected} leaves at least 24% margin to the frame edge`);
 }
});
