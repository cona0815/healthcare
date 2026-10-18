import React, { useRef, useState } from 'react';
import { Camera, ChevronRight, Plus, Utensils, Droplets, ClipboardCheck, HeartPulse, Dumbbell, Coffee, Sun, Moon } from 'lucide-react';
import { FoodAnalysis, SavedAppointment, WorkoutPlanDay, WorkoutLog, UserProfile, ViewState, VitalsRecord, MealType, DailyHealthLog } from '../types';
import { localDate } from '../services/healthSummary';
import { nutritionSummary } from '../services/nutritionSummary';
import './dashboard.css';
interface Props {dataLoading?:boolean;userProfile:UserProfile;foodLogs:FoodAnalysis[];appointments:SavedAppointment[];workoutPlan:WorkoutPlanDay[];workoutLogs:WorkoutLog[];vitalsRecords:VitalsRecord[];onNavigate:(view:ViewState,subTab?:string)=>void;onAnalyzeImage?:(file:File)=>void;onAddWorkout:(log:WorkoutLog)=>void;onUpdateProfile:(profile:UserProfile)=>Promise<void>;onRecordMeal?:(meal:MealType|null,date:string,file?:File)=>void;}
const mealTypes:MealType[]=['早餐','午餐','晚餐','點心/飲料'];
const icons=[Sun,Utensils,Moon,Coffee];
export default function Dashboard({userProfile,foodLogs,appointments,workoutLogs,vitalsRecords,onNavigate,onAnalyzeImage,onUpdateProfile,onRecordMeal}:Props){
 const date=localDate();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [goals,setGoals]=useState(false);const camera=useRef<HTMLInputElement>(null);
 const today=localDate();const meals=foodLogs.filter(m=>localDate(m.timestamp)===date);const nutrition=nutritionSummary(meals);const daily=userProfile.dailyHealthLogs?.find(d=>d.date===date);const taken=daily?.medicationsTaken||[];const reminders=userProfile.medicationReminders||[];const water=Number(daily?.waterIntake)||0;const calorieGoal=userProfile.calorieGoal;const waterGoal=userProfile.waterGoal;
 const saveDaily=async(patch:Partial<DailyHealthLog>)=>{setBusy(true);setError('');try{await onUpdateProfile({...userProfile,dailyHealthLogs:[...(userProfile.dailyHealthLogs||[]).filter(d=>d.date!==date),{...daily,date,...patch}]});}catch{setError('儲存失敗，請重試。');}finally{setBusy(false);}};
 const record=(meal:MealType|null,file?:File)=>{if(onRecordMeal)onRecordMeal(meal,date,file);else if(file&&onAnalyzeImage)onAnalyzeImage(file);else onNavigate('FOOD');};
 return <div className="nutrition-home">
 <div className="diary-date"><h2>今天，<time dateTime={date}>{new Date(`${date}T12:00:00`).toLocaleDateString('zh-TW',{month:'long',day:'numeric'})}</time></h2></div>

 <section className="nutrition-card"><div className="diary-title"><h3><Utensils/> {date===today?'今日':'當日'}營養</h3><button onClick={()=>setGoals(!goals)}>{goals?'收合':'設定目標'} <ChevronRight size={14}/></button></div><div className="energy-total"><strong>{Math.round(nutrition.calories).toLocaleString()}</strong><span>{calorieGoal?` / ${calorieGoal.toLocaleString()}`:''} kcal</span></div>{calorieGoal?<progress aria-label="熱量目標進度" value={nutrition.calories} max={calorieGoal}/>:<p className="diary-note">已記錄攝取 · 可設定自己的每日目標</p>}
 <div className="macro-grid">{[['蛋白質',nutrition.protein],['碳水',nutrition.carbs],['脂肪',nutrition.fat]].map(([label,entry])=>{const n=entry as typeof nutrition.protein;return <div key={String(label)}><span>{String(label)}</span><strong>{n.value===null?'—':`${n.value} g`}</strong><small>{n.value===null?'尚無數據':n.partial?'部分餐點資料':'已記錄'}</small></div>;})}</div>
 {goals&&<form className="goal-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await onUpdateProfile({...userProfile,calorieGoal:Number(f.get('calories'))||undefined,waterGoal:Number(f.get('water'))||undefined});setGoals(false);}catch{setError('目標儲存失敗。');}finally{setBusy(false);}}}><label>熱量目標（kcal）<input name="calories" type="number" min="1" max="20000" defaultValue={calorieGoal} placeholder="自行設定"/></label><label>飲水目標（ml）<input name="water" type="number" min="1" max="20000" defaultValue={waterGoal} placeholder="自行設定"/></label><button disabled={busy} className="diary-save">儲存目標</button></form>}
 </section>
 <section className="nutrition-card meal-diary"><div className="diary-title"><h3><ClipboardCheck/> 飲食紀錄</h3><button className="camera-action" onClick={()=>camera.current?.click()}><Camera size={17}/>拍照記錄</button></div><input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const file=e.target.files?.[0];if(file)record(null,file);e.target.value='';}}/>
 {mealTypes.map((type,i)=>{const entries=meals.filter(m=>m.mealType===type||(type==='點心/飲料'&&(m.mealType as string)==='點心'));const Icon=icons[i];return <div className={`meal-diary-row ${i===3?'snack-row':''}`} key={type}><span className={`meal-symbol meal-${i}`}><Icon size={25}/></span><div className="meal-info"><h4>{type==='點心/飲料'?'點心 / 飲料':type}</h4>{entries.length?<><strong>{Math.round(entries.reduce((s,m)=>s+Number(m.calories||0),0))} kcal</strong><p>{entries.map(m=>m.foodName).join('、')}</p></>:<p>尚未記錄</p>}</div><button className="meal-add" aria-label={`新增${type}`} onClick={()=>record(type)}><Plus size={23}/></button></div>;})}
 </section>
 <section className="nutrition-card water-card"><div className="diary-title"><h3><Droplets/> 飲水</h3><span><strong>{water.toLocaleString()}</strong>{waterGoal?` / ${waterGoal.toLocaleString()}`:''} ml</span><button disabled={busy} onClick={()=>saveDaily({waterIntake:water+250})}>+250 ml</button></div>{waterGoal&&<progress aria-label="飲水目標進度" value={water} max={waterGoal}/>}<div className="water-options"><button disabled={busy||water===0} onClick={()=>saveDaily({waterIntake:Math.max(0,water-250)})}>−250 ml</button><span>{date!==today?'正在編輯所選日期':'每次增加一杯'}</span></div></section>

 {error&&<p role="alert" className="diary-error">{error}</p>}
 </div>;
}
