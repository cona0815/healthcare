// Gemini 設定與「自動換模型」機制。
// 規則：不寫死單一模型。先用上次成功的模型，再用 latest 別名，模型停用（404）或額度用完（429）就換下一個，
// 全部失敗再問 Google 目前有哪些模型；免費方案 Flash-Lite 優先，付費方案 Flash 優先。
export const DEFAULT_GEMINI_MODEL='gemini-3.8-flash'; // 只作為舊設定相容與顯示用的最後備援，不再直接呼叫
export const AUTO_MODEL='auto';
export type GeminiPlan='free'|'paid';
export type ModelKind='general'|'video';
export const MODEL_ALIASES:Record<GeminiPlan,readonly string[]>={
 free:['gemini-flash-lite-latest','gemini-flash-latest'],
 paid:['gemini-flash-latest','gemini-flash-lite-latest'],
};
const MODELS_CACHE_KEY='hg_gemini_models_cache';
const PLAN_NOTICE_KEY='hg_gemini_plan_notice';

export function validModel(value:string){return /^gemini-[a-z0-9][a-z0-9.-]{1,100}$/.test(value);}

export function getGeminiPlan():GeminiPlan{return localStorage.getItem('hg_gemini_plan')==='paid'?'paid':'free';}
export function setGeminiPlan(plan:GeminiPlan){localStorage.setItem('hg_gemini_plan',plan);}
/** 程式偵測到方案設錯並自動改回免費時留下的提醒；讀取後清除。 */
export function takePlanNotice():string|null{const v=localStorage.getItem(PLAN_NOTICE_KEY);if(v)localStorage.removeItem(PLAN_NOTICE_KEY);return v||null;}

/** 使用者的模型選擇：'auto' 或明確的模型 ID。 */
export function getModelPreference(kind:ModelKind='general'):string{
 const value=localStorage.getItem('hg_gemini_model_'+kind);
 if(!value||value===AUTO_MODEL)return AUTO_MODEL;
 return validModel(value)?value:AUTO_MODEL;
}
export function saveModelPreferences(general:string,video:string){
 for(const value of [general,video])if(value!==AUTO_MODEL&&!validModel(value))throw new Error('請選「自動」或填寫有效的 Gemini 模型 ID，例如 gemini-flash-latest');
 localStorage.setItem('hg_gemini_model_general',general);localStorage.setItem('hg_gemini_model_video',video);
}
export function getLastGoodModel(kind:ModelKind):string|null{return localStorage.getItem('hg_gemini_last_good_'+kind)||null;}
export function rememberGoodModel(kind:ModelKind,model:string){localStorage.setItem('hg_gemini_last_good_'+kind,model);}

// 舊 API 相容：getGeminiModel 回傳「目前最可能使用的模型」，僅供顯示；實際呼叫一律走 runWithModelFallback。
export function getGeminiModel(kind:ModelKind='general'){
 const preference=getModelPreference(kind);
 if(preference!==AUTO_MODEL)return preference;
 return getLastGoodModel(kind)||DEFAULT_GEMINI_MODEL;
}
export function saveGeminiModels(general:string,video:string){
 if(!validModel(general)||!validModel(video))throw new Error('請填寫有效的 Gemini 模型 ID，例如 gemini-3.8-flash');
 saveModelPreferences(general,video);
}
/** 不經過自動換模型的呼叫（例如串流聊天）用這個挑一個最可能成功的模型。 */
export function preferredModel(kind:ModelKind='general',plan:GeminiPlan=getGeminiPlan()){
 const preference=getModelPreference(kind);
 if(preference!==AUTO_MODEL)return preference;
 return getLastGoodModel(kind)||MODEL_ALIASES[plan][0];
}

export class GeminiError extends Error{
 constructor(message:string,public code=500,public status='',public model=''){super(message);this.name='GeminiError';}
}
export type GeminiErrorKind='invalid_key'|'quota'|'model_missing'|'other';
export function classifyGeminiError(err:unknown):GeminiErrorKind{
 const e=err as {code?:unknown;status?:unknown;message?:unknown}|null;
 const code=Number(e?.code||0);
 const text=`${e?.status||''} ${e?.message||''}`;
 if(code===429||/RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(text))return 'quota';
 if(code===404||/NOT_FOUND|not found|no longer available|deprecated|is not supported/i.test(text))return 'model_missing';
 if(code===401||code===403||/API.?key.*(not valid|invalid|expired)|API_KEY_INVALID|UNAUTHENTICATED|PERMISSION_DENIED/i.test(text))return 'invalid_key';
 return 'other';
}
export const isFreeTierQuotaMessage=(text:string)=>/free[_ ]?tier/i.test(text);

