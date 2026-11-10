import CloudBackupVersions from './CloudBackupVersions';
import StorageModeSettings from './StorageModeSettings';
import {getStorageMode,getStoragePreference,configuredGasUrl} from '../services/storageMode';
import DeviceBackup from './DeviceBackup';
import {SyncCenter} from './CareTools';
import ApiGuide from './ApiGuide';
import {AUTO_MODEL,GeminiPlan,getGeminiPlan,setGeminiPlan,getModelPreference,saveModelPreferences,cachedModels,rankModels,takePlanNotice} from '../services/aiSettings';
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Key, Database, CalendarDays, Eye, EyeOff, Save, Code, Check, Cloud, CloudDownload, CloudUpload, RefreshCw, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { getGeminiKey, setGeminiKey, clearGeminiKey, testGeminiConnection } from '../services/geminiService';
import { getGasUrl, setGasUrl, clearGasUrl, isDemoMode, getLocal, dbService, syncQueue } from '../services/dbService';
import { GAS_CODE } from './GasSetup';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onRefreshAllData: () => Promise<void>;
}

const SystemSettings: React.FC<Props> = ({ userProfile, onUpdateProfile, onRefreshAllData }) => {
  const CUSTOM_CHOICE='custom';
  const [plan,setPlan]=useState<GeminiPlan>(getGeminiPlan());
  const [modelOptions,setModelOptions]=useState<string[]>(()=>rankModels(cachedModels(),getGeminiPlan()));
  const choiceFor=(pref:string,options:string[])=>pref===AUTO_MODEL?AUTO_MODEL:options.includes(pref)?pref:CUSTOM_CHOICE;
  const [generalChoice,setGeneralChoice]=useState(()=>choiceFor(getModelPreference('general'),rankModels(cachedModels(),getGeminiPlan())));
  const [generalCustom,setGeneralCustom]=useState(()=>getModelPreference('general')===AUTO_MODEL?'':getModelPreference('general'));
  const [videoChoice,setVideoChoice]=useState(()=>choiceFor(getModelPreference('video'),rankModels(cachedModels(),getGeminiPlan())));
  const [videoCustom,setVideoCustom]=useState(()=>getModelPreference('video')===AUTO_MODEL?'':getModelPreference('video'));
  const [testing,setTesting]=useState(false);
  const [gasTesting,setGasTesting]=useState(false);
  const modelOptionList=(choice:string)=>{const list=[...modelOptions];if(choice!==AUTO_MODEL&&choice!==CUSTOM_CHOICE&&!list.includes(choice))list.unshift(choice);return [<option key="auto" value={AUTO_MODEL}>自動（建議）</option>,...list.map(m=><option key={m} value={m}>{m}</option>),<option key="custom" value={CUSTOM_CHOICE}>自訂模型 ID…</option>];};
  const resolveChoice=(choice:string,custom:string)=>choice===CUSTOM_CHOICE?custom.trim():choice;
  const [settingsMessage,setSettingsMessage]=useState('');
  const [gasMessage,setGasMessage]=useState('');
  const gasSavingRef=useRef(false);
  const [gasSaving,setGasSaving]=useState(false);
  const [storageMode,refreshMode]=useState(getStorageMode());
  const [storagePreference,setStoragePreference]=useState(getStoragePreference());
  useEffect(()=>{const update=()=>{refreshMode(getStorageMode());setStoragePreference(getStoragePreference());};window.addEventListener('health-storage-mode',update);return()=>window.removeEventListener('health-storage-mode',update);},[]);
  const [apiKey, setApiKey] = useState('');
  const [gasUrl, setGasUrlState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showGasCode, setShowGasCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Backup & Restore states
  const [autoBackup, setAutoBackup] = useState<boolean>(() => {
    return localStorage.getItem('hg_auto_sync') !== 'false';
  });
  const [lastBackup, setLastBackup] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [counts, setCounts] = useState({
    food: 0,
    vitals: 0,
    workouts: 0,
    reports: 0,
    appointments: 0,
    recipes: 0
  });

  const loadCountsAndBackupTime = () => {
    setCounts({
      food: getLocal<any[]>('hg_foodLogs', []).length,
      vitals: getLocal<any[]>('hg_vitals', []).length,
      workouts: getLocal<any[]>('hg_workouts', []).length,
      reports: getLocal<any[]>('hg_reports', []).length,
      appointments: getLocal<any[]>('hg_appointments', []).length,
      recipes: getLocal<any[]>('hg_recipes', []).length,
    });
    
    // Also read timestamps written as JSON strings by older versions.
    const lastBackupTime = getLocal<string>('hg_last_backup_time', localStorage.getItem('hg_last_backup_time') || '');
    if (lastBackupTime) {
      setLastBackup(new Date(lastBackupTime).toLocaleString('zh-TW', { hour12: false }));
    } else {
      setLastBackup('從未備份');
    }
  };

  useEffect(() => {
    setApiKey(getGeminiKey() || '');
    setGasUrlState(configuredGasUrl() || '');{const notice=takePlanNotice();if(notice)setSettingsMessage(notice);}
    loadCountsAndBackupTime();
  }, []);

  const handleToggleAutoBackup = () => {
    const newVal = !autoBackup;
    setAutoBackup(newVal);
    localStorage.setItem('hg_auto_sync', String(newVal));
  };

  const handleDoBackup = async () => {
    if (!getGasUrl()) {
      alert("請先完成下方的「Google Apps Script URL (雲端資料同步)」設定！");
      return;
    }
    setSyncing(true);
    try {
      await dbService.backupAllToCloud();
      loadCountsAndBackupTime();
      alert("🎉 備份完成！完整備份已寫入並通過校驗。這次新增歷史版本，未覆蓋雲端同步紀錄；可在「雲端備份版本」下載。");
    } catch (e: any) {
      alert("備份發生錯誤: " + (e.message || e));
    } finally {
      setSyncing(false);
    }
  };

  const handleDoRestore = async () => {
    if (!getGasUrl()) {
      alert("請先完成下方的「Google Apps Script URL」設定！");
      return;
    }
    if (!confirm("⚠️ 注意：此操作將會下載 Google Sheet 上的資料，並【完全覆蓋】您目前手機本機的內容！\n\n確定要繼續下載嗎？")) {
      return;
    }
    setRestoring(true);
    try {
      await onRefreshAllData(); // Force fetch and reload entire local caches
      loadCountsAndBackupTime();
      alert("🎉 回復/同步成功！已成功將雲端資料庫之最新內容載入本機。");
    } catch (e: any) {
      alert("同步載入發生錯誤: " + (e.message || e));
    } finally {
      setRestoring(false);
    }
  };

  const persistGemini = () => {
    if(isDemoMode()){setSettingsMessage('請離開示範模式再設定。');return false;}
    const general=resolveChoice(generalChoice,generalCustom),video=resolveChoice(videoChoice,videoCustom);
    try{saveModelPreferences(general,video);setGeminiPlan(plan);if(apiKey.trim())setGeminiKey(apiKey.trim());else clearGeminiKey();return true;}
    catch(err){setSettingsMessage((err as Error).message||'儲存失敗，請檢查裝置空間。');return false;}
  };
  const handleSaveGemini = () => { if(persistGemini())setSettingsMessage('Gemini 設定已儲存；未變更 GAS 連線。'); };
  // 「確認」：先儲存目前輸入，再送一句「請回答 OK」測試金鑰與模型，並順便更新模型清單。
  const handleTestGemini = async () => {
    if(testing)return;
    if(!persistGemini())return;
    if(!apiKey.trim()){setSettingsMessage('請先貼上 API Key 再按確認。');return;}
    setTesting(true);setSettingsMessage('已儲存，正在測試金鑰…');
    try{
      const outcome=await testGeminiConnection();
      const currentPlan=getGeminiPlan();setPlan(currentPlan);
      if(outcome.models?.length)setModelOptions(rankModels(outcome.models,currentPlan));
      const notice=takePlanNotice();
      setSettingsMessage(outcome.message+(notice?' '+notice:''));
    }finally{setTesting(false);}
  };
  // GAS「測試連線」：只驗證部署網址能回應，不儲存設定、不上傳資料。
  const handleTestGas = async () => {
    if(gasTesting)return;
    if(isDemoMode()){setGasMessage('請離開示範模式再測試。');return;}
    const url=gasUrl.trim();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)){setGasMessage('GAS 網址需為 https://script.google.com/macros/s/…/exec');return;}
    setGasTesting(true);setGasMessage('正在測試連線…');
    try{await dbService.testConnection(url);setGasMessage('連線成功。這只是連線驗證：沒有儲存設定，也沒有上傳或同步任何資料。要啟用請按「儲存 GAS 設定」。');}
    catch(err){setGasMessage('連線失敗：'+((err as Error).message||'請確認部署網址與存取權限。'));}
    finally{setGasTesting(false);}
  };
  const handleSaveGas = async () => {
    if(gasSavingRef.current)return;
    if(isDemoMode()){setGasMessage('請離開示範模式再設定。');return;}
    if(syncQueue.busy){setGasMessage('同步正在進行，請等這次完成後再變更連線。');return;}
    if(gasUrl.trim()&&!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(gasUrl.trim())){setGasMessage('GAS 網址需為 https://script.google.com/macros/s/…/exec');return;}
    gasSavingRef.current=true;setGasSaving(true);setGasMessage(gasUrl.trim()?'正在檢查 GAS 連線…':'');
    try{
      if(gasUrl.trim()){
        await dbService.testConnection(gasUrl.trim());
        if(syncQueue.busy)throw new Error('同步正在進行，請稍後再儲存連線。');
        setGasUrl(gasUrl.trim());
        setGasMessage('GAS 連線已確認並儲存。此測試沒有上傳資料；同步結果請看同步中心。');
      }else{clearGasUrl();setGasMessage('GAS 已停用，資料只存本機，已啟用本機自動備份。');}
      window.dispatchEvent(new Event('health-sync'));
    }catch(err){setGasMessage('設定未完成，原儲存方式仍保留：'+((err as Error).message||'請重試。'));}
    finally{gasSavingRef.current=false;setGasSaving(false);}
  };

  const copyGasCode = () => {
    navigator.clipboard.writeText(GAS_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <Settings className="w-8 h-8 text-gray-500" /> 系統設定
          </h2>
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          <StorageModeSettings/>{storagePreference!=='gas'&&gasMessage&&<p role="status" className="integration-notice">{gasMessage}</p>}<p className="settings-intro">不設定也能手動記錄。AI 分析與雲端同步各自選用、分開儲存。</p>
          <section className="integration-card gemini-settings" aria-labelledby="gemini-settings-heading">
            <header><span className="integration-icon"><Key size={23}/></span><div><h3 id="gemini-settings-heading">Gemini AI 設定</h3><p>照片、文件與運動姿勢分析</p></div><span className="editable-badge">可編輯</span></header>
            <form onSubmit={e=>{e.preventDefault();handleSaveGemini();}}>
              <label htmlFor="gemini-api-key">API Key</label>
              <div className="key-input-wrap"><input id="gemini-api-key" type={showKey?'text':'password'} autoComplete="off" spellCheck={false} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="貼上你的 Gemini API Key"/><button type="button" aria-label={showKey?'隱藏 API Key':'顯示 API Key'} aria-pressed={showKey} onClick={()=>setShowKey(!showKey)}>{showKey?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>
              <p className="field-help">金鑰只保存在此瀏覽器；使用 AI 時由網站後端代理傳給 Google。留空並儲存即停用。</p>
              <fieldset className="plan-options"><legend>方案</legend>
                <label><input type="radio" name="gemini-plan" checked={plan==='free'} onChange={()=>setPlan('free')}/><span><strong>免費方案（預設）</strong><small>優先用 Flash-Lite；免費額度每天重置，各模型分開計算。</small></span></label>
                <label><input type="radio" name="gemini-plan" checked={plan==='paid'} onChange={()=>setPlan('paid')}/><span><strong>自己付費</strong><small>優先用 Flash；若 Google 回報的是免費額度，會自動改回免費並提醒。</small></span></label>
              </fieldset>
              <label htmlFor="gemini-general-model">一般分析模型<span>飲食照片、文件及文字分析</span></label>
              <select id="gemini-general-model" value={generalChoice} onChange={e=>setGeneralChoice(e.target.value)}>{modelOptionList(generalChoice)}</select>
              {generalChoice===CUSTOM_CHOICE&&<input aria-label="自訂一般分析模型 ID" spellCheck={false} value={generalCustom} onChange={e=>setGeneralCustom(e.target.value.trim())} placeholder="例如 gemini-flash-latest"/>}
              <label htmlFor="gemini-video-model">影片分析模型<span>運動姿勢分析與評分</span></label>
              <select id="gemini-video-model" value={videoChoice} onChange={e=>setVideoChoice(e.target.value)}>{modelOptionList(videoChoice)}</select>
              {videoChoice===CUSTOM_CHOICE&&<input aria-label="自訂影片分析模型 ID" spellCheck={false} value={videoCustom} onChange={e=>setVideoCustom(e.target.value.trim())} placeholder="例如 gemini-flash-latest"/>}
              <p className="field-help">「自動」先用上次成功的模型，再依方案輪替；模型停用或當天額度用完會自動換下一個，全部用完才停下來說明。指定模型時，額度用完不會自動更換。更換影片模型後請用相同片段重新驗證；舊分數不宜直接比較。</p>
              <div className="integration-actions"><button type="button" className="integration-test" disabled={testing} onClick={()=>void handleTestGemini()}><Check size={18}/>{testing?'測試中…':'確認'}</button><button className="integration-save" type="submit" disabled={testing}><Save size={18}/>儲存 Gemini 設定</button></div>
              {settingsMessage&&<p role="status" className="integration-notice">{settingsMessage}</p>}
              <p className="field-help">「確認」會先儲存，再送一句「請回答 OK」（不送照片，算 1 次額度），回報金鑰能不能用與實際用到的模型。程式查不到剩餘次數；要看每個模型今天用了幾次與上限，請到 Google AI Studio 左側的「用量」頁。</p>
              <a className="model-doc-link" href="https://aistudio.google.com/usage" target="_blank" rel="noopener noreferrer">開啟 AI Studio 用量頁 ↗</a>
            </form>
            <details className="integration-help"><summary>免費額度、申請教學與隱私說明</summary><ApiGuide/></details>
          </section>
          {storagePreference==='gas'&&<section className="integration-card gas-settings" aria-labelledby="gas-settings-heading">
            <header><span className="integration-icon"><Cloud size={23}/></span><div><h3 id="gas-settings-heading">GAS 雲端同步</h3><p>連接自己的 Google Sheets</p></div></header>
            <form onSubmit={e=>{e.preventDefault();void handleSaveGas();}}><label htmlFor="gas-deployment-url">GAS 部署網址</label><input id="gas-deployment-url" type="url" disabled={gasSaving} value={gasUrl} onChange={e=>setGasUrlState(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec"/><p className="field-help">未設定網址時只存本機。手機與電腦需設定同一個網址；儲存前會檢查連線。留空並儲存即停用同步，本機紀錄仍保留。</p><div className="integration-actions"><button type="button" className="integration-test" disabled={gasSaving||gasTesting} onClick={()=>void handleTestGas()}><Check size={18}/>{gasTesting?'測試中…':'測試連線'}</button><button type="submit" disabled={gasSaving||gasTesting} className="integration-save"><Save size={18}/>{gasSaving?'檢查連線中…':'儲存 GAS 設定'}</button></div>{gasMessage&&<p role="status" className="integration-notice">{gasMessage}</p>}</form>
            <p className="field-help">網站更新不會自動更新 Google 帳戶裡的 GAS。若自行更換 GAS 程式，需在 Apps Script「管理部署作業」選擇新版本再部署。</p>
          </section>}
          <hr className="border-gray-100" />

          <div className="space-y-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                  <CalendarDays className="w-5 h-5 text-gray-500" /> 偏好設定
              </h3>
              <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">
                      每日總結提醒時間
                  </label>
                  <input 
                      type="time" 
                      value={userProfile.dailySummaryTime || "20:00"}
                      onChange={(e) => onUpdateProfile({...userProfile, dailySummaryTime: e.target.value})}
                      className="w-full md:w-64 p-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-2">設定系統每天結算健康紀錄並給予鼓勵的時間（預設為 20:00）</p>
              </div>
          </div>

          <hr className="border-gray-100" />

          {storageMode==='gas'&&<>
          <div className="space-y-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                  <Cloud className="w-5 h-5 text-gray-500" /> 本機優先與雲端備份設定
              </h3>
              
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                      <div>
                          <span className="font-bold text-blue-900 block">連線時自動同步待處理紀錄</span>
                          <span className="text-xs text-blue-700">失敗的紀錄會保留在同步中心；連線恢復後重新嘗試。</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              checked={autoBackup}
                              onChange={handleToggleAutoBackup}
                              className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>
                  
                  <div className="pt-2 border-t border-blue-100 text-xs text-blue-800 flex flex-wrap justify-between items-center gap-2">
                      <div>
                         <span className="font-semibold">上次成功備份時間：</span>
                         <span className="font-mono bg-blue-100/50 px-2 py-1 rounded text-blue-900">{lastBackup}</span>
                      </div>
                      <div className="text-gray-500">
                         (本機保存 飲食: <strong className="text-blue-900">{counts.food}</strong> 筆 / 運動: <strong className="text-blue-900">{counts.workouts}</strong> 筆 / 健檢: <strong className="text-blue-900">{counts.reports}</strong> 筆 / 生理: <strong className="text-blue-900">{counts.vitals}</strong> 筆)
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                      onClick={handleDoBackup}
                      disabled={syncing || restoring}
                      className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition-all active:scale-98 flex items-start gap-4 disabled:opacity-50"
                  >
                      <div className="p-3 bg-emerald-500 text-white rounded-xl">
                          {syncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                      </div>
                      <div>
                          <h4 className="font-bold text-emerald-900">建立完整雲端備份（保留舊版）</h4>
                          <p className="text-xs text-emerald-700 mt-1">新增完整歷史版本，含縮圖、回收桶及影片評分；校驗成功才算完成，不覆蓋雲端同步紀錄。</p>
                      </div>
                  </button>

                  <button
                      onClick={handleDoRestore}
                      disabled={syncing || restoring}
                      className="p-4 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-2xl text-left transition-all active:scale-98 flex items-start gap-4 disabled:opacity-50"
                  >
                      <div className="p-3 bg-sky-500 text-white rounded-xl">
                          {restoring ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
                      </div>
                      <div>
                          <h4 className="font-bold text-sky-900">從雲端 Sheet 下載覆蓋本機</h4>
                          <p className="text-xs text-sky-700 mt-1">從 Google 表單載入並完全覆蓋本機，適合在切換裝置時完成同步。</p>
                      </div>
                  </button>
              </div>
          </div>

          </>}
          <hr className="border-gray-100" />

          {storageMode==='gas'&&<div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 mt-8">
              <h4 className="font-bold text-orange-800 text-lg mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5" /> Apps Script 部署說明（僅雲端同步需要）
              </h4>
              <div className="text-sm text-orange-800 mb-4 space-y-3 leading-relaxed">
                  <p>如需跨裝置同步，可使用自己的 Google Sheets；本機紀錄不需要設定。啟用雲端前，請部署 Apps Script 服務：</p>
                  <ol className="list-decimal pl-5 space-y-1">
                      <li>登入您的 Google 帳號，並建立一個新的空白 Google 試算表。</li>
                      <li>點選上方選單的 <strong>擴充功能 &gt; Apps Script</strong>。</li>
                      <li>將下方的「修復版 GAS 程式碼」複製，並貼上取代原有的 <code>Code.gs</code> 內容。</li>
                      <li>點選右上角 <strong>部署 &gt; 新增部署作業</strong>。</li>
                      <li>選擇類型為 <strong>網頁應用程式 (Web App)</strong>。</li>
                      <li>存取權限設定為 <strong>「所有人 (Anyone)」</strong>，然後點選部署。</li>
                      <li>授權後，複製生成的 <strong>網頁應用程式網址 (URL)</strong>。</li>
                      <li>將該 URL 貼回本頁面上方的「Google Apps Script URL」欄位並儲存。</li>
                  </ol>
                  <p className="font-bold mt-2">※ 如果您發現資料無法保存，請重新執行上述步驟的 4~6，並確保部署為「新版本」。</p>
              </div>
              
              <button
                  onClick={copyGasCode}
                  className="w-full bg-white border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mb-4"
              >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Code className="w-5 h-5" />}
                  {copied ? "已複製到剪貼簿" : "複製 GAS 程式碼"}
              </button>
              
              {copied && (
                  <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-[10px] text-green-400 font-mono">
                          {GAS_CODE}
                      </pre>
                  </div>
              )}
          </div>}

          {storageMode==='gas'&&<><CloudBackupVersions/><SyncCenter/></>}
          <DeviceBackup/>

        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
