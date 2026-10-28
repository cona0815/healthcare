import React,{useState} from 'react';
import {UserProfile} from '../types';
export default function MedicationReminders({profile,onUpdate}:{profile:UserProfile;onUpdate:(p:UserProfile)=>Promise<void>}){
 const [name,setName]=useState(''),[time,setTime]=useState('08:00'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const reminders=profile.medicationReminders||[];
 const save=async(next:typeof reminders)=>{setBusy(true);setError('');try{await onUpdate({...profile,medicationReminders:next});return true;}catch{setError('儲存失敗，請重試。');return false;}finally{setBusy(false);}};
 return <section className="care-panel reminder-settings"><h2>健康打卡・用藥提醒設定</h2><p className="care-muted">設定藥名與時間，總覽就會顯示當日勾選項目。</p><form onSubmit={async e=>{e.preventDefault();if(busy||!name.trim())return;if(await save([...reminders,{id:crypto.randomUUID(),name:name.trim(),time}]))setName('');}}><fieldset disabled={busy}><label>藥品名稱<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="輸入藥品名稱"/></label><label>提醒時間<input type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label><button type="submit">{busy?'儲存中…':'新增提醒'}</button></fieldset></form>{error&&<p role="alert">{error}</p>}<div>{[...reminders].sort((a,b)=>a.time.localeCompare(b.time)).map(m=><div className="task-sort-row" key={m.id}><span>{m.time} · {m.name}</span><button disabled={busy} onClick={()=>{if(confirm('移除此提醒？過去的打卡紀錄仍會保留。'))void save(reminders.filter(x=>x.id!==m.id));}}>移除</button></div>)}</div></section>;
}
