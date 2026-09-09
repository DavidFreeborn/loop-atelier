/** Original mathematical studies. artwork(p) returns nonnegative linear RGB. */
const HYPERBOLIC = `
vec2 hypMul(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
vec2 hypDiv(vec2 a,vec2 b){return hypMul(a,vec2(b.x,-b.y))/max(dot(b,b),1e-20);}
float hypLine(float d,float width,float aa){return 1.-smoothstep(width,width+aa,abs(d));}
vec3 artwork(vec2 p){
  const float PI=3.14159265359, TAU=6.28318530718;
  float t=TAU*uPhase, pixel=2./max(uResolution,64.);
  vec3 ground=vec3(.002,.006,.011);
  vec2 z=p/.965;
  float diskRadius=length(z);
  // Keep neighbouring fragment lanes alive for the derivatives below. The final
  // rim mask returns the ground outside the disk; an early return makes fwidth
  // undefined in the boundary quads on software graphics backends.
  if(diskRadius>=1.) z=vec2(0.);
  float excursion=.38+.24*uVariation;
  vec2 a=excursion*vec2(cos(t),.72*sin(t));
  // Exact disk automorphism. Its denominator has no zero in the open disk.
  z=hypDiv(z-a,vec2(1.,0.)-hypMul(vec2(a.x,-a.y),z));
  float orientation=.0031*uSeed+.13*sin(2.*t);
  z=hypMul(z,vec2(cos(orientation),sin(orientation)));
  // Fundamental sector of the regular {7,3} tessellation.
  float A=PI/7., B=PI/3.;
  float denominator=sqrt(cos(B)*cos(B)-sin(A)*sin(A));
  float centre=cos(B)/denominator, radius=sin(A)/denominator;
  vec2 c=vec2(centre,0.);
  for(int i=0;i<36;i++){
    float angle=atan(z.y,z.x), sector=floor((angle+A)/(2.*A));
    float turn=-sector*2.*A;
    z=hypMul(z,vec2(cos(turn),sin(turn))); z.y=abs(z.y);
    vec2 delta=z-c;
    float distance2=dot(delta,delta);
    if(distance2>=radius*radius) break;
    // Reflection in an orthogonal circle is a hyperbolic isometry.
    z=c+radius*radius*delta/distance2;
  }
  float conformal=max(1.-dot(z,z),1e-6);
  float signedSine=(dot(z-c,z-c)-radius*radius)/(radius*conformal);
  float edge=asinh(max(signedSine,0.));
  float radial=2.*atanh(min(length(z),.99999));
  float aa=max(fwidth(edge),pixel*.5);
  float edgeInk=hypLine(edge,.009,aa);
  float inset=hypLine(edge-.060,.005,aa);
  // Seven exact orthogonal-circle arcs form a {7/2} geodesic star.
  float r=.252+.008*sin(t), span=2.*PI/7.;
  float gc=(1.+r*r)/(2.*r*cos(span)), gr=sqrt(gc*gc-1.);
  float star=10.;
  for(int j=0;j<7;j++){
    float a=TAU*float(j)/7.;
    vec2 centreStar=gc*vec2(cos(a),sin(a));
    float distance=asinh((dot(z-centreStar,z-centreStar)-gr*gr)/(gr*conformal));
    star=min(star,abs(distance));
  }
  float aaStar=max(fwidth(star),pixel*.35);
  float inside=1.-smoothstep(r,r+max(fwidth(length(z)),1e-5),length(z));
  float engraving=hypLine(star,.005,aaStar)*inside;
  float tracery=hypLine(star-.028,.003,aaStar)*inside;
  float inner=hypLine(radial-.152,.004,max(fwidth(radial),pixel*.35));
  vec3 gold=vec3(1.8,.9,.19), porcelain=vec3(1.5,1.72,1.68), teal=vec3(.016,.32,.29);
  vec3 color=ground+porcelain*.62*edgeInk+gold*.9*engraving+teal*(.8*inset+.9*tracery+.5*inner);
  float rim=1.-smoothstep(1.-2.*pixel,1.,diskRadius);
  return mix(ground,max(color,vec3(0.)),rim);
}`;

