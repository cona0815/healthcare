import {getStorageMode} from './storageMode';
export const backupKeys=['hg_foodLogs','hg_reports','hg_workouts','hg_profile','hg_appointments','hg_workoutPlan','hg_recipes','hg_vitals','hg_jog_reports_v1'] as const;
export function parseBackup(text:string){
 const file=JSON.parse(text);const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
 const date=(v:any)=>typeof v==='string'&&v.trim()!==''&&Number.isFinite(Date.parse(v));
 const fail=(key:string)=>{throw new Error('備份內容不完整或格式錯誤：'+key);};
 if(file?.format!=='healthguardian-device'||file.version!==1||!object(file.data)||!date(file.createdAt)||typeof file.demo!=='boolean')throw new Error('不是支援的健康資料備份檔');
 for(const key of backupKeys){const value=file.data[key];if(key==='hg_profile'){
   if(!object(value)||(value.name!==undefined&&typeof value.name!=='string'))fail(key);
   for(const field of ['weightHistory','dailyHealthLogs','medicationReminders','symptoms','medicineStock','quickTemplates','customTasks','practiceCards'])if(value[field]!==undefined&&(!Array.isArray(value[field])||value[field].some((r:any)=>!object(r))))fail(key+'.'+field);
   for(const field of ['exerciseOptions','medicalConditions','dietaryPreferences','taskCardOrder'])if(value[field]!==undefined&&(!Array.isArray(value[field])||value[field].some((r:any)=>typeof r!=='string')))fail(key+'.'+field);
 }else if(!Array.isArray(value)||value.some((x:any)=>!object(x)))fail(key);}
 for(const f of file.data.hg_foodLogs){
   if(typeof f.foodName!=='string'||!f.foodName.trim()||!date(f.timestamp))fail('餐點名稱／日期');
   if(f.calories!==undefined&&(!Number.isFinite(Number(f.calories))||Number(f.calories)<0))fail('餐點熱量');
   if(f.mealType!==undefined&&!['早餐','午餐','晚餐','點心/飲料','點心'].includes(f.mealType))fail('餐別');
   if(f.revision!==undefined&&(!Number.isInteger(Number(f.revision))||Number(f.revision)<1))fail('餐點版本');
   if(f.deletedAt&&!date(f.deletedAt))fail('餐點刪除日期');
   if(f.nutrients!==undefined&&(!Array.isArray(f.nutrients)||f.nutrients.some((n:any)=>!object(n)||typeof n.name!=='string'||typeof n.unit!=='string'||!(typeof n.amount==='string'||typeof n.amount==='number')||(typeof n.amount==='number'&&!Number.isFinite(n.amount))||(Number.isFinite(Number(n.amount))&&Number(n.amount)<0))))fail('營養素');
   if(f.thumbnail!==undefined&&f.thumbnail!==''&&(typeof f.thumbnail!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f.thumbnail)))fail('餐點縮圖');
   f.calories=Number(f.calories||0);f.nutrients??=[];f.mealType=f.mealType==='點心'?'點心/飲料':f.mealType||'點心/飲料';f.riskLevel??='UNKNOWN';f.healthAdvice??='';
 }
 for(const [key,time] of [['hg_workouts','timestamp'],['hg_reports','analyzedAt'],['hg_vitals','date'],['hg_jog_reports_v1','createdAt']])for(const r of file.data[key]){if(!date(r[time]))fail(key+' 日期');}
 for(const r of file.data.hg_appointments)if(typeof r.id!=='string'||!r.id||!date(r.date))fail('回診');
 for(const r of file.data.hg_recipes)if(typeof r.id!=='string'||!r.id||typeof r.name!=='string')fail('食譜');
 const arrayField=(r:any,key:string,label:string,strings=false)=>{if(r[key]!==undefined&&(!Array.isArray(r[key])||r[key].some((x:any)=>strings?typeof x!=='string':!object(x))))fail(label);};
 for(const f of file.data.hg_foodLogs)arrayField(f,'ingredients','食材',true);
 for(const r of file.data.hg_recipes)for(const k of ['tags','ingredients','steps','checkedIngredients'])arrayField(r,k,'食譜 '+k,true);
 for(const r of file.data.hg_reports){arrayField(r,'metrics','健檢指標');arrayField(r,'dietaryRestrictions','健檢飲食建議',true);}
 for(const r of file.data.hg_jog_reports_v1)arrayField(r,'items','影片評分');
 for(const r of file.data.hg_workoutPlan)if(typeof r.day!=='string'||typeof r.activity!=='string')fail('運動計畫');
 for(const r of file.data.hg_profile.dailyHealthLogs||[]){if(!date(r.date))fail('每日紀錄日期');for(const k of ['medicationsTaken','appointmentsCompleted','customTasksCompleted'])arrayField(r,k,'每日勾選紀錄',true);}
 for(const r of file.data.hg_profile.weightHistory||[])if(!date(r.date)||!Number.isFinite(Number(r.weight))||Number(r.weight)<=0)fail('體重紀錄');
 if(file.data.hg_sync_conflicts_v1!==undefined&&(!Array.isArray(file.data.hg_sync_conflicts_v1)||file.data.hg_sync_conflicts_v1.some((r:any)=>!object(r))))fail('衝突保留版本');
 return file as {format:string;version:number;createdAt:string;demo:boolean;data:Record<string,any>};
}
export function createBackup(storage:Storage,demo:boolean){const data:Record<string,any>={};for(const key of backupKeys){const actual=key==='hg_jog_reports_v1'?(demo?'hg_demo_jog_reports_v1':key):(demo?'demo_v2_'+key:key);data[key]=JSON.parse(storage.getItem(actual)||(key==='hg_profile'?'{"name":"","height":"","weight":""}':'[]'));}data.hg_sync_conflicts_v1=JSON.parse(storage.getItem(demo?'demo_v2_hg_sync_conflicts_v1':'hg_sync_conflicts_v1')||'[]');return {format:'healthguardian-device',version:1,createdAt:new Date().toISOString(),demo,data};}
export function restoreBackup(storage:Storage,file:ReturnType<typeof parseBackup>,demo:boolean){
 file=parseBackup(JSON.stringify(file));
 if(file.demo!==demo)throw new Error('示範資料與正式資料不能互相還原');
 if(!demo&&((getStorageMode(storage)==='gas'&&storage.getItem('hg_gas_api_url'))||JSON.parse(storage.getItem('hg_sync_queue_v1')||'[]').some((r:any)=>r.destination)))throw new Error('請先完成雲端同步並中斷 GAS 連線，再還原本機資料');
 writeBackupData(storage,file,demo);
}
export function writeBackupData(storage:Storage,file:ReturnType<typeof parseBackup>,demo:boolean){
 file=parseBackup(JSON.stringify(file));
 const entries=backupKeys.map(key=>[key==='hg_jog_reports_v1'?(demo?'hg_demo_jog_reports_v1':key):(demo?'demo_v2_'+key:key),JSON.stringify(file.data[key])] as const);
 entries.push([demo?'demo_v2_hg_sync_conflicts_v1':'hg_sync_conflicts_v1',JSON.stringify(file.data.hg_sync_conflicts_v1||[])] as any);
 if(!demo)entries.push(['hg_sync_queue_v1','[]'] as any);
 const previous=entries.map(([key])=>[key,storage.getItem(key)] as const);
 try{for(const [key,value] of entries)storage.setItem(key,value);}catch(error){for(const [key,value] of previous){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}throw error;}
}
