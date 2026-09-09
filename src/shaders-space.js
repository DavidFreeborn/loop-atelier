/** Original opaque, architectural studies for Loop Atelier. */
const ARCHITECTURE = String.raw`
const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;
vec2 mapScene(vec3 p);
vec3 materialAt(vec3 p, float id);
float gFloor,gFov;
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q=abs(p)-b;
  return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;
}
float squareBeam(vec2 p,float w,float bevel) {
  vec2 q=abs(p)-vec2(w);
  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-bevel;
}
float seededPhase(){return TAU*fract(sin(uSeed*0.01731+0.719)*437.1831);}
vec3 normalAt(vec3 p,float e) {
  const vec2 k=vec2(1.0,-1.0);
  return normalize(k.xyy*mapScene(p+k.xyy*e).x+k.yyx*mapScene(p+k.yyx*e).x
    +k.yxy*mapScene(p+k.yxy*e).x+k.xxx*mapScene(p+k.xxx*e).x);
}
float occlusionAt(vec3 p,vec3 n) {
  float ao=0.0,weight=1.0;
  for(int i=1;i<=4;i++) {
    float h=0.025+float(i)*0.064;
    ao+=(h-mapScene(p+n*h).x)*weight;
    weight*=0.56;
  }
  return clamp(1.0-1.8*ao,0.12,1.0);
}
float shadowAt(vec3 p,vec3 direction) {
  float t=0.025,result=1.0;
  for(int i=0;i<24;i++) {
    float d=mapScene(p+direction*t).x;
    result=min(result,13.0*d/t);
    t+=clamp(d,0.028,0.24);
    if(d<0.001||t>5.5) break;
  }
  return clamp(result,0.06,1.0);
}
vec3 architecture(vec2 p,vec3 ro,vec3 target,float theme) {
  vec3 fw=normalize(target-ro),rt=normalize(cross(fw,vec3(0.0,1.0,0.0))),up=cross(rt,fw);
  vec3 rd=normalize(fw+gFov*p.x*rt+gFov*p.y*up);
  // Both sculptures and their plinths fit inside this box. Spend the ray
  // budget inside that region; handle the unbounded floor analytically.
  vec3 ta=(-vec3(2.06)-ro)/rd,tb=(vec3(2.06)-ro)/rd;
  vec3 nearBound=min(ta,tb),farBound=max(ta,tb);
  float entry=max(nearBound.x,max(nearBound.y,nearBound.z));
  float exitDistance=min(farBound.x,min(farBound.y,farBound.z));
  bool intersects=exitDistance>=max(entry,0.0);
  float travel=intersects?max(0.0,entry-0.003):18.0;
  if(rd.y<-0.0001&&-(ro.y+gFloor)/rd.y<travel)intersects=false;
  vec2 h=vec2(1.0,0.0);bool hit=false;
  int steps=uResolution<800.0?68:80;
  for(int i=0;i<80;i++) {
    if(i>=steps||!intersects) break;
    h=mapScene(ro+rd*travel);
    if(h.x<0.0009+travel*0.00010){hit=true;break;}
    travel+=max(h.x*0.91,0.001);
    if(travel>17.0)break;
  }
  vec3 background=mix(vec3(0.009,0.014,0.021),vec3(0.028,0.022,0.019),theme);
  background*=0.62+0.38*exp(-0.8*dot(p,p));
  // Continue the distant studio floor analytically instead of revealing the
  // ray-marcher's far bound as a hard false horizon behind the sculpture.
  if(!hit&&rd.y<-0.0001) {
    float floorTravel=-(ro.y+gFloor)/rd.y;
    if(floorTravel>0.0) {travel=floorTravel;h=vec2(0.0);hit=true;}
  }
  if(!hit)return background;
  vec3 pos=ro+rd*travel;
  vec3 n=h.y<0.5?vec3(0.0,1.0,0.0):normalAt(pos,0.0012+0.00008*travel);
  vec3 albedo=materialAt(pos,h.y);
  vec3 light=normalize(vec3(-0.55,0.87,0.58));
  bool distantFloor=h.y<0.5&&length(pos.xz)>5.5;
  float diffuse=max(dot(n,light),0.0);
  float ao=distantFloor?1.0:pow(occlusionAt(pos,n),0.72);
  float shadow=distantFloor?1.0:shadowAt(pos+n*0.007,light);
  float rim=max(dot(n,normalize(vec3(0.7,0.3,-0.6))),0.0);
  vec3 halfVector=normalize(light-rd);
  float specular=pow(max(dot(n,halfVector),0.0),72.0)*shadow;
  vec3 ambient=vec3(0.14,0.18,0.24)*(0.62+0.38*max(n.y,0.0));
  vec3 colour=albedo*(ambient*ao+vec3(1.65,1.37,1.02)*diffuse*shadow);
  colour+=albedo*vec3(0.18,0.28,0.43)*rim*ao;
  float metal=(theme>0.5&&h.y>0.5&&h.y<3.5)||(theme<0.5&&h.y>1.5&&h.y<2.5)?1.0:0.0;
  colour+=mix(vec3(0.52),albedo,0.55)*specular*(0.7+metal);
  vec3 reflected=reflect(rd,n);
  float panel=smoothstep(0.78,0.98,dot(reflected,normalize(vec3(-0.4,0.75,0.2))));
  colour+=albedo*vec3(0.58,0.63,0.71)*panel*metal*ao*0.35;
  float grazing=pow(1.0-max(dot(n,-rd),0.0),4.0);
  colour+=vec3(0.08,0.11,0.15)*grazing*ao;
  float haze=1.0-exp(-(h.y<0.5?0.072:0.014)*travel);
  return max(mix(colour,background,haze),vec3(0.0));
}
`;

