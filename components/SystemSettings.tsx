import React, { useState, useEffect } from 'react';
import { Settings, Key, Database, CalendarDays, Eye, EyeOff, Save, Code, Check, Cloud, CloudDownload, CloudUpload, RefreshCw, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { getGeminiKey, setGeminiKey } from '../services/geminiService';
import { getGasUrl, setGasUrl, getLocal, dbService } from '../services/dbService';
import { GAS_CODE } from './GasSetup';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onRefreshAllData: () => Promise<void>;
}

const SystemSettings: React.FC<Props> = ({ userProfile, onUpdateProfile, onRefreshAllData }) => {
  const [apiKey, setApiKey] = useState('');
  const [gasUrl, setGasUrlState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showGasCode, setShowGasCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Backup & Restore states
  const [autoBackup, setAutoBackup] = useState<boolean>(() => {
    return localStorage.getItem('hg_auto_backup') !== 'false';
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
    
    const lastBackupTime = localStorage.getItem('hg_last_backup_time');
    if (lastBackupTime) {
      setLastBackup(new Date(lastBackupTime).toLocaleString('zh-TW', { hour12: false }));
    } else {
      setLastBackup('從未備份');
    }
  };

  useEffect(() => {
    setApiKey(getGeminiKey() || '');
    setGasUrlState(getGasUrl() || '');
    loadCountsAndBackupTime();
  }, []);

  const handleToggleAutoBackup = () => {
    const newVal = !autoBackup;
    setAutoBackup(newVal);
    localStorage.setItem('hg_auto_backup', String(newVal));
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

  const handleSaveSystem = () => {
    if (apiKey.trim()) setGeminiKey(apiKey.trim());
    if (gasUrl.trim()) setGasUrl(gasUrl.trim());
    alert("系統設定已更新！(部分變更可能需重整網頁生效)");
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
          <div className="space-y-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                  <Key className="w-5 h-5 text-gray-500" /> 連線設定
              </h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                          Gemini API Key
                      </label>
                      <div className="relative">
                          <input 
                              type={showKey ? "text" : "password"} 
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none pr-12 transition-all"
                              placeholder="請輸入您的 API Key"
                          />
                          <button 
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                          >
                              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 pl-1">API Key 僅儲存於您的瀏覽器，保障隱私安全。需設定才能使用 AI 分析與營養建議功能。</p>
                  </div>
                  
                  <div>
                      <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                          Google Apps Script URL (雲端資料同步)
                      </label>
                      <input 
                          type="text" 
                          value={gasUrl}
                          onChange={(e) => setGasUrlState(e.target.value)}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          placeholder="https://script.google.com/..."
                      />
                  </div>
              </div>
          </div>

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

          <div className="space-y-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                  <Cloud className="w-5 h-5 text-gray-500" /> 本機優先與雲端備份設定
              </h3>
              
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                      <div>
                          <span className="font-bold text-blue-900 block">每週背景自動備份至網路</span>
                          <span className="text-xs text-blue-700">由系統自動在背景上傳最新健康紀錄，零延遲、不卡頓。</span>
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

          <hr className="border-gray-100" />

          <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 mt-8">
              <h4 className="font-bold text-orange-800 text-lg mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5" /> Apps Script 部署說明 (必須設定才能使用本系統)
              </h4>
              <div className="text-sm text-orange-800 mb-4 space-y-3 leading-relaxed">
                  <p>本系統使用 Google Sheets 作為您的專屬免費資料庫。為了讓系統能讀寫資料，您必須部署一個 Apps Script 服務：</p>
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
          </div>

          <div className="pt-4 flex justify-end">
              <button 
                  onClick={handleSaveSystem}
                  className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
              >
                  <Save className="w-6 h-6" /> 更新系統設定
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
