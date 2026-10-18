import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { UserProfile, VitalsRecord, WorkoutLog, SavedAppointment, ViewState } from '../types';
import { localDate, trendRows } from '../services/healthSummary';
interface Props { trendOnly?: boolean; profile: UserProfile; vitals: VitalsRecord[]; workouts: WorkoutLog[]; appointments: SavedAppointment[]; onUpdate: (p:UserProfile)=>Promise<void>; onNavigate:(v:ViewState)=>void; }
export default function HealthOverview({trendOnly=false,profile,vitals,workouts,appointments,onUpdate,onNavigate}:Props) {
 const [days,setDays]=useState(7); const [metric,setMetric]=useState('pressure'); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const today=localDate(); const daily=profile.dailyHealthLogs?.find(l=>l.date===today); const taken=daily?.medicationsTaken||[];
 const rows=trendRows(days,vitals,workouts,profile); const measured=rows.filter(r=>r.measured).length; const present=(r:typeof rows[number])=>metric==='pressure'?r.systolic!==null&&r.diastolic!==null:metric==='weight'?r.weight!==null:r.bloodSugar!==null; const completed=rows.filter(present).length;
 const toggle=async(id:string)=>{setBusy(true);setError('');try{await onUpdate({...profile,dailyHealthLogs:[...(profile.dailyHealthLogs||[]).filter(l=>l.date!==today),{...daily,date:today,medicationsTaken:taken.includes(id)?taken.filter(x=>x!==id):[...taken,id]}]});}catch{setError('儲存失敗，請重試。');}finally{setBusy(false);}};
 return <div className="space-y-6">
 {!trendOnly && <section className="bg-white border border-teal-100 rounded-3xl p-6 shadow-sm">
 <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">今日待辦</h2><span className="text-sm text-slate-500">{today}</span></div>
 <p className="text-sm text-slate-500 mt-2 mb-4">用藥依既有提醒顯示，量測與運動完成情況依當日紀錄更新。</p>
 <div className="grid md:grid-cols-2 gap-3">{(profile.medicationReminders||[]).map(m=><label key={m.id} className="flex items-center gap-3 bg-teal-50 p-4 rounded-xl"><input type="checkbox" checked={taken.includes(m.id)} disabled={busy} onChange={()=>toggle(m.id)} className="w-5 h-5"/><span>{m.time} · {m.name}</span></label>)}
 {['量測','運動'].map((label,i)=>{const complete=i?workouts.some(w=>localDate(w.timestamp)===today):vitals.some(v=>v.date===today);return <button key={label} onClick={()=>onNavigate(i?'WORKOUT':'VITALS')} className="text-left bg-slate-50 rounded-xl p-4">{complete?'✓ 已記錄':'＋ 前往記錄'}今日{label}</button>;})}</div>
 {!profile.medicationReminders?.length&&<p className="text-sm text-slate-500 mt-3">尚未設定用藥提醒，可至健康管理新增。</p>}
 {appointments.filter(a=>a.date===today).map(a=><button key={a.id} className="block w-full text-left rounded-xl bg-amber-50 p-4 mt-3" onClick={()=>onNavigate('HEALTH_MANAGEMENT')}>今日回診 · {a.time} {a.title} · {a.location}</button>)}
 {error&&<p role="alert" className="text-red-600 mt-3">{error}</p>}
 </section>}
 <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
 <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-slate-800">健康趨勢週報</h2><div className="flex gap-2">{[7,30].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)} className={`px-4 py-2 rounded-xl ${days===n?'bg-teal-700 text-white':'bg-slate-100'}`}>{n} 天</button>)}</div></div>
 <div className="grid grid-cols-3 gap-3 my-5">{[['量測天數',`${measured}/${days}`],['未量測天數',days-measured],['運動天數',rows.filter(r=>r.exercise>0).length]].map(([label,value])=><div key={label} className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}</div>
 <label className="text-sm">查看指標 <select value={metric} onChange={e=>setMetric(e.target.value)} className="border rounded-lg p-2 ml-2"><option value="pressure">血壓（mmHg）</option><option value="bloodSugar">空腹血糖（mg/dL）</option><option value="weight">體重（kg）</option></select></label>
 {rows.some(r=>metric==='pressure'?(r.systolic!==null||r.diastolic!==null):metric==='weight'?r.weight!==null:r.bloodSugar!==null)?<div className="h-64 mt-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis domain={['auto','auto']}/><Tooltip/><Legend/>{metric==='pressure'?<><Line dataKey="systolic" name="收縮壓" stroke="#0f766e" connectNulls={false}/><Line dataKey="diastolic" name="舒張壓" stroke="#6366f1" connectNulls={false}/></>:<Line dataKey={metric} name={metric==='weight'?'體重':'空腹血糖'} stroke="#0f766e" connectNulls={false}/>}</LineChart></ResponsiveContainer></div>:<div className="py-10 text-center text-sm text-stone-500"><p>這段期間還沒有可顯示的紀錄</p><button className="mt-3 underline" onClick={()=>onNavigate(metric==='weight'?'HEALTH_MANAGEMENT':'VITALS')}>新增第一筆紀錄 →</button></div>}
 <details className="mt-4"><summary>所選指標紀錄完成率 {Math.round(completed/days*100)}% · 缺漏 {days-completed} 天</summary><p className="text-xs text-slate-500 mt-2">完成率＝有此指標紀錄的天數 ÷ 所選天數；此為紀錄覆蓋率。</p><table className="coverage-table"><thead><tr><th>日期</th><th>血壓</th><th>空腹血糖</th><th>體重</th></tr></thead><tbody>{rows.map(r=><tr key={r.date}><td>{r.label}</td><td>{r.systolic!==null&&r.diastolic!==null?'已記錄':'缺漏'}</td><td>{r.bloodSugar!==null?'已記錄':'缺漏'}</td><td>{r.weight!==null?'已記錄':'缺漏'}</td></tr>)}</tbody></table></details>
 <p className="text-xs text-slate-500">同日多筆採平均值；缺少紀錄會留白，不視為零。血糖僅比較空腹紀錄。</p>
 </section></div>;
}
