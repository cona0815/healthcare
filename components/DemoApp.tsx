import React, { useState } from 'react';
import HealthOverview from './HealthOverview';
import VitalsTracker from './VitalsTracker';
import { UserProfile, VitalsRecord, WorkoutLog, SavedAppointment, ViewState } from '../types';
import { localDate } from '../services/healthSummary';
const KEY='hg_demo_v1';
function sample(){
 const profile:UserProfile={name:'示範使用者',height:'168',weight:'65',medicationReminders:[{id:'demo-morning',name:'早晨用藥（範例）',time:'08:00'},{id:'demo-evening',name:'晚間用藥（範例）',time:'20:00'}],weightHistory:[],dailyHealthLogs:[]};
 const vitals:VitalsRecord[]=[]; const workouts:WorkoutLog[]=[];
 for(let i=29;i>=1;i--){const d=new Date();d.setDate(d.getDate()-i);d.setHours(9,0,0,0);const date=localDate(d);if(i%4!==0){vitals.push({id:`bp-${i}`,date,time:'09:00',type:'blood_pressure',systolic:116+i%8,diastolic:74+i%5},{id:`bs-${i}`,date,time:'07:00',type:'blood_sugar',bloodSugar:90+i%7,bloodSugarContext:'fasting'});profile.weightHistory!.push({date,weight:(65+i*0.025).toFixed(1)});}if(i%3===0)workouts.push({id:`w-${i}`,activity:'散步',duration:'20',timestamp:d.toISOString(),caloriesBurned:0});}
 const appointments:SavedAppointment[]=[{id:'demo-appointment',title:'例行回診（範例）',date:localDate(),time:'14:00',location:'示範診所',doctor:'示範醫師',notes:'此為虛構行程',appointmentNumber:'12',createdAt:new Date().toISOString()}];
 return {profile,vitals,workouts,appointments};
}
function load(){try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data?.profile&&Array.isArray(data.vitals)&&Array.isArray(data.workouts)&&Array.isArray(data.appointments))return data as ReturnType<typeof sample>;}catch{}return sample();}
export default function DemoApp(){
 const [data,setData]=useState(load);const [tab,setTab]=useState<ViewState>('DASHBOARD');const [minutes,setMinutes]=useState('20');const [error,setError]=useState('');
 const save=(next:typeof data)=>{try{localStorage.setItem(KEY,JSON.stringify(next));setData(next);setError('');}catch{setError('本機儲存失敗，請確認瀏覽器空間。');throw new Error('storage failed');}};
 return <div className="min-h-screen bg-slate-50 text-slate-800"><div className="bg-teal-800 text-white px-5 py-3 flex flex-wrap justify-between gap-3"><span>示範模式 · 所有資料皆為虛構，僅存於本機</span><a href="/" className="underline">返回正式系統</a></div>
 <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6"><header><p className="text-teal-700 font-semibold">HealthGuardian</p><h1 className="text-3xl font-bold mt-2">從今天開始，照顧每一天</h1><p className="text-slate-500 mt-2">免金鑰體驗今日待辦、健康趨勢與手動紀錄。AI 分析與雲端同步請使用正式系統。</p></header>
 <nav className="flex flex-wrap gap-2">{[['DASHBOARD','健康總覽'],['VITALS','新增量測'],['WORKOUT','記錄運動'],['HEALTH_MANAGEMENT','今日回診']].map(([view,label])=><button key={view} onClick={()=>setTab(view as ViewState)} className={`px-4 py-3 rounded-xl ${tab===view?'bg-teal-700 text-white':'bg-white border'}`}>{label}</button>)}<button className="px-4 py-3 text-slate-500" onClick={()=>{if(confirm('重設所有示範紀錄？正式資料不受影響。'))save(sample());}}>重設示範資料</button></nav>
 {error&&<p role="alert" className="text-red-600">{error}</p>}
 {tab==='DASHBOARD'&&<HealthOverview profile={data.profile} vitals={data.vitals} workouts={data.workouts} appointments={data.appointments} onUpdate={async profile=>save({...data,profile})} onNavigate={setTab}/>}
 {tab==='VITALS'&&<VitalsTracker vitalsRecords={data.vitals} onSaveRecord={record=>save({...data,vitals:[record,...data.vitals]})}/>}
 {tab==='WORKOUT'&&<form className="p-6 rounded-3xl bg-white space-y-4" onSubmit={e=>{e.preventDefault();const duration=Number(minutes);if(!Number.isFinite(duration)||duration<=0||duration>1440)return;save({...data,workouts:[{id:crypto.randomUUID(),activity:'散步',duration:String(duration),timestamp:new Date().toISOString()},...data.workouts]});setTab('DASHBOARD');}}><h2 className="text-xl font-bold">記錄今日散步</h2><label className="block">分鐘 <input required type="number" min="1" max="1440" value={minutes} onChange={e=>setMinutes(e.target.value)} className="border rounded-xl p-3 ml-2"/></label><button className="bg-teal-700 text-white rounded-xl px-5 py-3">儲存並返回總覽</button></form>}
 {tab==='HEALTH_MANAGEMENT'&&<section className="p-6 rounded-3xl bg-white"><h2 className="text-xl font-bold mb-4">回診行程（範例）</h2>{data.appointments.map(a=><p key={a.id}>{a.date} {a.time} · {a.title} · {a.location}</p>)}</section>}
 </main></div>;
}