const SECTION = String.raw`
vec2 gXW,gYW,gZW;
float gSlice,gWidth,gSpacing;
vec4 sectionCoordinates(vec3 p) {
  vec4 q=vec4(p,gSlice);
  q.xw=mat2(gXW.x,-gXW.y,gXW.y,gXW.x)*q.xw;
  q.yw=mat2(gYW.x,-gYW.y,gYW.y,gYW.x)*q.yw;
  q.zw=mat2(gZW.x,-gZW.y,gZW.y,gZW.x)*q.zw;
  return q;
}
vec2 sectionStructure(vec3 p) {
  vec4 q=sectionCoordinates(p);
  vec4 d=abs(mod(q+0.5*gSpacing,gSpacing)-0.5*gSpacing);
  // The thickened pairwise intersections of a 4D hypercubic grid's planes.
  // Restriction to the 3D slice yields architectural struts. No 4D-to-3D
  // perspective division is involved: this is genuinely a hyperplane slice.
  // The symmetric cross-section increases with either nonnegative coordinate.
  // Its minimum pair is therefore the two smallest coordinates: two rounded
  // box evaluations replace six, with exactly the same geometry and material.
  float smallest=min(d.x,min(d.y,d.z));
  float middle=max(min(d.x,d.y),min(max(d.x,d.y),d.z));
  float ivory=squareBeam(vec2(smallest,middle),gWidth,0.017);
  float metal=squareBeam(vec2(smallest,d.w),gWidth,0.017);
  vec2 result=ivory<metal?vec2(ivory,1.0):vec2(metal,2.0);
  float clip=sdRoundBox(p,vec3(1.67),0.045);
  result.x=max(result.x,clip);
  return result;
}
vec2 mapScene(vec3 p) {
  vec2 result=sectionStructure(p);
  float plinth=sdRoundBox(p-vec3(0.0,-1.79,0.0),vec3(1.86,0.085,1.86),0.045);
  if(plinth<result.x)result=vec2(plinth,3.0);
  float floorDistance=p.y+1.95;
  if(floorDistance<result.x)result=vec2(floorDistance,0.0);
  return result;
}
vec3 materialAt(vec3 p,float id) {
  if(id<0.5)return vec3(0.020,0.027,0.039);
  if(id>2.5)return vec3(0.028,0.038,0.055);
  if(id>1.5)return vec3(0.49,0.205,0.072);
  return vec3(0.74,0.71,0.64);
}
vec3 artwork(vec2 p) {
  float a=TAU*fract(uPhase),seed=seededPhase();
  float xw=0.48+(0.24+0.36*uVariation)*sin(a);
  float yw=-0.22+(0.20+0.28*uVariation)*sin(a+0.9);
  float zw=0.34+(0.19+0.27*uVariation)*cos(a);
  gXW=vec2(cos(xw),sin(xw));gYW=vec2(cos(yw),sin(yw));gZW=vec2(cos(zw),sin(zw));
  gSlice=0.31*sin(a+0.4)+0.045*sin(seed);
  gWidth=0.047+0.013*uVariation;
  gFloor=1.95;
  gFov=0.62;
  gSpacing=0.88+0.10*fract(sin(uSeed*0.371)*73.15);
  float camera=0.73+0.13*sin(a);
  vec3 ro=vec3(5.15*cos(camera),3.10+0.13*cos(a),5.15*sin(camera));
  return architecture(p,ro,vec3(0.0,-0.34,0.0),0.0);
}
`;

