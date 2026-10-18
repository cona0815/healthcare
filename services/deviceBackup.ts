export const backupKeys=['hg_foodLogs','hg_reports','hg_workouts','hg_profile','hg_appointments','hg_workoutPlan','hg_recipes','hg_vitals','hg_jog_reports_v1'] as const;
export function parseBackup(text:string){
 const file=JSON.parse(text);if(file?.format!=='healthguardian-device'||file.version!==1||!file.data||typeof file.data!=='object')throw new Error('不是支援的健康資料備份檔');
 for(const key of backupKeys){const value=file.data[key];if(key==='hg_profile'){if(!value||Array.isArray(value)||typeof value!=='object'||typeof value.name!=='string')throw new Error('個人資料格式錯誤');}else if(!Array.isArray(value)||value.some((x:any)=>!x||typeof x!=='object'||Array.isArray(x)))throw new Error('紀錄格式錯誤：'+key);}
 return file as {format:string;version:number;createdAt:string;demo:boolean;data:Record<string,any>};
}
export function createBackup(storage:Storage,demo:boolean){const data:Record<string,any>={};for(const key of backupKeys){const actual=key==='hg_jog_reports_v1'?(demo?'hg_demo_jog_reports_v1':key):(demo?'demo_v2_'+key:key);data[key]=JSON.parse(storage.getItem(actual)||(key==='hg_profile'?'{"name":"","height":"","weight":""}':'[]'));}return {format:'healthguardian-device',version:1,createdAt:new Date().toISOString(),demo,data};}
export function restoreBackup(storage:Storage,file:ReturnType<typeof parseBackup>,demo:boolean){
 file=parseBackup(JSON.stringify(file));
 if(file.demo!==demo)throw new Error('示範資料與正式資料不能互相還原');
 if(!demo&&(storage.getItem('hg_gas_api_url')||JSON.parse(storage.getItem('hg_sync_queue_v1')||'[]').some((r:any)=>r.destination)))throw new Error('請先完成雲端同步並中斷 GAS 連線，再還原本機資料');
 const entries=backupKeys.map(key=>[key==='hg_jog_reports_v1'?(demo?'hg_demo_jog_reports_v1':key):(demo?'demo_v2_'+key:key),JSON.stringify(file.data[key])] as const);
 if(!demo)entries.push(['hg_sync_queue_v1','[]'] as any);
 const previous=entries.map(([key])=>[key,storage.getItem(key)] as const);
 try{for(const [key,value] of entries)storage.setItem(key,value);}catch(error){for(const [key,value] of previous){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}throw error;}
}
