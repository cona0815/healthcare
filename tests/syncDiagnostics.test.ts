import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SyncQueue} from '../services/syncQueue';
import {dbService} from '../services/dbService';
test('GAS deleted acknowledgement clears deletes but never acknowledges a save',async()=>{const data=new Map<string,string>();const queue=new SyncQueue({getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)} as Storage,async()=>({status:'deleted'}));queue.enqueue('cloud','a',{action:'delete'});await queue.flush('cloud');assert.equal(queue.list().length,0);queue.enqueue('cloud','b',{action:'save'});await queue.flush('cloud');assert.equal(queue.list().length,1);assert.equal(queue.list()[0].attempts,1);});
test('cloud connection test rejects error JSON, unrelated JSON and HTTP errors',async()=>{const original=globalThis.fetch;try{for(const response of [Response.json({status:'error',message:'Permission denied'}),Response.json({hello:'world'}),Response.json({},{status:503})]){globalThis.fetch=async()=>response;await assert.rejects(dbService.testConnection('https://script.google.com/macros/s/test/exec'));}}finally{globalThis.fetch=original;}});
test('cloud connection test needs a password and refuses a GAS that ignores it',async()=>{const original=globalThis.fetch;const url='https://script.google.com/macros/s/test/exec';const token='t'.repeat(64);const ok={foodLogs:[],workouts:[],profile:{}};try{
 globalThis.fetch=async()=>Response.json(ok);
 await assert.rejects(dbService.testConnection(url,''),/存取密碼/);
 // 舊版 GAS 不檢查密碼：任何密碼都回資料，必須拒絕儲存。
 await assert.rejects(dbService.testConnection(url,token),/沒有啟用存取密碼保護/);
 // 有保護的 GAS：正確密碼回資料，錯誤密碼回 UNAUTHORIZED。
 globalThis.fetch=async(_u:any,init:any)=>{const body=JSON.parse(init.body);return body.token===token?Response.json(body.action==='read_all'?ok:{status:'success',backups:[]}):Response.json({status:'error',code:'UNAUTHORIZED',message:'bad token'});};
 assert.equal(await dbService.testConnection(url,token),true);
 await assert.rejects(dbService.testConnection(url,'wrong-token'),/bad token/);
 // 還沒執行 setupAccessToken 的 v4 GAS。
 globalThis.fetch=async()=>Response.json({status:'error',code:'TOKEN_NOT_SET',message:'這個 GAS 還沒設定存取密碼'});
 await assert.rejects(dbService.testConnection(url,token),/還沒設定存取密碼/);
}finally{globalThis.fetch=original;}});
