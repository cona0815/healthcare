import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANKLE_CRITERIA,ANGEL_CRITERIA,BAND_CRITERIA,assistedPrompt,wallSitPrompt} from '../services/exerciseKinds';
import {exampleJogReport,parseJogReport,compareReports,reportScore} from '../services/jogReports';
test('ankle report requires ankle observations, missing motion stays unknown',()=>{
 const r=exampleJogReport('seated_ankle');
 assert.deepEqual(r.items.map(i=>i.id),ANKLE_CRITERIA.map(c=>c.id));
 const items=r.items.map(i=>({...i,score:i.id==='toe_raise'?null:4,status:i.id==='toe_raise'?'unknown':'good',time:i.id==='toe_raise'?'':'00:05'}));
 const parsed=parseJogReport({...r,items},'踮腳.mp4','side',10,'shoes','seated_ankle');
 assert.equal(parsed.items.find(i=>i.id==='toe_raise')?.score,null);
 assert.equal(reportScore(parsed),100);
 assert.throws(()=>parseJogReport(exampleJogReport(),'x','side',20,'shoes','seated_ankle'));
 assert.match(assistedPrompt('seated_ankle','side','shoes'),/另一項必須 unknown/);
});
test('opposite wall-facing variants cannot compare even with matching category IDs',()=>{
 const front=exampleJogReport('wall_angel'),back=exampleJogReport('snow_angel');
 assert.deepEqual(front.items.map(i=>i.id),ANGEL_CRITERIA.map(c=>c.id));
 assert.equal(compareReports(front,back),null);
 assert.equal(compareReports(front,front)?.[0].delta,0);
 assert.match(assistedPrompt('wall_angel','side','shoes'),/不要因為背部沒有貼牆/);
 assert.match(assistedPrompt('snow_angel','front','shoes'),/不要強迫頭、手肘、手腕全貼牆/);
});
test('revised wall rubric preserves old results without comparing incompatible versions',()=>{
 const wall=exampleJogReport('wall_sit');
 assert.equal(wall.protocol,'wall-v2');
 assert.equal(compareReports(wall,{...wall,protocol:'wall-v1'}),null);
 assert.match(wallSitPrompt('side','shoes'),/不因淺蹲、未到水平或抬手本身扣分/);
});
test('band wall slides require dedicated observations and never compare with unbanded versions',()=>{
 const band=exampleJogReport('band_wall_slide');
 assert.equal(band.protocol,'band-wall-v2');
 assert.deepEqual(band.items.map(i=>i.id),BAND_CRITERIA.map(c=>c.id));
 assert.equal(compareReports(band,exampleJogReport('wall_angel')),null);
 assert.throws(()=>parseJogReport(exampleJogReport('snow_angel'),'x','side',20,'shoes','band_wall_slide'));
 const items=band.items.map(i=>i.id==='band'?{...i,status:'unknown',score:null,time:''}:i);
 const parsed=parseJogReport({...band,items},'band.mp4','side',20,'shoes','band_wall_slide');
 assert.equal(parsed.items.find(i=>i.id==='band')?.score,null);
 const prompt=assistedPrompt('band_wall_slide','side','shoes');
 assert.match(prompt,/不要沿用背靠牆/);assert.match(prompt,/離牆後伸本身不是錯誤/);assert.match(prompt,/禁止時間區間/);assert.equal(compareReports(band,{...band,protocol:'band-wall-v1'}),null);
 assert.match(prompt,/無法看清彈力帶或手腕時必須 unknown/);
 assert.match(prompt,/不能由顏色、伸長量或畫面推算阻力/);
});
