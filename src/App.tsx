
import React, { useState, useEffect } from 'react';
import { 
  Activity, Droplets, Pill, Thermometer, User as UserIcon, 
  Settings, LogOut, Moon, Sun, Globe, Upload, Send, Menu, X, 
  ChevronRight, Calendar, AlertCircle, FileText, Smartphone, Check, Bell, Plus, Trash2, History as HistoryIcon, Edit2, Heart, AlertTriangle
} from 'lucide-react';
import { generateChatResponse, analyzeLabImage, generateNutritionPlan, analyzeMedicalValues } from './services/geminiService';
import { Button, Card, Input, SectionHeader } from './components/UI';
import { TRANSLATIONS, FOOD_ITEMS, HEALTH_CONDITIONS, LAB_INPUTS } from './constants';
import { User, Language, Theme, ViewState, ChatMessage, HistoryItem } from './types';

// --- FIREBASE IMPORTS ---
// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBIOjTFCVXXV-BcJxw4p96xltLYNWNAT3I",
  authDomain: "breast-cancer-care-app.firebaseapp.com",
  projectId: "breast-cancer-care-app",
  storageBucket: "breast-cancer-care-app.firebasestorage.app",
  messagingSenderId: "46455758280",
  appId: "1:46455758280:web:4088a6cb9805e68a5f74fd",
  measurementId: "G-ZSFMCXY3JN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Pink Ribbon Icon for Breast Cancer Awareness
