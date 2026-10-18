import SlowJogging from './components/SlowJogging';
import TodayTasks from './components/TodayTasks';
import CareTools from './components/CareTools';
import { syncQueue, isDemoMode } from './services/dbService';
import { localDate } from './services/healthSummary';
import HealthOverview from './components/HealthOverview';
import { Plus, X, Camera, Droplets, CalendarDays } from 'lucide-react';
import { MealType } from './types';
import React, { useState, useEffect, useRef } from 'react';
import { Utensils, BarChart3, UserCog, Activity, Dumbbell, Loader2, LogOut, Database, User, Key, LayoutDashboard, Settings, HeartPulse } from 'lucide-react';
import FoodAnalyzer from './components/FoodAnalyzer';
import AnalysisResultCard from './components/AnalysisResultCard';
import HealthManagement from './components/HealthManagement';
import SystemSettings from './components/SystemSettings';
import VitalsTracker from './components/VitalsTracker';
import WorkoutPlanner from './components/WorkoutPlanner';
import Dashboard from './components/Dashboard';
import GasSetup from './components/GasSetup';
import ApiKeySetup from './components/ApiKeySetup'; // New component
import DailySummaryPopup from './components/DailySummaryPopup'; // New component
import { HealthReport, FoodAnalysis, ViewState, UserProfile, WorkoutLog, SavedAppointment, WorkoutPlanDay, Recipe, DailyHealthLog, VitalsRecord } from './types';
import { dbService, getGasUrl, clearGasUrl, getLocal } from './services/dbService';
import { getGeminiKey, clearGeminiKey } from './services/geminiService';

