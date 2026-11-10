import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gasHarness} from './gasHarness';

test('GAS without an access token keeps the old open behaviour so existing deployments do not break',()=>{
 const h=gasHarness();
 const out=h.send({action:'read_all'});
 assert.ok(Array.isArray(out.foodLogs));
});

test('GAS with an access token rejects missing or wrong tokens and accepts the right one',()=>{
 const h=gasHarness();
 const token=h.context.setupAccessToken();
 assert.ok(typeof token==='string'&&token.length>=32);
 for(const bad of [undefined,'','wrong']){
  const out=h.send({action:'read_all',token:bad});
  assert.equal(out.status,'error');assert.equal(out.code,'UNAUTHORIZED');assert.equal(out.foodLogs,undefined);
 }
 assert.equal(h.send({action:'save',type:'Workouts',data:{id:'w1',type:'快走'}}).code,'UNAUTHORIZED');
 assert.equal(h.sheets.has('Workouts'),false);
 assert.ok(Array.isArray(h.send({action:'read_all',token}).foodLogs));
 h.context.clearAccessToken();
 assert.ok(Array.isArray(h.send({action:'read_all'}).foodLogs));
});

test('GAS only writes or deletes the eight known data sheets',()=>{
 const h=gasHarness();
 const save=h.send({action:'save',type:'BackupIndexV3',data:{id:'x'}});
 assert.equal(save.status,'error');assert.equal(h.sheets.has('BackupIndexV3'),false);
 const del=h.send({action:'delete',type:'MealVersionsV3',id:'x'});
 assert.equal(del.status,'error');
 assert.notEqual(h.send({action:'save',type:'Workouts',data:{id:'w1',type:'快走',duration:30}}).status,'error');
 assert.equal(h.sheets.has('Workouts'),true);
});

test('GAS ignores field names that a spreadsheet would treat as formulas',()=>{
 const h=gasHarness();
 h.send({action:'save',type:'Workouts',data:{id:'w1',type:'快走','=IMPORTDATA("https://x")':'1','+cmd':'2','@SUM(A1)':'3','-x':'4'}});
 const headers=h.sheets.get('Workouts').rows[0];
 assert.deepEqual(Array.from(headers as string[]).filter((k:string)=>/^[=+\-@]/.test(k)),[]);
 assert.ok(headers.includes('id')&&headers.includes('type'));
 h.send({action:'save',type:'Profile',data:{name:'王小明','=HYPERLINK("x")':'y'}});
 assert.deepEqual(Array.from(h.sheets.get('Profile').rows[0] as string[]).filter((k:string)=>/^=/.test(k)),[]);
});