const RibbonIcon = ({ className, size = 32 }: { className?: string; size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    style={{ filter: 'drop-shadow(0px 3px 5px rgba(236, 72, 153, 0.3))' }}
  >
    <defs>
      <linearGradient id="ribbonGradient" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ec4899" /> {/* Pink-500 */}
        <stop offset="100%" stopColor="#be185d" /> {/* Pink-700 */}
      </linearGradient>
      <linearGradient id="ribbonShadow" x1="50" y1="50" x2="50" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#9d174d" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#9d174d" stopOpacity="0" />
      </linearGradient>
    </defs>
    
    <path 
      d="M68 88L55 65C55 65 75 45 65 25C58 10 42 10 35 25C28 40 45 60 45 60L32 88" 
      stroke="url(#ribbonGradient)" 
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      opacity="0.9"
    />
    
    <path 
      d="M32 88L46.5 58" 
      stroke="url(#ribbonGradient)" 
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />

    <path 
      d="M45 60L50 50"
      stroke="url(#ribbonShadow)"
      strokeWidth="14"
      strokeLinecap="round"
    />
  </svg>
);

interface ReminderItem {
  id: number;
  name: string;
  dose: string;
  time: string;
  type: 'pill' | 'event';
  notify: boolean;
}

// Helper to get formatted date
const getCurrentDate = () => new Date().toISOString().split('T')[0];
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

const App: React.FC = () => {
  // --- STATE ---
  const [view, setView] = useState<ViewState>('splash');
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '', email: '', password: '', 
    age: '', weight: '', height: '', 
    stage: 'Stage I', diagnosisDate: getCurrentDate()
  });
  
  // Feature Specific State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Lab Analysis State
  const [labAnalysisResult, setLabAnalysisResult] = useState<string>('');
  const [manualLabValues, setManualLabValues] = useState<Record<string, string>>({});
  
  // Nutrition State
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [nutritionPlan, setNutritionPlan] = useState<string>('');
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [tempStats, setTempStats] = useState({ weight: 0, height: 0 });

  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ name: '', dose: '', time: '' });

  // Translations Helper
  const t = (key: string) => TRANSLATIONS[lang][key] || key;

  // --- PERSISTENCE & INIT ---

  // Persistence: Save active view to localStorage on change
  useEffect(() => {
    if (view !== 'splash') {
      localStorage.setItem('cancerCare_activeView', view);
    }
  }, [view]);
  
  // Check Firebase Auth State
  useEffect(() => {
    // @ts-ignore
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      if (currentUser) {
        // User is signed in, fetch extra data from Firestore
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(userData);
            
            // Check data expiry logic (7 days)
            const now = Date.now();
            const lastUpdate = userData.lastUpdated || 0;
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            
            if (now - lastUpdate > oneWeek) {
               // Logic to prompt update could go here
            }
          } else {
            // Fallback if auth exists but firestore doc missing (rare)
             setUser({
               name: currentUser.displayName || "User",
               email: currentUser.email || "",
               lastUpdated: Date.now()
             });
          }
          
          // --- VIEW RESTORATION LOGIC ---
          // If the app is loading (splash), try to restore the last view
          if (view === 'splash') {
            const lastView = localStorage.getItem('cancerCare_activeView') as ViewState;
            // List of views that are protected/internal
            const protectedViews = ['home', 'nutrition', 'blood-analysis', 'kidney-analysis', 'liver-analysis', 'diabetes', 'reminders', 'chat', 'profile', 'history', 'settings'];
            
            if (lastView && protectedViews.includes(lastView)) {
              setView(lastView);
            } else {
              setView('home');
            }
          } else if (view === 'login' || view === 'register') {
            // If user just logged in manually, go to home
            setView('home');
          }

        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []); // Run once on mount

  // Clear auth errors when switching views
  useEffect(() => {
    setAuthError(null);
  }, [view]);

  // Load local settings
  useEffect(() => {
    const savedHistory = localStorage.getItem('cancerCare_history');
    const savedReminders = localStorage.getItem('cancerCare_reminders');
    const savedChat = localStorage.getItem('cancerCare_chat');

    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    if (savedChat) setChatHistory(JSON.parse(savedChat));
  }, []);

  // Reset manual values when switching views
  useEffect(() => {
    setManualLabValues({});
    setLabAnalysisResult('');
  }, [view]);

  // Save local data on changes
  useEffect(() => {
    localStorage.setItem('cancerCare_history', JSON.stringify(history));
    localStorage.setItem('cancerCare_reminders', JSON.stringify(reminders));
    localStorage.setItem('cancerCare_chat', JSON.stringify(chatHistory));
  }, [history, reminders, chatHistory]);

  // Splash Screen Timer
  useEffect(() => {
    if (view === 'splash') {
      // Reduced splash timer to 1500ms for faster load feel
      const timer = setTimeout(() => {
        if (!authLoading) {
           if (user) {
             // Handled by auth listener mainly, this is a fallback
             const lastView = localStorage.getItem('cancerCare_activeView') as ViewState;
             setView((lastView && lastView !== 'splash') ? lastView : 'home');
           } else {
             // Not logged in: check if they were on login/register before refresh
             const lastView = localStorage.getItem('cancerCare_activeView') as ViewState;
             if (lastView === 'register') setView('register');
             else if (lastView === 'login') setView('login');
             else setView('welcome');
           }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [view, user, authLoading]);

  // Theme Handling
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Font Handling based on Lang
  useEffect(() => {
    document.body.style.fontFamily = lang === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif';
    document.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // --- HELPERS ---

  const addToHistory = (title: string, description: string, type: HistoryItem['type']) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: getCurrentDate(),
      title,
      description,
      type
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const mapAuthErrorCode = (code: string) => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return lang === 'ar' ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'Email is already in use.';
      case 'auth/weak-password':
        return lang === 'ar' ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak.';
      case 'auth/invalid-email':
        return lang === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format.';
      default:
        return lang === 'ar' ? 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً' : 'An unexpected error occurred.';
    }
  };

  // --- HANDLERS ---

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAiLoading(true);
    try {
      // 1. Create Authentication User
      const userCredential = await createUserWithEmailAndPassword(auth, regForm.email, regForm.password);
      const firebaseUser = userCredential.user;

      // 2. Prepare User Data object
      const newUser: User = {
        name: regForm.name,
        email: regForm.email,
        age: parseInt(regForm.age) || 0,
        weight: parseInt(regForm.weight) || 0,
        height: parseInt(regForm.height) || 0,
        cancerStage: regForm.stage,
        diagnosisDate: regForm.diagnosisDate,
        lastUpdated: Date.now()
      };

      // 3. Save to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
      
      setUser(newUser);
      setView('home');
      addToHistory('Account Created', 'Initial profile setup completed', 'update');
    } catch (error: any) {
      console.error("Registration Error:", error);
      setAuthError(mapAuthErrorCode(error.code));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAiLoading(true);
    try {
      await signInWithEmailAndPassword(auth, regForm.email, regForm.password);
      // onAuthStateChanged will handle the redirection and data fetching
    } catch (error: any) {
      console.error("Login Error:", error);
      setAuthError(mapAuthErrorCode(error.code));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsAiLoading(true);
      const reader = new FileReader();
      // Fix: Use a standard function or ensure async is handled correctly inside
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await analyzeLabImage(base64, type, lang);
          setLabAnalysisResult(result);
          addToHistory('Lab Analysis', `Analyzed ${type} report`, 'lab');
        } catch (error) {
          console.error("Analysis failed", error);
        } finally {
          setIsAiLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeManualValues = async (type: string) => {
    const values = manualLabValues;
    if (Object.keys(values).length === 0) return;
    
    // Type guard to ensure view is a valid key for LAB_INPUTS
    if (view in LAB_INPUTS) {
        setIsAiLoading(true);
        try {
          const result = await analyzeMedicalValues(type, values, lang);
          setLabAnalysisResult(result);
          addToHistory('Lab Analysis', `Manual analysis for ${type}`, 'lab');
        } catch (error) {
           console.error(error);
        } finally {
           setIsAiLoading(false);
        }
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, newMessage]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const historyText = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
      const responseText = await generateChatResponse(newMessage.text, historyText, lang);

      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      }]);
    } catch (error) {
       console.error(error);
    } finally {
       setIsAiLoading(false);
    }
  };

  const handleGenerateDiet = async () => {
    if (!user) return;
    setIsAiLoading(true);
    try {
      const plan = await generateNutritionPlan(
        { age: user.age, weight: user.weight, height: user.height, activity: 'Moderate' },
        selectedFoods,
        selectedConditions,
        lang
      );
      setNutritionPlan(plan);
      addToHistory('Nutrition Plan', 'Generated new AI nutrition plan', 'nutrition');
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateProfilePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user && auth.currentUser) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newAvatar = reader.result as string;
        // Update Local State
        const updatedUser = { ...user, avatar: newAvatar };
        setUser(updatedUser);
        
        // Update Firestore
        try {
           await setDoc(doc(db, "users", auth.currentUser!.uid), { avatar: newAvatar }, { merge: true });
        } catch (err) {
           console.error("Failed to sync avatar to cloud", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddReminder = () => {
    if (newReminder.name && newReminder.time) {
      const item: ReminderItem = {
        id: Date.now(),
        name: newReminder.name,
        dose: newReminder.dose || '1 dose',
        time: newReminder.time,
        type: 'pill',
        notify: true
      };
      setReminders([...reminders, item]);
      addToHistory('Reminder Set', `Added reminder for ${item.name}`, 'reminder');
      setNewReminder({ name: '', dose: '', time: '' });
      setIsAddingReminder(false);
    }
  };

  const toggleReminderNotify = (id: number) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, notify: !r.notify } : r));
  };

  const deleteReminder = (id: number) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const toggleFood = (food: string) => {
    setSelectedFoods(prev => prev.includes(food) ? prev.filter(f => f !== food) : [...prev, food]);
  }

  const toggleCondition = (condition: string) => {
     setSelectedConditions(prev => prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]);
  }

  const handleSaveStats = async () => {
      if (user && auth.currentUser) {
          const updatedUser = { ...user, weight: tempStats.weight || 0, height: tempStats.height || 0 };
          setUser(updatedUser);
          addToHistory('Stats Update', `Updated weight to ${tempStats.weight}kg`, 'update');
          setIsEditingStats(false);
          
          try {
             await setDoc(doc(db, "users", auth.currentUser.uid), { weight: tempStats.weight, height: tempStats.height }, { merge: true });
          } catch(e) {
             console.error("Sync error", e);
          }
      }
  };

  const clearHistory = () => {
      setHistory([]);
      localStorage.setItem('cancerCare_history', JSON.stringify([]));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('welcome');
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  // --- VIEWS ---

  if (view === 'splash') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-pink-600 to-rose-700 flex flex-col items-center justify-center z-50">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse-slow scale-150"></div>
          <RibbonIcon size={140} className="relative z-10 animate-fade-in drop-shadow-2xl" />
        </div>
        <h1 className="text-4xl font-bold text-white font-sans tracking-wide animate-fade-in mt-4">{t('app_name')}</h1>
        <p className="text-pink-100 mt-3 text-base font-light tracking-widest uppercase animate-fade-in delay-100">Breast Cancer Care</p>
      </div>
    );
  }

  if (view === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-900 dark:to-slate-800 p-8 text-center">
        <div className="mb-10 animate-slide-up">
           <RibbonIcon size={120} className="mx-auto" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3 animate-slide-up tracking-tight">{t('welcome_title')}</h1>
        <p className="text-base text-slate-600 dark:text-slate-300 mb-10 max-w-md mx-auto animate-slide-up delay-100 leading-relaxed font-light">{t('welcome_subtitle')}</p>
        <div className="flex flex-col gap-4 w-full max-w-sm animate-slide-up delay-200">
          <Button onClick={() => setView('login')} className="py-4 text-base">{t('signin')}</Button>
          <Button variant="secondary" onClick={() => setView('register')} className="py-4 text-base">{t('signup')}</Button>
        </div>
        
        <div className="absolute top-8 right-8 flex gap-3">
             <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="p-3 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-700 transition backdrop-blur-sm">
               <Globe size={24} className="text-slate-700 dark:text-white" />
             </button>
             <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-700 transition backdrop-blur-sm">
               {theme === 'light' ? <Moon size={24} className="text-slate-700" /> : <Sun size={24} className="text-white" />}
             </button>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
        <Card className="w-full max-w-md animate-slide-up p-10 border-none shadow-2xl shadow-pink-100 dark:shadow-none">
          <div className="text-center mb-10">
            <RibbonIcon size={80} className="mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('signin')}</h2>
          </div>
          
          {authError && (
             <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
               <AlertTriangle className="text-red-500 shrink-0" size={20} />
               <p className="text-sm text-red-600 font-medium">{authError}</p>
             </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input label={t('email')} type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="name@example.com" />
            <Input label={t('password')} type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} placeholder="••••••••" />
            <Button type="submit" disabled={isAiLoading} className="w-full mt-4 py-4 text-sm">
                {isAiLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : t('signin')}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <button 
              onClick={() => setView('register')}
              className="text-pink-600 dark:text-pink-400 hover:underline text-sm font-medium"
            >
              {t('no_account')}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (view === 'register') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6 py-10">
          <Card className="w-full max-w-2xl animate-slide-up p-8 md:p-10 border-none shadow-2xl shadow-pink-100 dark:shadow-none">
            <div className="text-center mb-8">
              <RibbonIcon size={60} className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('signup')}</h2>
              <p className="text-slate-500 text-sm mt-2">Please provide your medical details for a personalized experience.</p>
            </div>

            {authError && (
             <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
               <AlertTriangle className="text-red-500 shrink-0" size={20} />
               <p className="text-sm text-red-600 font-medium">{authError}</p>
             </div>
            )}

            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label={t('name')} value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} placeholder="Full Name" />
              <Input label={t('email')} type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="email@example.com" />
              
              <Input label={t('password')} type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} placeholder="••••••••" />
              <Input label={t('age')} type="number" value={regForm.age} onChange={e => setRegForm({...regForm, age: e.target.value})} placeholder="Ex: 45" />
              
              <Input label={t('weight')} type="number" value={regForm.weight} onChange={e => setRegForm({...regForm, weight: e.target.value})} placeholder="kg" />
              <Input label={t('height')} type="number" value={regForm.height} onChange={e => setRegForm({...regForm, height: e.target.value})} placeholder="cm" />
              
              <Input label={t('stage')} value={regForm.stage} onChange={e => setRegForm({...regForm, stage: e.target.value})} placeholder="Stage I, II, III..." />
              <Input label={t('diagnosis_date')} type="date" value={regForm.diagnosisDate} onChange={e => setRegForm({...regForm, diagnosisDate: e.target.value})} />

              <div className="md:col-span-2 pt-4">
                 <Button type="submit" disabled={isAiLoading} className="w-full py-4 text-sm">
                    {isAiLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : t('signup')}
                 </Button>
              </div>
            </form>
            <div className="mt-6 text-center">
              <button 
                onClick={() => setView('login')}
                className="text-pink-600 dark:text-pink-400 hover:underline text-sm font-medium"
              >
                {t('have_account')}
              </button>
            </div>
          </Card>
        </div>
      );
  }

  // --- AUTHENTICATED LAYOUT ---

  const NavItem: React.FC<{ icon: any, label: string, viewName: ViewState }> = ({ icon: Icon, label, viewName }) => (
    <button
      onClick={() => { setView(viewName); setMobileMenuOpen(false); }}
      className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl transition-all text-sm font-medium ${
        view === viewName 
          ? 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 shadow-sm' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={22} className={view === viewName ? "text-pink-600 dark:text-pink-400" : "text-slate-400"} />
      <span>{label}</span>
      {view === viewName && <ChevronRight size={16} className={`ml-auto opacity-50 ${lang === 'ar' ? 'rotate-180' : ''}`} />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex transition-colors duration-300 font-sans">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col w-80 bg-white dark:bg-slate-800 border-r dark:border-slate-700 h-screen sticky top-0 overflow-y-auto z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
        <div className="p-8 flex items-center gap-4">
            <RibbonIcon size={48} />
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">{t('app_name')}</h1>
              <p className="text-[10px] text-pink-500 font-bold tracking-widest uppercase">Breast Cancer Care</p>
            </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 py-4">
          <NavItem icon={Activity} label={t('home')} viewName="home" />
          <div className="pt-8 pb-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('health_status')}</div>
          <NavItem icon={UserIcon} label={t('nutrition')} viewName="nutrition" />
          <NavItem icon={Droplets} label={t('blood')} viewName="blood-analysis" />
          <NavItem icon={FilterIcon} label={t('kidney')} viewName="kidney-analysis" />
          <NavItem icon={Activity} label={t('liver')} viewName="liver-analysis" />
          <NavItem icon={Thermometer} label={t('diabetes')} viewName="diabetes" />
          
          <div className="pt-8 pb-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Assistant</div>
          <NavItem icon={HistoryIcon} label={t('history')} viewName="history" />
          <NavItem icon={Pill} label={t('reminders')} viewName="reminders" />
          <NavItem icon={FileText} label={t('chat')} viewName="chat" />
        </nav>

        <div className="p-6 border-t dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
           <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-600" onClick={() => setView('profile')}>
              {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-md" />
              ) : (
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-slate-600 flex items-center justify-center text-pink-500 dark:text-white">
                      <UserIcon size={24} />
                  </div>
              )}
              <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{t('profile')}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative bg-gray-50/50 dark:bg-slate-900">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b dark:border-slate-700 px-6 py-4 flex items-center justify-between md:justify-end transition-all shadow-sm">
            <div className="flex items-center gap-3 md:hidden">
                {/* Increased size for mobile visibility */}
                <RibbonIcon size={42} />
                <span className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">{t('app_name')}</span>
            </div>
            <button className="md:hidden p-3 -mr-2 text-slate-600 dark:text-slate-300 rounded-xl active:bg-gray-100" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={28} />
            </button>
            
            <div className="hidden md:flex items-center gap-3">
                <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="px-5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                    <span className="font-bold text-xs text-slate-700 dark:text-white">{lang === 'en' ? 'AR' : 'EN'}</span>
                </button>
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300">
                    {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                </button>
                <button onClick={() => setView('settings')} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300">
                    <Settings size={22} />
                </button>
            </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
                <div className="absolute left-0 top-0 h-full w-80 bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-6 border-b dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <RibbonIcon size={40} />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('app_name')}</h2>
                        </div>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"><X className="text-slate-500" size={24} /></button>
                    </div>
                    <nav className="p-4 space-y-2">
                        <NavItem icon={Activity} label={t('home')} viewName="home" />
                        <NavItem icon={UserIcon} label={t('nutrition')} viewName="nutrition" />
                        <NavItem icon={Droplets} label={t('blood')} viewName="blood-analysis" />
                        <NavItem icon={FilterIcon} label={t('kidney')} viewName="kidney-analysis" />
                        <NavItem icon={Activity} label={t('liver')} viewName="liver-analysis" />
                        <NavItem icon={Thermometer} label={t('diabetes')} viewName="diabetes" />
                        <div className="my-4 border-t dark:border-slate-700"></div>
                        <NavItem icon={HistoryIcon} label={t('history')} viewName="history" />
                        <NavItem icon={Pill} label={t('reminders')} viewName="reminders" />
                        <NavItem icon={FileText} label={t('chat')} viewName="chat" />
                        <NavItem icon={UserIcon} label={t('profile')} viewName="profile" />
                        <NavItem icon={Settings} label={t('settings')} viewName="settings" />
                    </nav>
                </div>
            </div>
        )}

        {/* View Content Container */}
        <div className="p-5 md:p-10 max-w-6xl mx-auto w-full flex-1">
            {/* HOME VIEW */}
            {view === 'home' && (
                <div className="space-y-8">
                    <SectionHeader title={`${t('welcome_back')} ${user?.name?.split(' ')[0]}`} subtitle={t('latest_updates')} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-none shadow-xl shadow-pink-500/20">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-pink-100 mb-2 text-xs uppercase tracking-wider font-bold">{t('health_status')}</p>
                                    {/* Show status based on whether data exists */}
                                    <h3 className="text-3xl font-bold">{labAnalysisResult ? t('good') : t('pending')}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                  <Activity className="text-white" size={28} />
                                </div>
                            </div>
                            <div className="mt-10">
                                <p className="text-xs text-pink-100 opacity-90 font-medium mb-1">{t('stage')}</p>
                                <p className="font-semibold text-base bg-white/10 inline-block px-4 py-1.5 rounded-full">{user?.cancerStage}</p>
                            </div>
                        </Card>

                        <Card onClick={() => setView('reminders')} className="cursor-pointer group hover:border-pink-300 dark:hover:border-pink-800 transition-all hover:shadow-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 mb-2 text-xs uppercase tracking-wider font-bold">{t('medication_due')}</p>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-pink-600 transition">
                                        {reminders.length > 0 ? reminders[0].name : "No Reminders"}
                                    </h3>
                                </div>
                                <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-pink-600">
                                    <Pill size={28} />
                                </div>
                            </div>
                            <div className="mt-8 flex items-center gap-2">
                                {reminders.length > 0 ? (
                                    <>
                                        <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg font-bold">{reminders[0].dose}</span>
                                        <span className="text-sm text-slate-500 font-medium">At {reminders[0].time}</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-slate-400">Click to add medications</span>
                                )}
                            </div>
                        </Card>

                        <Card onClick={() => setView('nutrition')} className="cursor-pointer group hover:border-green-300 dark:hover:border-green-800 transition-all hover:shadow-lg">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 mb-2 text-xs uppercase tracking-wider font-bold">{t('nutrition')}</p>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-green-600 transition">
                                        {nutritionPlan ? "Plan Ready" : "Generate Plan"}
                                    </h3>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
                                    <UserIcon size={28} />
                                </div>
                            </div>
                            <div className="mt-8 w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full w-2/3 shadow-[0_0_15px_rgba(34,197,94,0.4)]"></div>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 font-bold text-right">Daily Goal</p>
                        </Card>
                    </div>

                    <div className="pt-6">
                        <SectionHeader title={t('chat')} icon={FileText} subtitle="Professional Medical AI Assistance" />
                        <Card className="flex flex-col h-[550px] border-none shadow-xl shadow-gray-100 dark:shadow-none bg-white dark:bg-slate-800">
                             <div className="flex-1 overflow-y-auto mb-5 space-y-5 pr-3 scrollbar-thin scrollbar-thumb-pink-200 dark:scrollbar-thumb-slate-700">
                                {chatHistory.length === 0 && (
                                    <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
                                        <div className="w-20 h-20 bg-pink-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-5">
                                            <RibbonIcon className="text-pink-400 opacity-90" size={50} />
                                        </div>
                                        <p className="text-base font-medium">{t('type_message')}</p>
                                    </div>
                                )}
                                {chatHistory.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-6 py-4 text-sm rounded-2xl leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                                ? 'bg-pink-600 text-white rounded-tr-sm shadow-pink-200 dark:shadow-none' 
                                                : 'bg-gray-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-tl-sm'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isAiLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex space-x-1.5 bg-gray-50 dark:bg-slate-800 px-5 py-4 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-slate-700">
                                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-700">
                                <Input 
                                    value={chatInput} 
                                    onChange={e => setChatInput(e.target.value)} 
                                    placeholder={t('type_message')}
                                    className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-sm"
                                />
                                <Button onClick={handleSendMessage} disabled={isAiLoading} className="rounded-xl w-14 h-14 p-0 flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-none bg-pink-600 text-white">
                                    <Send size={24} />
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* HISTORY VIEW */}
            {view === 'history' && (
                <div className="space-y-8">
                     <div className="flex justify-between items-center">
                        <SectionHeader title={t('history')} icon={HistoryIcon} />
                        <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={clearHistory}>{t('clear_history')}</Button>
                     </div>
                     <div className="space-y-4">
                        {history.length === 0 ? (
                            <Card className="text-center py-10 text-slate-400">
                                <HistoryIcon size={40} className="mx-auto mb-3 opacity-50" />
                                <p>{t('history_empty')}</p>
                            </Card>
                        ) : (
                            history.map(item => (
                                <Card key={item.id} className="flex gap-4 p-5 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                                    <div className={`p-3 rounded-full h-fit shrink-0 ${
                                        item.type === 'lab' ? 'bg-blue-100 text-blue-600' :
                                        item.type === 'nutrition' ? 'bg-green-100 text-green-600' :
                                        item.type === 'reminder' ? 'bg-purple-100 text-purple-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {item.type === 'lab' ? <Activity size={20} /> : 
                                         item.type === 'nutrition' ? <UserIcon size={20} /> :
                                         item.type === 'reminder' ? <Bell size={20} /> : <Edit2 size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">{item.title}</h4>
                                        <p className="text-sm text-slate-500">{item.description}</p>
                                        <p className="text-xs text-slate-400 mt-2">{formatDate(item.date)}</p>
                                    </div>
                                </Card>
                            ))
                        )}
                     </div>
                </div>
            )}

            {/* NUTRITION VIEW */}
            {view === 'nutrition' && (
                <div className="space-y-8">
                    <SectionHeader title={t('nutrition')} icon={UserIcon} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            
                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Body Stats</h3>
                                    {!isEditingStats && (
                                        <Button variant="ghost" onClick={() => { 
                                            setTempStats({ weight: user?.weight || 0, height: user?.height || 0}); 
                                            setIsEditingStats(true); 
                                        }} className="p-2 h-auto text-pink-500">
                                            <Edit2 size={16} />
                                        </Button>
                                    )}
                                </div>
                                {isEditingStats ? (
                                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <Input label={t('weight')} type="number" value={tempStats.weight} onChange={e => setTempStats({...tempStats, weight: parseInt(e.target.value) || 0})} />
                                        <Input label={t('height')} type="number" value={tempStats.height} onChange={e => setTempStats({...tempStats, height: parseInt(e.target.value) || 0})} />
                                        <div className="flex gap-2">
                                            <Button onClick={handleSaveStats} className="flex-1 py-2 text-xs">{t('update')}</Button>
                                            <Button variant="secondary" onClick={() => setIsEditingStats(false)} className="flex-1 py-2 text-xs">{t('cancel')}</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1 font-bold">{t('weight')}</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{user?.weight} <span className="text-sm font-normal text-slate-400">kg</span></p>
                                        </div>
                                        <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1 font-bold">{t('height')}</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{user?.height} <span className="text-sm font-normal text-slate-400">cm</span></p>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Health Conditions Section */}
                            <Card>
                                <h3 className="text-base font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="w-2 h-5 bg-red-500 rounded-full"></span>
                                    {t('select_conditions')}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {HEALTH_CONDITIONS.map(condition => (
                                        <button
                                            key={condition}
                                            onClick={() => toggleCondition(condition)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                selectedConditions.includes(condition) 
                                                    ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            {selectedConditions.includes(condition) && <Check size={14} className="inline mr-1" />}
                                            {condition}
                                        </button>
                                    ))}
                                </div>
                            </Card>

                             {/* Foods Section */}
                            <Card>
                                <h3 className="text-base font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="w-2 h-5 bg-pink-500 rounded-full"></span>
                                    {t('select_foods')}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-6 max-h-60 overflow-y-auto pr-1">
                                    {FOOD_ITEMS.map(food => (
                                        <button
                                            key={food}
                                            onClick={() => toggleFood(food)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                selectedFoods.includes(food) 
                                                    ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20 transform scale-105' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            {food}
                                        </button>
                                    ))}
                                </div>
                                <Button onClick={handleGenerateDiet} disabled={isAiLoading || selectedFoods.length === 0} className="w-full py-4 text-sm shadow-lg shadow-pink-200 dark:shadow-none">
                                    {isAiLoading ? t('loading') : t('generate_plan')}
                                </Button>
                            </Card>
                        </div>
                        
                        <Card className="flex flex-col min-h-[500px]">
                            <h3 className="text-base font-bold mb-5 text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-5 bg-green-500 rounded-full"></span>
                                Personalized Clinical Nutrition Plan
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
                                {nutritionPlan ? (
                                    <div className="prose dark:prose-invert prose-sm max-w-none">
                                        <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{nutritionPlan}</div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                                        <FileText size={50} className="stroke-1" />
                                        <p className="text-sm text-center max-w-[240px]">Select health conditions and preferred foods to generate a professional plan.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* LAB ANALYSIS VIEWS - UPDATED FOR SPECIFIC INPUTS */}
            {['blood-analysis', 'kidney-analysis', 'liver-analysis', 'diabetes'].includes(view) && (
                <div className="space-y-8">
                    <SectionHeader 
                        title={view === 'blood-analysis' ? t('blood') : view === 'kidney-analysis' ? t('kidney') : view === 'liver-analysis' ? t('liver') : t('diabetes')} 
                        icon={Activity} 
                    />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <h3 className="text-base font-bold mb-5 text-slate-800 dark:text-white">{t('enter_values')}</h3>
                            
                            <div className="space-y-5 mb-8">
                                {/* DYNAMIC INPUTS BASED ON VIEW TYPE - Type Safety Fix */}
                                {((view in LAB_INPUTS) ? LAB_INPUTS[view as keyof typeof LAB_INPUTS] : []).map((field: any) => (
                                    <Input 
                                        key={field.key}
                                        label={field.label} 
                                        type="number"
                                        placeholder={`Normal Range: ${field.placeholder} ${field.unit}`}
                                        value={manualLabValues[field.key] || ''}
                                        onChange={(e) => setManualLabValues({...manualLabValues, [field.key]: e.target.value})}
                                    />
                                ))}
                                
                                <Button 
                                    className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30" 
                                    onClick={() => handleAnalyzeManualValues(view)}
                                    disabled={isAiLoading || Object.keys(manualLabValues).length === 0}
                                >
                                    {isAiLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : t('analyze_btn')}
                                </Button>
                            </div>

                            <div className="pt-8 border-t dark:border-slate-700 text-center">
                                <p className="text-sm text-slate-500 mb-4 font-bold">OR</p>
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-pink-500 hover:bg-pink-50/10 transition-all relative group cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => handleFileUpload(e, view)} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex items-center justify-center gap-3">
                                        <Upload className="text-pink-500" size={24} />
                                        <p className="text-slate-700 dark:text-slate-300 text-sm font-bold">{t('upload_report')}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-slate-50/50 dark:bg-slate-800/30 border-pink-100 dark:border-slate-700 flex flex-col min-h-[500px]">
                            <h3 className="text-base font-bold mb-5 text-slate-800 dark:text-white flex items-center gap-2">
                                <Activity size={20} className="text-pink-500"/> {t('results')}
                            </h3>
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 overflow-y-auto">
                                {isAiLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-slate-500 text-sm font-bold">{t('loading')}</p>
                                    </div>
                                ) : labAnalysisResult ? (
                                    <div className="prose dark:prose-invert prose-sm max-w-none">
                                        <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{labAnalysisResult}</div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <FileText size={40} className="mb-4 stroke-1" />
                                        <p className="text-sm text-center px-6">Enter values manually or upload a report image to receive a formal AI medical interpretation.</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 text-xs rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span className="leading-relaxed font-medium">{t('ai_disclaimer')}</span>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

             {/* CHAT VIEW (Dedicated Page) */}
             {view === 'chat' && (
                <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] flex flex-col">
                    <SectionHeader title={t('chat')} icon={FileText} subtitle={t('ai_disclaimer')} />
                    <Card className="flex-1 flex flex-col min-h-0 border-none shadow-xl">
                         <div className="flex-1 overflow-y-auto mb-5 space-y-5 pr-3 custom-scrollbar p-3">
                             {chatHistory.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <div className="p-6 bg-pink-50 dark:bg-slate-700/50 rounded-full mb-5 animate-pulse-slow">
                                        <RibbonIcon className="text-pink-500" size={60} />
                                    </div>
                                    <p className="text-base font-medium">{t('type_message')}</p>
                                </div>
                             )}
                            {chatHistory.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] md:max-w-[70%] px-6 py-4 text-sm rounded-2xl shadow-sm leading-relaxed ${
                                        msg.role === 'user' 
                                            ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-tr-sm shadow-pink-200 dark:shadow-none' 
                                            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-600 rounded-tl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isAiLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-700 px-5 py-4 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-slate-600 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 pt-4 border-t dark:border-slate-700">
                            <Input 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder={t('type_message')}
                                className="flex-1 bg-gray-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700"
                            />
                            {/* Updated Send Button for better visibility */}
                            <Button onClick={handleSendMessage} disabled={isAiLoading} className="px-6 shadow-lg shadow-pink-200 dark:shadow-none bg-pink-600 text-white hover:bg-pink-700">
                                <Send size={20} className="text-white" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* PROFILE VIEW */}
            {view === 'profile' && (
                <div className="space-y-8">
                    <SectionHeader title={t('profile')} icon={UserIcon} />
                    <Card>
                        <div className="flex flex-col md:flex-row items-center gap-10 mb-10">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-pink-200 to-rose-300 shadow-lg flex items-center justify-center bg-white dark:bg-slate-800">
                                    {user?.avatar ? (
                                        <img 
                                            src={user.avatar} 
                                            alt="Profile" 
                                            className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-800" 
                                        />
                                    ) : (
                                        <UserIcon size={64} className="text-pink-300 dark:text-slate-600" />
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-300">
                                    <Upload className="text-white drop-shadow-md" size={32} />
                                    <input type="file" accept="image/*" onChange={updateProfilePic} className="hidden" />
                                </label>
                            </div>
                            <div className="text-center md:text-left space-y-3">
                                <h2 className="text-3xl font-bold text-slate-800 dark:text-white">{user?.name}</h2>
                                <p className="text-base text-slate-500 font-medium">{user?.email}</p>
                                <div className="flex gap-2 justify-center md:justify-start pt-1">
                                    <span className="px-5 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs rounded-full font-bold uppercase tracking-wider">{user?.cancerStage}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label={t('name')} value={user?.name || ''} onChange={e => setUser({...user!, name: e.target.value})} />
                            <Input label={t('diagnosis_date')} type="date" value={user?.diagnosisDate || ''} onChange={e => setUser({...user!, diagnosisDate: e.target.value})} />
                            <Input label={t('weight')} type="number" value={user?.weight || 0} onChange={e => setUser({...user!, weight: parseInt(e.target.value) || 0})} />
                            <Input label={t('height')} type="number" value={user?.height || 0} onChange={e => setUser({...user!, height: parseInt(e.target.value) || 0})} />
                            
                            {/* Added Phone Number Field with Heart */}
                            <div className="col-span-1 md:col-span-2">
                                <Input label={t('phone')} value={user?.phone || ''} onChange={e => setUser({...user!, phone: e.target.value})} placeholder="+20 1xxxxxxxxx" />
                                <p className="text-xs text-pink-500 mt-2 flex items-center gap-1 font-medium animate-pulse-slow">
                                    <Heart size={12} fill="currentColor" /> {t('phone_note')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-10 flex justify-end">
                             <Button onClick={() => addToHistory('Profile Updated', 'User details modified', 'update')} className="px-10 py-4">{t('save')}</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* REMINDERS VIEW */}
            {view === 'reminders' && (
                <div className="space-y-8">
                    <SectionHeader title={t('reminders')} icon={Pill} />
                    
                    {/* Add Reminder Form Toggle */}
                    {isAddingReminder ? (
                        <Card className="mb-8 bg-pink-50/50 dark:bg-slate-800 border-pink-100 dark:border-slate-700 animate-slide-up">
                            <h3 className="text-base font-bold mb-5 text-slate-800 dark:text-white">New Reminder</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                                <Input label="Medication Name" value={newReminder.name} onChange={e => setNewReminder({...newReminder, name: e.target.value})} placeholder="Ex: Tamoxifen" />
                                <Input label="Dose" value={newReminder.dose} onChange={e => setNewReminder({...newReminder, dose: e.target.value})} placeholder="Ex: 20mg" />
                                <Input label="Time" type="time" value={newReminder.time} onChange={e => setNewReminder({...newReminder, time: e.target.value})} />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button variant="ghost" onClick={() => setIsAddingReminder(false)} className="text-sm">Cancel</Button>
                                <Button onClick={handleAddReminder} className="px-8 text-sm">Save Reminder</Button>
                            </div>
                        </Card>
                    ) : (
                        <Button onClick={() => setIsAddingReminder(true)} className="w-full mb-6 border-dashed border-2 bg-transparent text-slate-500 border-slate-300 hover:bg-white hover:border-pink-400 hover:text-pink-500 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800 shadow-none py-4 text-sm">
                            <Plus size={20} /> Add New Reminder
                        </Button>
                    )}

                    <div className="grid grid-cols-1 gap-5">
                        {reminders.map((item) => (
                            <Card key={item.id} className="flex justify-between items-center p-6 hover:shadow-lg transition-all border border-transparent hover:border-pink-100 dark:hover:border-slate-600 group">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${item.type === 'event' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/20'}`}>
                                        {item.type === 'event' ? <Calendar size={26} /> : <Pill size={26} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base text-slate-800 dark:text-white">{item.name}</h4>
                                        <p className="text-sm text-slate-500 font-medium">{item.dose}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-8">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white bg-gray-50 dark:bg-slate-700 px-4 py-2 rounded-xl">{item.time}</p>
                                    
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => toggleReminderNotify(item.id)}
                                            className={`p-3 rounded-full transition-all ${
                                                item.notify 
                                                    ? 'bg-pink-500 text-white shadow-md shadow-pink-200 dark:shadow-none' 
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-500'
                                            }`}
                                            title="Toggle Notification"
                                        >
                                            <Bell size={20} fill={item.notify ? "currentColor" : "none"} />
                                        </button>
                                        <button 
                                            onClick={() => deleteReminder(item.id)}
                                            className="p-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {reminders.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <p className="text-sm">No reminders set. Click above to add one.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SETTINGS VIEW */}
            {view === 'settings' && (
                <div className="space-y-8">
                    <SectionHeader title={t('settings')} icon={Settings} />
                    <Card>
                        <div className="space-y-8">
                            <div className="flex items-center justify-between pb-6 border-b dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                        <Globe className="text-slate-600 dark:text-slate-300" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{t('language')}</h4>
                                        <p className="text-xs text-slate-500">English / العربية</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                                    className="px-5 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600"
                                >
                                    {lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                                </button>
                            </div>

                            <div className="flex items-center justify-between pb-6 border-b dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                        {theme === 'light' ? <Sun className="text-slate-600" size={24} /> : <Moon className="text-slate-300" size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{t('dark_mode')}</h4>
                                        <p className="text-xs text-slate-500">Adjust appearance</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                                    className={`w-14 h-8 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${theme === 'dark' ? 'bg-pink-500' : 'bg-slate-200'}`}
                                >
                                    <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="pt-2">
                                <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 justify-start h-14 px-6 text-sm" onClick={handleLogout}>
                                    <LogOut size={20} />
                                    {t('logout')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>

        {/* FOOTER */}
        <footer className="mt-auto py-10 text-center text-xs text-slate-400 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
            <p className="font-medium tracking-wide mb-3">{t('copyright')}</p>
            <a 
                href="https://wa.me/201020879511" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-50 dark:bg-green-900/10 rounded-full text-green-600 hover:text-green-700 font-bold transition-colors"
            >
                <Smartphone size={16} />
                {t('contact_dev')}
            </a>
        </footer>
      </main>
      
      {/* Hidden Icons Load */}
      <div className="hidden">
        <FilterIcon />
      </div>
    </div>
  );
};

// Simple Icon wrapper component needed because Lucide doesn't export 'Filter' by default sometimes or name conflict
const FilterIcon: React.FC<any> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    {...props}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export default App;