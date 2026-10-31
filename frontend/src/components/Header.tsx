import React from 'react';
import { Sparkles, Zap, Settings, Plus, LayoutGrid, MessageSquareCode } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'studio';
  setCurrentView: (v: 'home' | 'studio') => void;
  credits: number;
  onOpenCredits: () => void;
  onOpenSettings: () => void;
  onOpenCreate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  credits,
  onOpenCredits,
  onOpenSettings,
  onOpenCreate
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0d14]/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#a82bf0] via-[#ec268f] to-indigo-500 p-0.5 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0e1018] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#ec268f] fill-[#ec268f]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tracking-tight font-display text-white group-hover:text-pink-300 transition-colors">
                AURA
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                AI Ads Director
              </span>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <nav className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                currentView === 'home'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setCurrentView('studio')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                currentView === 'studio'
                  ? 'bg-gradient-to-r from-[#ec268f]/20 to-purple-500/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-[#ec268f]" />
              <span>Agent Studio</span>
            </button>
          </nav>
        </div>

        {/* Right Action Zone */}
        <div className="flex items-center gap-3">
          {/* Credits Pill / Paid Option */}
          <button
            onClick={onOpenCredits}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-pink-500/10 transition-all text-xs"
            title="Click to view plans or top up credits"
          >
            <Zap className="w-3.5 h-3.5 text-[#ec268f] fill-current group-hover:scale-110 transition-transform" />
            <span className="font-bold text-white tabular-nums">{credits}</span>
            <span className="text-slate-400 text-[11px] hidden md:inline">Credits</span>
            <span className="text-[10px] font-semibold text-[#ec268f] bg-pink-500/20 px-1.5 py-0.5 rounded ml-0.5">
              + Top Up
            </span>
          </button>

          {/* Create Button with competitor signature color */}
          <button
            onClick={onOpenCreate}
            className="btn-competitor-gradient px-4 py-2 rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="whitespace-nowrap">Create Campaign</span>
          </button>

          {/* Settings icon */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            title="Agent Autonomy & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden cursor-pointer hover:border-pink-500 transition-colors shrink-0">
            <img
              src="/assets/images/aura_avatar_square_1792474096942.jpg"
              alt="User profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
