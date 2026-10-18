import { SyncQueue } from './syncQueue';
import { FoodAnalysis, HealthReport, UserProfile, WorkoutLog, SavedAppointment, WorkoutPlanDay, Recipe, VitalsRecord } from '../types';

const GAS_URL_KEY = 'hg_gas_api_url';
export const isDemoMode = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';
export const getGasUrl = () => isDemoMode() ? null : localStorage.getItem(GAS_URL_KEY);
const storageKey = (key: string) => isDemoMode() ? 'demo_v2_' + key : key;
export const setGasUrl = (url: string) => localStorage.setItem(GAS_URL_KEY, url);
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
  localStorage.setItem(storageKey(key), JSON.stringify(value));
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
       throw new Error("Invalid response format. Likely permission error.");
     }

    const json = await response.json();
    if (!json || typeof json !== 'object' || json.status === 'error') {
      throw new Error(json?.message || '雲端服務未能完成操作。');
    }
    return json;
  } catch (error: any) {
    console.error("GAS API Error:", error);
    if (error.message === 'Failed to fetch' || (error.cause && error.cause.message === 'Failed to fetch')) {
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
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            body: JSON.stringify({ action: "read_all" }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        }, 60000);
        
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            if (json && typeof json === 'object') {
                return true;
            } else {
                throw new Error("Invalid JSON structure");
            }
        } catch (e) {
            console.error("Connection test failed: Response is not JSON", text.substring(0, 100));
            if (text.includes("Google Drive") || text.includes("Google Docs")) {
                 throw new Error("回傳了 Google 登入頁面，請確認部署設定：「誰可以存取」必須設為「任何人」。");
            }
            throw new Error("回傳格式錯誤 (非 JSON)，請確認您複製的是「網頁應用程式網址」而非編輯器網址。");
        }
    } catch (e: any) {
        console.error("Connection test network error", e);
        if (e.message === 'Failed to fetch' || (e.cause && e.cause.message === 'Failed to fetch')) {
             throw new Error("網路連線錯誤 (Failed to fetch)。請檢查網址是否完整，並確認瀏覽器無阻擋跨站請求 (CORS)。");
        }
        throw e;
    }
  },

  // Load health/profile data -> Reads from localStorage instantly! Falls back to Sheet if empty.
  loadAllData: async (forceFromCloud = false) => {
    const hasLocalProfile = localStorage.getItem(storageKey(LOCAL_STORAGE_KEYS.profile));
    const hasLocalFood = Object.values(LOCAL_STORAGE_KEYS).filter(key=>!['hg_auto_backup','hg_last_backup_time'].includes(key)).some(key=>localStorage.getItem(storageKey(key))!==null);

    // If local data exists and we are NOT forcing from cloud, return immediately!
    if ((!getGasUrl() || hasLocalProfile || hasLocalFood) && !forceFromCloud) {
      return {
        foodLogs: getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs, []),
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
    // Otherwise, fetch from Google Sheet and update local cache
    const data = await callGasApi({ action: "read_all" });
    
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
    profile.weightHistory = ensureArray(profile.weightHistory);
    profile.medicationReminders = ensureArray(profile.medicationReminders);
    profile.dailyHealthLogs = ensureArray(profile.dailyHealthLogs);

    const appointments = Array.isArray(data.appointments) ? data.appointments : [];
    const vitals = Array.isArray(data.vitals) ? data.vitals : [];

    // Store in Local Cache
    setLocal(LOCAL_STORAGE_KEYS.foodLogs, foodLogs);
    setLocal(LOCAL_STORAGE_KEYS.reports, reports);
    setLocal(LOCAL_STORAGE_KEYS.workouts, workouts);
    setLocal(LOCAL_STORAGE_KEYS.profile, profile);
    setLocal(LOCAL_STORAGE_KEYS.appointments, appointments);
    setLocal(LOCAL_STORAGE_KEYS.workoutPlan, currentPlan);
    setLocal(LOCAL_STORAGE_KEYS.recipes, recipes);
    setLocal(LOCAL_STORAGE_KEYS.vitals, vitals);

    return {
      foodLogs,
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
    setLocal(LOCAL_STORAGE_KEYS.foodLogs, [log, ...logs]);
    dbService.queueSync('FoodLogs', log);
  },

  updateFoodLog: async (timestamp: string, updatedLog: FoodAnalysis) => {
    const logs = getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs, []);
    const updated = logs.map(l => l.timestamp === timestamp ? updatedLog : l);
    setLocal(LOCAL_STORAGE_KEYS.foodLogs, updated);
    dbService.queueSync('FoodLogs', updatedLog);
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
    if(isDemoMode()) return;
    const id = data.id || data.timestamp || data.analyzedAt;
    const singleton = type === 'Profile' || type === 'WorkoutPlan';
    const stableData = singleton ? data : {...data, id: id || crypto.randomUUID()};
    syncQueue.enqueue(getGasUrl() || '', singleton ? type : type + ':' + stableData.id, {action:'save',type,data:stableData});
    if (typeof navigator !== 'undefined' && navigator.onLine && localStorage.getItem('hg_auto_sync')!=='false') void syncQueue.flush(getGasUrl() || '');
  },
  queueDelete: (type: string, id: string) => {
    if(isDemoMode()) return;
    syncQueue.enqueue(getGasUrl() || '', type + ':' + id, {action:'delete',type,id});
    if(typeof navigator !== 'undefined' && navigator.onLine && localStorage.getItem('hg_auto_sync')!=='false') void syncQueue.flush(getGasUrl() || '');
  },

  // Full backup payload to Sheets
  backupAllToCloud: async () => {
    if (syncQueue.busy || syncQueue.list().length) throw new Error("請先完成同步中心的待同步資料，再進行完整備份。");
    const url = getGasUrl();
    if (!url) throw new Error("尚未設定 Google Sheets API 網址");

    const payload = {
      profile: getLocal<UserProfile>(LOCAL_STORAGE_KEYS.profile, { name: '', height: '', weight: '' }),
      foodLogs: getLocal<FoodAnalysis[]>(LOCAL_STORAGE_KEYS.foodLogs, []),
      reports: getLocal<HealthReport[]>(LOCAL_STORAGE_KEYS.reports, []),
      workouts: getLocal<WorkoutLog[]>(LOCAL_STORAGE_KEYS.workouts, []),
      appointments: getLocal<SavedAppointment[]>(LOCAL_STORAGE_KEYS.appointments, []),
      recipes: getLocal<Recipe[]>(LOCAL_STORAGE_KEYS.recipes, []),
      workoutPlan: getLocal<WorkoutPlanDay[]>(LOCAL_STORAGE_KEYS.workoutPlan, []),
      vitals: getLocal<VitalsRecord[]>(LOCAL_STORAGE_KEYS.vitals, [])
    };

    try {
      // Use the batch backup action supported by Backend v2.3+
      const res = await callGasApi({
        action: "backup_all",
        data: payload
      });

      if (res && res.status === "success") {
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
