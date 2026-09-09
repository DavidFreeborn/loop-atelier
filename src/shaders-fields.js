/** Original complex-dynamics and diffraction studies; no borrowed shader code. */
export const COMPLEX_SHADERS = [
  {
    id: 'monodromy', title: 'Monodromy', subtitle: 'Five roots exchange their identities',
    description: 'Copper, deep blue and ivory territories unfold into recursively branching borders. Three roots braid in one direction while two braid in the other; the polynomial returns to its beginning even though its roots have exchanged places.',
    technique: 'Newton iteration of a degree-five complex polynomial built from a cubic and a quadratic factor. Periodic coefficients produce root monodromy. Smooth orbit effort supplies engraved contours; converged root position supplies a continuous, label-independent palette.',
    formula: 'P(z,t) = [(z−c(t))³−a(t)][(z−d(t))²−b(t)]; zₙ₊₁ = zₙ − P/P′',
    duration: 12, exposure: 1, collection: 3, kind: 'shader', palette: 'native',
    source: `
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x); }
vec2 cdiv(vec2 a, vec2 b) { return cmul(a,vec2(b.x,-b.y))/max(dot(b,b),1e-24); }
vec2 cis(float a) { return vec2(cos(a),sin(a)); }
float engraved(float phase, float width) {
  float pixel = max(fwidth(phase), 1e-4);
  float line = 1.0-smoothstep(width, width+pixel, abs(sin(phase)));
  return mix(line, 2.0*width/3.14159265359, smoothstep(.45,1.8,pixel));
}
vec3 artwork(vec2 p) {
  float tau=6.28318530718, t=tau*uPhase, seed=.37*sin(uSeed*.0137);
  vec2 c=.19*vec2(cos(t+.4),sin(t-.2));
  vec2 d=.29*vec2(cos(t+2.1),sin(t+1.2));
  vec2 a=(.48+.16*cos(t+.2))*cis(t+seed);
  vec2 b=(.16+.07*sin(t+.8))*cis(-t+.9+seed);
  float tilt=.14*sin(t);
  mat2 rotation=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt));
  vec2 z=rotation*(p*(1.12+.32*uVariation));
  float effort=0.0;
  for(int i=0;i<28;i++) {
    vec2 zc=z-c, zd=z-d, zc2=cmul(zc,zc);
    vec2 A=cmul(zc2,zc)-a, B=cmul(zd,zd)-b;
    vec2 f=cmul(A,B), df=3.0*cmul(zc2,B)+2.0*cmul(zd,A);
    float residual=length(f);
    effort+=(1.0-exp(-3.2*sqrt(residual)))*smoothstep(1e-5,1e-3,residual);
    if(residual>1e-8) {
      z-=cdiv(f,df);
      // Only near singular Newton poles: keep powers inside Float32 range.
      z*=min(1.0,1000.0/max(length(z),1e-12));
    }
  }
  // Smooth through roots crossing the origin; atan would rotate an entire
  // basin's colour abruptly even though the root itself moves continuously.
  vec2 direction=z*inversesqrt(dot(z,z)+.15*.15);
  float warm=.5+.5*(direction.y*cos(.65)+direction.x*sin(.65));
  vec3 ink=vec3(.012,.039,.075), copper=vec3(1.35,.34,.095), chalk=vec3(1.75,1.52,1.04);
  vec3 pigment=mix(ink,copper,smoothstep(.12,.85,warm));
  float secondHarmonic=(direction.x*direction.x-direction.y*direction.y)*cos(.8)+2.0*direction.x*direction.y*sin(.8);
  pigment=mix(pigment,chalk,.42*smoothstep(.45,1.0,.5+.5*secondHarmonic));
  float relief=.34+.66*exp(-.13*effort);
  float fine=engraved(8.3*effort+.6*direction.y,.14);
  float broad=engraved(2.3*effort+.5,.08);
  float border=1.0-exp(-.065*max(effort-5.0,0.0));
  vec3 color=pigment*relief*(.58+.42*fine);
  color+=vec3(.32,.58,.7)*border*(.25+.75*broad);
  color+=chalk*.27*broad*exp(-.06*effort);
  return max(color,vec3(0.0));
}`,
  },
  {
    id: 'caustic', title: 'Caustic', subtitle: 'Two quartic wavefronts collide',
    description: 'Amber and glacial wavefronts braid through a folded cubic plane. Six spreading arms gather into cusps, exchange fine fringes and open deep channels of destructive interference.',
    technique: 'Direct midpoint quadrature of two finite-aperture quartic diffraction integrals. A periodic cubic map bends their control plane into a braid. Color follows relative wave strength, while coherent interference alone supplies the light. This is a scalar wave study with an artistic coordinate embedding, not a ray-traced fluid simulation.',
    formula: 'Ψ(X,Y)=∫w(s) exp[ik(s⁴/4+Xs²/2+Ys)] ds; I=|Ψ₁+eⁱθΨ₂|²',
    duration: 12, exposure: 1, collection: 3, kind: 'shader', palette: 'native',
    source: `
vec2 phaseUnit(float a) { return vec2(cos(a),sin(a)); }
vec3 artwork(vec2 p) {
  float tau=6.28318530718, t=tau*uPhase, seed=.29*sin(uSeed*.021);
  float turn=.22*sin(t+seed);
  mat2 rotation=mat2(cos(turn),sin(turn),-sin(turn),cos(turn));

  vec2 z=rotation*p;
  vec2 z2=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y);
  vec2 z3=vec2(z2.x*z.x-z2.y*z.y,z2.x*z.y+z2.y*z.x);
  float twisting=.5*sin(t);
  mat2 twist=mat2(cos(twisting),sin(twisting),-sin(twisting),cos(twisting));
  vec2 q=1.45*tanh(.9*(1.35*z3-(.55+.18*cos(t))*twist*z));
  float separation=.54+.32*cos(t);
  float bend=.16+.18*uVariation;
  vec2 first=vec2(2.7*(q.x-separation)-.78, 3.15*q.y+.58*sin(t+.3)+bend*q.x*q.x);
  vec2 second=vec2(-2.7*(q.x+separation)-.78, 3.15*q.y-.58*sin(t+.3)-bend*q.x*q.x);
  float k=16.0+8.0*uVariation;
  vec2 waveA=vec2(0.0), waveB=vec2(0.0);
  // Fixed, independent quadrature: no time stepping or texture feedback.
  for(int i=0;i<256;i++) {
    float s=-1.7+(float(i)+.5)*(3.4/256.0);
    float s2=s*s, quartic=.25*s2*s2;
    float aperture=.5+.5*cos(3.14159265359*s/1.7);
    float phaseA=k*(quartic+.5*first.x*s2+first.y*s);
    float phaseB=k*(quartic+.5*second.x*s2+second.y*s);
    waveA+=aperture*phaseUnit(phaseA);
    waveB+=aperture*phaseUnit(phaseB);
  }
  waveA*=3.4/256.0; waveB*=3.4/256.0;
  float angle=1.2*sin(t-.4)+seed+9.0*q.x-6.0*q.y;
  vec2 phasedB=vec2(waveB.x*cos(angle)-waveB.y*sin(angle),waveB.x*sin(angle)+waveB.y*cos(angle));
  float IA=dot(waveA,waveA), IB=dot(waveB,waveB), interference=dot(waveA+phasedB,waveA+phasedB);
  // An explicit artistic intensity transfer suppresses the broad low-level
  // field, giving destructive-interference channels a clear graphic presence.

  float energy=pow(1.1*interference,1.55);
  float balance=IA/max(IA+IB,1e-8);
  vec3 hue=mix(vec3(.025,.42,.94),vec3(1.65,.32,.045),smoothstep(.18,.82,balance));
  vec3 color=energy*hue;
  color+=vec3(.7,.79,.73)*.065*energy*energy;
  // A subdued full-frame field preserves the darkest destructive interference.
  color+=vec3(.0025,.006,.011);
  return max(color,vec3(0.0));
}`,
  },
];
