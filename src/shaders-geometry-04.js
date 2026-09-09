/** Original implicit and cellular geometry for Loop Atelier, collection 04.
 * All temporal parameters use a wrapped phase and integer-frequency harmonics.
 * Each source is independent GLSL for the shared artwork(vec2) renderer contract.
 */
const STUDIO = String.raw`
const float PI=3.141592653589793, TAU=6.283185307179586;
float hash1(float n){return fract(sin(n*127.1+uSeed*0.01731)*43758.5453);}
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 backdrop(vec2 p){return vec3(0.008,0.012,0.018)*(0.70+0.30*exp(-dot(p,p)));}
vec3 cameraRay(vec2 p,vec3 ro,vec3 target,float fov){
 vec3 fw=normalize(target-ro),rt=normalize(cross(fw,vec3(0,1,0)));
 return normalize(fw+fov*(p.x*rt+p.y*cross(rt,fw)));
}
vec2 sphereInterval(vec3 ro,vec3 rd,float r){
 float b=dot(ro,rd),d=b*b-dot(ro,ro)+r*r;
 if(d<0.0)return vec2(1.0,-1.0);
 float h=sqrt(d);return vec2(max(0.0,-b-h),-b+h);
}
vec3 lightSurface(vec3 p,vec3 n,vec3 rd,vec3 albedo,float shadow,float ao,float metal){
 vec3 key=normalize(vec3(-0.65,0.88,0.60)),fill=normalize(vec3(0.72,0.25,-0.48));
 float diffuse=max(dot(n,key),0.0),back=max(dot(n,fill),0.0);
 vec3 colour=albedo*(vec3(0.12,0.17,0.25)*ao+vec3(2.6,2.24,1.86)*diffuse*shadow);
 colour+=albedo*vec3(0.24,0.38,0.58)*back*ao;
 vec3 h=normalize(key-rd),reflected=reflect(rd,n);
 float spec=pow(max(dot(n,h),0.0),mix(72.0,110.0,metal));
 float panel=smoothstep(0.88,0.98,dot(reflected,normalize(vec3(-0.4,0.80,0.3))));
 float fresnel=0.04+0.30*pow(1.0-max(dot(n,-rd),0.0),5.0);
 colour+=mix(vec3(0.95),albedo,metal*.7)*(spec*shadow*0.9+panel*fresnel*ao);
 return max(colour,vec3(0));
}
`;

