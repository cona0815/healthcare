import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {GAS_CODE} from '../components/GasSetup';
test('GAS meal upserts ignore stale retries and retain deletions until explicit higher revision restore',()=>{
 const rows:any[]=[];const headers=['id','timestamp','revision','deletedAt','foodName'];
 const sheet={getDataRange:()=>({getValues:()=>[headers,...rows.map(r=>headers.map(k=>r[k]??''))]}),deleteRow:(n:number)=>rows.splice(n-2,1)};
 const context:any={SpreadsheetApp:{getActiveSpreadsheet:()=>({})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:(text:string)=>({setMimeType:()=>JSON.parse(text)})}};
 vm.runInNewContext(GAS_CODE,context);context.getOrCreateSheet=()=>sheet;context.readSheet=()=>rows;context.appendData=(_s:any,data:any)=>rows.push({...data});
 const send=(data:any)=>context.doPost({postData:{contents:JSON.stringify({action:'save',type:'FoodLogs',data})}});
 const food={id:'a',timestamp:'2026-10-26T04:00:00Z',foodName:'飯',revision:1};
 assert.equal(send(food).status,'success');send(food);assert.equal(rows.length,1);
 send({...food,revision:2,timestamp:'2026-10-27T04:00:00Z'});assert.equal(rows.length,1);
 send({...food,revision:3,deletedAt:'deleted'});send({...food,revision:2});assert.equal(rows[0].deletedAt,'deleted');
 send({...food,revision:4,deletedAt:''});assert.equal(rows.length,1);assert.equal(rows[0].deletedAt,'');
});