const INVERSION = String.raw`
vec3 gCentre,gGridShift;
float gRadius2,gGridSize;
vec2 vaultedGrid(vec3 q) {
  vec3 d=abs(mod(q+0.5*gGridSize,gGridSize)-0.5*gGridSize);
  float a=squareBeam(d.xy,0.040,0.045);
  float b=squareBeam(d.xz,0.040,0.045);
  float c=squareBeam(d.yz,0.040,0.045);
  float distance=min(a,min(b,c));
  return vec2(distance,a<b&&a<c?1.0:(b<c?2.0:3.0));
}
vec2 invertedStructure(vec3 p) {
  vec3 relative=p-gCentre;
  float radius=max(length(relative),0.025),r2=radius*radius;
  vec3 q=gCentre+gRadius2*relative/r2+gGridShift;
  vec2 grid=vaultedGrid(q);
  // Exact identity: |I(x)-I(p)|=R²|x-p|/(|x-c||p-c|). Within a ball of
  // radius d around p, this is <=R²d/(r(r-d)). Solving for a safe source
  // clearance D gives the conservative step below, without a square root.
  float D=abs(grid.x);
  float safe=D*r2/(gRadius2+D*radius);
  float distance=sign(grid.x)*safe;
  // Finite crop: the accumulation at the inversion centre is deliberately
  // excluded, so the shader does not pretend to resolve infinitely small cells.
  distance=max(distance,0.31-radius);
  distance=max(distance,sdRoundBox(p,vec3(1.78,1.43,1.78),0.08));
  return vec2(distance,grid.y);
}
vec2 mapScene(vec3 p) {
  vec2 result=invertedStructure(p);
  float plinth=sdRoundBox(p-vec3(0.0,-1.60,0.0),vec3(1.94,0.065,1.94),0.045);
  if(plinth<result.x)result=vec2(plinth,4.0);
  float ground=p.y+1.78;
  if(ground<result.x)result=vec2(ground,0.0);
  return result;
}
vec3 materialAt(vec3 p,float id) {
  if(id<0.5)return vec3(0.025,0.028,0.037);
  if(id>3.5)return vec3(0.065,0.061,0.055);
  float r=length(p-gCentre);
  vec3 copper=vec3(0.65,0.34,0.13),cobalt=vec3(0.045,0.12,0.21);
  float blend=smoothstep(0.48,1.58,r);
  if(id<1.5)blend=0.65+0.35*blend;
  return mix(cobalt,copper,blend);
}
vec3 artwork(vec2 p) {
  float a=TAU*fract(uPhase),seed=seededPhase();
  gCentre=vec3(0.20*cos(a),0.14*sin(a),0.15*sin(2.0*a));
  gGridShift=vec3(0.22*sin(a+0.4),0.19*cos(a),0.17*sin(2.0*a+0.7));
  gGridShift+=0.035*vec3(sin(seed),cos(seed),sin(seed+1.3));
  gRadius2=1.72+(0.16+0.24*uVariation)*sin(a-0.3);
  gGridSize=0.87+0.04*cos(seed);
  gFloor=1.78;
  gFov=0.65;
  float camera=0.60+0.18*sin(a+0.2);
  vec3 ro=vec3(5.2*cos(camera),2.65+0.18*cos(a),5.2*sin(camera));
  return architecture(p,ro,vec3(0.0,-0.30,0.0),1.0);
}
`;

export const SPACE_SHADERS = [
  {
    id:'section',title:'Section',subtitle:'Rooms from a fourth direction',
    description:'A four-dimensional cellular grid passes through a three-dimensional slice. Ivory and copper structures join, divide, and change direction as the slice turns through the grid.',
    technique:'Ray-marched thickened intersections of pairs of hypercubic grid planes in R⁴, restricted to a rotating affine three-plane. Real occlusion, soft shadows, and opaque material distinguish the structural families.',
    formula:'q = R(t)(x,y,z,h(t)); solid = {minᵢ<ⱼ d((qᵢ,qⱼ),grid) < ε}',
    duration:12,exposure:1,collection:3,kind:'shader',palette:'native',source:ARCHITECTURE+SECTION,
  },
  {
    id:'inversion',title:'Inversion',subtitle:'An arcade folded through a sphere',
    description:'Ordered rooms become curved vaults around a shifting inversion sphere. Broad copper arches give way to progressively smaller cobalt chambers toward the centre.',
    technique:'The inverse image of a periodic architectural lattice under sphere inversion. A conservative distance bound supports opaque ray marching; the central accumulation is deliberately cropped at finite scale.',
    formula:'I(p) = c + R²(p−c)/‖p−c‖²; geometry = I⁻¹(periodic vaulted grid)',
    duration:12,exposure:1,collection:3,kind:'shader',palette:'native',source:ARCHITECTURE+INVERSION,
  },
];
