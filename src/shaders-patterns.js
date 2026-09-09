/** Original full-frame pattern mechanisms. Sources define artwork(vec2 p).
 * All returned values are nonnegative LINEAR radiance for the shared tone map.
 */
const PALIMPSEST = `
float paBox(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}
float paInside(float d, float aa) { return 1.0 - smoothstep(-aa, aa, d); }
float paLine(float d, float w, float aa) { return 1.0 - smoothstep(w-aa, w+aa, abs(d)); }
float paHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*.0137)*43758.5453); }
vec3 artwork(vec2 p) {
  const float TAU = 6.28318530718;
  vec2 z = p - vec2(-.17,.065);
  float radius = max(length(z), .00001);
  float logarithm = 1.72 * log(radius);
  // One time cycle translates this lattice by (-3,+2). Its material keys
  // repeat every three radial and two angular cells, so the image is periodic.
  vec2 q = vec2(logarithm - 3.0*uPhase,
    6.0*atan(z.y,z.x)/TAU - (.20+.45*uVariation)*logarithm + 2.0*uPhase);
  vec2 cell = floor(q);
  vec2 key = mod(cell,vec2(3.,2.));
  vec2 f = fract(q)-.5;
  if(key.y>.5) f=vec2(-f.y,f.x);
  float aa = min(.18, 3.6/(max(uResolution,64.)*radius));
  float family = key.x;
  float paper = paLine(paBox(f,vec2(.445)),.037,aa);
  float ink = 0.;
  if(family<.5) {
    // Nested rooms with alternating open thresholds, not concentric circles.
    vec2 room=f;
    float scale=1.;
    for(int level=0;level<4;level++) {
      float wall=paLine(paBox(room,vec2(.335*scale)),.023*scale+.004,aa);
      float doorway=paInside(paBox(room-vec2(.335*scale,0.),vec2(.065*scale,.11*scale)),aa);
      paper=max(paper,wall*(1.-doorway));
      room=vec2(-room.y,room.x)-vec2(.024*scale,-.014*scale);
      scale*=.56;
    }
    paper=max(paper,paInside(paBox(f-vec2(.13,-.11),vec2(.07,.19)),aa));
  } else if(family<1.5) {
    paper=max(paper,paInside(paBox(f,vec2(.355,.375)),aa));
    ink=max(ink,paInside(paBox(f+vec2(.06,.015),vec2(.19,.255)),aa));
    float steps=paLine(fract((f.y+.5)*7.)-.5,.11,aa*7.);
    ink=max(ink,steps*paInside(paBox(f-vec2(.245,0.),vec2(.065,.32)),aa));
    ink=max(ink,paInside(paBox(f-vec2(-.22,.28),vec2(.065,.055)),aa));
  } else {
    paper=max(paper,paInside(paBox(f-vec2(-.22,0.),vec2(.08,.34)),aa));
    paper=max(paper,paInside(paBox(f-vec2(.12,.23),vec2(.22,.065)),aa));
    paper=max(paper,paInside(paBox(f-vec2(.12,-.23),vec2(.22,.065)),aa));
    paper=max(paper,paLine(paBox(f-vec2(.075,0.),vec2(.15)),.028,aa));
    float hatch=paLine(fract((f.x+f.y)*10.)-.5,.10,aa*10.);
    paper=max(paper,hatch*paInside(paBox(f-vec2(.255,0.),vec2(.055,.13)),aa));
  }
  float redDoor=paInside(paBox(f-vec2(.08,-.015),vec2(.047,.075)),aa);
  float redRail=paInside(paBox(f-vec2(-.38,.15),vec2(.014,.15)),aa);
  float accent=(redDoor+redRail)*step(.5,paHash(key));
  float tick=paInside(paBox(f-vec2(.365,.34),vec2(.032,.009)),aa);
  paper=max(paper,tick);
  vec3 color=mix(vec3(.001),vec3(3.6),clamp(paper-ink,0.,1.));
  color=mix(color,vec3(3.8,.065,.017),clamp(accent,0.,1.));
  // Deliberate central aperture also removes the unresolved log singularity.
  float aperture=smoothstep(.020,.052,radius);
  color=mix(vec3(.001),color,aperture);
  float seal=paLine(radius-.028,.0017,1.4/max(uResolution,64.));
  return max(mix(color,vec3(3.8,.065,.017),seal),vec3(0.));
}
`;

