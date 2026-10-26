import {FoodAnalysis,UserProfile,VitalsRecord,WorkoutLog} from '../types';
import {localDate} from './healthSummary';
import {visibleFoods} from './foodRecords';
export function companionInsight(profile:UserProfile,foods:FoodAnalysis[],workouts:WorkoutLog[],vitals:VitalsRecord[],now=new Date()){
 const today=localDate(now.toISOString()),cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-6);const start=localDate(cutoff.toISOString());
 const validDay=(d:string)=>d>=start&&d<=today;
 const meals=visibleFoods(foods).filter(f=>Date.parse(f.timestamp)<=now.getTime());
 const readings=[...new Map(vitals.map(v=>[v.id,v])).values()].filter(v=>v.type==='blood_sugar'&&Number.isFinite(v.bloodSugar)&&v.bloodSugar!>0&&validDay(v.date)&&Date.parse(`${v.date}T${v.time||'00:00'}`)<=now.getTime()).sort((a,b)=>`${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
 const latest=readings[0],recent=latest&&now.getTime()-Date.parse(`${latest.date}T${latest.time||'00:00'}`)<=2*3600000;
 const days=new Set([...meals.map(f=>localDate(f.timestamp)),...workouts.filter(w=>Date.parse(w.timestamp)<=now.getTime()).map(w=>localDate(w.timestamp)),...vitals.filter(v=>Date.parse(`${v.date}T${v.time||'00:00'}`)<=now.getTime()).map(v=>v.date),...(profile.dailyHealthLogs||[]).filter(d=>(d.waterIntake||0)>0||(d.sleepHours||0)>0).map(d=>d.date)].filter(d=>d<=today&&(!profile.companion||d>=localDate(profile.companion.createdAt))));
 const growth={days:days.size,chapter:days.size>=14?'日常好夥伴':days.size>=7?'默契養成':days.size>=3?'一起探索':'初次相伴',next:days.size>=14?null:days.size>=7?14:days.size>=3?7:3};
 const base={growth,severity:'info',icon:'🌱',title:'我們的日常正在成長',observation:'紀錄一餐、活動或量測，都能留下一天的共同回憶。',meaning:'人物的成長代表陪伴與紀錄，不是健康分數。沒有紀錄不代表你沒有照顧自己。',action:'今天想從哪一件小事開始？',source:'',destination:'TASKS' as 'TASKS'|'VITALS'|'FOOD'};
 if(latest&&recent&&(latest.bloodSugar!<70||latest.bloodSugar!>=300))return {...base,severity:'urgent',icon:'⚠️',title:'先照顧現在的血糖',observation:`${latest.date} ${latest.time} 記錄 ${latest.bloodSugar} mg/dL。`,meaning:'這個數值需要優先處理，不能靠角色狀態判斷安全。',action:latest.bloodSugar!<70?'請立即依醫療團隊的低血糖處理計畫處理，不要繼續斷食或運動。若意識不清、抽搐或無法吞嚥，立即請旁人聯絡急救，勿餵食。':'請立即聯絡醫療人員確認處理方式；若血糖持續達 300 mg/dL，或有嘔吐、呼吸困難、意識改變，立即就醫。不要自行加藥或用運動壓低數值。',source:'https://www.cdc.gov/diabetes/treatment/index.html',destination:'VITALS' as const};
 const high=readings.filter(v=>v.bloodSugarContext==='fasting'&&v.bloodSugar!>130),highDays=new Set(high.map(v=>v.date)).size;
 if(highDays)return {...base,severity:'attention',icon:'📋',title:highDays>1?'這幾天的血糖，值得一起留意':'這筆空腹血糖，先確認一下',observation:`近 7 天有 ${highDays} 天空腹紀錄高於 130 mg/dL；最近 ${high[0].date} ${high[0].time}：${high[0].bloodSugar} mg/dL。`,meaning:'130 是許多糖尿病成人餐前管理目標的上緣，不是診斷標準，個人目標可能不同。長期血糖偏高可能增加眼睛、腎臟與心血管問題的風險；不能據此認定是某一餐造成。',action:'先確認空腹時段與量測方式，帶紀錄與醫療團隊討論。餐飲可先選無糖飲品、維持規律進餐；不要自行停藥、加藥或延長斷食。',source:'https://www.cdc.gov/diabetes/treatment/index.html',destination:'VITALS' as const};
 if(latest)return {...base,icon:'📋',title:'一起把量測背景記清楚',observation:`最近紀錄：${latest.date} ${latest.time}，${latest.bloodSugar} mg/dL。`,meaning:latest.bloodSugarContext==='postprandial'?'目前只有「餐後」標記，沒有距離開餐多久，因此不直接套用餐後兩小時目標。':'單筆數字不能代表整體血糖控制，也不能診斷或排除疾病。',action:'記下量測時段、餐點與不適症狀，依醫療團隊建議追蹤。較早的異常紀錄不代表此刻的血糖。',source:'https://www.cdc.gov/diabetes/treatment/index.html',destination:'VITALS' as const};
 if(meals.some(f=>localDate(f.timestamp)===today))return {...base,icon:'🍱',title:'餐點收到，我陪你看搭配',observation:`今天已留下 ${meals.filter(f=>localDate(f.timestamp)===today).length} 筆餐點。`,meaning:'只有熱量或餐名，無法確定糖分、完整營養或未來疾病風險；少吃也不會讓人物升級更快。',action:'下次記錄可補上份量與飲料甜度，讓餐點更容易和量測紀錄一起回顧。',destination:'FOOD' as const};
 return base;
}
