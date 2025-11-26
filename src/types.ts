export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

export interface User {
  name: string;
  email: string;
  phone?: string; // Added phone number
  avatar?: string; // Base64 string
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  diagnosisDate?: string;
  cancerStage?: string;
  lastUpdated?: number; // Timestamp
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'lab' | 'nutrition' | 'reminder' | 'update';
}

export interface LabResult {
  id: string;
  type: 'blood' | 'kidney' | 'liver' | 'diabetes';
  date: string;
  summary: string;
  values?: Record<string, string | number>;
}

export interface NutritionPlan {
  dailyCalories: number;
  meals: string[];
  advice: string;
}

export type ViewState = 
  | 'splash' 
  | 'welcome' 
  | 'login' 
  | 'register' 
  | 'home' 
  | 'nutrition' 
  | 'blood-analysis' 
  | 'kidney-analysis' 
  | 'liver-analysis' 
  | 'diabetes' 
  | 'reminders' 
  | 'chat' 
  | 'profile' 
  | 'history'
  | 'settings';