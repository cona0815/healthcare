import {setLocal,getLocal,LOCAL_STORAGE_KEYS,isDemoMode} from './dbService';
import {localDate} from './healthSummary';
import {UserProfile,VitalsRecord,WorkoutLog,RiskLevel} from '../types';
export function initializeDemo(){
 if(!isDemoMode()||getLocal(LOCAL_STORAGE_KEYS.profile,null))return;
 const today=localDate();const profile:UserProfile={name:'示範使用者',height:'168',weight:'65',calorieGoal:1800,waterGoal:1800,weightHistory:[],dailyHealthLogs:[],medicationReminders:[{id:'sample-med',name:'早晨用藥（範例）',time:'08:00'}],symptoms:[{id:'sample-symptom',occurredAt:`${today}T09:00`,symptom:'頭痛（範例）',severity:3,notes:'虛構紀錄：持續約 15 分鐘'}],medicineStock:[{id:'sample-stock',name:'範例藥品',remaining:5,dailyUse:1,reminderDays:7,updatedAt:new Date().toISOString()}],quickTemplates:[{id:'sample-food',kind:'food',name:'燕麥豆漿早餐',mealType:'早餐',calories:320},{id:'sample-workout',kind:'workout',name:'超慢跑',duration:20}]};
 const vitals:VitalsRecord[]=[],workouts:WorkoutLog[]=[];
 for(let i=29;i>0;i--){const d=new Date();d.setDate(d.getDate()-i);const date=localDate(d);if(i%4!==0){vitals.push({id:`demo-pressure-${i}`,date,time:'08:00',type:'blood_pressure',systolic:115+i%9,diastolic:74+i%5},{id:`demo-sugar-${i}`,date,time:'07:00',type:'blood_sugar',bloodSugar:89+i%8,bloodSugarContext:'fasting'});profile.weightHistory!.push({date,weight:(65+i*.02).toFixed(1)});}if(i%3===0)workouts.push({id:`demo-workout-${i}`,activity:'超慢跑',duration:'20',timestamp:`${date}T18:00:00`});}
 setLocal(LOCAL_STORAGE_KEYS.profile,profile);setLocal(LOCAL_STORAGE_KEYS.vitals,vitals);setLocal(LOCAL_STORAGE_KEYS.workouts,workouts);
 setLocal(LOCAL_STORAGE_KEYS.foodLogs,[{foodName:'燕麥豆漿早餐（範例）',calories:320,mealType:'早餐',timestamp:`${today}T08:30:00`,nutrients:[{name:'蛋白質',amount:'15',unit:'g'}],healthAdvice:'虛構資料',riskLevel:RiskLevel.UNKNOWN}]);
 setLocal(LOCAL_STORAGE_KEYS.appointments,[{id:'sample-appointment',title:'例行回診（範例）',date:today,time:'14:00',location:'示範診所',doctor:'示範醫師',notes:'虛構行程',appointmentNumber:'12',createdAt:new Date().toISOString()}]);
}
