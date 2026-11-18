import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Calendar,
  Zap,
  Target
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { BowlerProfile } from '../types/analytics';

interface BowlerScoutingDrawerProps {
  bowler: BowlerProfile | null;
  onClose: () => void;
}

export const BowlerScoutingDrawer: React.FC<BowlerScoutingDrawerProps> = ({
  bowler,
  onClose,
}) => {
  if (!bowler) return null;

  const radarData = [
    { subject: 'BCE (Execution)', value: Math.max(20, Math.min(100, Math.round(50 + bowler.z_bce * 16))), fullMark: 100 },
    { subject: 'BCR (Composure)', value: Math.max(20, Math.min(100, Math.round(50 + bowler.z_bcr * 16))), fullMark: 100 },
    { subject: 'BGI (Game IQ)', value: Math.max(20, Math.min(100, Math.round(50 + bowler.z_bgi * 16))), fullMark: 100 },
    { subject: 'Economy Index', value: Math.max(20, Math.min(100, Math.round(Math.max(0, (12 - bowler.economy) * 12)))), fullMark: 100 },
    { subject: 'Wicket Strike', value: Math.max(20, Math.min(100, Math.round(Math.min(100, bowler.wickets * 1.2)))), fullMark: 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#090F1E] border-l border-[#1E293B] h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[#1E293B] bg-gradient-to-r from-[#0E1D3E] via-[#0D152A] to-[#090F1E] relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
              RANK #{bowler.rank} • BOWL-INTEL
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {bowler.archetype}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {bowler.player_name}
          </h2>

          <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 font-mono-stats text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">B-PGAI_100</span>
              <span className="text-xl font-bold text-blue-400">{bowler.b_pgai_100}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Balls / Wkts</span>
              <span className="text-white font-semibold">{bowler.legal_balls}b • <span className="text-emerald-400 font-bold">{bowler.wickets}w</span></span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Economy</span>
              <span className="text-emerald-400 font-bold">{bowler.economy}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Pressure Balls</span>
              <span className="text-amber-400 font-bold">{bowler.pressure_balls}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Radar Chart */}
          <div className="bg-[#0F172A] rounded-xl p-4 border border-[#1E293B]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Bowler Decision-Control Radar</span>
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#1E293B" />
                  <PolarAngleAxis dataKey="subject" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" tick={false} />
                  <Radar name={bowler.player_name} dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bunnies Log */}
          <div className="bg-[#0F172A] rounded-xl p-4 border border-[#1E293B]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Batsmen Dominated by {bowler.player_name}</span>
            </h3>
            {bowler.bunnies_log?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-stats">
                  <thead className="bg-[#0A1020] text-slate-500 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-2.5">Batsman</th>
                      <th className="py-2 px-2.5 text-center">Balls</th>
                      <th className="py-2 px-2.5 text-center">Runs</th>
                      <th className="py-2 px-2.5 text-center text-emerald-400">Dismissals</th>
                      <th className="py-2 px-2.5 text-right">SR</th>
                      <th className="py-2 px-2.5 text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {bowler.bunnies_log.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="py-2 px-2.5 font-semibold text-white">{b.batter_name}</td>
                        <td className="py-2 px-2.5 text-center text-slate-400">{b.balls}</td>
                        <td className="py-2 px-2.5 text-center">{b.runs}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-emerald-400">{b.dismissals}</td>
                        <td className="py-2 px-2.5 text-right">{b.sr}</td>
                        <td className="py-2 px-2.5 text-right font-semibold text-slate-200">{b.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono py-2">No repeat bunnies recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
