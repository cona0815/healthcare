import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
import {GAS_CODE} from '../components/GasSetup';
// 預設會先執行 setupAccessToken，send() 自動帶上密碼；要測未設密碼或錯誤密碼時用 {withToken:false} 或 sendRaw()。
export function gasHarness(options:{withToken?:boolean}={}){
 const sheets=new Map<string,any>();const props=new Map<string,string>();let failWrite=false;
 const make=(name:string)=>{const rows:any[][]=[];const sheet={rows,getLastRow:()=>rows.length,getLastColumn:()=>Math.max(0,...rows.map(r=>r.length)),getDataRange:()=>({getValues:()=>rows.map(r=>[...r])}),getRange:(r:number,c:number,h:number,w:number)=>({getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1]?.[c+j-1]??'')),setValues:(values:any[][])=>{if(failWrite)throw Error('simulated interrupted write');values.forEach((row,i)=>row.forEach((v,j)=>{rows[r+i-1]??=[];rows[r+i-1][c+j-1]=typeof v==='string'?v.replace(/^'/,''):v;}));}}),deleteRow:(n:number)=>{rows.splice(n-1,1);},appendRow:(row:any[])=>{if(failWrite)throw Error('simulated interrupted write');rows.push(row.map(v=>typeof v==='string'?v.replace(/^'/,''):v));}};sheets.set(name,sheet);return sheet;};
 const ss={getSheetByName:(name:string)=>sheets.get(name),insertSheet:make};
 const context:any={PropertiesService:{getScriptProperties:()=>({getProperty:(k:string)=>props.get(k)??null,setProperty:(k:string,v:string)=>{props.set(k,v);},deleteProperty:(k:string)=>{props.delete(k);}})},Logger:{log(){}},SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},Utilities:{getUuid:randomUUID,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_a:any,s:string)=>Array.from(createHash('sha256').update(s).digest())},ContentService:{MimeType:{JSON:'json'},createTextOutput:(s:string)=>({setMimeType:()=>JSON.parse(s)})}};
 vm.runInNewContext(GAS_CODE,context);
 const token:string|null=options.withToken===false?null:context.setupAccessToken();
 const sendRaw=(payload:any)=>context.doPost({postData:{contents:JSON.stringify(payload)}});
 return {sheets,props,context,token,sendRaw,setFailure:(value:boolean)=>{failWrite=value;},send:(payload:any)=>sendRaw(token&&payload&&typeof payload==='object'&&!('token' in payload)?{...payload,token}:payload)};
}