const PHASON = `
float phCross(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
float phLine(float d,float width,float aa){return 1.-smoothstep(width,width+aa,abs(d));}
vec3 artwork(vec2 p){
  const float TAU=6.28318530718;
  float t=TAU*uPhase, orientation=.0009*uSeed;
  float c=cos(orientation),s=sin(orientation);
  vec2 x=5.4*mat2(c,s,-s,c)*p;
  float amplitude=.18+.35*uVariation;
  vec2 w=vec2(.137,.091)+amplitude*vec2(cos(t),sin(t));
  vec2 physical[5],internal[5];float gamma[5];
  for(int j=0;j<5;j++){
    float a=TAU*float(j)/5.;
    physical[j]=vec2(cos(a),sin(a));internal[j]=vec2(cos(2.*a),sin(2.*a));
    gamma[j]=dot(internal[j],w);
  }
  float aa=10.8/max(uResolution,64.);
  vec3 ground=vec3(.002,.005,.009),color=vec3(0.);
  float acceptedCoverage=0.;
  for(int i=0;i<5;i++)for(int j=i+1;j<5;j++){
    vec2 u=physical[i],v=physical[j];float determinant=phCross(u,v),area=abs(determinant);
    vec2 estimate=floor(.4*vec2(dot(u,x),dot(v,x))+vec2(gamma[i],gamma[j]));
    // A dual tile has x=(5/2)r+sum(s_l u_l), 0<=s_l<=1.
    // The projection error is <0.65 in each grid coordinate: two levels suffice.
    for(int ni=0;ni<2;ni++)for(int nj=0;nj<2;nj++){
      vec2 levels=estimate+vec2(float(ni),float(nj));
      vec2 grid=levels-vec2(gamma[i],gamma[j]);
      vec2 r=vec2(grid.x*v.y-grid.y*u.y,u.x*grid.y-v.x*grid.x)/determinant;
      vec2 base=levels.x*u+levels.y*v;
      vec2 rest[3];float blend[3];int index=0;
      for(int k=0;k<5;k++)if(k!=i&&k!=j){
        vec2 e=physical[k];float h=dot(e,r)+gamma[k],integer=floor(h+.5);
        float ai=phCross(e,v)/determinant,aj=phCross(u,e)/determinant;
        vec2 derivative=internal[k]-ai*internal[i]-aj*internal[j];
        // Smooth a phason flip in internal-space distance, not in clock time.
        float width=.014*length(derivative);
        rest[index]=e;blend[index]=smoothstep(-width,width,h-integer);
        base+=integer*e;index++;
      }
      for(int state=0;state<8;state++){
        vec2 b=base;float weight=1.;
        for(int k=0;k<3;k++){
          float bit=float((state>>k)&1);
          b+=bit*rest[k];weight*=mix(1.-blend[k],blend[k],bit);
        }
        if(weight<=0.)continue;
        vec2 centre=b+.5*(u+v),d=x-centre;
        vec2 local=vec2(phCross(d,v),phCross(u,d))/determinant;
        float edge=(max(abs(local.x),abs(local.y))-.5)*area;
        if(edge>aa)continue;
        float coverage=1.-smoothstep(-aa,aa,edge);
        float line=phLine(edge,.010,aa);
        float thick=step(.8,area);
        vec2 acute=.5*(u+sign(dot(u,v))*v);
        float arc=min(abs(length(d-acute)-.5),abs(length(d+acute)-.5));
        float engraving=phLine(arc,.007,aa);
        float diagonal=abs(phCross(d,acute))/length(acute);
        float spine=phLine(diagonal,.005,aa);
        vec3 gold=vec3(2.,.72,.095),ivory=vec3(1.65,1.78,1.67),blue=vec3(.001,.007,.015);
        vec3 tile=blue*(.4+.8*thick)+mix(gold,ivory,thick)*(.72*line+.12*engraving);
        tile+=gold*(.014+.19*spine)*(1.-thick);
        color+=weight*coverage*tile;
        acceptedCoverage+=weight*coverage;
      }
    }
  }
  // Simultaneous local flips are not disjoint events. Normalize their optical
  // mixture so overlapping acceptance windows cannot pump the face brightness.
  return ground+max(color,vec3(0.))/max(acceptedCoverage,.05);
}`;

