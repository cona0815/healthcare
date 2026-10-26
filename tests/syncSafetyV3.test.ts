import {test} from 'node:test';import assert from 'node:assert/strict';
import {SyncQueue} from '../services/syncQueue';
import {createBackup,parseBackup,restoreBackup} from '../services/deviceBackup';
function memory(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}} as Storage;}
test('conflict or old server success never clears pending meal or advances success time',async()=>{
 for(const response of [{status:'success',ignoredStale:true},{status:'success'},{status:'conflict',current:{id:'meal',revision:2}}]){const s=memory();const q=new SyncQueue(s,async()=>response);q.enqueue('cloud','FoodLogs:meal',{type:'FoodLogs',action:'save_meal_v3',operationId:'op',baseRevision:1,data:{id:'meal',revision:2}});await q.flush('cloud');assert.equal(q.list().length,1);assert.equal(s.getItem('hg_sync_last_success'),null);assert.ok(q.list()[0].error);}
});
test('offline coalescing retains original base revision and verified ack clears only its operation',async()=>{
 const s=memory();let sent:any;const q=new SyncQueue(s,async p=>{sent=p;return {status:'success',protocol:3,operationId:p.operationId};});
 q.enqueue('cloud','FoodLogs:a',{type:'FoodLogs',operationId:'one',baseRevision:0,data:{id:'a',revision:1}});q.enqueue('cloud','FoodLogs:a',{type:'FoodLogs',operationId:'two',baseRevision:1,data:{id:'a',revision:2}});await q.flush('cloud');assert.equal(sent.baseRevision,0);assert.equal(q.list().length,0);
});
test('restore rejects malformed records before writing and retains deleted meals across backup round trip',()=>{
 const s=memory();s.setItem('hg_foodLogs','[]');const backup=createBackup(memory(),false);
 for(const invalid of [{},{foodName:'飯',timestamp:'invalid'},{foodName:'飯',timestamp:'2026-10-26',nutrients:{}},{foodName:'飯',timestamp:'2026-10-26',calories:-1}]){backup.data.hg_foodLogs=[invalid];assert.throws(()=>restoreBackup(s,backup,false));assert.equal(s.getItem('hg_foodLogs'),'[]');}
 backup.data.hg_foodLogs=[{id:'deleted',foodName:'飯',timestamp:'2026-10-26T04:00:00Z',deletedAt:'2026-10-26T05:00:00Z',revision:2}];restoreBackup(s,parseBackup(JSON.stringify(backup)),false);assert.equal(JSON.parse(s.getItem('hg_foodLogs')!)[0].id,'deleted');assert.ok(JSON.parse(s.getItem('hg_foodLogs')!)[0].deletedAt);
});
