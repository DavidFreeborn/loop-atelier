/** Native movie playback with the same quiet presentation as the studio. */
export function galleryHTML(scenes) {
  const ordered=[...scenes].sort((a,b)=>a.title.localeCompare(b.title));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Loop atelier</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#101113;color:#e4e1da;font:14px/1.5 'Segoe UI',Arial,sans-serif}header,main{max-width:1600px;margin:auto;padding:24px 4%}header{display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid #2d3032}h1{font:400 24px Georgia,serif;margin:0}a{color:inherit;text-underline-offset:5px}a:focus-visible{outline:2px solid #c4b392;outline-offset:5px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px}figure{margin:0;min-width:0}video{width:100%;aspect-ratio:1;display:block;background:#050607}figcaption{padding-top:10px;font-size:14px;color:#c9c8c2}@media(max-width:950px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){main{grid-template-columns:1fr}}
</style></head><body><header><h1>Loop atelier</h1><a href="loop-atelier.html">Studio</a></header><main>
${ordered.map(s=>`<figure><video controls loop muted playsinline preload="metadata" poster="stills/${s.id}.png" aria-label="${s.title}"><source src="loops/${s.id}.mp4" type="video/mp4"><a href="loops/${s.id}.mp4">${s.title} MP4</a></video><figcaption>${s.title}</figcaption></figure>`).join('\n')}
</main></body></html>`;
}
