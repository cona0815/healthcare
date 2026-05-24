import React, { useEffect, useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { UserProfile, FoodAnalysis, WorkoutLog, DailyHealthLog } from '../types';
import { generateDailySummary } from '../services/geminiService';

interface Props {
  userProfile: UserProfile;
  foodLogs: FoodAnalysis[];
  workoutLogs: WorkoutLog[];
  dailyHealthLogs: DailyHealthLog[];
  onClose: () => void;
}

const DailySummaryPopup: React.FC<Props> = ({ userProfile, foodLogs, workoutLogs, dailyHealthLogs, onClose }) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const result = await generateDailySummary(userProfile, foodLogs, workoutLogs, dailyHealthLogs);
        setSummary(result);
      } catch (err) {
        console.error(err);
        setSummary("很抱歉，生成今日總結時發生錯誤，請稍後再試。");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [userProfile, foodLogs, workoutLogs, dailyHealthLogs]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-50 to-transparent rounded-bl-full pointer-events-none"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2 text-teal-600">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-xl font-heading font-black text-gray-900">今日健康總結</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative z-10 min-h-[150px] flex items-center justify-center bg-gray-50 rounded-2xl p-4">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-teal-600">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium animate-pulse">正在生成您的專屬陪伴與鼓勵...</p>
              </div>
            ) : (
              <div className="w-full h-full text-base font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <button
               onClick={onClose}
               className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-200 transition-colors active:scale-95 flex items-center justify-center"
            >
               收到！明天繼續努力
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySummaryPopup;