const SURGERY = String.raw`
float gK,gA;
mat3 gRotation;
float quartic(vec4 c,float e,float s){return (((c.x*s+c.y)*s+c.z)*s+c.w)*s+e;}
float signedCubeRoot(float x){return sign(x)*pow(abs(x),1.0/3.0);}
vec3 cubicRoots(float a,float b,float c){
 // Roots of x^3+a*x^2+b*x+c; a single real root is repeated in the output.
 float p=b-a*a/3.0,q=(2.0*a*a*a)/27.0-a*b/3.0+c;
 float discriminant=q*q*.25+p*p*p/27.0;
 if(discriminant>=0.0){
  float d=sqrt(discriminant);
  float r=signedCubeRoot(-q*.5+d)+signedCubeRoot(-q*.5-d)-a/3.0;
  return vec3(r);
 }
 float radius=2.0*sqrt(max(-p/3.0,0.0));
 float theta=acos(clamp((-q*.5)/sqrt(max(-p*p*p/27.0,1e-20)),-1.0,1.0))/3.0;
 vec3 r=radius*cos(vec3(theta,theta+TAU/3.0,theta+2.0*TAU/3.0))-a/3.0;
 return vec3(min(r.x,min(r.y,r.z)),max(min(r.x,r.y),min(max(r.x,r.y),r.z)),max(r.x,max(r.y,r.z)));
}
float surfaceHit(vec3 worldOrigin,vec3 worldDirection){
 vec3 ro=gRotation*worldOrigin,rd=gRotation*worldDirection;
 // Move the polynomial origin to closest approach; this avoids cancellation
 // from expanding fourth powers at the much more distant camera position.
 float centre=-dot(ro,rd);vec3 r=ro+centre*rd;
 float radius2=3.0*gA+gA*sqrt(3.0*gK)+0.002;
 float h2=radius2-dot(r,r);if(h2<0.0)return -1.0;
 float h=sqrt(h2),lo=max(-h,-centre+0.00015),hi=h;
 if(lo>=hi)return -1.0;
 vec3 r2=r*r,d2=rd*rd;
 vec4 c=vec4(dot(d2,d2),4.0*dot(r*rd,d2),6.0*dot(r2,d2)-2.0*gA,4.0*dot(r*r2,rd)-4.0*gA*dot(r,rd));
 float e=dot(r2-vec3(gA),r2-vec3(gA))-gK*gA*gA;
 vec3 stationary=cubicRoots(3.0*c.y/(4.0*c.x),c.z/(2.0*c.x),c.w/(4.0*c.x));
 stationary=clamp(stationary,vec3(lo),vec3(hi));
 float left=lo,fl=quartic(c,e,left);
 for(int segment=0;segment<4;segment++){
  float right=segment==0?stationary.x:(segment==1?stationary.y:(segment==2?stationary.z:hi));
  float fr=quartic(c,e,right);
  if(right>left+1e-7&&fl*fr<=0.0){
   for(int j=0;j<21;j++){
    float middle=(left+right)*.5,fm=quartic(c,e,middle);
    if(fl*fm<=0.0)right=middle;else{left=middle;fl=fm;}
   }
   return centre+(left+right)*.5;
  }
  left=right;fl=fr;
 }
 return -1.0;
}
vec3 artwork(vec2 p){
 float a=TAU*fract(uPhase),seed=hash1(1.0)*TAU;
 gA=.40;
 float pulse=sin(a-.45);
 gK=1.42+(0.65+0.20*uVariation)*pulse*pulse*pulse;
 float yaw=.25+.13*sin(a+.2)+.10*sin(seed),tilt=.18+.10*cos(a);
 gRotation=mat3(cos(yaw),0,-sin(yaw),0,1,0,sin(yaw),0,cos(yaw));
 gRotation=mat3(1,0,0,0,cos(tilt),-sin(tilt),0,sin(tilt),cos(tilt))*gRotation;
 vec3 ro=vec3(3.15,2.22,4.12),rd=cameraRay(p,ro,vec3(0),.385);
 float t=surfaceHit(ro,rd);if(t<0.0)return backdrop(p);
 vec3 pos=ro+rd*t,q=gRotation*pos;
 vec3 grad=4.0*q*(q*q-vec3(gA));
 // At a topology-changing critical point the geometric normal is undefined;
 // a finite radial fallback is used only at that vanishing-gradient point.
 vec3 n=normalize(transpose(gRotation)*(dot(grad,grad)>1e-12?grad:q));
 vec3 h=12.0*q*q-vec3(4.0*gA);
 float curvature=(grad.x*grad.x*h.y*h.z+grad.y*grad.y*h.x*h.z+grad.z*grad.z*h.x*h.y)/max(pow(dot(grad,grad),2.0),1e-8);
 // Gaussian curvature identifies the saddle regions where handles form.
 float saddle=smoothstep(-.25,1.3,-curvature);
 vec3 albedo=mix(vec3(.76,.70,.60),vec3(.055,.18,.23),saddle*.90);
 vec3 light=normalize(vec3(-.65,.88,.60));
 float sh=surfaceHit(pos+n*.004,light)>0.0?.17:1.0;
 float sh2=surfaceHit(pos+n*.004,normalize(light+vec3(.08,.025,-.04)))>0.0?.17:1.0;
 float ao=mix(1.0,.62,saddle);
 return lightSurface(pos,n,rd,albedo,(sh+sh2)*.5,ao,.22);
}
`;

