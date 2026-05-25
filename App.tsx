import React, { useState, useEffect } from 'react';
import { Utensils, BarChart3, UserCog, Activity, Dumbbell, Loader2, LogOut, Database, User, Key, LayoutDashboard, Settings, HeartPulse } from 'lucide-react';
import FoodAnalyzer from './components/FoodAnalyzer';
import CalendarStats from './components/CalendarStats';
import AnalysisResultCard from './components/AnalysisResultCard';
import HealthManagement from './components/HealthManagement';
import SystemSettings from './components/SystemSettings';
import VitalsTracker from './components/VitalsTracker';
import WorkoutPlanner from './components/WorkoutPlanner';
import Dashboard from './components/Dashboard';
import GasSetup from './components/GasSetup';
import ApiKeySetup from './components/ApiKeySetup'; // New component
import DailySummaryPopup from './components/DailySummaryPopup'; // New component
import { HealthReport, FoodAnalysis, ViewState, UserProfile, WorkoutLog, SavedAppointment, WorkoutPlanDay, Recipe, DailyHealthLog } from './types';
import { dbService, getGasUrl, clearGasUrl } from './services/dbService';
import { getGeminiKey, clearGeminiKey } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(!!getGeminiKey());
  const [hasConnection, setHasConnection] = useState<boolean>(!!getGasUrl());
  const [activeTab, setActiveTab] = useState<ViewState>('DASHBOARD');
  const [activeHealthSubTab, setActiveHealthSubTab] = useState<'PROFILE' | 'REPORTS' | 'APPOINTMENTS' | 'MEDICATION' | 'SYSTEM'>('PROFILE');
  const [dataLoading, setDataLoading] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  
  const [healthReports, setHealthReports] = useState<HealthReport[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodAnalysis[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', height: '', weight: '' });
  const [dailyHealthLogs, setDailyHealthLogs] = useState<DailyHealthLog[]>([]);
  
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [currentWorkoutPlan, setCurrentWorkoutPlan] = useState<WorkoutPlanDay[]>([]);
  
  // 新增食譜狀態
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [vitalsRecords, setVitalsRecords] = useState<VitalsRecord[]>([]);

  const [showDailySummary, setShowDailySummary] = useState(false);

  // 監聽時間以觸發每日總結
  useEffect(() => {
    if (!userProfile.dailySummaryTime || showDailySummary) return;

    const [targetHour, targetMinute] = userProfile.dailySummaryTime.split(':').map(Number);
    const checkTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const todayString = now.toISOString().split('T')[0];
      const lastSummaryDate = localStorage.getItem('lastDailySummaryDate');

      if (
        lastSummaryDate !== todayString &&
        (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute))
      ) {
        setShowDailySummary(true);
        localStorage.setItem('lastDailySummaryDate', todayString);
      }
    };

    // 初始檢查並每分鐘檢查一次
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [userProfile.dailySummaryTime, showDailySummary]);

  useEffect(() => {
    if (hasApiKey && hasConnection) {
      loadUserData();
    }
  }, [hasApiKey, hasConnection]);

  const loadUserData = async () => {
    setDataLoading(true);
    try {
      const data = await dbService.loadAllData();
      setFoodLogs(data.foodLogs.reverse()); 
      setHealthReports(data.reports.reverse());
      setWorkoutLogs(data.workouts.reverse());
      
      let loadedProfile = data.profile || { name: '', height: '', weight: '' };
      // 根據歷史紀錄自動更新當前體重
      if (loadedProfile.weightHistory && loadedProfile.weightHistory.length > 0) {
          // 依日期排序 (最新在最前)
          const sortedHistory = [...loadedProfile.weightHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latestRecord = sortedHistory[0];
          // 如果有最新紀錄，同步更新顯示的體重
          if (latestRecord && latestRecord.weight) {
             loadedProfile.weight = latestRecord.weight;
          }
      }
      setUserProfile(loadedProfile);
      setDailyHealthLogs(loadedProfile.dailyHealthLogs || []);

      if (data.appointments) setAppointments(data.appointments.reverse());
      if (data.workoutPlan) setCurrentWorkoutPlan(data.workoutPlan);
      if (data.recipes) setSavedRecipes(data.recipes.reverse());
      if (data.vitals) setVitalsRecords(data.vitals.reverse()); // Load vitals
    } catch (e) {
      console.error("Failed to load data", e);
      alert("讀取資料失敗，請確認您的 Google Sheet 權限設定");
    } finally {
      setDataLoading(false);
    }
  };

  const handleFoodAnalysisComplete = async (result: FoodAnalysis) => {
    setFoodLogs(prev => [result, ...prev]);
    try {
        await dbService.addFoodLog(result);
    } catch (e) {
        console.error("Save food log failed", e);
        alert("資料儲存失敗，請檢查連線");
    }
  };

  const handleUpdateLog = async (timestamp: string, updatedLog: FoodAnalysis) => {
    setFoodLogs(prev => prev.map(log => log.timestamp === timestamp ? updatedLog : log));
    try {
        await dbService.updateFoodLog(timestamp, updatedLog);
    } catch (e) {
        alert("更新失敗，請檢查連線");
    }
  };

  const handleAddWorkout = async (log: WorkoutLog) => {
    setWorkoutLogs(prev => [log, ...prev]);
    try {
        await dbService.addWorkoutLog(log);
    } catch (e) {
        alert("運動紀錄儲存失敗");
    }
  };

  const handleReportAnalyzed = async (report: HealthReport) => {
    setHealthReports(prev => [report, ...prev]);
    try {
        await dbService.addHealthReport(report);
        alert("健檢報告已上傳並儲存至 Google Sheets！");
    } catch (e) {
        alert("健檢報告儲存失敗，請檢查連線");
    }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    // Optimistic update
    setUserProfile(profile);
    try {
        await dbService.saveUserProfile(profile);
    } catch (e) {
        console.error(e);
        alert("個人資料儲存失敗！請檢查您的 Google Sheets 連線與部署設定。");
        throw e; // Re-throw to let child components know
    }
  };
  
  const handleSaveAppointment = async (appointment: SavedAppointment) => {
    setAppointments(prev => [appointment, ...prev]);
    try {
        await dbService.saveAppointment(appointment);
    } catch (e) {
        alert("預約儲存失敗");
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    try {
        await dbService.deleteAppointment(id);
    } catch (e) {
        console.error(e);
    }
  };

  const handleSaveWorkoutPlan = async (plan: WorkoutPlanDay[]) => {
    setCurrentWorkoutPlan(plan);
    try {
        await dbService.saveWorkoutPlan(plan);
    } catch (e) {
        alert("運動計畫儲存失敗");
    }
  };
  
  // Handle Save/Update Recipe
  const handleSaveRecipe = async (recipe: Recipe) => {
    setSavedRecipes(prev => {
      const exists = prev.find(r => r.id === recipe.id);
      if (exists) {
        return prev.map(r => r.id === recipe.id ? recipe : r);
      }
      return [recipe, ...prev];
    });
    try {
        await dbService.saveRecipe(recipe);
    } catch (e) {
        alert("食譜儲存失敗");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id));
    try {
        await dbService.deleteRecipe(id);
    } catch (e) { console.error(e); }
  };

  const handleSaveVitals = async (record: VitalsRecord) => {
    setVitalsRecords(prev => [record, ...prev]);
    try {
        await dbService.saveVitalsRecord(record);
    } catch (e) {
        alert("生理數據儲存失敗");
    }
  };

  const handleDisconnect = () => {
    if (confirm("確定要登出並清除所有連線資訊嗎？")) {
        clearGasUrl();
        clearGeminiKey();
        setHasConnection(false);
        setHasApiKey(false);
        window.location.reload();
    }
  };

  const latestHealthReport = healthReports.length > 0 ? healthReports[0] : null;

  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            dataLoading={dataLoading}
            userProfile={userProfile}
            foodLogs={foodLogs}
            appointments={appointments}
            workoutPlan={currentWorkoutPlan}
            workoutLogs={workoutLogs}
            vitalsRecords={vitalsRecords}
            onNavigate={(view, subTab) => {
               setActiveTab(view);
               if (subTab) {
                 setActiveHealthSubTab(subTab as any);
               }
            }}
            onAnalyzeImage={(file) => {
               setPendingImageFile(file);
               setActiveTab('FOOD');
            }}
            onAddWorkout={handleAddWorkout}
            onUpdateProfile={handleUpdateProfile}
          />
        );
      case 'FOOD':
        return (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            <FoodAnalyzer 
              healthReport={latestHealthReport}
              userProfile={userProfile}
              pendingImageFile={pendingImageFile}
              onClearPendingImage={() => setPendingImageFile(null)}
              onAnalysisComplete={handleFoodAnalysisComplete}
              onUpdateLog={handleUpdateLog}
              savedRecipes={savedRecipes}
              onSaveRecipe={handleSaveRecipe}
              onDeleteRecipe={handleDeleteRecipe}
              foodLogs={foodLogs}
              appointments={appointments}
              workoutPlan={currentWorkoutPlan}
            />
            {foodLogs.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 px-1">最近分析記錄</h3>
                <div className="space-y-4 md:space-y-6">
                  {foodLogs.slice(0, 5).map((log, index) => (
                    <AnalysisResultCard key={index} data={log} onUpdateLog={handleUpdateLog}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'CALENDAR':
        return <CalendarStats logs={foodLogs} workoutLogs={workoutLogs} appointments={appointments} onUpdateLog={handleUpdateLog} userProfile={userProfile} />;
      case 'WORKOUT':
        return (
          <WorkoutPlanner 
             userProfile={userProfile} 
             healthReport={latestHealthReport} 
             workoutLogs={workoutLogs} 
             onAddWorkout={handleAddWorkout}
             currentPlan={currentWorkoutPlan}
             onSavePlan={handleSaveWorkoutPlan}
          />
        );
      case 'VITALS':
        return (
          <VitalsTracker 
            vitalsRecords={vitalsRecords}
            onSaveRecord={handleSaveVitals}
          />
        );
      case 'HEALTH_MANAGEMENT':
        return (
          <HealthManagement 
             userProfile={userProfile} 
             onUpdateProfile={handleUpdateProfile} 
             healthReports={healthReports} 
             onReportAnalyzed={handleReportAnalyzed}
             appointments={appointments}
             onSaveAppointment={handleSaveAppointment}
             onDeleteAppointment={handleDeleteAppointment}
             activeSubTab={activeHealthSubTab}
             onSubTabChange={setActiveHealthSubTab}
          />
        );
      case 'SYSTEM_SETTINGS':
        return (
          <SystemSettings 
             userProfile={userProfile} 
             onUpdateProfile={handleUpdateProfile} 
          />
        );
      default:
        return null;
    }
  };

  const NavButton = ({ id, label, icon: Icon }: { id: ViewState, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`relative flex-1 min-w-[64px] flex flex-col items-center justify-center space-y-1 transition-all h-full py-2 ${activeTab === id ? 'text-teal-600' : 'text-gray-400 hover:text-gray-500'}`}
    >
      <Icon className={`w-6 h-6 ${activeTab === id ? 'scale-110' : 'scale-100'} transition-transform`} />
      <span className="text-[10px] font-medium scale-90 sm:scale-100">{label}</span>
      {activeTab === id && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
      )}
    </button>
  );

  const DesktopNavButton = ({ id, label, icon: Icon, colorClass }: { id: ViewState, label: string, icon: any, colorClass: string }) => (
     <button 
        onClick={() => setActiveTab(id)}
        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-all ${activeTab === id ? `${colorClass} shadow-md translate-x-1` : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <Icon className="w-5 h-5" /> {label}
      </button>
  );

  // 1. First time Setup: Gemini API Key
  if (!hasApiKey) {
    return <ApiKeySetup onComplete={() => setHasApiKey(true)} />;
  }

  // 2. Second time Setup: Google Sheet DB
  if (!hasConnection) {
    return <GasSetup onConnect={() => setHasConnection(true)} />;
  }

  // 3. Loading Data
  if (dataLoading) {
     return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
        <p className="animate-pulse font-medium">資料同步中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 selection:bg-teal-100 selection:text-teal-900">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 flex-shrink-0 z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100 cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-2 rounded-xl shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-heading font-bold tracking-tight text-gray-900">
            HealthGuardian
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">選單</p>
          <DesktopNavButton id="DASHBOARD" label="總覽儀表板" icon={LayoutDashboard} colorClass="bg-gray-100 text-gray-900" />
          <DesktopNavButton id="VITALS" label="每日生理量測" icon={HeartPulse} colorClass="bg-rose-50 text-rose-700" />
          <DesktopNavButton id="FOOD" label="飲食分析與購物" icon={Utensils} colorClass="bg-teal-50 text-teal-700" />
          <DesktopNavButton id="CALENDAR" label="日曆統計" icon={BarChart3} colorClass="bg-indigo-50 text-indigo-700" />
          <DesktopNavButton id="WORKOUT" label="運動建議" icon={Dumbbell} colorClass="bg-orange-50 text-orange-700" />
          <DesktopNavButton id="HEALTH_MANAGEMENT" label="健康管理中心" icon={UserCog} colorClass="bg-blue-50 text-blue-700" />
          <div className="mt-8">
            <DesktopNavButton id="SYSTEM_SETTINGS" label="系統設定" icon={Settings} colorClass="bg-gray-100 text-gray-700" />
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
           <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
               <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                   {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : <User className="w-5 h-5"/>}
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{userProfile.name || '使用者'}</p>
                  <p className="text-xs text-green-600 font-medium truncate flex items-center gap-1">
                     <Database className="w-3 h-3"/> 已連線
                  </p>
               </div>
               <button 
                 onClick={handleDisconnect} 
                 className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                 title="登出"
               >
                 <LogOut className="w-4 h-4" />
               </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative overflow-hidden">
        
        {/* Mobile App Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 z-20 flex-shrink-0">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-1.5 rounded-lg shadow-sm">
                  <Activity className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-heading font-bold tracking-tight text-gray-900">
                HealthGuardian
              </h1>
            </div>
            <div className="flex items-center gap-1">
               <button 
                 onClick={() => setActiveTab('SYSTEM_SETTINGS')}
                 className={`p-2 rounded-full transition-colors ${activeTab === 'SYSTEM_SETTINGS' ? 'text-gray-900 bg-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                 title="設定"
               >
                 <Settings className="w-5 h-5" />
               </button>
               <button 
                 onClick={handleDisconnect} 
                 className="p-2 text-gray-400 focus:text-red-500 active:bg-red-50 rounded-full transition-colors"
                 title="登出"
               >
                 <LogOut className="w-5 h-5" />
               </button>
            </div>
          </div>
          <div className="bg-green-600/90 py-1 flex items-center justify-center gap-1 text-white text-[10px] font-medium shadow-inner">
            <Database className="w-3 h-3"/> 資料已自動同步至 Google Sheets
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8">
           <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
              {renderContent()}
           </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 md:hidden z-30 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex overflow-x-auto overflow-y-hidden scrollbar-hide h-16 w-full items-center px-1">
          <NavButton id="DASHBOARD" label="首頁" icon={LayoutDashboard} />
          <NavButton id="VITALS" label="量測" icon={HeartPulse} />
          <NavButton id="FOOD" label="飲食" icon={Utensils} />
          <NavButton id="CALENDAR" label="統計" icon={BarChart3} />
          <NavButton id="WORKOUT" label="運動" icon={Dumbbell} />
          <NavButton id="HEALTH_MANAGEMENT" label="健康" icon={UserCog} />
        </div>
      </nav>
      
      {showDailySummary && (
        <DailySummaryPopup 
          userProfile={userProfile}
          foodLogs={foodLogs}
          workoutLogs={workoutLogs}
          dailyHealthLogs={dailyHealthLogs}
          onClose={() => setShowDailySummary(false)}
        />
      )}
    </div>
  );
};

export default App;