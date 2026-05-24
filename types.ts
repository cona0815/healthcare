
export enum RiskLevel {
  SAFE = 'SAFE',
  MODERATE = 'MODERATE',
  DANGEROUS = 'DANGEROUS',
  UNKNOWN = 'UNKNOWN'
}

export type MealType = '早餐' | '午餐' | '晚餐' | '點心/飲料';

export interface WeightRecord {
  date: string;   // YYYY-MM-DD
  weight: string; // kg
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface MedicationReminder {
  id: string;
  name: string; // 藥物名稱或提醒名稱
  time: string; // 時間 HH:mm
}

export interface DailyHealthLog {
  date: string; // YYYY-MM-DD
  waterIntake?: number; // ml
  sleepHours?: number; // hours
  medicationsTaken?: string[]; // 已服藥的 Reminder ID
}

export interface UserProfile {
  name?: string; 
  height: string; // cm
  weight: string; // kg (目前體重)
  gender?: Gender; 
  birthDate?: string; // YYYY-MM-DD
  activityLevel?: ActivityLevel; 
  targetDeficit?: number; // 新增：每日熱量赤字目標 (例如 300, 500)
  weightHistory?: WeightRecord[]; 
  dietaryPreferences?: string[]; // 飲食偏好 (e.g., 素食, 減脂)
  allergies?: string; // 過敏原 / 忌口
  medicalConditions?: string[]; // 慢性病與病史
  dailySummaryTime?: string; // 每日總結結算提醒時間, HH:mm
  dailyHealthLogs?: DailyHealthLog[];
  medicationReminders?: MedicationReminder[];
}

export interface Nutrient {
  name: string;
  amount: string;
  unit: string;
}

export interface FoodAnalysis {
  foodName: string;
  calories: number;
  estimatedWeight?: string; 
  ingredients?: string[]; 
  nutrients: Nutrient[];
  riskLevel: RiskLevel;
  diagnosis?: string; 
  healthAdvice: string;
  mealType: MealType;
  timestamp: string;
}

export interface HealthMetric {
  name: string;
  value: string;
  status: 'Normal' | 'Warning' | 'Critical';
  advice: string;
}

export interface HealthReport {
  summary: string;
  metrics: HealthMetric[];
  dietaryRestrictions: string[];
  analyzedAt: string;
}

export interface AppointmentDetails {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  doctor: string;
  notes: string;
  appointmentNumber: string;
}

export interface SavedAppointment extends AppointmentDetails {
  id: string;
  createdAt: string;
}

export interface Restaurant {
  name: string;
  uri: string;
  address?: string;
}

export interface FoodSuggestion {
  name: string;
  description: string;
  calories: number;
  riskLevel: RiskLevel;
  reason: string;
  tags: string[]; 
  restaurants?: Restaurant[];
}

export interface Medication {
  name: string;
  indication: string; 
  usage: string; 
  sideEffects: string;
  interactionWarning: string; 
  riskLevel: RiskLevel;
}

export interface WorkoutPlanDay {
  day: string;
  activity: string;
  duration: string;
  intensity: string;
  notes: string;
}

export interface WorkoutLog {
  id: string;
  activity: string;
  duration: string;
  timestamp: string; 
  caloriesBurned?: number; 
}

export interface Recipe {
  id: string;
  name: string;
  calories: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
  videoKeyword: string; 
  reason: string; 
  notes?: string; 
  checkedIngredients?: string[]; 
}

export interface GroceryItem {
  name: string;
  category: string;
  reason: string;
}

export interface ProductLabelAnalysis {
  productName: string;
  riskLevel: RiskLevel;
  analysis: string;
  nutrientsOfInterest: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface VitalsRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: 'blood_pressure' | 'blood_sugar';
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  bloodSugar?: number;
  bloodSugarContext?: 'fasting' | 'postprandial' | 'random';
  notes?: string;
}

export type ViewState = 'DASHBOARD' | 'FOOD' | 'CALENDAR' | 'HEALTH_MANAGEMENT' | 'WORKOUT' | 'SYSTEM_SETTINGS' | 'VITALS';