// --- 模型清單 ---
export const isCandidateModel=(name:string)=>/^gemini-\d+(?:\.\d+)?-flash(?:-lite)?$/.test(name);
const parseModel=(name:string)=>{const m=name.match(/^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/);return m?{version:parseFloat(m[1]),lite:!!m[2]}:null;};
/** 只留正式版 flash／flash-lite（排除 preview、exp、tts、image 等），依方案排序：免費 Lite 優先、付費 Flash 優先，版本新的在前。 */
export function rankModels(names:string[],plan:GeminiPlan):string[]{
 return [...new Set(names.filter(isCandidateModel))].sort((a,b)=>{
  const A=parseModel(a)!,B=parseModel(b)!;
  if(A.lite!==B.lite){const liteFirst=plan==='free';return (A.lite?-1:1)*(liteFirst?1:-1);}
  return B.version-A.version;
 });
}
export type DiscoveredModel={name:string;displayName?:string;methods?:string[]};
export function cachedModels():string[]{
 try{const raw=localStorage.getItem(MODELS_CACHE_KEY);if(!raw)return [];const parsed=JSON.parse(raw);return Array.isArray(parsed?.names)?parsed.names.filter((n:unknown)=>typeof n==='string'):[];}catch{return [];}
}
export type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>;
/** 透過後端代理問 Google 目前有哪些支援 generateContent 的模型，並快取在本機。 */
export async function discoverModels(headers:Record<string,string>={},fetcher:Fetcher=(...args)=>fetch(...args)):Promise<string[]>{
 const res=await fetcher('/api/gemini/models',{headers});
 const body:any=await res.json().catch(()=>({}));
 if(!res.ok)throw new GeminiError(String(body?.error||'無法取得 Gemini 模型清單'),res.status,String(body?.status||''));
 const names=((body?.models||[]) as DiscoveredModel[]).filter(m=>!m.methods||m.methods.includes('generateContent')).map(m=>String(m.name||'').replace(/^models\//,'')).filter(Boolean);
 try{localStorage.setItem(MODELS_CACHE_KEY,JSON.stringify({at:new Date().toISOString(),names}));}catch{}
 return names;
}

/** 自動模式的候選順序：上次成功 → 別名 → 已知清單（快取或剛問到的）。 */
export function autoCandidates(kind:ModelKind,plan:GeminiPlan,known:string[]=[]):string[]{
 const list=[getLastGoodModel(kind),...MODEL_ALIASES[plan],...rankModels(known,plan)].filter((v):v is string=>!!v);
 return [...new Set(list)];
}

export type FallbackResult<T>={result:T;model:string;notes:string[]};
export type FallbackOptions={plan?:GeminiPlan;headers?:Record<string,string>;fetcher?:Fetcher;discover?:boolean};
/**
 * 依序嘗試模型。404 換下一個；429 在自動模式換下一個、在使用者指定模型時照實回報；金鑰錯誤立即停止。
 * 候選都失敗且允許查詢時，問 Google 現有模型再試一輪。
 */
export async function runWithModelFallback<T>(kind:ModelKind,attempt:(model:string)=>Promise<T>,options:FallbackOptions={}):Promise<FallbackResult<T>>{
 let plan=options.plan??getGeminiPlan();
 const preference=getModelPreference(kind);
 const explicit=preference!==AUTO_MODEL;
 const notes:string[]=[];
 const tried=new Set<string>();
 let sawQuota=false,sawMissing=false;
 const tryList=async(models:string[]):Promise<FallbackResult<T>|null>=>{
  for(const model of models){
   if(tried.has(model))continue;
   tried.add(model);
   try{
    const result=await attempt(model);
    rememberGoodModel(kind,model);
    return {result,model,notes};
   }catch(err){
    const kind2=classifyGeminiError(err);
    const message=String((err as Error)?.message||'');
    if(kind2==='invalid_key')throw new GeminiError('Gemini 金鑰無效或已失效，請到設定重新貼上。',401,'INVALID_KEY',model);
    if(kind2==='model_missing'){sawMissing=true;notes.push(`${model} 已停用或不存在，改試其他模型`);continue;}
    if(kind2==='quota'){
     sawQuota=true;
     if(plan==='paid'&&isFreeTierQuotaMessage(message)){
      plan='free';setGeminiPlan('free');
      try{localStorage.setItem(PLAN_NOTICE_KEY,'Google 回報的是免費額度，已自動改回免費方案；若你確實有付費，請確認金鑰所屬的專案已開啟計費。');}catch{}
      notes.push('Google 回報免費額度，方案已改回免費');
     }
     if(explicit&&model===preference)throw new GeminiError(`${model} 今天的額度已用完。你指定了這個模型，所以沒有自動更換；可改選「自動」。`,429,'RESOURCE_EXHAUSTED',model);
     notes.push(`${model} 額度用完，改用下一個`);continue;
    }
    throw err;
   }
  }
  return null;
 };
 const first=explicit?[preference,...autoCandidates(kind,plan,cachedModels())]:autoCandidates(kind,plan,cachedModels());
 let outcome=await tryList(first);
 if(outcome)return outcome;
 if(options.discover!==false){
  try{
   const names=await discoverModels(options.headers,options.fetcher);
   outcome=await tryList(rankModels(names,plan));
   if(outcome)return outcome;
  }catch(err){notes.push('無法取得 Google 模型清單：'+String((err as Error)?.message||''));}
 }
 if(sawQuota&&!sawMissing)throw new GeminiError(plan==='free'?'所有可用模型今天的免費額度都已用完，明天會重置；可改用手動紀錄。':'所有可用模型的額度都已用完，請稍後再試或查看 Google AI Studio 用量。',429,'RESOURCE_EXHAUSTED');
 throw new GeminiError('目前找不到可用的 Gemini 模型：'+(notes.join('；')||'沒有候選模型'),sawQuota?429:404,sawMissing?'NOT_FOUND':'');
}
