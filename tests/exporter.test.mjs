/** Movie quality validation must fail before browser launch or output creation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs,codecOptions} from '../scripts/render.mjs';

test('movie defaults preserve each codec and apply the curated MP4 exception',()=>{
 assert.equal(parseArgs(['--format','mp4']).crf,16);
 assert.equal(parseArgs(['--format','webm']).crf,18);
 assert.equal(parseArgs(['--scene','hyperbolic','--format','mp4']).crf,12);
 assert.equal(parseArgs(['--scene','hyperbolic','--format','webm']).crf,18);
 assert.equal(parseArgs(['--scene','hyperbolic','--format','mp4','--crf','16']).crf,16);
 assert.equal(parseArgs([]).crf,undefined);
 assert.equal(parseArgs(['--format','frames']).crf,undefined);
});

test('CRF accepts codec endpoints, including zero as an explicit override',()=>{
 for(const [format,max] of [['mp4',51],['webm',63]])for(const crf of [0,12,max]){
  const options=parseArgs(['--scene','hyperbolic','--format',format,'--crf',String(crf)]);
  assert.equal(options.crf,crf);
  const args=codecOptions(format,options.crf);
  assert.equal(args[args.indexOf('-crf')+1],String(crf));
  assert.equal(args[args.indexOf('-c:v')+1],format==='mp4'?'libx264':'libvpx-vp9');
 }
});

test('CRF rejects fractions, nonfinite values and codec-specific overflow',()=>{
 for(const format of ['mp4','webm'])for(const value of ['-1','12.5','NaN','Infinity',format==='mp4'?'52':'64']){
  assert.throws(()=>parseArgs(['--format',format,'--crf',value]),/--crf must be an integer between/);
 }
 assert.throws(()=>parseArgs(['--format','mp4','--crf']),/Missing value/);
 assert.throws(()=>parseArgs(['--format','mp4','--crf','12','--crf','8']),/Duplicate option/);
});

test('CRF is rejected for stills and frame sequences instead of being ignored',()=>{
 for(const format of ['png','frames'])assert.throws(()=>parseArgs(['--format',format,'--crf','12']),/only supported for MP4 and WebM/);
});

test('CLI reports invalid CRF before dependency discovery or rendering',()=>{
 const entry=fileURLToPath(new URL('../scripts/render.mjs',import.meta.url));
 for(const args of [['--crf','12'],['--format','mp4','--crf','52'],['--format','webm','--crf','1.5']]){
  const result=spawnSync(process.execPath,[entry,...args],{encoding:'utf8',windowsHide:true,env:{...process.env,LOOP_STUDIO_PLAYWRIGHT_PATH:'missing-test-runtime',FFMPEG_PATH:'missing-test-encoder'}});
  assert.equal(result.status,1);
  assert.match(result.stderr,/Export failed: --crf/);
  assert.doesNotMatch(result.stderr,/Playwright|FFMPEG_PATH/);
  assert.doesNotMatch(result.stdout,/Rendering|Graphics/);
 }
});
