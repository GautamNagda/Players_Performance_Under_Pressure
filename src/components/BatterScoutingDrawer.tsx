import React from 'react';
import { 
  X, 
  Flame, 
  ShieldAlert, 
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
import { BatterProfile } from '../types/analytics';

interface BatterScoutingDrawerProps {
  batter: BatterProfile | null;
  onClose: () => void;
}

export const BatterScoutingDrawer: React.FC<BatterScoutingDrawerProps> = ({
  batter,
  onClose,
}) => {
  if (!batter) return null;

  const radarData = [
    { subject: 'PCE (Clutch)', value: Math.max(20, Math.min(100, Math.round(50 + batter.z_pce * 16))), fullMark: 100 },
    { subject: 'PRR (Resilience)', value: Math.max(20, Math.min(100, Math.round(50 + batter.z_prr * 16))), fullMark: 100 },
    { subject: 'GIQ (Game IQ)', value: Math.max(20, Math.min(100, Math.round(50 + batter.z_giq * 16))), fullMark: 100 },
    { subject: 'Strike Rate', value: Math.max(20, Math.min(100, Math.round(batter.strike_rate / 2))), fullMark: 100 },
    { subject: 'Finish Rate', value: Math.max(20, Math.min(100, Math.round((batter.finish_rate || 0.3) * 100))), fullMark: 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#090F1E] border-l border-[#1E293B] h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[#1E293B] bg-gradient-to-r from-[#200A1A] via-[#150F22] to-[#090F1E] relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rr-pink/20 text-rr-pink border border-rr-pink/40">
              RANK #{batter.rank} • BATS-INTEL
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {batter.archetype}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {batter.player_name}
          </h2>

          <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 font-mono-stats text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">PGAI_100</span>
              <span className="text-xl font-bold text-rr-pink">{batter.pgai_100}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Runs (Balls)</span>
              <span className="text-white font-semibold">{batter.total_runs} ({batter.balls_faced}b)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Strike Rate</span>
              <span className="text-emerald-400 font-bold">{batter.strike_rate}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Pressure Balls</span>
              <span className="text-amber-400 font-bold">{batter.pressure_balls}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Radar Chart */}
          <div className="bg-[#0F172A] rounded-xl p-4 border border-[#1E293B]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-rr-pink" />
              <span>Batter Decision-Capability Radar</span>
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#1E293B" />
                  <PolarAngleAxis dataKey="subject" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" tick={false} />
                  <Radar name={batter.player_name} dataKey="value" stroke="#EA1A85" fill="#EA1A85" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Nemesis Log */}
          <div className="bg-[#0F172A] rounded-xl p-4 border border-[#1E293B]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Bowlers on Which {batter.player_name} Struggles</span>
            </h3>
            {batter.nemesis_log?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-stats">
                  <thead className="bg-[#0A1020] text-slate-500 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-2.5">Bowler</th>
                      <th className="py-2 px-2.5 text-center">Balls</th>
                      <th className="py-2 px-2.5 text-center">Runs</th>
                      <th className="py-2 px-2.5 text-center text-rose-400">Dismissals</th>
                      <th className="py-2 px-2.5 text-right">SR</th>
                      <th className="py-2 px-2.5 text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {batter.nemesis_log.map((n, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="py-2 px-2.5 font-semibold text-white">{n.bowler_name}</td>
                        <td className="py-2 px-2.5 text-center text-slate-400">{n.balls}</td>
                        <td className="py-2 px-2.5 text-center">{n.runs}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-rose-400">{n.dismissals}</td>
                        <td className="py-2 px-2.5 text-right">{n.sr}</td>
                        <td className="py-2 px-2.5 text-right font-semibold text-slate-200">{n.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono py-2">No repeat dismissals recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
