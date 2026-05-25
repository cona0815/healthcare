import React, { useMemo, useState } from 'react';
import { Activity, Calendar, Dumbbell, Flame, CheckCircle2, ChevronDown, ChevronUp, MapPin, User, Clock, FileText, Utensils, Zap, Trophy, AlertTriangle, Sparkles, AlertCircle, Target, Plus, CheckSquare, Save, Loader2, Camera, ArrowRight, Droplets, Moon, Star, Pill, HeartPulse, X } from 'lucide-react';
import { FoodAnalysis, SavedAppointment, WorkoutPlanDay, WorkoutLog, UserProfile, ViewState, ActivityLevel, DailyHealthLog, VitalsRecord } from '../types';
import { calculateExerciseCalories, generateHealthAssistantAdvice } from '../services/geminiService';

interface Props {
  dataLoading?: boolean;
  userProfile: UserProfile;
  foodLogs: FoodAnalysis[];
  appointments: SavedAppointment[];
  workoutPlan: WorkoutPlanDay[];
  workoutLogs: WorkoutLog[];
  vitalsRecords: VitalsRecord[];
  onNavigate: (view: ViewState, subTab?: string) => void;
  onAnalyzeImage?: (file: File) => void;
  onAddWorkout: (log: WorkoutLog) => void;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
};

const COMMON_QUICK_EXERCISES = [
    "皮克敏",
    "快走 (Brisk Walking)", 
    "慢跑 (Jogging)", 
    "游泳 (Swimming)", 
    "重訓 (Weight Training)", 
    "瑜珈 (Yoga)", 
    "皮拉提斯 (Pilates)", 
    "騎腳踏車 (Cycling)", 
    "跳繩 (Jump Rope)", 
    "HIIT 間歇運動",
    "登山 (Hiking)"
];

