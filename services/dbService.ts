import {backupIfDue,snapshotStore} from './localSnapshots';
import {createBackup,parseBackup,writeBackupData} from './deviceBackup';
import {foodId, visibleFoods} from './foodRecords';
import {getStorageMode,setStorageMode} from './storageMode';
import { SyncQueue } from './syncQueue';
import { FoodAnalysis, HealthReport, UserProfile, WorkoutLog, SavedAppointment, WorkoutPlanDay, Recipe, VitalsRecord } from '../types';

const GAS_URL_KEY = 'hg_gas_api_url';
export const isDemoMode = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';
export const getGasUrl = () => isDemoMode() || getStorageMode()==='local' ? null : localStorage.getItem(GAS_URL_KEY);
const storageKey = (key: string) => isDemoMode() ? 'demo_v2_' + key : key;
export const setGasUrl = (url: string) => {localStorage.setItem(GAS_URL_KEY,url);setStorageMode('gas');};
export const clearGasUrl = () => localStorage.removeItem(GAS_URL_KEY);

// Define local storage keys
export const LOCAL_STORAGE_KEYS = {
  foodLogs: 'hg_foodLogs',
  reports: 'hg_reports',
  workouts: 'hg_workouts',
  profile: 'hg_profile',
  appointments: 'hg_appointments',
  workoutPlan: 'hg_workoutPlan',
  recipes: 'hg_recipes',
  vitals: 'hg_vitals',
  lastBackup: 'hg_last_backup_time',
  autoBackup: 'hg_auto_backup',
};

// Local storage helper utilities
export const getLocal = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(storageKey(key));
  if (!item) return defaultValue;
  try {
    return JSON.parse(item);
  } catch (e) {
    return defaultValue;
  }
};

export const setLocal = <T>(key: string, value: T): void => {
  try{localStorage.setItem(storageKey(key), JSON.stringify(value));if(typeof window!=='undefined')window.dispatchEvent(new Event('health-saved'));}catch(error){if(typeof window!=='undefined')window.dispatchEvent(new Event('health-save-failed'));throw error;}
};

// Timeout fetch helper
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 60000) => {
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error: any) {
    const isAbort = error.name === 'AbortError' || 
                    (error.message && (error.message.includes('aborted') || error.message.includes('timeout') || error.message.includes('reason')));
                    
    if (isAbort) {
        throw new Error(`連線回應逾時 (${timeout / 1000}秒)。Google Sheets 可能正在休眠啟動中，請耐心等候或再次點擊按鈕重試。`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
};

// Calling GAS Generic API Function
const callGasApi = async (data: any, destination?: string) => {
  if(data.type==='FoodLogs'&&data.action==='save')data={...data,action:'save_meal_v3',baseRevision:data.baseRevision??Math.max(0,(data.data?.revision||1)-1),operationId:data.operationId||'legacy-'+data.data?.id+'-'+data.data?.revision};
  const url = destination || getGasUrl();
  if (!url) throw new Error("API URL not set");

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
    });
    if (!response.ok) {
      throw new Error(`雲端服務回應失敗 (HTTP ${response.status})，請稍後重試。`);
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
       throw new Error("雲端未回傳資料，可能是 Google 登入或權限頁面。請確認 GAS 的執行身分及存取權限，並使用 /exec 部署網址。");
     }

    const json = await response.json();
    if (!json || typeof json !== 'object' || json.status === 'error') {
      throw new Error(data.action?.endsWith('_v3')&&/Unknown action/i.test(json?.message||'')?'請先部署設定內的 GAS v3 程式；本機資料與待同步紀錄均保留。':json?.message || '雲端服務未能完成操作。');
    }
    return json;
  } catch (error: any) {
    console.error("GAS API Error:", error);
    if (/Failed to fetch|Load failed|NetworkError|Network request failed/i.test(error.message||'')) {
        throw new Error("網路連線失敗 (Failed to fetch)。請檢查您的 GAS 網址是否正確 (需為 /exec 結尾)，或是您的瀏覽器擴充功能(如廣告阻擋)可能阻擋了連線。");
    }
    throw error;
  }
};

