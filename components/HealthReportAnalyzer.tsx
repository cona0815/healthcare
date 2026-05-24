import React, { useState, useRef } from 'react';
import { FileText, Upload, Loader2, AlertCircle, History, ChevronDown, ChevronUp, ShieldAlert, GitCompare, ArrowRight, ArrowUpRight, ArrowDownRight, X, CheckSquare, Square, TrendingUp, Activity } from 'lucide-react';
import { analyzeHealthReport, fileToGenerativePart } from '../services/geminiService';
import { HealthReport } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  reports: HealthReport[];
  onReportAnalyzed: (report: HealthReport) => void;
}

const HealthReportAnalyzer: React.FC<Props> = ({ reports, onReportAnalyzed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReportIndex, setExpandedReportIndex] = useState<number | null>(null);
  const [showTrend, setShowTrend] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentReport = reports.length > 0 ? reports[0] : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const base64 = await fileToGenerativePart(file);
      const report = await analyzeHealthReport(base64, file.type);
      onReportAnalyzed(report);
    } catch (err) {
      setError("無法辨識健檢報告，請確認圖片清晰度。");
    } finally {
      setLoading(false);
    }
  };

  const toggleReport = (index: number) => setExpandedReportIndex(expandedReportIndex === index ? null : index);

  // Helper to safely parse number from string like "120 mg/dl"
  const safeParseFloat = (val: string) => {
      const match = val.match(/[\d\.]+/);
      return match ? parseFloat(match[0]) : null;
  }

  // Get metrics that appear in multiple reports
  const getCommonMetrics = () => {
     if (reports.length < 2) return [];
     const metricCounts: Record<string, number> = {};
     reports.forEach(r => {
        r.metrics.forEach(m => {
           metricCounts[m.name] = (metricCounts[m.name] || 0) + 1;
        });
     });
     return Object.keys(metricCounts).filter(k => metricCounts[k] >= 2);
  };

  const commonMetrics = getCommonMetrics();

  const getChartData = (metricName: string) => {
      const sortedReports = [...reports].sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime());
      const data = [];
      for (const r of sortedReports) {
          const m = r.metrics.find(x => x.name === metricName);
          if (m) {
              const val = safeParseFloat(m.value);
              if (val !== null) {
                  data.push({
                      date: new Date(r.analyzedAt).toLocaleDateString().substring(5), // Make date shorter like MM/DD
                      value: val,
                      fullDate: new Date(r.analyzedAt).toLocaleDateString(),
                      status: m.status
                  });
              }
          }
      }
      return data;
  }

  const renderTrendView = () => {
    if (reports.length < 2 || commonMetrics.length === 0) return null;
    
    const metricToDisplay = selectedMetric || commonMetrics[0];
    const chartData = getChartData(metricToDisplay);

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in mt-6">
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-indigo-900 flex items-center gap-2">
             <TrendingUp className="w-5 h-5" /> 歷次健檢趨勢圖
          </h3>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 scrollbar-hide">
              {commonMetrics.slice(0, 5).map(m => (
                  <button 
                      key={m}
                      onClick={() => setSelectedMetric(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${metricToDisplay === m ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
                  >
                      {m}
                  </button>
              ))}
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-white w-full h-80">
             <h4 className="text-center font-bold text-gray-700 mb-4">{metricToDisplay}</h4>
             <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                     <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} width={40} />
                     <Tooltip 
                         contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                         labelStyle={{fontWeight: 'bold', color: '#374151', marginBottom: '4px'}}
                         itemStyle={{color: '#4f46e5', fontWeight: 'bold'}}
                     />
                     <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                 </LineChart>
             </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> 健檢報告檔案庫</h2>
        <p className="opacity-90 mt-2">上傳健檢報告，AI 自動追蹤健康趨勢並提供飲食禁忌建議。</p>
      </div>

      {showTrend ? (
         <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">健康趨勢分析</h3>
                <button onClick={() => setShowTrend(false)} className="text-sm font-bold text-gray-500 hover:text-gray-700">關閉圖表</button>
            </div>
            {renderTrendView()}
         </div>
      ) : null}

      <>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 rounded-2xl p-8 transition-colors cursor-pointer active:scale-95 duration-200" onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 bg-white shadow-sm text-blue-600 border border-gray-100 rounded-2xl flex items-center justify-center mb-4 transform -rotate-3 transition-transform hover:rotate-0"><Upload className="w-8 h-8" /></div>
            <p className="text-gray-600 font-bold">上傳新的健檢報告</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          {loading && <div className="mt-6 flex flex-col items-center text-blue-600"><Loader2 className="w-8 h-8 animate-spin mb-2" /><p className="text-sm font-medium">AI 正在解讀報告數據並建檔...</p></div>}
          {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}
        </div>

        {currentReport && (
          <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden ring-1 ring-blue-100 mt-6">
            <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                <h3 className="font-bold text-gray-800">最新報告 (分析依據)</h3>
              </div>
              <span className="text-sm font-medium text-gray-600">{new Date(currentReport.analyzedAt).toLocaleDateString()}</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 italic border-l-4 border-blue-500 pl-4 py-1 bg-gray-50 rounded-r">"{currentReport.summary}"</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {currentReport.metrics.map((metric, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{metric.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${metric.status === 'Critical' ? 'bg-red-100 text-red-700' : metric.status === 'Warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{metric.value}</span>
                    </div>
                    <p className="text-xs text-gray-500">{metric.advice}</p>
                  </div>
                ))}
              </div>
              {currentReport.dietaryRestrictions && currentReport.dietaryRestrictions.length > 0 && (
                <div className="mt-4 bg-red-50 p-5 rounded-xl border border-red-200">
                  <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2 text-lg"><ShieldAlert className="w-5 h-5 text-red-600" /> AI 建議：飲食禁忌</h4>
                  <ul className="list-disc pl-5 space-y-2">{currentReport.dietaryRestrictions.map((item, i) => <li key={i} className="text-red-700 font-medium">{item}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        )}

        {reports.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><History className="w-5 h-5" /> 報告存檔 ({reports.length})</h3>
                {reports.length >= 2 && !showTrend && (
                  <button onClick={() => setShowTrend(true)} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-200 transition-colors shadow-sm"><TrendingUp className="w-4 h-4" /> 歷次健檢趨勢</button>
                )}
            </div>
            <div className="space-y-4">
                {reports.map((report, idx) => {
                  const isExpanded = expandedReportIndex === idx;
                  return (
                      <div key={idx} className="bg-white rounded-xl border border-gray-200 transition-all shadow-sm">
                        <div className="flex items-center p-4">
                            <div className="flex-1 flex justify-between items-center cursor-pointer" onClick={() => toggleReport(idx)}>
                              <div><p className="font-semibold text-gray-800">{idx === 0 ? "最新健檢報告" : `存檔報告 #${reports.length - idx}`}</p><p className="text-xs text-gray-500">{new Date(report.analyzedAt).toLocaleDateString()}</p></div>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-sm animate-fade-in">
                              <p className="mb-2 text-gray-600">{report.summary}</p>
                              <div className="grid grid-cols-2 gap-2 mb-3">{report.metrics.map((m, i) => (<div key={i} className="flex justify-between border-b border-gray-200 py-1 last:border-0"><span>{m.name}</span><span className={m.status === 'Critical' ? 'text-red-600 font-bold' : m.status === 'Warning' ? 'text-yellow-600 font-bold' : 'text-green-600'}>{m.value}</span></div>))}</div>
                            </div>
                        )}
                      </div>
                  );
                })}
            </div>
          </div>
        )}
      </>
    </div>
  );
};
export default HealthReportAnalyzer;