const Dashboard: React.FC<Props> = ({ 
  dataLoading = false, userProfile, foodLogs, appointments, workoutPlan, workoutLogs, vitalsRecords, onNavigate, onAnalyzeImage, onAddWorkout, onUpdateProfile
}) => {
  const [isAptExpanded, setIsAptExpanded] = useState(false);
  const [quickActivity, setQuickActivity] = useState("");
  const [quickDuration, setQuickDuration] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [loadingAssistant, setLoadingAssistant] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  
  const getGreeting = () => {
      const hour = today.getHours();
      if (hour >= 5 && hour < 12) return '早安';
      if (hour >= 12 && hour < 18) return '午安';
      return '晚安';
  };

  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAnalyzeImage) {
        onAnalyzeImage(file);
    }
    // reset input
    if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
    }
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const adviceFetched = React.useRef(false);

  React.useEffect(() => {
     let mounted = true;
     
     const lastSeenDate = localStorage.getItem('lastSeenHealthAssistant');
     if (lastSeenDate === todayStr) {
         setLoadingAssistant(false);
         setShowAssistant(false);
         return; 
     }

     const fetchAdvice = async () => {
         setLoadingAssistant(true);
         setShowAssistant(true); 
         // Force slight delay to bypass immediate unmount in strict mode
         await new Promise(resolve => setTimeout(resolve, 500));
         if (!mounted) return;
         
         try {
           const message = await generateHealthAssistantAdvice(userProfile, foodLogs, workoutLogs, vitalsRecords, appointments);
           if (mounted) {
               const formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-700 font-black bg-indigo-50 px-1.5 py-0.5 rounded mx-0.5 border border-indigo-100">$1</strong>');
               setAssistantMessage(formattedMessage);
               setLoadingAssistant(false);
               localStorage.setItem('lastSeenHealthAssistant', todayStr);
           }
         } catch(e) {
           if (mounted) {
               setAssistantMessage("生成健康建議時發生錯誤，請確認 API Key 以及網路連線。");
               setLoadingAssistant(false);
           }
         }
     };
     fetchAdvice();
     return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  const currentDailyLog = useMemo(() => {
    return userProfile.dailyHealthLogs?.find(l => l.date === todayStr) || { date: todayStr, medicationsTaken: [] };
  }, [userProfile.dailyHealthLogs, todayStr]);

  const handleToggleMedication = async (reminderId: string) => {
     const logs = [...(userProfile.dailyHealthLogs || [])];
     const idx = logs.findIndex(l => l.date === todayStr);
     
     let medicationsTaken = [...(currentDailyLog.medicationsTaken || [])];
     if (medicationsTaken.includes(reminderId)) {
        medicationsTaken = medicationsTaken.filter(id => id !== reminderId);
     } else {
        medicationsTaken.push(reminderId);
     }

     if (idx >= 0) {
         logs[idx] = { ...logs[idx], medicationsTaken };
     } else {
         logs.push({ date: todayStr, medicationsTaken });
     }
     await onUpdateProfile({ ...userProfile, dailyHealthLogs: logs });
  };

  // 1. Calculate TDEE
  const tdee = useMemo(() => {
      const w = parseFloat(userProfile.weight);
      const h = parseFloat(userProfile.height);
      const birthDate = userProfile.birthDate;
      const gender = userProfile.gender || 'male';
      const activity = userProfile.activityLevel || 'sedentary';

      if (!w || !h || !birthDate) return 2000; 

      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
      }

      // Mifflin-St Jeor Equation
      let bmr = (10 * w) + (6.25 * h) - (5 * age);
      if (gender === 'male') bmr += 5;
      else bmr -= 161;

      const factor = ACTIVITY_FACTORS[activity] || 1.2;
      return Math.round(bmr * factor);
  }, [userProfile]);

  // 2. Calories Calculation
  const targetDeficit = userProfile.targetDeficit || 0;
  
  const todayFoodCalories = useMemo(() => {
    return foodLogs
        .filter(log => log.timestamp && log.timestamp.startsWith(todayStr))
        .reduce((sum, log) => sum + (Number(log.calories) || 0), 0);
  }, [foodLogs, todayStr]);

  const todayExerciseCalories = useMemo(() => {
    return workoutLogs
        .filter(log => log.timestamp && log.timestamp.startsWith(todayStr))
        .reduce((sum, log) => sum + (Number(log.caloriesBurned) || 0), 0);
  }, [workoutLogs, todayStr]);

  // Logic: 
  // Daily Budget = TDEE - Deficit Goal
  // Net Intake = Food - Exercise
  // Remaining = Daily Budget - Net Intake
  
  const dailyBudget = tdee - targetDeficit;
  const netIntake = todayFoodCalories - todayExerciseCalories;
  const remainingCalories = dailyBudget - netIntake;
  
  // Progress for the circle (0 to 100%)
  // If remaining is full (didn't eat), percent is 0 used. 
  // We want to show how much "Budget" is used.
  const usedPercent = Math.max(0, (netIntake / dailyBudget) * 100);
  // Clone for visual capping at 100 for the stroke, but keep logic for color
  const visualPercent = Math.min(100, usedPercent);
  
  // Status Colors & Feedback
  let statusColor = "text-teal-100";
  let cardGradient = "from-teal-500 to-emerald-600"; // Default Safe (Green/Teal)
  let ringColor = "stroke-teal-200";
  let ringBgColor = "stroke-teal-500/30";
  let statusMessage = "攝取量控制良好";

  if (remainingCalories < 0) {
      // 爆表 (Over Budget) -> Red Alert
      cardGradient = "from-red-600 to-rose-700";
      ringColor = "stroke-red-200";
      ringBgColor = "stroke-red-900/30";
      statusMessage = "⚠️ 熱量已超標！";
      statusColor = "text-red-100";
  } else if (remainingCalories < 200) {
      // Warning Zone -> Orange
      cardGradient = "from-orange-500 to-amber-600";
      ringColor = "stroke-orange-200";
      ringBgColor = "stroke-orange-800/30";
      statusMessage = "即將達標，注意晚餐";
  }

  // 3-B. Achievements Calculation
  const achievements = useMemo(() => {
     let badges = [];
     
     // Pikmin total steps
     const totalSteps = workoutLogs
         .filter(log => log.activity === '皮克敏')
         .reduce((sum, log) => sum + parseInt(log.duration || '0', 10) || 0, 0);

     if (totalSteps >= 100000) {
        badges.push({ title: "步數達人", desc: "累積破 10 萬步", icon: <Star className="w-5 h-5 text-yellow-500" /> });
     } else if (totalSteps >= 10000) {
        badges.push({ title: "初階行者", desc: "累積 1 萬步", icon: <MapPin className="w-5 h-5 text-green-500" /> });
     }

     // Active days streak (consecutive days with workout > 0 calories burned)
     const sortedWorkoutDays = Array.from(new Set(workoutLogs.map(l => l.timestamp.split('T')[0]))).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
     let streak = 0;
     let tempDate = new Date();
     for (let i = 0; i < sortedWorkoutDays.length; i++) {
        const dStr = tempDate.toISOString().split('T')[0];
        if (sortedWorkoutDays[i] === dStr) {
           streak++;
           tempDate.setDate(tempDate.getDate() - 1);
        } else if (i === 0 && sortedWorkoutDays[i] !== dStr) {
           // Maybe checked yesterday
           tempDate.setDate(tempDate.getDate() - 1);
           const yStr = tempDate.toISOString().split('T')[0];
           if (sortedWorkoutDays[i] === yStr) {
              streak++;
              tempDate.setDate(tempDate.getDate() - 1);
           } else {
              break;
           }
        } else {
           break;
        }
     }
     
     if (streak >= 7) badges.push({ title: "恆心鐵人", desc: "連續運動 7 天", icon: <Flame className="w-5 h-5 text-orange-500 fill-orange-500" /> });
     else if (streak >= 3) badges.push({ title: "活力燃燒", desc: "連續運動 3 天", icon: <Flame className="w-5 h-5 text-orange-400" /> });

     return badges;
  }, [workoutLogs]);

  // 3. Next Appointment
  const upcomingAppointment = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    return sorted.find(apt => {
        try {
            const dateStr = apt.date.replace(/[\/\.年月]/g, '-').replace(/日/g, '');
            const parts = dateStr.split('-');
            const aptDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            return aptDate >= todayDate;
        } catch { return false; }
    });
  }, [appointments]);

  // 4. Today's Workout
  const todayWorkout = useMemo(() => {
      if (!workoutPlan || workoutPlan.length === 0) return null;
      try {
          const weekDay = today.toLocaleDateString('zh-TW', { weekday: 'long' });
          return workoutPlan.find(p => p.day && (p.day.includes(weekDay.replace('星期', '週')) || p.day.includes(weekDay)));
      } catch (e) { return null; }
  }, [workoutPlan]);

  const isWorkoutDone = useMemo(() => {
      if (!todayWorkout) return false;
      return workoutLogs.some(log => 
          log.timestamp.startsWith(todayStr) && 
          log.activity.includes(todayWorkout.activity)
      );
  }, [todayWorkout, workoutLogs, todayStr]);

  const handleCheckPlan = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!todayWorkout || isWorkoutDone) return;
      
      setCheckingPlan(true);
      try {
          const calories = await calculateExerciseCalories(todayWorkout.activity, todayWorkout.duration, userProfile);
          const newLog: WorkoutLog = {
              id: Date.now().toString(),
              activity: todayWorkout.activity,
              duration: todayWorkout.duration,
              timestamp: new Date().toISOString(),
              caloriesBurned: calories
          };
          onAddWorkout(newLog);
          alert(`運動目標達成！消耗熱量約 ${calories} kcal`);
      } catch (e) {
          console.error(e);
          const newLog: WorkoutLog = {
              id: Date.now().toString(),
              activity: todayWorkout.activity,
              duration: todayWorkout.duration,
              timestamp: new Date().toISOString(),
              caloriesBurned: 0
          };
          onAddWorkout(newLog);
      } finally {
          setCheckingPlan(false);
      }
  };

  const handleQuickAdd = async () => {
      if (!quickActivity || !quickDuration) return alert("請選擇運動項目並輸入數值");
      
      setIsCalculating(true);
      try {
          const isPikmin = quickActivity === '皮克敏';
          const durationStr = isPikmin ? (quickDuration.includes("步") ? quickDuration : quickDuration + "步") : (quickDuration.includes("分") ? quickDuration : quickDuration + "分鐘");
          const calories = await calculateExerciseCalories(quickActivity, durationStr, userProfile);

          const newLog: WorkoutLog = {
              id: Date.now().toString(),
              activity: quickActivity,
              duration: durationStr,
              timestamp: new Date().toISOString(),
              caloriesBurned: calories
          };
          onAddWorkout(newLog);
          
          setQuickActivity("");
          setQuickDuration("");
          alert(`運動記錄已新增！(預估消耗 ${calories} kcal)`);
      } catch (e) {
          console.error(e);
          const isPikmin = quickActivity === '皮克敏';
          const durationStr = isPikmin ? (quickDuration.includes("步") ? quickDuration : quickDuration + "步") : (quickDuration.includes("分") ? quickDuration : quickDuration + "分鐘");
          const newLog: WorkoutLog = {
              id: Date.now().toString(),
              activity: quickActivity,
              duration: durationStr,
              timestamp: new Date().toISOString(),
              caloriesBurned: 0
          };
          onAddWorkout(newLog);
          setQuickActivity("");
          setQuickDuration("");
          alert("運動記錄已新增 (無法計算熱量)");
      } finally {
          setIsCalculating(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
       {/* Header with Greeting & Quick Action */}
       <div className="mb-2 px-1">
          <div>
            <h2 className="text-3xl font-heading font-black text-gray-900 tracking-tight">
              {getGreeting()}，{userProfile.name || '健康夥伴'}
            </h2>
            <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-widest">
              {today.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
       </div>
       
       {/* AI Health Assistant Modal */}
       {showAssistant && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowAssistant(false)}>
           <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden w-full max-w-md animate-slide-up bg-gradient-to-br from-indigo-500/5 to-purple-500/5" onClick={(e) => e.stopPropagation()}>
              <button
                 onClick={() => setShowAssistant(false)}
                 className="absolute top-4 right-4 z-20 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
                 aria-label="關閉"
              >
                 <X className="w-5 h-5" />
              </button>
              
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400 opacity-20 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
              
              <div className="flex flex-col items-center text-center mt-2">
                 <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center relative mb-4 shadow-inner">
                     <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                     {!loadingAssistant && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-4 border-white rounded-full"></div>}
                 </div>
                 
                 <h3 className="font-heading font-black text-gray-900 text-2xl mb-4 flex items-center gap-2 justify-center">
                    今日小提醒
                 </h3>
                 
                 <div className="text-gray-700 font-medium text-base md:text-lg leading-relaxed h-auto min-h-[80px] flex items-center justify-center w-full">
                     {loadingAssistant ? (
                         <div className="space-y-3 animate-pulse w-full">
                            <div className="h-5 bg-indigo-100 rounded-full w-full"></div>
                            <div className="h-5 bg-indigo-100 rounded-full w-5/6 mx-auto"></div>
                            <div className="h-5 bg-indigo-100 rounded-full w-4/6 mx-auto"></div>
                         </div>
                     ) : (
                         <div 
                           className="text-left bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 w-full"
                           dangerouslySetInnerHTML={{ __html: assistantMessage.replace(/\n/g, '<br/>') }} 
                         />
                     )}
                 </div>
                 
                 {!loadingAssistant && (
                     <button
                       onClick={() => setShowAssistant(false)}
                       className="mt-8 w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 text-lg"
                     >
                        知道了
                     </button>
                 )}
              </div>
           </div>
         </div>
       )}

       {/* QUICK ACTIONS MENU */}
       <div className="grid grid-cols-4 gap-3 pb-4 pt-1 px-1">
           <button 
             onClick={() => onNavigate('VITALS')}
             className="flex justify-center items-center bg-rose-50 text-rose-700 py-4 w-full rounded-2xl font-bold border border-rose-100 hover:bg-rose-100 hover:border-rose-200 transition-all active:scale-95"
           >
             <HeartPulse className="w-6 h-6" />
           </button>
           <button 
             onClick={() => onNavigate('FOOD')}
             className="flex justify-center items-center bg-teal-50 text-teal-700 py-4 w-full rounded-2xl font-bold border border-teal-100 hover:bg-teal-100 hover:border-teal-200 transition-all active:scale-95"
           >
             <Utensils className="w-6 h-6" />
           </button>
           <button 
             onClick={() => onNavigate('WORKOUT')}
             className="flex justify-center items-center bg-orange-50 text-orange-700 py-4 w-full rounded-2xl font-bold border border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-all active:scale-95"
           >
             <Dumbbell className="w-6 h-6" />
           </button>
           <button 
             onClick={() => onNavigate('HEALTH_MANAGEMENT', 'APPOINTMENTS')}
             className="flex justify-center items-center bg-indigo-50 text-indigo-700 py-4 w-full rounded-2xl font-bold border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95"
           >
             <Calendar className="w-6 h-6" />
           </button>
       </div>

       {/* MAIN HERO CARD: REMAINING CALORIES CIRCLE */}
       <div 
         className={`bg-gradient-to-br ${cardGradient} rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 cursor-pointer group`}
         onClick={() => onNavigate('FOOD')}
       >
          <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
             <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (onAnalyzeImage) {
                    cameraInputRef.current?.click();
                  } else {
                    onNavigate('FOOD'); 
                  }
                }}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 px-4 py-2 rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2"
             >
                <Camera className="w-4 h-4" />
                <span>餐點分析</span>
             </button>
             <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleCameraChange} />
          </div>

          {/* Decorative Mesh Gradients */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl pointer-events-none mix-blend-overlay"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl pointer-events-none mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center py-4">
             
             {/* Circular Progress */}
             <div className="relative w-56 h-56 sm:w-64 sm:h-64">
                 <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" className={ringBgColor} strokeWidth="6" fill="transparent" />
                    <circle 
                        cx="50" cy="50" r="42" 
                        className={`transition-all duration-1000 ease-out ${ringColor}`}
                        strokeWidth="6" 
                        fill="transparent" 
                        strokeDasharray={264} 
                        strokeDashoffset={264 - (264 * visualPercent) / 100} 
                        strokeLinecap="round"
                    />
                 </svg>
                 
                 {/* Center Content */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium opacity-80 mb-0.5 tracking-wide uppercase">剩餘額度</p>
                    <h3 className="text-6xl sm:text-7xl font-sans font-black tracking-tighter drop-shadow-sm">
                        {remainingCalories}
                    </h3>
                    <p className="text-sm font-bold opacity-80 mt-1">kcal</p>
                 </div>
             </div>

             {/* Status Message */}
             <div className={`mt-8 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center gap-2 ${statusColor} animate-fade-in-up font-medium`}>
                {remainingCalories < 0 ? <AlertCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span className="text-sm tracking-wide">{statusMessage}</span>
             </div>

             {/* Bottom Stats Grid */}
             <div className="grid grid-cols-3 gap-6 sm:gap-12 mt-8 w-full max-w-md border-t border-white/10 pt-6">
                 <div className="text-center">
                    <p className="text-xs opacity-70 mb-1 uppercase tracking-widest">已攝取</p>
                    <p className="font-bold text-xl font-mono">{todayFoodCalories}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xs opacity-70 mb-1 uppercase tracking-widest">已消耗</p>
                    <p className="font-bold text-xl font-mono opacity-90">-{todayExerciseCalories}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xs opacity-70 mb-1 uppercase tracking-widest">總目標</p>
                    <p className="font-bold text-xl font-mono">{dailyBudget}</p>
                 </div>
             </div>
          </div>
       </div>

       <div className="mb-6">
           {/* Medication Checklist Card */}
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 relative overflow-hidden mb-6">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full pointer-events-none"></div>
               <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                     <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                        <Pill className="w-5 h-5" />
                     </div>
                     <h3 className="font-heading font-black text-gray-900 text-lg">今日服藥檢核</h3>
                  </div>
                  <button onClick={() => {
                      onNavigate('HEALTH_MANAGEMENT', 'PROFILE');
                      setTimeout(() => {
                          document.getElementById('medication-settings')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                  }} className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                    新增設定
                  </button>
               </div>
               
               <div className="space-y-3 relative z-10">
                   {(!userProfile.medicationReminders || userProfile.medicationReminders.length === 0) ? (
                       <div className="text-center p-6 bg-emerald-50/50 border border-dashed border-emerald-200 rounded-2xl text-emerald-600 font-medium text-sm">
                           尚未設定提醒，點擊右上方「新增設定」加入你的服藥計畫
                       </div>
                   ) : (
                       userProfile.medicationReminders.map(reminder => {
                           const isTaken = currentDailyLog.medicationsTaken?.includes(reminder.id);
                           return (
                               <div 
                                   key={reminder.id}
                                   onClick={() => handleToggleMedication(reminder.id)}
                                   className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isTaken ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                               >
                                   <div className="flex items-center gap-4">
                                       <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${isTaken ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                                           {isTaken && <CheckCircle2 className="w-4 h-4 text-white" />}
                                       </div>
                                       <div>
                                           <div className={`font-bold ${isTaken ? 'line-through opacity-70' : ''}`}>{reminder.name}</div>
                                           <div className={`text-xs font-mono font-medium ${isTaken ? 'opacity-70' : 'text-gray-500'}`}><Clock className="w-3 h-3 inline mr-1 -mt-0.5" />{reminder.time}</div>
                                       </div>
                                   </div>
                               </div>
                           );
                       })
                   )}
               </div>
           </div>

           {/* Achievements Card */}
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="bg-yellow-100 p-2 rounded-xl text-yellow-600">
                        <Trophy className="w-5 h-5" />
                     </div>
                     <h3 className="font-heading font-black text-gray-900 text-lg">成就徽章</h3>
                  </div>
                  <span className="text-sm font-bold text-gray-400">{achievements.length} 個解鎖</span>
               </div>
               
               {achievements.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {achievements.map((badge, idx) => (
                          <div key={idx} className="flex flex-col items-center flex-shrink-0 w-24 p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                             <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 border border-gray-100">
                                {badge.icon}
                             </div>
                             <p className="text-xs font-bold text-gray-800 text-center line-clamp-1">{badge.title}</p>
                             <p className="text-[10px] text-gray-500 text-center leading-tight mt-1">{badge.desc}</p>
                          </div>
                      ))}
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                      <Star className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">尚未解鎖任何徽章，加油！</p>
                  </div>
               )}
           </div>
       </div>

       {/* Quick Add Workout Section */}
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-50 to-transparent rounded-bl-full pointer-events-none"></div>
           <div className="flex items-center gap-3 mb-5 relative z-10">
               <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                  <Zap className="w-5 h-5" />
               </div>
               <h3 className="font-heading font-black text-gray-900 text-lg">快速記錄運動</h3>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-4 items-center relative z-10">
               <div className="relative w-full flex-1">
                   <select 
                       value={quickActivity}
                       onChange={(e) => setQuickActivity(e.target.value)}
                       className="w-full text-base bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-500 appearance-none font-medium text-gray-800 transition-shadow"
                   >
                       <option value="" disabled>選擇運動項目...</option>
                       {COMMON_QUICK_EXERCISES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                   </select>
                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
               </div>

               <div className="flex w-full sm:w-1/3 gap-3">
                   <input 
                       type="number"
                       value={quickDuration}
                       onChange={(e) => setQuickDuration(e.target.value)}
                       placeholder={quickActivity === '皮克敏' ? "步數" : "分鐘"}
                       className="flex-1 w-full text-base bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-500 text-center font-medium transition-shadow"
                   />
                   <button 
                       onClick={handleQuickAdd}
                       disabled={isCalculating}
                       className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-2xl transition-colors flex-shrink-0 flex items-center justify-center font-bold shadow-sm hover:shadow-md active:scale-95 disabled:opacity-70"
                   >
                       {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : "新增"}
                   </button>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Workout Card */}
           <div 
             className={`p-6 rounded-3xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group ${
                 isWorkoutDone ? 'bg-orange-500 border-orange-600' : 'bg-white border-orange-100'
             }`}
             onClick={() => onNavigate('WORKOUT')}
           >
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform duration-500 group-hover:scale-110 ${
                  isWorkoutDone ? 'bg-white/10' : 'bg-orange-50'
              }`}></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                        isWorkoutDone ? 'bg-white text-orange-500' : 'bg-orange-100 text-orange-600'
                    }`}>
                        <Dumbbell className="w-6 h-6" />
                    </div>
                    <h4 className={`font-heading font-black text-lg ${isWorkoutDone ? 'text-white' : 'text-gray-900'}`}>今日運動計畫</h4>
                 </div>
                 
                 {todayWorkout && !isWorkoutDone && (
                     <button 
                        onClick={handleCheckPlan}
                        disabled={checkingPlan}
                        className="bg-gray-100 hover:bg-green-100 text-gray-400 hover:text-green-600 p-2.5 rounded-full transition-all shadow-sm z-20 disabled:opacity-70 disabled:cursor-not-allowed"
                        title="標記為已完成"
                     >
                         {checkingPlan ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
                     </button>
                 )}
                 {isWorkoutDone && (
                     <span className="bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                         <CheckCircle2 className="w-4 h-4" /> 已完成
                     </span>
                 )}
              </div>

              {todayWorkout ? (
                  <div className="relative z-10 pt-2">
                      <p className={`text-3xl font-heading font-black mb-2 tracking-tight ${isWorkoutDone ? 'text-white' : 'text-gray-900'}`}>
                          {todayWorkout.activity}
                      </p>
                      <div className="flex items-center gap-2">
                          <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                              isWorkoutDone ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
                          }`}>
                              {todayWorkout.duration}
                          </span>
                      </div>
                  </div>
              ) : (
                  <div className="relative z-10 py-6 text-center">
                      <p className="text-gray-400 font-medium text-base mb-1">今日無特定行程</p>
                      <p className="text-sm text-orange-500 font-bold hover:underline decoration-orange-300">點擊建立運動計畫</p>
                  </div>
              )}
           </div>

           {/* Appointment Card */}
           <div 
             className={`bg-white rounded-3xl shadow-sm border border-indigo-50 transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                 isAptExpanded ? 'p-6 ring-2 ring-indigo-200 shadow-md' : 'p-6 hover:shadow-md'
             }`}
             onClick={() => setIsAptExpanded(!isAptExpanded)}
           >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-indigo-50 -mr-4 -mt-4 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="font-heading font-black text-gray-900 text-lg">下一次回診</h4>
                 </div>
                 {upcomingAppointment && (
                     <div className="text-gray-400 bg-gray-50 p-2 rounded-full">
                         {isAptExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                     </div>
                 )}
              </div>
              
              {upcomingAppointment ? (
                  <div className="relative z-10 pt-2">
                      <div className="flex items-baseline gap-2 mb-2">
                          <p className="text-4xl font-heading font-black text-indigo-900 tracking-tighter">
                              {new Date(upcomingAppointment.date).getDate()} 
                          </p>
                          <span className="text-base font-bold text-gray-500 uppercase tracking-widest">
                             {new Date(upcomingAppointment.date).toLocaleDateString('zh-TW', { month: 'short' })}
                          </span>
                      </div>
                      <p className="font-bold text-gray-800 text-xl truncate">{upcomingAppointment.title}</p>
                      
                      {isAptExpanded && (
                          <div className="mt-6 pt-6 border-t border-indigo-50 space-y-4 animate-fade-in">
                              <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                                  <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                  <span>{upcomingAppointment.time}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                                  <User className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                  <span>{upcomingAppointment.doctor}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                                  <MapPin className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                  <span>{upcomingAppointment.location}</span>
                              </div>
                              {upcomingAppointment.notes && (
                                  <div className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                      <span className="leading-relaxed">{upcomingAppointment.notes}</span>
                                  </div>
                              )}
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); onNavigate('HEALTH_MANAGEMENT', 'APPOINTMENTS'); }}
                                className="w-full mt-4 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-xl transition-colors"
                              >
                                  前往預約管理
                              </button>
                          </div>
                      )}

                      {!isAptExpanded && (
                          <p className="text-xs text-indigo-500 mt-3 font-bold uppercase tracking-widest">點擊展開資訊</p>
                      )}
                  </div>
              ) : (
                  <div className="relative z-10 py-6 text-center" onClick={(e) => { e.stopPropagation(); onNavigate('HEALTH_MANAGEMENT', 'APPOINTMENTS'); }}>
                      <p className="text-gray-400 font-medium text-base mb-1">目前無預約行程</p>
                      <p className="text-sm text-indigo-500 font-bold hover:underline decoration-indigo-300">點擊新增預約</p>
                  </div>
              )}
           </div>
       </div>
    </div>
  );
};

export default Dashboard;