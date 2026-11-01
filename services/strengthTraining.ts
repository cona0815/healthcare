import {TrainingSet,WorkoutLog} from '../types';
export const exerciseKey=(name:string)=>name.trim().normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ');
export function validTrainingSets(sets:unknown):sets is TrainingSet[]{
 return Array.isArray(sets)&&sets.length>0&&sets.length<=50&&sets.every(s=>s&&Number.isInteger(s.reps)&&s.reps>=1&&s.reps<=1000&&Number.isFinite(s.weightKg)&&s.weightKg>=0&&s.weightKg<=1000);
}
export function lastStrengthWorkout(logs:WorkoutLog[],activity:string,now=new Date()){
 return logs.filter(w=>exerciseKey(w.activity)===exerciseKey(activity)&&validTrainingSets(w.sets)&&Number.isFinite(Date.parse(w.timestamp))&&Date.parse(w.timestamp)<=now.getTime()).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp))[0];
}
export function trainingStats(sets:TrainingSet[]){
 return {sets:sets.length,reps:sets.reduce((n,s)=>n+s.reps,0),volume:Math.round(sets.reduce((n,s)=>n+s.reps*s.weightKg,0)*100)/100,maxWeight:Math.max(0,...sets.map(s=>s.weightKg))};
}
export function strengthHistory(logs:WorkoutLog[],activity:string){
 return logs.map((w,index)=>({w,index})).filter(({w})=>exerciseKey(w.activity)===exerciseKey(activity)&&validTrainingSets(w.sets)&&Number.isFinite(Date.parse(w.timestamp))).sort((a,b)=>Date.parse(a.w.timestamp)-Date.parse(b.w.timestamp)||b.index-a.index).map(({w})=>({...w,stats:trainingStats(w.sets!)}));
}
export const remainingRest=(endsAt:number|null,now=Date.now())=>endsAt===null?0:Math.max(0,Math.ceil((endsAt-now)/1000));
export const weekDays=['週一','週二','週三','週四','週五','週六','週日'];
export function weekdayIndex(day:string){
 const normalized=day.replace(/星期|禮拜/g,'週').replace('週天','週日');
 const index=weekDays.findIndex(d=>normalized===d||normalized.startsWith(d+' '));
 if(index>=0)return index;
 const english=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(day.trim().toLowerCase());
 return english;
}
