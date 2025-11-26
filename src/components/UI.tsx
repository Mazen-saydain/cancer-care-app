
import React from 'react';
import { LucideProps } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(236,72,153,0.08)] transition-all duration-300 p-6 border border-slate-100 dark:border-slate-700 ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'; 
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ children, onClick, variant = 'primary', className = "", disabled, type="button" }) => {
  const baseStyle = "px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transform tracking-wide relative overflow-hidden group";
  const variants = {
    primary: "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 hover:-translate-y-0.5 border border-transparent after:absolute after:inset-0 after:bg-white/10 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
    secondary: "bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm hover:shadow-md",
    outline: "border-2 border-pink-500 text-pink-500 hover:bg-pink-50 dark:hover:bg-slate-800",
    ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
  };

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Input: React.FC<{
  label?: string;
  type?: string;
  value?: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}> = ({ label, type = "text", value, onChange, placeholder, className = "" }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {label && <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-5 py-3.5 text-sm rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 font-medium shadow-sm"
    />
  </div>
);

export const SectionHeader: React.FC<{ title: string; subtitle?: string; icon?: React.FC<LucideProps> }> = ({ title, subtitle, icon: Icon }) => (
  <div className="mb-8 animate-slide-up">
    <div className="flex items-center gap-3 mb-2">
      {Icon && (
        <div className="p-2.5 bg-pink-50 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400 shadow-sm">
          <Icon size={24} />
        </div>
      )}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{title}</h2>
    </div>
    {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 ml-1 font-medium leading-relaxed">{subtitle}</p>}
  </div>
);