const App: React.FC = () => {
  const demo=isDemoMode();
  const localOnly=demo || localStorage.getItem('hg_local_mode')==='true';
  const [hasApiKey, setHasApiKey] = useState<boolean>(!!getGeminiKey());
  const [hasConnection, setHasConnection] = useState<boolean>(!!getGasUrl());
  const [toolsOpen,setToolsOpen]=useState(false);
  const [careSection,setCareSection]=useState('symptoms');
  const [healthCalendarDate,setHealthCalendarDate]=useState(localDate());
  useEffect(()=>{if(!toolsOpen)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setToolsOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[toolsOpen]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [mealContext, setMealContext] = useState<{meal: MealType | null; date: string} | null>(null);
  const [activeTab, setActiveTab] = useState<ViewState>('DASHBOARD');
  const [workoutCategory,setWorkoutCategory]=useState('aerobic');
  const returnToWorkouts=()=>{setWorkoutCategory(activeTab==='SLOW_JOG'?'aerobic':activeTab==='WALL_SIT'||activeTab==='SEATED_ANKLE'?'legs':'back');setActiveTab('WORKOUT');};
  const mainScroll=useRef<HTMLElement>(null);
  useEffect(()=>{mainScroll.current?.scrollTo({top:0,behavior:'auto'});},[activeTab,careSection]);
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
      const todayString = localDate(now);
      const lastSummaryDate = localStorage.getItem(demo?'demo_lastDailySummaryDate':'lastDailySummaryDate');

      if (
        lastSummaryDate !== todayString &&
        (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute))
      ) {
        setShowDailySummary(true);
        localStorage.setItem(demo?'demo_lastDailySummaryDate':'lastDailySummaryDate', todayString);
      }
    };

    // 初始檢查並每分鐘檢查一次
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [userProfile.dailySummaryTime, showDailySummary]);

  useEffect(() => {
    if (localOnly || (hasApiKey && hasConnection)) {
      void loadUserData().catch(()=>{});
    }
  }, [hasApiKey, hasConnection]);
  useEffect(()=>{
    const retry=()=>{if(!demo&&navigator.onLine&&localStorage.getItem('hg_auto_sync')!=='false')void syncQueue.flush(getGasUrl()||'');};
    retry();window.addEventListener('online',retry);const timer=setInterval(retry,30000);
    return()=>{window.removeEventListener('online',retry);clearInterval(timer);};
  },[]);

  const loadUserData = async (forceFromCloud = false) => {
    setDataLoading(true);
    try {
      const data = await dbService.loadAllData(forceFromCloud);
      setFoodLogs([...data.foodLogs].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)));
      setHealthReports([...data.reports].sort((a,b)=>Date.parse(b.analyzedAt)-Date.parse(a.analyzedAt)));
      setWorkoutLogs([...data.workouts].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)));

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
      if (data.vitals) setVitalsRecords([...data.vitals].sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))); // Load vitals
    } catch (e) {
      console.error("Failed to load data", e);
      if (!forceFromCloud) alert("讀取資料失敗，請確認您的 Google Sheet 權限設定");
      throw e;
    } finally {
      setDataLoading(false);
    }
  };

  const handleFoodAnalysisComplete = async (result: FoodAnalysis) => {

    try {
        await dbService.addFoodLog(result);
        setFoodLogs(prev => [result, ...prev]);
    } catch (e) {
        console.error("Save food log failed", e);
        throw e;
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

    try {
        await dbService.addWorkoutLog(log);
        setWorkoutLogs(prev => [log, ...prev]);
    } catch (e) {
        throw e;
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

    try {
        await dbService.saveUserProfile(profile);
        setUserProfile(profile);
        setDailyHealthLogs(profile.dailyHealthLogs || []);
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
    if(demo){location.href='/';return;}
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
            onRecordMeal={(meal, date, file) => {setMealContext({meal,date});setPendingImageFile(file || null);setActiveTab('FOOD');}}
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
            {mealContext && <p className="meal-context">記錄日期：{mealContext.date} · {mealContext.meal || '依照片判斷餐次'}</p>}
            <FoodAnalyzer
              healthReport={latestHealthReport}
              userProfile={userProfile}
              pendingImageFile={pendingImageFile}
              selectedMeal={mealContext?.meal}
              selectedDate={mealContext?.date}
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
      case 'TASKS':
        return <TodayTasks date={healthCalendarDate} onDateChange={setHealthCalendarDate} profile={userProfile} vitals={vitalsRecords} workouts={workoutLogs} appointments={appointments} foods={foodLogs} onUpdate={handleUpdateProfile} onNavigate={(view,subTab)=>{if(view==='CARE')setCareSection(subTab||'stock');if(view==='HEALTH_MANAGEMENT')setActiveHealthSubTab((subTab||'PROFILE') as any);setActiveTab(view);}}/>;
      case 'CARE':
        return <div><div className="flex items-center justify-between mb-4"><button className="px-3 py-2 rounded-lg border bg-white" onClick={()=>setActiveTab('TASKS')}>← 健康日曆</button><button className="px-3 py-2 rounded-lg border bg-white" onClick={()=>{setActiveHealthSubTab('PROFILE');setActiveTab('HEALTH_MANAGEMENT');}}>我的資料與健康管理 →</button></div><CareTools key={careSection} initialSection={careSection} profile={userProfile} foods={foodLogs} workouts={workoutLogs} vitals={vitalsRecords} onUpdate={handleUpdateProfile} onFood={handleFoodAnalysisComplete} onWorkout={handleAddWorkout}/></div>;
      case 'TRENDS':
        return <HealthOverview trendOnly profile={userProfile} vitals={vitalsRecords} workouts={workoutLogs} appointments={appointments} onUpdate={handleUpdateProfile} onNavigate={setActiveTab}/>;

      case 'SEATED_ANKLE': return <SlowJogging onBack={returnToWorkouts} key="ankle" exercise="seated_ankle" logs={workoutLogs} onSave={handleAddWorkout}/>;
      case 'WALL_ANGEL': return <SlowJogging onBack={returnToWorkouts} key="angel-front" exercise="wall_angel" logs={workoutLogs} onSave={handleAddWorkout}/>;
      case 'BAND_WALL_SLIDE': return <SlowJogging onBack={returnToWorkouts} key="band-wall" exercise="band_wall_slide" logs={workoutLogs} onSave={handleAddWorkout}/>;
      case 'SNOW_ANGEL': return <SlowJogging onBack={returnToWorkouts} key="angel-back" exercise="snow_angel" logs={workoutLogs} onSave={handleAddWorkout}/>;
      case 'WALL_SIT':
        return <SlowJogging onBack={returnToWorkouts} key="wall" exercise="wall_sit" logs={workoutLogs} onSave={handleAddWorkout}/>;
      case 'SLOW_JOG':
        return <SlowJogging onBack={returnToWorkouts} key="jog" logs={workoutLogs} onSave={handleAddWorkout}/>;
      case 'WORKOUT':
        return (
          <WorkoutPlanner workoutCategory={workoutCategory} onCategoryChange={setWorkoutCategory} onAssistedExercise={kind=>setActiveTab(kind)} onWallSit={()=>setActiveTab('WALL_SIT')} onSlowJog={()=>setActiveTab('SLOW_JOG')} onUpdateProfile={handleUpdateProfile}
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
        if(demo && activeHealthSubTab==='SYSTEM')return <p>示範模式不會變更正式設定。<button onClick={()=>setActiveHealthSubTab('PROFILE')}>回到個人資料</button></p>;
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
        if(demo)return <p>示範模式不會更動正式系統的金鑰或雲端設定。<a href="/">離開示範</a></p>;
        return (
          <SystemSettings
             userProfile={userProfile}
             onUpdateProfile={handleUpdateProfile}
             onRefreshAllData={() => loadUserData(true)}
          />
        );
      default:
        return null;
    }
  };

  const NavButton = ({ id, label, icon: Icon }: { id: ViewState, label: string, icon: any }) => (
    <button
      onClick={() => {setMealContext(null);setActiveTab(id);}}
      className={`relative flex-1 min-w-0 flex flex-col items-center justify-center space-y-1 transition-all h-full py-2 ${activeTab === id ? 'text-teal-600' : 'text-gray-400 hover:text-gray-500'}`}
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
  if (!localOnly && !hasApiKey) {
    return <ApiKeySetup onComplete={() => setHasApiKey(true)} />;
  }

  // 2. Second time Setup: Google Sheet DB
  if (!localOnly && !hasConnection) {
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
    <div className="health-shell flex h-[100dvh] overflow-hidden bg-gray-50 selection:bg-teal-100 selection:text-teal-900">

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
          <DesktopNavButton id="TASKS" label="健康日曆" icon={CalendarDays} colorClass="bg-teal-50 text-teal-700" />
          <DesktopNavButton id="CARE" label="健康工具與同步" icon={HeartPulse} colorClass="bg-teal-50 text-teal-700" />
          <DesktopNavButton id="TRENDS" label="健康趨勢週報" icon={BarChart3} colorClass="bg-teal-50 text-teal-700" />
          <DesktopNavButton id="VITALS" label="每日生理量測" icon={HeartPulse} colorClass="bg-rose-50 text-rose-700" />
          <DesktopNavButton id="FOOD" label="飲食分析與購物" icon={Utensils} colorClass="bg-teal-50 text-teal-700" />
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
                     <Database className="w-3 h-3"/> 本機儲存
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
            <Database className="w-3 h-3"/> {demo?'示範資料 · 本機儲存':getGasUrl()?'本機儲存 · 同步詳見健康工具':'本機儲存 · 未設定雲端'}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main ref={mainScroll} className="flex-1 overflow-y-auto overflow-x-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8">
           <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
              {(demo||localOnly)&&<div className="mode-banner">{demo?'示範模式 · 虛構資料，僅存在本機':'本機模式 · 手動紀錄免金鑰'} <a href={demo?'/':'/?demo=1'}>{demo?'離開示範':'體驗示範'}</a></div>}

              {renderContent()}
           </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 md:hidden z-30 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mobile-shortcuts">
          <NavButton id="DASHBOARD" label="總覽" icon={LayoutDashboard} />

          <NavButton id="FOOD" label="飲食" icon={Utensils} />
          <button className="record-nav" aria-label="新增紀錄" onClick={()=>setRecordOpen(true)}><span><Plus size={26}/></span><small>記錄</small></button>

          <NavButton id="WORKOUT" label="運動" icon={Dumbbell} />
          <NavButton id="TASKS" label="健康日曆" icon={CalendarDays} />
          <button aria-label="工具" aria-haspopup="dialog" aria-expanded={toolsOpen} onClick={()=>setToolsOpen(true)} className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-gray-500 py-2"><Settings className="w-6 h-6"/><span className="text-[10px]">工具</span></button>
        </div>
      </nav>

      {toolsOpen && <div className="record-overlay" onClick={()=>setToolsOpen(false)}><section className="record-sheet" style={{maxHeight:'80dvh',overflowY:'auto'}} role="dialog" aria-modal="true" aria-label="工具選單" onClick={e=>e.stopPropagation()}><div><h2>工具</h2><button autoFocus aria-label="關閉工具選單" onClick={()=>setToolsOpen(false)}><X/></button></div>{[['band-wall','彈力帶沿牆上舉・AI 姿勢'],['seated-ankle','坐姿踮腳＋勾腳・AI 姿勢'],['wall-angel','牆壁天使（面向牆）'],['snow-angel','雪天使（背靠牆）'],['wall-sit','靠牆深蹲・AI 姿勢'],['slow-jog','超慢跑計時與姿勢'],['trends','健康趨勢週報'],['stock','藥品庫存與補藥'],['templates','常用範本'],['export','看診摘要 PDF'],['sync','同步中心'],['profile','我的資料與健康管理']].map(([id,label])=><button key={id} onClick={()=>{setToolsOpen(false);if(id==='calendar'){setActiveTab('TASKS');}else if(id==='band-wall'){setActiveTab('BAND_WALL_SLIDE');}else if(id==='seated-ankle'){setActiveTab('SEATED_ANKLE');}else if(id==='wall-angel'){setActiveTab('WALL_ANGEL');}else if(id==='snow-angel'){setActiveTab('SNOW_ANGEL');}else if(id==='wall-sit'){setActiveTab('WALL_SIT');}else if(id==='slow-jog'){setActiveTab('SLOW_JOG');}else if(id==='trends'){setActiveTab('TRENDS');}else if(id==='profile'){setActiveHealthSubTab('PROFILE');setActiveTab('HEALTH_MANAGEMENT');}else{setCareSection(id);setActiveTab('CARE');}}}>{label}</button>)}</section></div>}
      {recordOpen && <div className="record-overlay" onClick={()=>setRecordOpen(false)}><section className="record-sheet" role="dialog" aria-modal="true" aria-label="新增紀錄" onClick={e=>e.stopPropagation()}><div><h2>想記錄什麼？</h2><button aria-label="關閉新增紀錄" onClick={()=>setRecordOpen(false)}><X/></button></div>{([{view:'FOOD',label:'拍照記飲食',Icon:Camera},{view:'VITALS',label:'血壓與血糖',Icon:HeartPulse},{view:'WORKOUT',label:'運動紀錄',Icon:Dumbbell},{view:'DASHBOARD',label:'飲水紀錄',Icon:Droplets},{view:'TASKS',label:'症狀與健康日曆',Icon:HeartPulse}] as const).map(({view,label,Icon})=><button key={view} onClick={()=>{setMealContext(null);setActiveTab(view);setRecordOpen(false);}}><Icon size={22}/>{label}</button>)}</section></div>}
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
