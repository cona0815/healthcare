import {ActivityLevel} from '../types';
export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; desc: string; factor: number }[] = [
    { value: 'sedentary', label: '久坐 / 無運動', desc: '辦公室工作，幾乎不運動', factor: 1.2 },
    { value: 'light', label: '輕度活動', desc: '每週運動 1-3 天', factor: 1.375 },
    { value: 'moderate', label: '中度活動', desc: '每週運動 3-5 天', factor: 1.55 },
    { value: 'active', label: '高度活動', desc: '每週運動 6-7 天', factor: 1.725 },
    { value: 'very_active', label: '超高度活動', desc: '勞力工作或每日兩次訓練', factor: 1.9 },
];

export const DEFICIT_GOALS = [
    { value: 0, label: '維持體重', desc: '攝取量 = TDEE' },
    { value: 300, label: '溫和減重 (-300)', desc: '每日創造 300kcal 赤字' },
    { value: 500, label: '減少 500 kcal', desc: '每日熱量赤字 500 kcal' },
    { value: 700, label: '減少 700 kcal', desc: '需搭配運動，避免肌肉流失' },
];

