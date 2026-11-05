import {WorkoutLog} from '../types';
export function manualWorkout(id:string,activity:string,minutes:string,timestamp:string,now=new Date()):WorkoutLog{
 const duration=Number(minutes),date=new Date(timestamp),name=activity.trim();
 if(!id||!name||name.length>100||!Number.isFinite(duration)||duration<1||duration>1440||!Number.isFinite(date.getTime())||date>now)throw new Error('請填寫運動項目、1–1440 分鐘及有效的已發生時間。');
 return {id,activity:name,duration:`${duration}分鐘`,timestamp:date.toISOString()};
}
