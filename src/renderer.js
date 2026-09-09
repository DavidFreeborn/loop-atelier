/**
 * Loop Atelier renderer. Independent implementation, no dependencies.
 * Geometry is a pure function of phase. Exposure is accumulated in a floating
 * point framebuffer, then tone mapped once, after all temporal samples.
 */
export const wrap = t => ((t % 1) + 1) % 1;
export const VERSION = '2.1.0';
const samplePatterns=new Map();
/** Independently permuted pixel strata, exactly centred for every sample count. */
export function samplePattern(n) {
  n=Math.max(1,Math.min(64,Math.round(n)));
  if(samplePatterns.has(n))return samplePatterns.get(n);
  const shuffle=seed=>{
    const a=Array.from({length:n},(_,i)=>i);
    for(let i=n-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=Math.floor(seed/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };
  const x=shuffle(731),y=shuffle(9137);
  const pattern=Object.freeze(x.map((v,i)=>Object.freeze([(v+.5)/n-.5,(y[i]+.5)/n-.5])));
  samplePatterns.set(n,pattern);return pattern;
}

const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 aParticle;
uniform vec2 uRotation;
uniform float uDistance, uSize, uPointSize, uWeight;
out float vLight;
void main() {
  float cy=cos(uRotation.x), sy=sin(uRotation.x);
  float cp=cos(uRotation.y), sp=sin(uRotation.y);
  vec3 p=aParticle.xyz;
  p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
  p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);
  float perspective=uDistance/(uDistance-p.z);
  gl_Position=vec4(p.xy*2.65/(uDistance-p.z),0.,1.);
  float footprint=uPointSize*uSize/800.*perspective;
  gl_PointSize=max(1.,footprint);
  // Subpixel points still rasterize as one-pixel sprites. Preserve their
  // intended energy so a small preview does not become disproportionately bright.
  vLight=aParticle.w * mix(.42,1.,smoothstep(-1.1,1.1,p.z)) * uWeight * min(1.,footprint*footprint);
}`;
const fragment = `#version 300 es
precision highp float;
in float vLight;
out vec4 colour;
void main() {
  vec2 p=gl_PointCoord*2.-1.;
  float r=dot(p,p);
  if(r>1.) discard;
  float coverage=1.-smoothstep(.06,1.,r);
  colour=vec4(vec3(vLight*coverage),1.);
}`;
const screenVertex = `#version 300 es
precision highp float;
out vec2 uv;
void main(){
  vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
  uv=p; gl_Position=vec4(p*2.-1.,0.,1.);
}`;
const screenFragment = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform float uExposure;
uniform int uPalette, uColour;
in vec2 uv;
out vec4 colour;
void main(){
  if(uColour==1 && uPalette==3) {
    vec3 v=1.-exp(-max(vec3(0.),texture(uImage,uv).rgb)*uExposure);
    colour=vec4(mix(12.92*v,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v)),1.);
    return;
  }
  vec3 radiance=texture(uImage,uv).rgb;
  float light=1.-exp(-(uColour==1?dot(radiance,vec3(.2126,.7152,.0722)):radiance.r)*uExposure);
  // Linear radiance -> sRGB. This preserves delicate low-density filaments.
  float s=light<=.0031308 ? 12.92*light : 1.055*pow(light,1./2.4)-.055;
  vec3 bg=vec3(.018,.022,.028), ink=vec3(.95,.96,.98);
  if(uPalette==1) { bg=vec3(.025,.019,.014); ink=vec3(.99,.79,.48); }
  if(uPalette==2) { bg=vec3(.94,.925,.89); ink=vec3(.085,.105,.13); }
  colour=vec4(mix(bg,ink,clamp(s,0.,1.)),1.);
}`;

function program(gl, vs, fs) {
  const compiled=[];
  for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const error=gl.getShaderInfoLog(shader); gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }
    compiled.push(shader);
  }
  const p=gl.createProgram(); compiled.forEach(s=>gl.attachShader(p,s)); gl.linkProgram(p);
  compiled.forEach(s=>gl.deleteShader(s));
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export class LoopRenderer {
  constructor(canvas) {
    this.canvas=canvas;
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl) throw new Error('This studio needs WebGL 2. Enable hardware acceleration or use a current desktop browser.');
    this.gl=gl;
    this.maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.hdr=!!gl.getExtension('EXT_color_buffer_float');
    this.points=program(gl,vertex,fragment);
    this.screen=program(gl,screenVertex,screenFragment);
    this.buffer=gl.createBuffer();
    this.vao=gl.createVertexArray();
    gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);
    this.emptyVao=gl.createVertexArray();
    this.target=gl.createFramebuffer(); this.texture=gl.createTexture();
    this.uniforms={};
    this.artPrograms=new Map();
    for(const [key,p,names] of [['p',this.points,['uRotation','uDistance','uSize','uPointSize','uWeight']],['s',this.screen,['uImage','uExposure','uPalette','uColour']]]) {
      this.uniforms[key]=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)]));
    }
    this.allocated=0;
    this.resize(canvas.width || 800);
  }
  resize(size) {
    const gl=this.gl;
    if(gl.isContextLost()) return false;
    size=Math.floor(Math.max(64,Math.min(this.maxTextureSize,size)));
    if(size===this.size) return;
    this.size=size; this.canvas.width=size; this.canvas.height=size;
    gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,this.hdr ? gl.RGBA16F : gl.RGBA8,size,size,0,gl.RGBA,this.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('The graphics device cannot allocate this output size. Try a smaller resolution.');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  render(scene, phase, options={}) {
    const gl=this.gl, p=this.uniforms.p, s=this.uniforms.s;
    if(gl.isContextLost()) return false;
    const {samples=1,shutter=.65,fps=30,duration=8,exposure=1,palette=scene.palette||'silver',camera={yaw:0,pitch:0,distance:3.4},pointSize=1.5,variation=.5}=options;
    const n=Math.max(1,Math.min(64,Math.round(samples)));
    gl.viewport(0,0,this.size,this.size);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.target);
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE);
    if(scene.kind==='shader') {
      let art=this.artPrograms.get(scene.source);
      if(!art) {
        const code=`#version 300 es\nprecision highp float;\nuniform float uPhase,uVariation,uSeed,uResolution,uWeight;\nuniform vec2 uJitter;\nin vec2 uv;\nout vec4 colour;\n${scene.source}\nvoid main(){vec3 c=artwork((gl_FragCoord.xy+uJitter)/uResolution*2.-1.);if(any(isnan(c))||any(isinf(c))) c=vec3(0.);colour=vec4(clamp(c,vec3(0.),vec3(32.))*uWeight,1.);}`;
        const pr=program(gl,screenVertex,code);
        art={program:pr,uniforms:Object.fromEntries(['uPhase','uVariation','uSeed','uResolution','uWeight','uJitter'].map(k=>[k,gl.getUniformLocation(pr,k)]))};
        this.artPrograms.set(scene.source,art);
      }
      gl.useProgram(art.program);gl.bindVertexArray(this.emptyVao);
      const u=art.uniforms;
      gl.uniform1f(u.uVariation,variation);gl.uniform1f(u.uSeed,scene.seed);gl.uniform1f(u.uResolution,this.size);gl.uniform1f(u.uWeight,1/n);
      const pattern=samplePattern(n);
      for(let i=0;i<n;i++) {
        const offset=n===1?0:((i+.5)/n-.5)*shutter/(fps*duration);
        gl.uniform1f(u.uPhase,wrap(phase+offset));
        // A stratified pixel footprint complements analytic derivative filtering.
        gl.uniform2f(u.uJitter,...pattern[i]);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
    } else {
    gl.useProgram(this.points); gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.uniform2f(p.uRotation,camera.yaw || 0,camera.pitch || 0);
    gl.uniform1f(p.uDistance,camera.distance || 3.4);
    gl.uniform1f(p.uSize,this.size); gl.uniform1f(p.uPointSize,pointSize);
    // Preserve energy as sample density or the number of shutter samples changes.
    gl.uniform1f(p.uWeight,1.4 * 50000 / scene.count / n);
    for(let i=0;i<n;i++) {
      const offset=n===1 ? 0 : ((i+.5)/n-.5)*shutter/(fps*duration);
      const data=scene.update(wrap(phase+offset),variation);
      if(this.allocated!==data.byteLength) {
        gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW); this.allocated=data.byteLength;
      } else gl.bufferSubData(gl.ARRAY_BUFFER,0,data);
      gl.drawArrays(gl.POINTS,0,scene.count);
    }
    }
    gl.disable(gl.BLEND); gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.useProgram(this.screen); gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.uniform1i(s.uImage,0); gl.uniform1f(s.uExposure,Math.max(.1,exposure));
    gl.uniform1i(s.uPalette,{silver:0,amber:1,paper:2,native:3}[palette] ?? 0);
    gl.uniform1i(s.uColour,scene.kind==='shader'?1:0);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  dispose() {
    const g=this.gl;
    g.deleteProgram(this.points); g.deleteProgram(this.screen); g.deleteBuffer(this.buffer);
    g.deleteTexture(this.texture); g.deleteFramebuffer(this.target);
    g.deleteVertexArray(this.vao); g.deleteVertexArray(this.emptyVao);
    for(const a of this.artPrograms.values())g.deleteProgram(a.program);
    this.artPrograms.clear();
  }
}
