import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gasHarness} from './gasHarness';

test('GAS without an access token refuses every request so a leaked URL exposes nothing',()=>{
 const h=gasHarness({withToken:false});
 h.send({action:'save',type:'Workouts',data:{id:'w1',type:'快走'}});
 assert.equal(h.sheets.has('Workouts'),false);
 for(const action of ['read_all','list_backups_v3','read_backup_v3','delete','save_meal_v3']){
  const out=h.send({action,type:'Workouts',id:'w1'});
  assert.equal(out.status,'error');assert.equal(out.code,'TOKEN_NOT_SET');assert.equal(out.foodLogs,undefined);assert.equal(out.backups,undefined);
 }
});

test('GAS with an access token rejects missing, wrong or near-miss tokens and accepts the right one',()=>{
 const h=gasHarness();
 const token=h.token!;
 assert.ok(typeof token==='string'&&token.length>=32);
 for(const bad of [undefined,'','wrong',token.slice(0,-1),token+'x',token.toUpperCase()===token?token.toLowerCase():token.toUpperCase()]){
  const out=h.sendRaw({action:'read_all',token:bad});
  assert.equal(out.status,'error');assert.equal(out.code,'UNAUTHORIZED');assert.equal(out.foodLogs,undefined);
 }
 assert.equal(h.sendRaw({action:'save',type:'Workouts',data:{id:'w1',type:'快走'}}).code,'UNAUTHORIZED');
 assert.equal(h.sheets.has('Workouts'),false);
 assert.ok(Array.isArray(h.sendRaw({action:'read_all',token}).foodLogs));
});

test('running setupAccessToken again rotates the password and clearing it locks everything',()=>{
 const h=gasHarness();
 const old=h.token!;
 const fresh=h.context.setupAccessToken();
 assert.notEqual(fresh,old);
 assert.equal(h.sendRaw({action:'read_all',token:old}).code,'UNAUTHORIZED');
 assert.ok(Array.isArray(h.sendRaw({action:'read_all',token:fresh}).foodLogs));
 h.context.clearAccessToken();
 assert.equal(h.sendRaw({action:'read_all',token:fresh}).code,'TOKEN_NOT_SET');
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

test('GAS delete needs an exact, non-empty id',()=>{
 const h=gasHarness();
 h.send({action:'save',type:'Workouts',data:{id:'w1',type:'快走'}});
 h.send({action:'save',type:'Workouts',data:{id:'w2',type:'慢跑'}});
 const before=h.sheets.get('Workouts').rows.length;
 for(const id of ['',undefined,null,0]) h.send({action:'delete',type:'Workouts',id});
 assert.equal(h.sheets.get('Workouts').rows.length,before);
 h.send({action:'delete',type:'Workouts',id:'w1'});
 const ids=h.sheets.get('Workouts').rows.slice(1).map((r:any[])=>String(r[h.sheets.get('Workouts').rows[0].indexOf('id')]).replace(/^'/,''));
 assert.deepEqual(Array.from(ids),['w2']);
});
