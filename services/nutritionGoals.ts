import {UserProfile} from '../types';
export function estimateTDEE(p:Pick<UserProfile,'weight'|'height'|'birthDate'|'gender'|'activityLevel'>,now=new Date()){
 const w=Number(p.weight),h=Number(p.height);if(!p.birthDate||!w||!h||!p.gender)return null;const b=new Date(p.birthDate+'T12:00:00');let age=now.getFullYear()-b.getFullYear();if(now.getMonth()<b.getMonth()||(now.getMonth()===b.getMonth()&&now.getDate()<b.getDate()))age--;if(!Number.isFinite(age)||age<18||age>120||w<=0||h<=0)return null;
 const factor=({sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9} as Record<string,number>)[p.activityLevel||'sedentary'];return Math.round((10*w+6.25*h-5*age+(p.gender==='male'?5:-161))*factor);
}
export function calorieBudget(goal:number|undefined,consumed:number){return goal&&goal>0?{remaining:Math.max(0,Math.round(goal-consumed)),over:Math.max(0,Math.round(consumed-goal))}:null;}
export function eatingEndTime(start:string,end?:string){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))throw new Error('進食開始時間格式錯誤');
 if(end!==undefined){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(end))throw new Error('進食結束時間格式錯誤');return end;}
 const [h,m]=start.split(':').map(Number);return `${String((h+8)%24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
export function eatingMinutes(start:string,end?:string){const finish=eatingEndTime(start,end),[h,m]=start.split(':').map(Number),[eh,em]=finish.split(':').map(Number);const minutes=(eh*60+em-h*60-m+1440)%1440;if(!minutes)throw new Error('開始與結束時間不能相同');return minutes;}
export function fastingWindow(now:Date,start:string,finish?:string){
 const duration=eatingMinutes(start,finish);
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))throw new Error('進食開始時間格式錯誤');
 const [h,m]=start.split(':').map(Number),today=new Date(now);today.setHours(h,m,0,0);
 const previous=new Date(today);previous.setDate(previous.getDate()-1);
 const end=(d:Date)=>{const e=new Date(d);e.setMinutes(e.getMinutes()+duration);return e;};
 const active=[previous,today].find(d=>now>=d&&now<end(d));
 if(active)return {phase:'eating' as const,next:end(active),seconds:Math.ceil((end(active).getTime()-now.getTime())/1000)};
 const next=new Date(today);if(now>=today)next.setDate(next.getDate()+1);return {phase:'fasting' as const,next,seconds:Math.ceil((next.getTime()-now.getTime())/1000)};
}

export function resolveCalorieGoal(p:UserProfile,now=new Date()){const tdee=estimateTDEE(p,now);const derived=tdee?tdee-(p.targetDeficit||0):undefined;return p.calorieGoalSource==='tdee'?(derived&&derived>0?derived:undefined):p.calorieGoal||(derived&&derived>0?derived:undefined);}

export function eatingDayRanges(start:string,end?:string):Array<[number,number]>{
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))return [];
 const [h,m]=start.split(':').map(Number),from=(h*60+m)/1440,to=(h*60+m+eatingMinutes(start,end))/1440;
 return to<=1?[[from,to]]:[[0,to-1],[from,1]];
}
