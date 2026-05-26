import React, { useState } from 'react';
import { HeartPulse, Droplets, Activity, History, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { VitalsRecord } from '../types';

interface Props {
  vitalsRecords: VitalsRecord[];
  onSaveRecord: (record: VitalsRecord) => void;
}

const VitalsTracker: React.FC<Props> = ({ vitalsRecords, onSaveRecord }) => {
  const [activeTab, setActiveTab] = useState<'blood_pressure' | 'blood_sugar'>('blood_pressure');
  const [showHistory, setShowHistory] = useState(false);

  // Form states
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [bsContext, setBsContext] = useState<'fasting' | 'postprandial' | 'random'>('fasting');

  const handleSave = () => {
    const now = new Date();
    const newRecord: VitalsRecord = {
      id: Date.now().toString(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type: activeTab,
    };

    if (activeTab === 'blood_pressure') {
      if (!systolic || !diastolic) return alert("請輸入收縮壓與舒張壓");
      newRecord.systolic = parseInt(systolic);
      newRecord.diastolic = parseInt(diastolic);
      if (pulse) newRecord.pulse = parseInt(pulse);
    } else {
      if (!bloodSugar) return alert("請輸入血糖數值");
      newRecord.bloodSugar = parseInt(bloodSugar);
      newRecord.bloodSugarContext = bsContext;
    }

    onSaveRecord(newRecord);

    // Reset forms
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setBloodSugar('');
    alert("紀錄成功！");
  };

  const getBPStatus = (sys?: number, dia?: number) => {
    if (!sys || !dia) return { text: '未知', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (sys >= 140 || dia >= 90) return { text: '血壓偏高 (高血壓第2期以上)', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle };
    if (sys >= 130 || dia >= 80) return { text: '血壓偏高 (高血壓第1期)', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertCircle };
    if (sys >= 120 && dia < 80) return { text: '血壓偏高', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertCircle };
    return { text: '血壓正常', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 };
  };

  const getBSStatus = (sugar?: number, context?: string) => {
    if (!sugar) return { text: '未知', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (context === 'fasting') {
      if (sugar >= 126) return { text: '飯前血糖過高', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle };
      if (sugar >= 100) return { text: '飯前血糖偏高', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertCircle };
      return { text: '飯前血糖正常', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 };
    } else {
      // postprandial or random
      if (sugar >= 200) return { text: '血糖過高', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle };
      if (sugar >= 140) return { text: '血糖偏高', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertCircle };
      return { text: '血糖正常', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 };
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
            <Activity className="w-10 h-10 text-rose-500" /> 生理數據紀錄
          </h2>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors"
          >
            {showHistory ? <Plus className="w-5 h-5" /> : <History className="w-5 h-5" />}
            {showHistory ? "我要紀錄" : "歷史紀錄"}
          </button>
        </div>

        {!showHistory ? (
          <div className="p-6 md:p-8 space-y-8 animate-fade-in">
            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-full mb-4">
              <button
                onClick={() => setActiveTab('blood_pressure')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-lg font-bold transition-all ${
                  activeTab === 'blood_pressure' ? 'bg-white text-rose-600 shadow-sm transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <HeartPulse className="w-5 h-5" /> 量血壓
              </button>
              <button
                onClick={() => setActiveTab('blood_sugar')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-lg font-bold transition-all ${
                  activeTab === 'blood_sugar' ? 'bg-white text-blue-600 shadow-sm transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Droplets className="w-5 h-5" /> 量血糖
              </button>
            </div>

            {/* Content Form */}
            {activeTab === 'blood_pressure' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-rose-50/50 p-4 rounded-xl border-2 border-rose-100 flex flex-col justify-between">
                    <label className="block text-sm sm:text-base font-black text-rose-900 mb-2">收縮壓 (高)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="120"
                      className="w-full text-center text-3xl sm:text-4xl p-3 bg-white border-2 border-rose-200 rounded-xl font-bold focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div className="bg-sky-50/50 p-4 rounded-xl border-2 border-sky-100 flex flex-col justify-between">
                    <label className="block text-sm sm:text-base font-black text-sky-900 mb-2">舒張壓 (低)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="80"
                      className="w-full text-center text-3xl sm:text-4xl p-3 bg-white border-2 border-sky-200 rounded-xl font-bold focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div className="col-span-2 bg-gray-50 p-4 rounded-xl border-2 border-gray-200 flex items-center gap-4">
                    <label className="text-sm sm:text-base font-black text-gray-700 whitespace-nowrap">心跳/脈搏 (選填)</label>
                    <input 
                      type="number" 
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      placeholder="72"
                      className="w-full text-center text-2xl p-2 bg-white border-2 border-gray-200 rounded-xl font-bold focus:ring-4 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'blood_sugar' && (
              <div className="space-y-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border-2 border-blue-100">
                   <label className="block text-base font-black text-blue-900 mb-3">選擇量測時機</label>
                   <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'fasting', label: '飯前' },
                        { id: 'postprandial', label: '飯後' },
                        { id: 'random', label: '隨機' }
                      ].map(ctx => (
                        <button
                          key={ctx.id}
                          onClick={() => setBsContext(ctx.id as any)}
                          className={`py-3 rounded-lg text-sm sm:text-base font-bold border-2 transition-all ${
                            bsContext === ctx.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {ctx.label}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="bg-blue-50/30 p-4 rounded-xl border-2 border-blue-100">
                  <label className="block text-base font-black text-blue-900 mb-2">血糖數值</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={bloodSugar}
                      onChange={(e) => setBloodSugar(e.target.value)}
                      placeholder="100"
                      className="w-full text-center text-4xl p-4 bg-white border-2 border-blue-200 rounded-xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">mg/dL</span>
                  </div>
                </div>
              </div>
            )}

            <button
               onClick={handleSave}
               className="w-full py-4 mt-6 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xl font-black rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
               <Plus className="w-6 h-6" /> 儲存今日紀錄
            </button>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-4 bg-gray-50 min-h-[400px] animate-fade-in">
             {vitalsRecords.length === 0 ? (
               <div className="text-center py-16">
                 <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                 <p className="text-xl text-gray-500 font-bold">目前沒有任何紀錄</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {[...vitalsRecords].reverse().map(record => {
                    if (record.type === 'blood_pressure') {
                       const status = getBPStatus(record.systolic, record.diastolic);
                       const StatusIcon = status.icon || Activity;
                       return (
                         <div key={record.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                            <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <HeartPulse className="w-6 h-6 text-rose-500" />
                                 <span className="font-bold text-gray-700 text-xl">血壓</span>
                                 <span className="text-sm font-bold text-gray-400 ml-2">{record.date} {record.time}</span>
                               </div>
                               <div className="flex items-end gap-2">
                                 <span className="text-4xl font-black text-gray-800">{record.systolic}</span>
                                 <span className="text-2xl font-bold text-gray-400 mb-1">/</span>
                                 <span className="text-4xl font-black text-gray-800">{record.diastolic}</span>
                                 {record.pulse && <span className="text-lg font-bold text-gray-500 ml-4">心跳 {record.pulse}</span>}
                               </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${status.bg} ${status.color}`}>
                               <StatusIcon className="w-6 h-6" />
                               <span className="font-bold text-lg hidden sm:inline">{status.text}</span>
                            </div>
                         </div>
                       );
                    } else {
                       const status = getBSStatus(record.bloodSugar, record.bloodSugarContext);
                       const StatusIcon = status.icon || Activity;
                       const contextLabel = record.bloodSugarContext === 'fasting' ? '飯前' : record.bloodSugarContext === 'postprandial' ? '飯後' : '隨機';
                       return (
                         <div key={record.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                            <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <Droplets className="w-6 h-6 text-blue-500" />
                                 <span className="font-bold text-gray-700 text-xl">血糖 ({contextLabel})</span>
                                 <span className="text-sm font-bold text-gray-400 ml-2">{record.date} {record.time}</span>
                               </div>
                               <div className="flex items-end gap-2">
                                 <span className="text-4xl font-black text-gray-800">{record.bloodSugar}</span>
                                 <span className="text-lg font-bold text-gray-500 mb-1">mg/dL</span>
                               </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${status.bg} ${status.color}`}>
                               <StatusIcon className="w-6 h-6" />
                               <span className="font-bold text-lg hidden sm:inline">{status.text}</span>
                            </div>
                         </div>
                       );
                    }
                 })}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsTracker;
