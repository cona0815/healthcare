import StorageModeSettings from './StorageModeSettings';
import {getStorageMode,configuredGasUrl} from '../services/storageMode';
import DeviceBackup from './DeviceBackup';
import {SyncCenter} from './CareTools';
import ApiGuide from './ApiGuide';
import {getGeminiModel,saveGeminiModels,validModel} from '../services/aiSettings';
import React, { useState, useEffect } from 'react';
import { Settings, Key, Database, CalendarDays, Eye, EyeOff, Save, Code, Check, Cloud, CloudDownload, CloudUpload, RefreshCw, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { getGeminiKey, setGeminiKey, clearGeminiKey } from '../services/geminiService';
import { getGasUrl, setGasUrl, clearGasUrl, isDemoMode, getLocal, dbService } from '../services/dbService';
import { GAS_CODE } from './GasSetup';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onRefreshAllData: () => Promise<void>;
}

const SystemSettings: React.FC<Props> = ({ userProfile, onUpdateProfile, onRefreshAllData }) => {
  const [generalModel,setGeneralModel]=useState(getGeminiModel());
  const [videoModel,setVideoModel]=useState(getGeminiModel('video'));
  const [settingsMessage,setSettingsMessage]=useState('');
  const [gasMessage,setGasMessage]=useState('');
  const [storageMode,refreshMode]=useState(getStorageMode());
  useEffect(()=>{const update=()=>refreshMode(getStorageMode());window.addEventListener('health-storage-mode',update);return()=>window.removeEventListener('health-storage-mode',update);},[]);
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
    setGasUrlState(configuredGasUrl() || '');
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
      alert("🎉 備份完成！所有本機健康數據與生理指標已安全複製到您的 Google 雲端試算表。");
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

  const handleSaveGemini = () => {
    if(isDemoMode()){setSettingsMessage('請離開示範模式再設定。');return;}
    if(!validModel(generalModel)||!validModel(videoModel)){setSettingsMessage('模型 ID 格式錯誤，請參考 Google 官方模型清單。');return;}
    try{saveGeminiModels(generalModel,videoModel);if(apiKey.trim())setGeminiKey(apiKey.trim());else clearGeminiKey();setSettingsMessage('Gemini 設定已儲存；未變更 GAS 連線。');}catch{setSettingsMessage('儲存失敗，請檢查裝置空間。');}
  };
  const handleSaveGas = () => {
    if(isDemoMode()){setGasMessage('請離開示範模式再設定。');return;}
    if(gasUrl.trim()&&!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(gasUrl.trim())){setGasMessage('GAS 網址需為 https://script.google.com/macros/s/…/exec');return;}
    try{if(gasUrl.trim())setGasUrl(gasUrl.trim());else clearGasUrl();setGasMessage('GAS 設定已儲存；未變更 Gemini 設定。');window.dispatchEvent(new Event('health-sync'));}catch{setGasMessage('儲存失敗，請檢查裝置空間。');}
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
          <StorageModeSettings/><p className="settings-intro">不設定也能手動記錄。AI 分析與雲端同步各自選用、分開儲存。</p>
          <section className="integration-card gemini-settings" aria-labelledby="gemini-settings-heading">
            <header><span className="integration-icon"><Key size={23}/></span><div><h3 id="gemini-settings-heading">Gemini AI 設定</h3><p>照片、文件與運動姿勢分析</p></div><span className="editable-badge">可編輯</span></header>
            <form onSubmit={e=>{e.preventDefault();handleSaveGemini();}}>
              <label htmlFor="gemini-api-key">API Key</label>
              <div className="key-input-wrap"><input id="gemini-api-key" type={showKey?'text':'password'} autoComplete="off" spellCheck={false} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="貼上你的 Gemini API Key"/><button type="button" aria-label={showKey?'隱藏 API Key':'顯示 API Key'} aria-pressed={showKey} onClick={()=>setShowKey(!showKey)}>{showKey?<EyeOff size={20}/>:<Eye size={20}/>}</button></div>
              <p className="field-help">金鑰只保存在此瀏覽器；使用 AI 時由網站後端代理傳給 Google。留空並儲存即停用。</p>
              <label htmlFor="gemini-general-model">一般分析模型<span>飲食照片、文件及文字分析</span></label>
              <input id="gemini-general-model" spellCheck={false} value={generalModel} onChange={e=>setGeneralModel(e.target.value.trim())} required/>
              <label htmlFor="gemini-video-model">影片分析模型<span>運動姿勢分析與評分</span></label>
              <input id="gemini-video-model" spellCheck={false} value={videoModel} onChange={e=>setVideoModel(e.target.value.trim())} required/>
              <p className="field-help">填寫帳戶可用的模型 ID。更換影片模型後，先用相同片段驗證；舊分數不宜直接比較。</p>
              <a className="model-doc-link" href="https://ai.google.dev/gemini-api/docs/models" target="_blank" rel="noopener noreferrer">查看官方模型清單 ↗</a>
              <button className="integration-save" type="submit"><Save size={18}/>儲存 Gemini 設定</button>
              {settingsMessage&&<p role="status" className="integration-notice">{settingsMessage}</p>}
            </form>
            <details className="integration-help"><summary>免費額度、申請教學與隱私說明</summary><ApiGuide/></details>
          </section>
          {storageMode==='gas'&&<section className="integration-card gas-settings" aria-labelledby="gas-settings-heading">
            <header><span className="integration-icon"><Cloud size={23}/></span><div><h3 id="gas-settings-heading">GAS 雲端同步</h3><p>連接自己的 Google Sheets</p></div></header>
            <form onSubmit={e=>{e.preventDefault();handleSaveGas();}}><label htmlFor="gas-deployment-url">GAS 部署網址</label><input id="gas-deployment-url" type="url" value={gasUrl} onChange={e=>setGasUrlState(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec"/><p className="field-help">手機與電腦需設定同一個網址。留空並儲存即停用同步，本機紀錄仍保留。</p><button type="submit" className="integration-save"><Save size={18}/>儲存 GAS 設定</button>{gasMessage&&<p role="status" className="integration-notice">{gasMessage}</p>}</form>
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
                          <h4 className="font-bold text-emerald-900">立即手動將本機資料備份至雲端</h4>
                          <p className="text-xs text-emerald-700 mt-1">立刻將本機所有最新數據上傳儲存於 Google Sheet，保障資料不丟失。</p>
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

          {storageMode==='gas'&&<SyncCenter/>}
          <DeviceBackup/>

        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