// Array integrity utility
const ensureArray = (item: any): any[] => {
    if (Array.isArray(item)) return item;
    if (typeof item === 'string' && (item.startsWith('[') || item.startsWith('{'))) {
        try { return JSON.parse(item); } catch (e) { return []; }
    }
    return [];
};

export const dbService = {
  // Test connection to Google Sheet Link
  testConnection: async (url: string) => {
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.trim())) throw new Error('請填入完整的 GAS 網頁應用程式網址（/exec 結尾）。');
    const data=await callGasApi({action:'read_all'},url.trim());
    if(!Array.isArray(data.foodLogs)||!Array.isArray(data.workouts)||!('profile' in data)) throw new Error('GAS 回傳的資料格式不符，請確認部署的是本系統的 GAS 程式及最新版本。');
    return true;
  },

  // Load health/profile data -> Reads from localStorage instantly! Falls back to Sheet if empty.
  loadAllData: async (forceFromCloud = false) => {
    const hasLocalProfile = localStorage.getItem(storageKey(LOCAL_STORAGE_KEYS.profile));
    const hasLocalFood = Object.values(LOCAL_STORAGE_KEYS).filter(key=>!['hg_auto_backup','hg_last_backup_time'].includes(key)).some(key=>localStorage.getItem(storageKey(key))!==null);

    // If local data exists and we are NOT forcing from cloud, return immediately!
    if ((!getGasUrl() || hasLocalProfile || hasLocalFood) && !forceFromCloud) {
      return {
        foodLogs: visibleFoods(getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs, [])),
        reports: getLocal<HealthReport[]>(LOCAL_STORAGE_KEYS.reports, []),
        workouts: getLocal<WorkoutLog[]>(LOCAL_STORAGE_KEYS.workouts, []),
        profile: getLocal<UserProfile>(LOCAL_STORAGE_KEYS.profile, { name: '', height: '', weight: '' }),
        appointments: getLocal<SavedAppointment[]>(LOCAL_STORAGE_KEYS.appointments, []),
        workoutPlan: getLocal<WorkoutPlanDay[]>(LOCAL_STORAGE_KEYS.workoutPlan, []),
        recipes: getLocal<Recipe[]>(LOCAL_STORAGE_KEYS.recipes, []),
        vitals: getLocal<VitalsRecord[]>(LOCAL_STORAGE_KEYS.vitals, [])
      };
    }

    if (syncQueue.list().length) throw new Error('還有待同步資料，請先至同步中心完成同步，再從雲端載入。');
    const beforeDownload=JSON.stringify(createBackup(localStorage,isDemoMode()).data);
    // Otherwise, fetch from Google Sheet and update local cache
    const data = await callGasApi({ action: "read_all" });
    
    if(!data||!['foodLogs','workouts','reports','appointments','recipes','workoutPlan','vitals'].every(k=>Array.isArray(data[k]))||!data.profile||typeof data.profile!=='object'||Array.isArray(data.profile))throw new Error('雲端回傳內容不完整，未覆蓋本機資料');
    let currentPlan: WorkoutPlanDay[] = [];
    if (data.workoutPlan && Array.isArray(data.workoutPlan) && data.workoutPlan.length > 0) {
        const lastEntry = data.workoutPlan[data.workoutPlan.length - 1];
        if (lastEntry && lastEntry.planJson) {
            try {
                const jsonStr = typeof lastEntry.planJson === 'string' ? lastEntry.planJson : JSON.stringify(lastEntry.planJson);
                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed)) {
                    currentPlan = parsed;
                }
            } catch (e) {
                console.error("Failed to parse workout plan JSON", e);
            }
        }
    }

    const rawFoodLogs = Array.isArray(data.foodLogs) ? data.foodLogs : [];
    const foodLogs = rawFoodLogs.map((log: any) => ({
        ...log,
        thumbnail:log.thumbnail ?? getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs,[]).find(f=>foodId(f)===foodId(log))?.thumbnail,
        revision:Number(log.revision)||1,
        nutrients: ensureArray(log.nutrients),
        ingredients: ensureArray(log.ingredients),
        calories: Number(log.calories) || 0
    }));

    const rawWorkouts = Array.isArray(data.workouts) ? data.workouts : [];
    const workouts = rawWorkouts.map((w: any) => ({
        ...w,
        timestamp: w.timestamp ? String(w.timestamp) : ''
    }));

    const rawReports = Array.isArray(data.reports) ? data.reports : [];
    const reports = rawReports.map((r: any) => ({
        ...r,
        metrics: ensureArray(r.metrics),
        dietaryRestrictions: ensureArray(r.dietaryRestrictions)
    }));
    
    const rawRecipes = Array.isArray(data.recipes) ? data.recipes : [];
    const recipes = rawRecipes.map((r: any) => ({
        ...r,
        tags: ensureArray(r.tags),
        ingredients: ensureArray(r.ingredients),
        steps: ensureArray(r.steps),
        checkedIngredients: ensureArray(r.checkedIngredients)
    }));

    let profile = data.profile || { name: '', height: '', weight: '' };
    if (profile.exerciseOptions !== undefined && profile.exerciseOptions !== null && profile.exerciseOptions !== '') profile.exerciseOptions = ensureArray(profile.exerciseOptions);
    for (const key of ['symptoms','medicineStock','quickTemplates','customTasks','taskCardOrder']) profile[key] = ensureArray(profile[key]);
    if(typeof profile.companion==='string'){try{profile.companion=JSON.parse(profile.companion);}catch{delete profile.companion;}}
    profile.weightHistory = ensureArray(profile.weightHistory);
    profile.medicationReminders = ensureArray(profile.medicationReminders);
    profile.dailyHealthLogs = ensureArray(profile.dailyHealthLogs);

    const appointments = Array.isArray(data.appointments) ? data.appointments : [];
    const vitals = Array.isArray(data.vitals) ? data.vitals : [];

    // Validate the complete response before touching local data, then preserve a recovery snapshot.
    const incoming=createBackup(localStorage,isDemoMode());
    Object.assign(incoming.data,{hg_foodLogs:foodLogs,hg_reports:reports,hg_workouts:workouts,hg_profile:profile,hg_appointments:appointments,hg_workoutPlan:currentPlan,hg_recipes:recipes,hg_vitals:vitals});
    const validated=parseBackup(JSON.stringify(incoming));
    if(typeof indexedDB!=='undefined')await backupIfDue(localStorage,snapshotStore,isDemoMode(),0,new Date(),true);
    if(syncQueue.list().length||JSON.stringify(createBackup(localStorage,isDemoMode()).data)!==beforeDownload)throw new Error('下載期間本機資料已變更，未覆蓋；請完成同步後重試');
    writeBackupData(localStorage,validated,isDemoMode());

    return {
      foodLogs: visibleFoods(foodLogs),
      reports,
      workouts,
      profile,
      appointments, 
      workoutPlan: currentPlan,
      recipes,
      vitals
    };
  },

  // Save Operations (Instant Local + Silent Background queue Sync)
  saveUserProfile: async (profile: UserProfile) => {
    setLocal(LOCAL_STORAGE_KEYS.profile, profile);
    const dataToSave = { 
        ...profile, 
        updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }) 
    };
    dbService.queueSync('Profile', dataToSave);
  },

  addFoodLog: async (log: FoodAnalysis) => {
    const logs = getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs, []);
    const id=foodId(log);
    const existing=logs.find(l=>foodId(l)===id);
    if(existing){dbService.queueSync('FoodLogs',{...existing,id});return;}
    const saved={...log,id,revision:1};
    setLocal(LOCAL_STORAGE_KEYS.foodLogs,[saved,...logs]);
    dbService.queueSync('FoodLogs',saved);
  },
  updateFoodLog: async (key:string, log:FoodAnalysis) => {
    const logs=getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs,[]);
    const old=logs.find(l=>foodId(l)===key||l.timestamp===key);
    if(!old||old.deletedAt) throw new Error('這筆餐點已刪除，請重新開啟紀錄。');
    if(log.revision!==undefined && log.revision!==(old.revision||1)) throw new Error('餐點已被更新，請重新開啟後編輯。');
    const saved={...log,id:foodId(old),revision:(old.revision||1)+1};
    setLocal(LOCAL_STORAGE_KEYS.foodLogs,logs.map(l=>foodId(l)===foodId(old)?saved:l));
    dbService.queueSync('FoodLogs',saved);
  },
  deleteFoodLog: async (key:string) => {
    const logs=getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs,[]);
    const old=logs.find(l=>foodId(l)===key);
    if(!old||old.deletedAt)return;
    // A tombstone travels through ordinary upserts and backups; old retries cannot re-add locally.
    const deleted={...old,id:key,revision:(old.revision||1)+1,deletedAt:new Date().toISOString()};
    setLocal(LOCAL_STORAGE_KEYS.foodLogs,logs.map(l=>foodId(l)===key?deleted:l));
    dbService.queueSync('FoodLogs',deleted);
  },
  restoreFoodLog: async(key:string) => {
    const logs=getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs,[]);
    const old=logs.find(l=>foodId(l)===key);
    if(!old?.deletedAt)return;
    const restored={...old,deletedAt:'',revision:(old.revision||1)+1};
    setLocal(LOCAL_STORAGE_KEYS.foodLogs,logs.map(l=>foodId(l)===key?restored:l));
    dbService.queueSync('FoodLogs',restored);
  },

  addHealthReport: async (report: HealthReport) => {
    const reports = getLocal<HealthReport[]>(LOCAL_STORAGE_KEYS.reports, []);
    setLocal(LOCAL_STORAGE_KEYS.reports, [report, ...reports]);
    dbService.queueSync('Reports', report);
  },

  addWorkoutLog: async (log: WorkoutLog) => {
    const workouts = getLocal<WorkoutLog[]>(LOCAL_STORAGE_KEYS.workouts, []);
    setLocal(LOCAL_STORAGE_KEYS.workouts, [log, ...workouts]);
    dbService.queueSync('Workouts', log);
  },
  
  saveAppointment: async (appointment: SavedAppointment) => {
    const appts = getLocal<SavedAppointment[]>(LOCAL_STORAGE_KEYS.appointments, []);
    setLocal(LOCAL_STORAGE_KEYS.appointments, [appointment, ...appts]);
    dbService.queueSync('Appointments', appointment);
  },

  deleteAppointment: async (id: string) => {
    const appts = getLocal<SavedAppointment[]>(LOCAL_STORAGE_KEYS.appointments, []);
    setLocal(LOCAL_STORAGE_KEYS.appointments, appts.filter(a => a.id !== id));
    dbService.queueDelete('Appointments', id);
  },

  saveWorkoutPlan: async (plan: WorkoutPlanDay[]) => {
    setLocal(LOCAL_STORAGE_KEYS.workoutPlan, plan);
    const payload = {
        timestamp: new Date().toISOString(),
        planJson: JSON.stringify(plan)
    };
    dbService.queueSync('WorkoutPlan', payload);
  },

  saveRecipe: async (recipe: Recipe) => {
    const recipes = getLocal<Recipe[]>(LOCAL_STORAGE_KEYS.recipes, []);
    const exists = recipes.find(r => r.id === recipe.id);
    const updated = exists ? recipes.map(r => r.id === recipe.id ? recipe : r) : [recipe, ...recipes];
    setLocal(LOCAL_STORAGE_KEYS.recipes, updated);
    dbService.queueSync('Recipes', recipe);
  },

  deleteRecipe: async (id: string) => {
    const recipes = getLocal<Recipe[]>(LOCAL_STORAGE_KEYS.recipes, []);
    setLocal(LOCAL_STORAGE_KEYS.recipes, recipes.filter(r => r.id !== id));
    dbService.queueDelete('Recipes', id);
  },

  saveVitalsRecord: async (record: VitalsRecord) => {
    const vitals = getLocal<VitalsRecord[]>(LOCAL_STORAGE_KEYS.vitals, []);
    setLocal(LOCAL_STORAGE_KEYS.vitals, [record, ...vitals]);
    dbService.queueSync('Vitals', record);
  },

  // Helper inside save calls to execute silent sync
  queueSync: (type: string, data: any) => {
    if(isDemoMode()||getStorageMode()==='local') return;
    const id = data.id || data.timestamp || data.analyzedAt;
    const singleton = type === 'Profile' || type === 'WorkoutPlan';
    const stableData = singleton ? data : {...data, id: id || crypto.randomUUID()};
    syncQueue.enqueue(getGasUrl() || '', singleton ? type : type + ':' + stableData.id, type==='FoodLogs'?{action:'save_meal_v3',type,data:stableData,baseRevision:Math.max(0,(stableData.revision||1)-1),operationId:crypto.randomUUID()}:{action:'save',type,data:stableData});
    if (typeof navigator !== 'undefined' && navigator.onLine && localStorage.getItem('hg_auto_sync')!=='false') void syncQueue.flush(getGasUrl() || '');
  },
  queueDelete: (type: string, id: string) => {
    if(isDemoMode()||getStorageMode()==='local') return;
    syncQueue.enqueue(getGasUrl() || '', type + ':' + id, {action:'delete',type,id});
    if(typeof navigator !== 'undefined' && navigator.onLine && localStorage.getItem('hg_auto_sync')!=='false') void syncQueue.flush(getGasUrl() || '');
  },

  resolveMealConflict:async(id:string,useLocal:boolean)=>{
    if(syncQueue.busy)throw new Error('請等同步完成再處理');
    const row=syncQueue.list().find(r=>r.id===id);if(!row?.conflict||row.current===undefined)throw new Error('缺少雲端版本，請更新 GAS 並重試');
    const archive=getLocal<any[]>('hg_sync_conflicts_v1',[]);
    setLocal('hg_sync_conflicts_v1',[...archive,{savedAt:new Date().toISOString(),local:row.payload.data,cloud:row.current}]);
    const local=getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs,[]);
    const selected=useLocal?{...row.payload.data,revision:Number(row.current?.revision||0)+1}:row.current;
    setLocal(LOCAL_STORAGE_KEYS.foodLogs,selected?local.map(f=>foodId(f)===foodId(selected)?selected:f):local.filter(f=>foodId(f)!==foodId(row.payload.data)));
    if(useLocal)syncQueue.replaceConflict(id,{action:'save_meal_v3',type:'FoodLogs',data:selected,baseRevision:Number(row.current?.revision||0),operationId:crypto.randomUUID()});else syncQueue.remove(id);
    if(typeof window!=='undefined')window.dispatchEvent(new Event('health-food-refresh'));
  },
  listCloudBackups:async()=>{const r=await callGasApi({action:'list_backups_v3'});if(r.protocol!==3||!Array.isArray(r.backups))throw new Error('請先部署 GAS v3 程式');return r.backups as {id:string;createdAt:string}[];},
  downloadCloudBackup:async(id:string)=>{const r=await callGasApi({action:'read_backup_v3',backupId:id});if(r.protocol!==3)throw new Error('請先部署 GAS v3 程式');return parseBackup(JSON.stringify(r.backup));},
  // Full backup payload to Sheets
  backupAllToCloud: async () => {
    if (syncQueue.busy || syncQueue.list().length) throw new Error("請先完成同步中心的待同步資料，再進行完整備份。");
    const url = getGasUrl();
    if (!url) throw new Error("尚未設定 Google Sheets API 網址");

    const payload = parseBackup(JSON.stringify(createBackup(localStorage,false)));
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
    const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');

    try {
      // Use the batch backup action supported by Backend v2.3+
      const res = await callGasApi({
        action: "backup_snapshot_v3",
        data: payload
      });

      if (res && res.status === "success" && res.protocol===3 && res.backupId && res.digest===digest) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.lastBackup, new Date().toISOString());
        return true;
      }
      throw new Error(res?.message || "備份失敗，請確認 Apps Script 部署版本是否為最新修復版。");
    } catch (e: any) {
      console.error("Backup All error:", e);
      
      throw e;
    }
  }
};

export const syncQueue = new SyncQueue({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)} as Storage, callGasApi, ()=>{if(typeof window!=='undefined') window.dispatchEvent(new Event('health-sync'));});
