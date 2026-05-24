import React, { useState, useEffect } from 'react';
import { Settings, Key, Database, CalendarDays, Eye, EyeOff, Save, Code, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { getGeminiKey, setGeminiKey } from '../services/geminiService';
import { getGasUrl, setGasUrl } from '../services/dbService';
import { GAS_CODE } from './GasSetup';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

const SystemSettings: React.FC<Props> = ({ userProfile, onUpdateProfile }) => {
  const [apiKey, setApiKey] = useState('');
  const [gasUrl, setGasUrlState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showGasCode, setShowGasCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setApiKey(getGeminiKey() || '');
    setGasUrlState(getGasUrl() || '');
  }, []);

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

          <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
              <h4 className="font-bold text-orange-800 text-lg mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5" /> 開發者工具：重置 / 修復資料同步
              </h4>
              <p className="text-sm text-orange-700 mb-4 leading-relaxed">
                  如果您發現資料無法保存（重新整理後消失，或顯示同步失敗），請嘗試更新 Apps Script 版本：<br/>
                  1. 複製下方的修復程式碼<br/>
                  2. 貼到您的 Google Apps Script 覆蓋舊程式碼<br/>
                  3. 重新建立「新版本」的網頁應用程式部署
              </p>
              
              <button
                  onClick={copyGasCode}
                  className="w-full bg-white border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mb-4"
              >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Code className="w-5 h-5" />}
                  {copied ? "已複製到剪貼簿" : "複製修復版 GAS 程式碼"}
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
