import {FoodAnalysis,RiskLevel,UserProfile,WorkoutLog} from '../types';
import {localDate} from './healthSummary';
import {eatingMinutes,resolveCalorieGoal} from './nutritionGoals';

export const rewardMilestones=[3,7,14,30,60,100];
export type RewardKind='fasting'|'diet'|'exercise';
export const offsetDay=(date:string,offset:number)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+offset);return localDate(d);};
const dayNumber=(date:string)=>{const [y,m,d]=date.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;};
export function streakStats(dates:string[],today:string){
 const days=[...new Set(dates)].filter(d=>d<=today).sort();
 const achieved=new Set(days);let best=0,run=0,last:number|undefined;
 for(const date of days){const n=dayNumber(date);run=last!==undefined&&n===last+1?run+1:1;best=Math.max(best,run);last=n;}
 let current=0,cursor=achieved.has(today)?today:offsetDay(today,-1);
 while(achieved.has(cursor)){current++;cursor=offsetDay(cursor,-1);}
 const badges=rewardMilestones.filter(n=>n<=best),next=rewardMilestones.find(n=>n>current);
 return {current,best,total:days.length,badges,next,dates:days};
}
export function workoutMinutes(value:unknown){
 const s=String(value??'').trim().toLowerCase();
 const simple=s.match(/^(\d+(?:\.\d+)?)\s*(?:分鐘|分|minutes?|mins?)?$/);
 const hours=s.match(/^(\d+(?:\.\d+)?)\s*(?:小時|hours?|hrs?)(?:\s*(\d+(?:\.\d+)?)\s*(?:分鐘|分|minutes?|mins?))?$/);
 const n=simple?Number(simple[1]):hours?Number(hours[1])*60+Number(hours[2]||0):NaN;
 return Number.isFinite(n)&&n>0&&n<=1440?n:0;
}
function uniqueRecords<T extends {id?:string}>(records:T[]){const seen=new Set<string>();return records.filter(r=>{if(!r.id)return true;if(seen.has(r.id))return false;seen.add(r.id);return true;});}
export function healthRewards(profile:UserProfile,foods:FoodAnalysis[],workouts:WorkoutLog[],now=new Date()){
 const today=localDate(now),nowMs=now.getTime(),validTime=(s:string)=>Number.isFinite(Date.parse(s))&&Date.parse(s)<=nowMs;
 const meals=uniqueRecords(foods).filter(f=>!f.deletedAt&&validTime(f.timestamp)).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 const mealsByDay=new Map<string,FoodAnalysis[]>();for(const f of meals){const d=localDate(f.timestamp);mealsByDay.set(d,[...(mealsByDay.get(d)||[]),f]);}
 const minutesByDay=new Map<string,number>();let unreadableWorkouts=0;
 for(const w of uniqueRecords(workouts).filter(w=>validTime(w.timestamp))){const minutes=workoutMinutes(w.duration);if(!minutes)unreadableWorkouts++;const d=localDate(w.timestamp);minutesByDay.set(d,(minutesByDay.get(d)||0)+minutes);}
 const exerciseDates=[...minutesByDay].filter(([,n])=>n>=30&&n<=1440).map(([d])=>d);
 const goal=resolveCalorieGoal(profile,now),dietRule=profile.rewardDietRule||'calorie';
 const dietCheck=(entries:FoodAnalysis[])=>{
  const count=['早餐','午餐','晚餐'].filter(type=>entries.some(f=>f.mealType===type)).length;
  const validCalories=entries.every(f=>Number.isFinite(Number(f.calories))&&Number(f.calories)>=0),calories=entries.reduce((n,f)=>n+Number(f.calories||0),0);
  const qualified=count===3&&(dietRule==='traffic'?entries.every(f=>f.riskLevel===RiskLevel.SAFE||f.riskLevel===RiskLevel.MODERATE):!!goal&&goal>0&&validCalories&&calories>=goal*.9&&calories<=goal*1.1);
  return {count,calories,qualified};
 };
 const dietDates=[...mealsByDay].filter(([d,entries])=>d<today&&dietCheck(entries).qualified).map(([d])=>d);
 const breakfasts=[...mealsByDay].flatMap(([date,entries])=>{const breakfast=entries.find(f=>f.mealType==='早餐');return breakfast?[{date,time:Date.parse(breakfast.timestamp)}]:[];}).sort((a,b)=>a.time-b.time);
 let eatingHours=8,fastingHours=16;try{const s=profile.fastingSchedule;eatingHours=s?.eatingHours??(s?.eatingStart?eatingMinutes(s.eatingStart,s.eatingEnd)/60:8);fastingHours=s?.fastingHours??24-eatingHours;}catch{eatingHours=NaN;}
 const validSchedule=Number.isFinite(eatingHours)&&eatingHours>0&&eatingHours<=24&&Number.isFinite(fastingHours)&&fastingHours>0&&fastingHours<=24;
 const fastingDates:string[]=[],mealTimes=meals.map(f=>Date.parse(f.timestamp));
 const firstMealAfter=(time:number)=>{let low=0,high=mealTimes.length;while(low<high){const mid=(low+high)>>>1;if(mealTimes[mid]<=time)low=mid+1;else high=mid;}return mealTimes[low]??Infinity;};
 if(profile.fastingSchedule&&validSchedule){
  for(let i=0;i<breakfasts.length-1;i++){
   const anchor=breakfasts[i],next=breakfasts[i+1],eatingEnd=anchor.time+eatingHours*3600000,cycleEnd=eatingEnd+fastingHours*3600000;
   // A next-day breakfast closes the evidence gap: no reward for simply not logging food.
   if(next.date!==offsetDay(anchor.date,1)||next.time<cycleEnd||nowMs<cycleEnd)continue;
   if(firstMealAfter(eatingEnd)<next.time)continue;
   fastingDates.push(anchor.date);
  }
 }
 const hasBreakfastToday=breakfasts.some(b=>b.date===today),pendingFasting=breakfasts.some(b=>b.date===offsetDay(today,-1))&&!hasBreakfastToday;
 const stats={fasting:streakStats(fastingDates,pendingFasting?offsetDay(today,-1):today),diet:streakStats(dietDates,today),exercise:streakStats(exerciseDates,today)};
 const todayDiet=dietCheck(mealsByDay.get(today)||[]),todayMinutes=minutesByDay.get(today)||0;
 return {stats,hasBreakfastToday,pendingFasting,goal,dietRule,eatingHours,fastingHours,validSchedule,todayDiet,todayMinutes,unreadableWorkouts,badgeCount:Object.values(stats).reduce((n,s)=>n+s.badges.length,0),today};
}