const LAGUERRE = String.raw`
const int CELLS=19;
vec3 gSites[CELLS],gCutNormal,gCutNormal2;
float gWeights[CELLS],gCut,gCut2,gThickness;
void prepareCells(float a){
 for(int i=0;i<CELLS;i++){
  float f=float(i);vec3 site;
  if(i==0)site=vec3(0);
  else if(i<=6){
   float s=(i%2)==0?-1.0:1.0;
   site=i<=2?vec3(s,0,0):(i<=4?vec3(0,s,0):vec3(0,0,s));
   site*=.94;
  }else{
   int j=i-7,plane=j/4,k=j%4;
   float x=(k%2)==0?-.82:.82,y=k<2?-.82:.82;
   site=plane==0?vec3(x,y,0):(plane==1?vec3(x,0,y):vec3(0,x,y));
  }
  vec3 offset=vec3(hash1(f*3.0+3.0),hash1(f*3.0+4.0),hash1(f*3.0+5.0))-.5;
  site+=offset*.20;
  site+=.065*vec3(sin(a+f*1.7),cos(a+f*2.3),sin(a+f*.93));
  gSites[i]=site;
  gWeights[i]=(.18+.25*uVariation)*sin(a+f*1.83+hash1(f+72.0)*1.4);
 }
}
vec2 cellular(vec3 p,out vec3 normal){
 float best=1e8;int winner=0;
 for(int i=0;i<CELLS;i++){
  vec3 q=p-gSites[i];float power=dot(q,q)-gWeights[i];
  if(power<best){best=power;winner=i;}
 }
 float clearance=1e8;
 for(int j=0;j<CELLS;j++){
  if(j==winner)continue;
  vec3 q=p-gSites[j];float power=dot(q,q)-gWeights[j];
  // Exact inward distance to a power-bisector plane of the winning cell.
  vec3 towards=gSites[winner]-gSites[j];float separation=length(towards);
  float distance=(power-best)/(2.0*separation);
  if(distance<clearance){clearance=distance;normal=towards/separation;}
 }
 return vec2(clearance-gThickness,float(winner));
}
vec2 cellDetail(vec3 p,out vec3 normal){
 vec2 wall=cellular(p,normal);float r=length(p),bound=r-1.56;
 vec3 radial=p/max(r,.000001);
 float d=max(wall.x,bound);float material=1.0+wall.y*.01;
 if(bound>wall.x)normal=radial;
 float shell=abs(r-1.515)-.045;
 if(shell<d){d=shell;material=2.0;normal=sign(r-1.515)*radial;}
 // Remove a dihedral wedge, retaining enough exterior shell to reveal volume.
 float cut1=dot(p,gCutNormal)-gCut,cut2=dot(p,gCutNormal2)-gCut2;
 float cut=min(cut1,cut2);
 if(cut>d){d=cut;material=3.0;normal=cut1<cut2?gCutNormal:gCutNormal2;}
 return vec2(d,material);
}
vec2 cellMap(vec3 p){vec3 normal;return cellDetail(p,normal);}
vec3 cellNormal(vec3 p){
 // Exact face normals keep hard polyhedral junctions sharp; finite-difference
 // averaging here would invent narrow, bright bevels that are not in the model.
 vec3 normal;cellDetail(p,normal);return normal;
}
float chamberExit(vec3 p,vec3 direction){
 // A void is a convex power cell eroded by the wall thickness, intersected
 // with the inner sphere. Its first ray exit is the first opaque boundary.
 if(length(p)>=1.47)return 0.0;
 float best=1e8;int winner=0;
 for(int i=0;i<CELLS;i++){
  vec3 q=p-gSites[i];float power=dot(q,q)-gWeights[i];
  if(power<best){best=power;winner=i;}
 }
 float exitDistance=sphereInterval(p,direction,1.47).y;
 for(int j=0;j<CELLS;j++){
  if(j==winner)continue;
  vec3 q=p-gSites[j],towards=gSites[winner]-gSites[j];
  float separation=length(towards);
  float clearance=(dot(q,q)-gWeights[j]-best)/(2.0*separation)-gThickness;
  if(clearance<=0.0)return 0.0;
  float closing=-dot(towards,direction)/separation;
  if(closing>1e-7)exitDistance=min(exitDistance,clearance/closing);
 }
 return exitDistance;
}
vec2 clipHalfspace(vec2 interval,vec3 p,vec3 direction,vec3 normal,float offset){
 float height=dot(p,normal)-offset,speed=dot(direction,normal);
 if(abs(speed)<1e-7){if(height>0.0)return vec2(1,-1);}
 else if(speed>0.0)interval.y=min(interval.y,-height/speed);
 else interval.x=max(interval.x,-height/speed);
 return interval;
}
float cellShadow(vec3 p,vec3 direction){
 vec2 interval=sphereInterval(p,direction,1.56);interval.x=max(interval.x,.005);
 // The retained volume is sphere ∩ (halfspace 1 ∪ halfspace 2). Testing
 // those two ray intervals separately is an exact union-visibility query.
 for(int side=0;side<2;side++){
  vec2 segment=clipHalfspace(interval,p,direction,side==0?gCutNormal:gCutNormal2,side==0?gCut:gCut2);
  if(segment.y<=segment.x)continue;
  vec3 start=p+direction*(segment.x+.000001);
  if(chamberExit(start,direction)<segment.y-segment.x-.000002)return .065;
 }
 return 1.0;
}
vec3 artwork(vec2 p){
 float a=TAU*fract(uPhase);prepareCells(a);
 gCutNormal=normalize(vec3(.08+.15*sin(a),.18+.12*cos(a),1));
 gCutNormal2=normalize(vec3(1,-.10+.15*sin(a),-.12));
 gCut=-.28+.30*sin(a+.35);gCut2=-.48+.24*cos(a-.2);
 gThickness=.031+.012*uVariation;
 vec3 ro=vec3(2.68,2.35,4.38),rd=cameraRay(p,ro,vec3(0),.405);
 vec2 interval=sphereInterval(ro,rd,1.57);
 if(interval.x>interval.y)return backdrop(p);
 float t=interval.x;vec2 hit;bool found=false;
 for(int i=0;i<180;i++){
  hit=cellMap(ro+rd*t);
  if(hit.x<.00075){found=true;break;}
  t+=max(.0004,hit.x*.95);if(t>interval.y)break;
 }
 if(!found)return backdrop(p);
 vec3 pos=ro+rd*t,n=cellNormal(pos);
 vec3 albedo=hit.y>2.5?vec3(.59,.27,.095):(hit.y>1.5?vec3(.045,.095,.13):vec3(.68,.71,.67));
 if(hit.y<1.5)albedo*=.88+.12*hash1(floor((hit.y-1.0)*100.0+.5)+31.0);
 float ao=1.0;
 for(int i=0;i<4;i++){
  float h=.055+float(i)*.095;
  ao-=clamp((h-cellMap(pos+n*h).x)/h,0.0,1.0)*(.34*pow(.68,float(i)));
 }
 float sh=cellShadow(pos+n*.004,normalize(vec3(-.65,.88,.60)));
 return lightSurface(pos,n,rd,albedo,sh,clamp(ao,.13,1.0),hit.y>1.5?.6:.08);
}
`;

