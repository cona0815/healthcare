import MealManager from './MealManager';
import HistoryEntry from './HistoryEntry';
import CareTools from './CareTools';
import TaskCalendar from './TaskCalendar';
import TaskBoard from './TaskBoard';
import React,{useState,useRef,useEffect} from 'react';
import {Pill,HeartPulse,Dumbbell,CalendarDays,Utensils,Droplets,Package} from 'lucide-react';
import {UserProfile,VitalsRecord,WorkoutLog,SavedAppointment,ViewState,FoodAnalysis,WorkoutPlanDay} from '../types';
import {localDate} from '../services/healthSummary';
import './care.css';
interface Props {onEditFood:(id:string,f:FoodAnalysis)=>Promise<void>;onDeleteFood:(id:string)=>Promise<void>;onRestoreFood:(id:string)=>Promise<void>;onFood:(f:FoodAnalysis)=>Promise<void>;onWorkout:(w:WorkoutLog)=>Promise<void>;onVital:(v:VitalsRecord)=>Promise<void>;profile:UserProfile;vitals:VitalsRecord[];workouts:WorkoutLog[];appointments:SavedAppointment[];foods?:FoodAnalysis[];plan?:WorkoutPlanDay[];onUpdate:(p:UserProfile)=>Promise<void>;onNavigate:(v:ViewState,subTab?:string)=>void;date?:string;onDateChange?:(date:string)=>void;}
export default function TodayTasks({onEditFood,onDeleteFood,onRestoreFood,profile,vitals,workouts,appointments,foods=[],plan=[],onUpdate,onNavigate,onFood,onWorkout,onVital,date:initialDate=localDate(),onDateChange}:Props){
 const [date,setDate]=useState(initialDate);
 const [symptomsOpen,setSymptomsOpen]=useState(false);
 const symptomPanel=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(symptomsOpen)symptomPanel.current?.scrollIntoView({behavior:'smooth',block:'start'});},[symptomsOpen]);
 const today=localDate(),isToday=date===today;
 const markers:Record<string,string[]>={};
 const mark=(key:string,label:string)=>{if(!key)return;markers[key]??=[];if(!markers[key].includes(label))markers[key].push(label);};
 foods.forEach(f=>mark(localDate(f.timestamp),'飲食'));workouts.forEach(w=>mark(localDate(w.timestamp),'運動'));
 profile.symptoms?.forEach(s=>mark(localDate(s.occurredAt),'症狀'));
 profile.dailyHealthLogs?.forEach(d=>{if(d.medicationsTaken?.length)mark(d.date,'用藥');});appointments.forEach(a=>mark(a.date,'回診'));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const day=profile.dailyHealthLogs?.find(d=>d.date===date),taken=day?.medicationsTaken||[],visited=day?.appointmentsCompleted||[];
 const reminders=[...(profile.medicationReminders||[])].sort((a,b)=>a.time.localeCompare(b.time));
 const visits=appointments.filter(a=>a.date===date).sort((a,b)=>a.time.localeCompare(b.time));
 const records=vitals.filter(v=>v.date===date),exercise=workouts.filter(w=>localDate(w.timestamp)===date),meals=foods.filter(f=>localDate(f.timestamp)===date);
 const low=(isToday?profile.medicineStock||[]:[]).filter(m=>m.dailyUse>0&&m.remaining/m.dailyUse<=m.reminderDays);
 const water=day?.waterIntake||0;
 const save=async(patch:object)=>{setBusy(true);setError('');try{await onUpdate({...profile,dailyHealthLogs:[...(profile.dailyHealthLogs||[]).filter(d=>d.date!==date),{...day,date,...patch}]});}catch{setError('儲存失敗，請重試');}finally{setBusy(false);}};
 const toggle=(field:'medicationsTaken'|'appointmentsCompleted',id:string)=>{const values=day?.[field]||[];void save({[field]:values.includes(id)?values.filter(v=>v!==id):[...values,id]});};
 const card=(title:string,Icon:any,status:string,content:React.ReactNode)=><section key={title} data-task-id={title} className="task-block"><header><h2><Icon size={20}/>{title}</h2><span>{status}</span></header>{content}</section>;
 return <div className="task-page"><header className="task-heading"><p>{new Date(`${date}T12:00:00`).toLocaleDateString('zh-TW',{month:'long',day:'numeric',weekday:'long'})}</p><h1>健康助手</h1><p>每日安排、飲食、運動、用藥與症狀，集中在這裡。</p></header><TaskCalendar date={date} onSelect={d=>{setDate(d);onDateChange?.(d);setSymptomsOpen(false);setError('');}} markers={markers} disabled={busy}/><p className="selected-task-date" role="status">{isToday?'今天':date} · 當日安排與紀錄</p>{symptomsOpen&&<div ref={symptomPanel} className="calendar-symptom-panel"><button className="symptom-close" onClick={()=>setSymptomsOpen(false)}>← 返回當日卡片</button><CareTools key={date} sectionOnly selectedDate={date} initialSection="symptoms" profile={profile} foods={foods} workouts={workouts} vitals={vitals} onUpdate={onUpdate} onFood={async()=>{}} onWorkout={async()=>{}}/></div>}{error&&<p role="alert" className="care-notice">{error}</p>}<TaskBoard key={date} profile={profile} date={date} onUpdate={onUpdate} groupActions={{
 '飲食與營養':<nav className="assistant-category-links" aria-label="飲食與營養工具"><button onClick={()=>onNavigate('CARE','nutrition')}>營養目標與16:8</button><button onClick={()=>onNavigate('HEALTH_MANAGEMENT','PROFILE')}>個人資料與 TDEE</button></nav>,
 '運動與量測':<nav className="assistant-category-links" aria-label="運動與量測工具"><button onClick={()=>onNavigate('WORKOUT')}>運動與姿勢練習</button><button onClick={()=>onNavigate('TRENDS')}>健康趨勢</button></nav>,
 '用藥與就醫':<nav className="assistant-category-links" aria-label="用藥與就醫工具"><button onClick={()=>onNavigate('HEALTH_MANAGEMENT','MEDICATION')}>用藥管理</button><button onClick={()=>onNavigate('CARE','stock')}>藥品庫存</button><button onClick={()=>onNavigate('HEALTH_MANAGEMENT','APPOINTMENTS')}>回診與預約</button><button onClick={()=>onNavigate('HEALTH_MANAGEMENT','REPORTS')}>健檢報告</button><button onClick={()=>onNavigate('CARE','export')}>看診摘要</button></nav>,
 '日常待辦':<><nav className="assistant-category-links" aria-label="日常待辦工具"><button onClick={()=>onNavigate('CARE','templates')}>常用範本</button></nav><HistoryEntry key={date+'-entry'} date={date} profile={profile} onFood={onFood} onWorkout={onWorkout} onVital={onVital} onUpdate={onUpdate}/></>
 }}>
 {card('用藥',Pill,!isToday?`${taken.length} 筆已服藥紀錄`:reminders.length?`${reminders.filter(m=>taken.includes(m.id)).length} / ${reminders.length} 已完成`:'尚未設定',<>{reminders.map(m=><label className={taken.includes(m.id)?'task-done':''} key={m.id}><input type="checkbox" disabled={busy} checked={taken.includes(m.id)} onChange={()=>toggle('medicationsTaken',m.id)}/><span><small>{m.time}</small>{m.name}</span></label>)}{taken.filter(id=>!reminders.some(m=>m.id===id)).map(id=><p key={id}>✓ 已服藥（原提醒已移除）</p>)}{!taken.length&&<p>當日尚無已服藥紀錄。</p>}<small>提醒名稱依目前設定顯示；未勾選不代表當天未服藥。</small>{!reminders.length&&<p>依自己的處方新增用藥提醒。</p>}<button onClick={()=>onNavigate('HEALTH_MANAGEMENT','MEDICATION')}>管理用藥提醒 →</button></>)}
 {card('症狀日記',HeartPulse,`${(profile.symptoms||[]).filter(s=>localDate(s.occurredAt)===date).length} 筆紀錄`,<>{(profile.symptoms||[]).filter(s=>localDate(s.occurredAt)===date).map(s=><div key={s.id}><p>{s.occurredAt.slice(11,16)} · {s.symptom} · {s.severity}/10</p>{s.notes&&<small>{s.notes}</small>}</div>)}{!(profile.symptoms||[]).some(s=>localDate(s.occurredAt)===date)&&<p>當天尚無症狀紀錄。</p>}<button disabled={date>today} onClick={()=>setSymptomsOpen(true)}>新增／編輯當日症狀 ↑</button></>)}
 {card('生理量測',HeartPulse,records.length?`${records.length} 筆已記錄`:'尚未記錄',<><p>血壓：{records.some(v=>v.type==='blood_pressure')?'已記錄':'未記錄'} · 血糖：{records.some(v=>v.type==='blood_sugar')?'已記錄':'未記錄'}</p><p>體重：{profile.weightHistory?.some(w=>w.date===date)?'已記錄':'未記錄'}</p><small>依你的量測安排記錄，未記錄不代表漏做。</small><div><button onClick={()=>onNavigate('VITALS')}>記錄血壓／血糖 →</button><button onClick={()=>onNavigate('HEALTH_MANAGEMENT')}>記錄體重 →</button></div></>)}
 {card('運動',Dumbbell,exercise.length?`${exercise.length} 筆已記錄`:'尚未記錄',<>{exercise.length?exercise.map(w=><p key={w.id}>✓ {w.activity} · {w.duration} 分鐘</p>):<p>依當天的運動安排，完成後記下活動與時間。</p>}<button onClick={()=>onNavigate('WORKOUT')}>{exercise.length?'查看／新增運動':'查看計畫與記錄運動'} →</button></>)}
 {card('回診行程',CalendarDays,visits.length?`${visits.filter(a=>visited.includes(a.id)).length} / ${visits.length} 已完成`:'當日無預約',<>{visits.map(a=><label key={a.id} className={visited.includes(a.id)?'task-done':''}><input type="checkbox" disabled={busy} checked={visited.includes(a.id)} onChange={()=>toggle('appointmentsCompleted',a.id)}/><span><small>{a.time}</small>{a.title}<small>{a.location}{a.doctor?` · ${a.doctor}`:''}</small>{a.notes&&<small>{a.notes}</small>}</span></label>)}{!visits.length&&<p>當天沒有已登錄的回診行程。</p>}<button onClick={()=>onNavigate('HEALTH_MANAGEMENT','APPOINTMENTS')}>查看／安排回診 →</button></>)}
 {card('飲食紀錄',Utensils,`${meals.length} 筆已記錄`,<><MealManager foods={foods} date={date} onEdit={onEditFood} onDelete={onDeleteFood} onRestore={onRestoreFood}/><div className="task-meals">{['早餐','午餐','晚餐'].map(m=><span key={m}>{meals.some(f=>f.mealType===m)?'✓':'○'} {m}</span>)}</div>{meals.length?meals.map((f,i)=><p key={`${f.timestamp}-${i}`}><small>{f.mealType||'餐點'}</small> · {f.foodName} · {Math.round(Number(f.calories)||0)} kcal{f.thumbnail?.startsWith('data:image/jpeg;base64,')&&<img className="food-thumbnail" src={f.thumbnail} alt={`${f.foodName}縮圖`}/>}</p>):<p>當天尚無飲食紀錄。</p>}<button onClick={()=>onNavigate('DASHBOARD')}>前往今日飲食記錄 →</button></>)}
 {card('飲水',Droplets,profile.waterGoal&&water>=profile.waterGoal?'已達設定目標':`${water} ml`,<><p className="task-water">{water}<small>{profile.waterGoal?` / ${profile.waterGoal} ml`:' ml'}</small></p>{profile.waterGoal?<progress aria-label="今日飲水進度" value={water} max={profile.waterGoal}/>:<p>尚未設定每日飲水目標。</p>}<button disabled={busy} onClick={()=>void save({waterIntake:water+250})}>{isToday?'＋ 喝了一杯（250 ml）':'＋ 補記飲水（250 ml）'}</button><button onClick={()=>onNavigate('DASHBOARD')}>調整紀錄／目標 →</button></>)}
 {low.length>0&&card('補藥提醒',Package,`${low.length} 項庫存偏低`,<>{low.map(m=><p key={m.id}>{m.name} · 剩 {m.remaining} 顆（約 {Math.floor(m.remaining/m.dailyUse)} 天）</p>)}<button onClick={()=>onNavigate('CARE','stock')}>管理藥品庫存 →</button></>)}
 </TaskBoard></div>;
}
