import { VitalsRecord, WorkoutLog, UserProfile } from '../types';
export const localDate = (value: Date | string = new Date()) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
export function trendRows(days: number, vitals: VitalsRecord[], workouts: WorkoutLog[], profile: UserProfile, now = new Date()) {
  const mean = (values: number[]) => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10 : null;
  return Array.from({length: days}, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate()-days+1+i); const date = localDate(d);
    const records = vitals.filter(v=>v.date === date);
    const numbers = (key: 'systolic'|'diastolic'|'bloodSugar', type: string) => records.filter(v=>v.type === type).map(v=>Number(v[key])).filter(v=>Number.isFinite(v)&&v>0);
    const weights = (profile.weightHistory || []).filter(w=>w.date===date).map(w=>Number(w.weight)).filter(v=>Number.isFinite(v)&&v>0);
    return {date, label:date.slice(5), systolic:mean(numbers('systolic','blood_pressure')), diastolic:mean(numbers('diastolic','blood_pressure')), bloodSugar:mean(records.filter(v=>v.bloodSugarContext==='fasting'&&v.type==='blood_sugar').map(v=>Number(v.bloodSugar)).filter(v=>Number.isFinite(v)&&v>0)), weight:mean(weights), exercise:workouts.filter(w=>localDate(w.timestamp)===date).length, measured:records.length>0};
  });
}
