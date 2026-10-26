import React,{useState} from 'react';
import {dbService,getGasUrl} from '../services/dbService';
export default function CloudBackupVersions(){
 const [rows,setRows]=useState<{id:string;createdAt:string}[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await fn();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}};
 return <section className="care-panel"><h3>雲端備份版本</h3><p>需部署 GAS v3。每次備份獨立保存，包含餐點縮圖、回收桶、個人資料及影片評分；不改寫即時同步資料。舊版本不會自動刪除。</p><button disabled={busy||!getGasUrl()} onClick={()=>void run(async()=>setRows((await dbService.listCloudBackups()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))))}>查看備份版本</button>{rows.map(r=><div className="snapshot-row" key={r.id}><span>{new Date(r.createdAt).toLocaleString('zh-TW')}</span><button disabled={busy} onClick={()=>void run(async()=>{const backup=await dbService.downloadCloudBackup(r.id);const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`健康日常_雲端備份_${r.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('已校驗並產生下載檔。可在「手機備份與還原」選取檔案還原。');})}>下載完整備份</button></div>)}{message&&<p role="status">{message}</p>}</section>;
}