const SWITCHBOARD = `
float swHash(vec2 p) { return fract(sin(dot(p,vec2(113.7,271.9))+uSeed*.0213)*41537.1941); }
float swEase(float value) { float x=clamp(value,0.,1.);return x*x*x*(x*(6.*x-15.)+10.); }
mat2 swRotation(float a) { float c=cos(a),s=sin(a);return mat2(c,-s,s,c); }
float swBand(float distance, float width, float aa) { return 1.-smoothstep(width-aa,width+aa,abs(distance)); }
vec4 swMechanism(vec2 q, float offset) {
  vec2 cell=floor(q),f=fract(q)-.5;
  float key=swHash(cell);
  float group=swHash(floor(cell*.5));
  float local=fract(uPhase + offset - .051*(cell.x-cell.y) - .13*group);
  float first=swEase((local-.12)/.23);
  float second=swEase((local-.62)/.23);
  // Two quarter turns: final angle differs by pi, an exact symmetry of the
  // paired arcs. Both movement windows have zero velocity and acceleration.
  float angle=1.57079632679*(step(.5,key)+first+second);
  vec2 v=swRotation(angle)*f;
  float distance=min(abs(length(v-vec2(-.5,-.5))-.5),abs(length(v-vec2(.5,.5))-.5));
  float moving=4.*first*(1.-first)+4.*second*(1.-second);
  // The contact fingers retract before the rotor leaves its locked orientation.
  // Cropping is radial and softly gated: no rotating square-edge fragments.
  float retracted=swEase(first/.08)*swEase((1.-first)/.08)
                 +swEase(second/.08)*swEase((1.-second)/.08);
  float diskAA=max(fwidth(length(f)),.0001);
  float disk=1.-smoothstep(.435-diskAA,.435+diskAA,length(f));
  float gate=mix(1.,disk,retracted);
  return vec4(distance,moving,key,gate);
}
vec3 artwork(vec2 p) {
  float density=3.5+1.4*uVariation;
  vec2 q=p*density+vec2(.5);
  vec4 mechanism=swMechanism(q,0.);
  vec4 large=swMechanism(p*1.13+vec2(.5),.21);
  float aa=2.2*density/max(uResolution,64.);
  float largeAA=2.6/max(uResolution,64.);
  float polarity=swBand(large.x,.175,largeAA)*large.w;
  vec3 dark=vec3(.001),paper=vec3(3.7),red=vec3(3.7,.058,.016);
  vec3 background=mix(dark,paper,polarity);
  vec3 foreground=mix(paper,dark,polarity);
  float rails=swBand(mechanism.x,.083,aa)*mechanism.w;
  float channel=swBand(mechanism.x,.031,aa)*mechanism.w;
  vec3 color=mix(background,foreground,rails);
  color=mix(color,background,channel);
  float live=channel*mechanism.y;
  color=mix(color,red,live);
  vec2 f=fract(q)-.5;
  // Fixed port bearings reveal when a route is locked and when it is turning.
  float port=min(min(length(f-vec2(.5,0.)),length(f-vec2(-.5,0.))),
                 min(length(f-vec2(0.,.5)),length(f-vec2(0.,-.5))));
  float bearing=swBand(port-.028,.009,aa);
  color=mix(color,foreground,bearing);
  float pin=1.-smoothstep(.010-aa,.010+aa,port);
  color=mix(color,mix(foreground,red,mechanism.y),pin);
  // A finer etched scale sits in the quiet centres of selected mechanisms.
  float plate=1.-smoothstep(.16,.19,length(f));
  float hatch=swBand(fract((f.x-f.y)*17.)-.5,.08,aa*17.);
  float etch=plate*hatch*step(.53,mechanism.z)*(1.-rails);
  color=mix(color,mix(vec3(.055),vec3(1.8),1.-polarity),etch*.55);
  float boss=swBand(length(f)-.033,.006,aa);
  color=mix(color,foreground,boss*.8);
  return max(color,vec3(0.));
}
`;

export const PATTERN_SHADERS = [
  {
    id:'palimpsest',title:'Palimpsest',subtitle:'An architectural print that consumes itself',
    description:'Rooms, stairways and vermilion thresholds feed into an off-centre aperture. An exact logarithmic transformation repeatedly turns the smallest plan into the largest.',
    technique:'A complex-log lattice with three radial and two angular material periods. Translation through that lattice creates a loxodromic zoom; nested rectilinear motifs provide four scales of detail.',
    formula:'L = 1.72 ln r; q = (L − 3t, 6θ/τ − aL + 2t); material(q + (−3,2)) = material(q)',
    duration:12,exposure:1,collection:3,kind:'shader',palette:'native',source:PALIMPSEST,
  },
  {
    id:'switchboard',title:'Switchboard',subtitle:'Routes lock, release and find another order',
    description:'An interlocking print of paired tracks rearranges through staggered quarter turns. Larger routes reverse the black-and-white ground while vermilion channels mark mechanisms in motion.',
    technique:'Two nested Truchet scales use quintic stop-and-turn schedules. A half-turn is an exact symmetry of each paired-arc motif, making the punctuated mechanism image-periodic.',
    formula:'α = (π/2)[b + E((s−.12)/.23) + E((s−.62)/.23)], s = fract(t−delay)',
    duration:12,exposure:1,collection:3,kind:'shader',palette:'native',source:SWITCHBOARD,
  },
];