const VORTICES = `
vec2 voMul(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
float voLine(float value,float width){float aa=max(fwidth(value),1e-5);return 1.-smoothstep(width,width+aa,abs(value));}
vec3 artwork(vec2 p){
  const float TAU=6.28318530718;
  float t=TAU*uPhase, seed=.21*sin(uSeed*.0097);
  float angle=.16*sin(t+seed);
  vec2 z=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*p;
  vec2 wave=vec2(1.,0.);
  vec2 phaseGradient=vec2(48.*z.x+8.*z.y,-48.*z.y+8.*z.x);
  float nearest=10., chargeField=0.;
  float separation=.35+.22*uVariation;
  for(int j=0;j<3;j++){
    float a=TAU*float(j)/3.;
    vec2 positive=(.59+.08*sin(t+a))*vec2(cos(a+t),sin(a+t));
    vec2 negative=separation*vec2(cos(a-t+.7),sin(a-t+.7))+.13*vec2(sin(t),cos(2.*t));
    vec2 plus=z-positive,minus=z-negative;
    float p2=dot(plus,plus),m2=dot(minus,minus);
    vec2 f=plus*inversesqrt(p2+.0016),g=vec2(minus.x,-minus.y)*inversesqrt(m2+.0016);
    vec2 pair=voMul(f,g);
    wave=voMul(wave,voMul(pair,voMul(pair,pair)));
    phaseGradient+=3.*(vec2(-plus.y,plus.x)/max(p2,1e-7)-vec2(-minus.y,minus.x)/max(m2,1e-7));
    nearest=min(nearest,sqrt(min(p2,m2)));
    chargeField+=.028/(p2+.05)-.028/(m2+.05);
  }
  float carrier=24.*(z.x*z.x-z.y*z.y)+8.*z.x*z.y+2.*sin(t);
  wave=voMul(wave,vec2(cos(carrier),sin(carrier)));
  float amplitude=length(wave);
  vec2 direction=wave/max(amplitude,.002);
  // Analytic phase-gradient scaling prevents broad chalk bands at saddles.
  float contourGradient=length(phaseGradient)*max(abs(direction.y),.01);
  float strand=voLine(direction.x,min(.095,.0019*contourGradient));
  float parallel=voLine(direction.x-.62,min(.035,.0011*contourGradient));
  float visibility=smoothstep(.005,.09,amplitude);
  float coreRing=voLine(nearest-.030,.003)*(1.-smoothstep(.025,.08,nearest));
  vec3 ivory=vec3(1.6,1.78,1.75), cold=vec3(.03,.38,.72), warm=vec3(1.6,.30,.08);
  vec3 hue=mix(cold,warm,.5+.5*tanh(2.2*chargeField));
  vec3 color=vec3(.002,.004,.009)+visibility*(ivory*.82*strand+hue*.65*parallel);
  color+=hue*.82*coreRing;
  return max(color,vec3(0.));
}`;

export const MATHEMATICS_04_SHADERS = [
  {
    id:'hyperbolic', title:'Hyperbolic', subtitle:'Seven sides, three at each vertex', movieCrf:12,
    description:'A regular hyperbolic tiling viewed through a moving disk isometry.',
    technique:'Exact {7,3} circle-reflection tiling in the Poincaré disk; periodic Möbius translation.',
    formula:'Mₐ(z)=(z−a)/(1−āz); reflection z↦c+R²(z−c)/|z−c|²',
    duration:12,exposure:1,collection:4,kind:'shader',palette:'native',source:HYPERBOLIC,
  },
  {
    id:'phason',title:'Phason',subtitle:'A loop through internal space',
    description:'Dual pentagrid rhombi rearrange through local phason flips on a closed internal-space path.',
    technique:'Dual pentagrid rhombi; optical crossfades during local flips along a closed internal-space path.',
    formula:'uⱼ·r+γⱼ=nⱼ; X=Σⱼ⌈uⱼ·r+γⱼ⌉uⱼ; γⱼ=uⱼ⊥·w(t)',
    duration:12,exposure:1,collection:4,kind:'shader',palette:'native',source:PHASON,
  },
  {
    id:'vortices',title:'Vortices',subtitle:'Six phase singularities braid',
    description:'Opposite-charge phase vortices deform and reconnect visible nodal fringes.',
    technique:'Three charge +3 and three charge −3 complex factors; saddle carrier and analytic contour-width control.',
    formula:'Ψ=eⁱφ ∏ⱼ[(z−aⱼ)(z̄−b̄ⱼ)/√((|z−aⱼ|²+ε²)(|z−bⱼ|²+ε²))]³',
    duration:12,exposure:1,collection:4,kind:'shader',palette:'native',source:VORTICES,
  },
];
