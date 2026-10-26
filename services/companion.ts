import {CompanionSettings,FoodAnalysis,UserProfile,WorkoutLog} from '../types';
import {localDate} from './healthSummary';
export function companionAge(c:CompanionSettings,now=new Date()){
 const days=Math.max(0,Math.floor((Date.parse(localDate(now.toISOString()))-Date.parse(localDate(c.createdAt)))/86400000));
 return {days,stage:c.ageMode==='growth'?(days>=90?'senior':days>=30?'adult':'young'):c.ageMode};
}
export function companionMood(profile:UserProfile,foods:FoodAnalysis[],workouts:WorkoutLog[],now=new Date()){
 const today=localDate(now.toISOString()),day=profile.dailyHealthLogs?.find(d=>d.date===today);
 const meals=foods.filter(f=>!f.deletedAt&&localDate(f.timestamp)===today),exercise=workouts.filter(w=>localDate(w.timestamp)===today);
 const mealTime=Math.max(0,...meals.map(f=>Date.parse(f.timestamp)||0)),workoutTime=Math.max(0,...exercise.map(w=>Date.parse(w.timestamp)||0)),waterTime=(day?.waterIntake||0)>0?(Date.parse(day?.waterUpdatedAt||'')||1):0;
 if(exercise.length&&workoutTime>=Math.max(mealTime,waterTime))return {icon:'👟',title:'一起動一動',text:'今天的活動，已收進我的日記。',action:'WORKOUT' as const};
 if(waterTime>0&&waterTime>=mealTime)return {icon:'💧',title:'喝口水，歇一下',text:'飲水紀錄收到，陪你慢慢過今天。',action:'DASHBOARD' as const};
 if(meals.length)return {icon:'🍱',title:'餐桌日記更新了',text:`今天留下 ${meals.length} 筆餐點，一起記住日常。`,action:'FOOD' as const};
 return {icon:'🌱',title:'今天也陪著你',text:'記下一餐，或一起享受休息時間。',action:'FOOD' as const};
}

/** Decorative silhouette from measured weight history; never a body-fat or health estimate. */
export function companionBody(profile:UserProfile,now=new Date()){
 const c=profile.companion,base={small:.90,round:1.05,sturdy:1.13}[c?.body||'round'];
 const today=localDate(now.toISOString());
 const byDay=new Map<string,number>();
 for(const r of profile.weightHistory||[]){const n=Number(r.weight),d=r.date;if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(`${d}T12:00:00`).toISOString().slice(0,10)===d&&d<=today&&Number.isFinite(n)&&n>0&&n<=500)byDay.set(d,n);}
 const records=[...byDay].sort((a,b)=>a[0].localeCompare(b[0]));
 const manual=c?.bodyMode==='manual';
 if(manual)return {scale:base,mode:'manual',count:records.length,label:'手動外觀',detail:'保留你選擇的體型。',baseline:null as number|null,trend:null as number|null};
 const initial=records.slice(0,3).map(r=>r[1]).sort((a,b)=>a-b),baseline=initial.length===3?initial[1]:null;
 if(!baseline||records.length<4)return {scale:base,mode:'auto',count:records.length,label:'正在認識你的體型',detail:`已記錄 ${records.length} 個量測日；先累積 4 天體重，人物再隨趨勢慢慢變化。`,baseline,trend:null as number|null};
 let trend=baseline,scale=base;
 for(const [,weight] of records.slice(3)){
  // Winsorize each observation so a typo or a single fluctuation cannot dominate the sprite.
  trend+=.2*(Math.max(trend*.95,Math.min(trend*1.05,weight))-trend);
  const target=Math.max(.82,Math.min(1.28,base*(1+3*(trend/baseline-1))));
  scale+=Math.max(-.012,Math.min(.012,target-scale));
 }
 return {scale,mode:'auto',count:records.length,label:Math.abs(scale-base)<.008?'體型趨勢穩定':'體型隨紀錄慢慢變化',detail:`依 ${records.length} 個量測日平滑調整；最後量測 ${records[records.length-1][0]}。`,baseline,trend};
}