const MILNOR = String.raw`
vec2 gPhase0,gPhase1,gPhase2;
float gCoefficient,gBand;
vec2 multiplyComplex(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
vec2 polynomial(vec3 p){
 float r2=dot(p,p),d=1.0+r2;
 vec2 z1=2.0*p.xy/d,z2=vec2(2.0*p.z,r2-1.0)/d;
 return multiplyComplex(z1,z1)+gCoefficient*multiplyComplex(multiplyComplex(z2,z2),z2);
}
float pageBand(vec2 f,vec2 direction){
 float along=dot(f,direction),across=f.y*direction.x-f.x*direction.y;
 return max(abs(across)-gBand,-along);
}
vec2 milnorMap(vec3 p){
 vec2 f=polynomial(p);
 float d0=pageBand(f,gPhase0),d1=pageBand(f,gPhase1),d2=pageBand(f,gPhase2);
 float D=min(d0,min(d1,d2));
 float material=d0<d1&&d0<d2?1.0:(d1<d2?2.0:3.0);
 // The polynomial's Lipschitz constant on the unit 4-ball is <=3*max(1,c).
 // Stereographic chord lengths obey |q(p)-q(x)|=2|p-x|/sqrt((1+|p|²)(1+|x|²)).
 // This conservative local clearance follows by solving that chord bound.
 float r=length(p),L=3.0*max(1.0,gCoefficient);
 float d=D*(1.0+r*r)/(2.0*L+abs(D)*r);
 float binding=length(f)-.045;
 float bd=binding*(1.0+r*r)/(2.0*L+abs(binding)*r);
 if(bd<d){d=bd;material=4.0;}
 d=max(d,r-1.62);
 return vec2(d,material);
}
vec3 milnorNormal(vec3 p){
 const vec2 k=vec2(1,-1);float e=.0012;
 return normalize(k.xyy*milnorMap(p+k.xyy*e).x+k.yyx*milnorMap(p+k.yyx*e).x+k.yxy*milnorMap(p+k.yxy*e).x+k.xxx*milnorMap(p+k.xxx*e).x);
}
float milnorShadow(vec3 p,vec3 direction){
 float t=.005,end=sphereInterval(p,direction,1.63).y;
 for(int i=0;i<180;i++){
  float d=milnorMap(p+direction*t).x;
  if(d<.00035)return .12;
  t+=max(d*.98,.00035);if(t>end)return 1.0;
 }
 return .12;
}
vec3 artwork(vec2 p){
 float a=TAU*fract(uPhase),seed=hash1(9.0)*TAU;
 float theta=a+.18*sin(seed);
 gPhase0=vec2(cos(theta),sin(theta));
 gPhase1=vec2(cos(theta+TAU/3.0),sin(theta+TAU/3.0));
 gPhase2=vec2(cos(theta+2.0*TAU/3.0),sin(theta+2.0*TAU/3.0));
 gCoefficient=.85+.30*uVariation;gBand=.018+.010*uVariation;
 float yaw=.18*sin(a+.25);
 vec3 ro=vec3(4.25,2.15,3.078);ro.xz=turn(yaw)*ro.xz;
 vec3 rd=cameraRay(p,ro,vec3(0),.395);
 vec2 interval=sphereInterval(ro,rd,1.63);if(interval.x>interval.y)return backdrop(p);
 float t=interval.x;vec2 hit;bool found=false;
 for(int i=0;i<240;i++){
  hit=milnorMap(ro+rd*t);if(hit.x<.0009){found=true;break;}
  t+=max(hit.x*.97,.00035);if(t>interval.y)break;
 }
 if(!found)return backdrop(p);
 vec3 pos=ro+rd*t,n=milnorNormal(pos);
 vec3 albedo=hit.y>3.5?vec3(.60,.30,.10):(hit.y<1.5?vec3(.76,.73,.64):(hit.y<2.5?vec3(.085,.21,.26):vec3(.40,.47,.49)));
 float ao=1.0;
 for(int i=1;i<=4;i++){float h=float(i)*.048;ao-=(h-milnorMap(pos+n*h).x)*(.85/float(i));}
 float sh=milnorShadow(pos+n*.005,normalize(vec3(-.65,.88,.60)));
 return lightSurface(pos,n,rd,albedo,sh,clamp(ao,.25,1.0),hit.y>3.5?.7:.12);
}
`;

