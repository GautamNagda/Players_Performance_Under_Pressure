import React from 'react';
import { 
  Database, 
  Flame, 
  ShieldCheck, 
  SlidersHorizontal, 
  Activity, 
  CheckCircle2,
  Cpu,
  Search,
  BookOpen
} from 'lucide-react';

export type NavTab = 'batters' | 'bowlers' | 'search' | 'methodology' | 'dataset' | 'sandbox';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  totalDeliveries: number;
  totalMatches: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  totalDeliveries,
  totalMatches,
}) => {
  const navItems = [
    {
      id: 'batters' as NavTab,
      label: 'Top 10 Batsmen (PGAI)',
      sublabel: '≥ 300 Balls • Main Focus',
      icon: Flame,
      badge: 'TOP 10',
      activeColor: 'bg-gradient-to-r from-rr-pink/20 to-transparent text-white border-l-4 border-l-rr-pink glow-pink',
    },
    {
      id: 'bowlers' as NavTab,
      label: 'Top 10 Bowlers (B-PGAI)',
      sublabel: '≥ 240 Legal Balls • Main Focus',
      icon: ShieldCheck,
      badge: 'TOP 10',
      activeColor: 'bg-gradient-to-r from-blue-600/20 to-transparent text-white border-l-4 border-l-blue-500 glow-blue',
    },
    {
      id: 'search' as NavTab,
      label: 'Player Pressure Search',
      sublabel: 'Matches & Nemesis Scout',
      icon: Search,
      badge: 'DEEP SCOUT',
      activeColor: 'bg-gradient-to-r from-purple-600/20 to-transparent text-white border-l-4 border-l-purple-500',
    },
    {
      id: 'methodology' as NavTab,
      label: 'How the Code & Model Work',
      sublabel: '8 Pillars & Math Explainer',
      icon: BookOpen,
      badge: 'SPEC GUIDE',
      activeColor: 'bg-gradient-to-r from-amber-500/20 to-transparent text-white border-l-4 border-l-amber-500 glow-gold',
    },
    {
      id: 'dataset' as NavTab,
      label: 'Dataset & Domain Audit',
      sublabel: './data pack Showcase',
      icon: Database,
      badge: '6 CSVS',
      activeColor: 'bg-slate-800/80 text-white border-l-4 border-l-slate-400',
    },
    {
      id: 'sandbox' as NavTab,
      label: 'RR Selection Sandbox',
      sublabel: 'Weights & Multiplier Sim',
      icon: SlidersHorizontal,
      badge: 'SIMULATOR',
      activeColor: 'bg-gradient-to-r from-emerald-600/20 to-transparent text-white border-l-4 border-l-emerald-500',
    },
  ];

  return (
    <aside className="w-72 bg-[#0A1020] border-r border-[#1E293B] flex flex-col h-screen select-none shrink-0 sticky top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1E293B] bg-gradient-to-b from-[#111A33] to-[#0A1020]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rr-pink to-rr-blue flex items-center justify-center shadow-lg shadow-rr-pink/20 ring-1 ring-white/20">
            <span className="text-white font-black text-xl tracking-tighter">RR</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold tracking-widest text-rr-pink uppercase">Rajasthan Royals</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h1 className="text-sm font-extrabold text-white tracking-tight">PLAYERS UNDER PRESSURE</h1>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span className="flex items-center space-x-1 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-rr-pink" />
            <span>Spec-Aligned PGAI v3.0</span>
          </span>
          <span className="font-mono text-emerald-400 font-semibold">T20 / IPL</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Decision Intelligence Views
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                isActive
                  ? item.activeColor
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-900/80 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{item.sublabel}</div>
                </div>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  isActive
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {item.badge}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Pipeline Status Card in Footer */}
      <div className="p-4 border-t border-[#1E293B] bg-[#070B16]">
        <div className="rounded-xl bg-[#0F172A] p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pipeline Status</span>
            </span>
            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              <span>Spec Active</span>
            </span>
          </div>

          <div className="space-y-1 font-mono-stats text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-500">Indexed Balls:</span>
              <span className="text-slate-200 font-semibold">{totalDeliveries ? totalDeliveries.toLocaleString() : '200,999'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Matches:</span>
              <span className="text-slate-200 font-semibold">{totalMatches ? totalMatches.toLocaleString() : '883'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model Engine:</span>
              <span className="text-slate-200 font-semibold">OOF LightGBM + XGB</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