export const GEOMETRY_04_SHADERS = [
 {
  id:'surgery',title:'Surgery',subtitle:'Eight chambers, five handles',
  description:'Eight chambers merge along twelve connections, forming a surface with five handles. Increasing the level closes those handles around an inner cavity.',
  technique:'A quartic level set changes topology at its analytically known saddle levels. Rays intersect the polynomial directly; saddle curvature colours the emerging handles.',
  formula:'Σᵢ(xᵢ²−a)² = κ(t)a²; critical levels κ = 1, 2, 3',
  collection:4,kind:'shader',palette:'native',duration:12,exposure:1,source:STUDIO+SURGERY,
 },
 {
  id:'laguerre',title:'Laguerre',subtitle:'An architecture of competing distances',
  description:'Weighted cells exchange space inside a cutaway sphere. Moving the section reveals the shared walls and inner chambers as their boundaries rearrange.',
  technique:'A 3D power diagram uses squared distance minus a changing weight. Exact bisector distances form finite walls; two moving planes remove a wedge from the cellular volume.',
  formula:'Cᵢ = {x : ‖x−sᵢ‖²−wᵢ ≤ ‖x−sⱼ‖²−wⱼ for every j}',
  collection:4,kind:'shader',palette:'native',duration:12,exposure:1,source:STUDIO+LAGUERRE,
 },
 {
  id:'milnor',title:'Milnor',subtitle:'Three pages bound by a trefoil',
  description:'Three surfaces unfold around one trefoil boundary. They are pages of a complex-polynomial open book, viewed through stereographic projection.',
  technique:'Three argument levels of z₁²+cz₂³ on the unit 3-sphere become surfaces in 3D. Finite level bands, a thickened binding and a spherical crop make the pages visible.',
  formula:'f=z₁²+cz₂³; arg f = 2πt+2πj/3, j=0,1,2; (z₁,z₂)∈S³',
  collection:4,kind:'shader',palette:'native',duration:12,exposure:1,source:STUDIO+MILNOR,
 },
];
