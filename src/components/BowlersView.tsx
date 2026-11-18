import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  Target, 
  Award, 
  Calendar,
  Sparkles,
  Zap,
  Flame,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ScatterChart, 
  Scatter, 
  ZAxis, 
  CartesianGrid,
  Cell,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis
} from 'recharts';
import { BowlersPGAIData, BowlerProfile } from '../types/analytics';

interface BowlersViewProps {
  data: BowlersPGAIData;
}

export const BowlersView: React.FC<BowlersViewProps> = ({ data }) => {
  const top10 = data.top_10 || [];
  const [selectedBowler, setSelectedBowler] = useState<BowlerProfile | null>(top10[0] || null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTop10 = top10.filter((b) =>
    b.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBowler = (bowler: BowlerProfile) => {
    setSelectedBowler(bowler);
    // Smooth scroll down to deep dive profile section
    setTimeout(() => {
      const el = document.getElementById('bowler-deep-dive');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Stacked Bar: BCE (40%), BCR (30%), BGI (30%)
  const pillarData = top10.map((b) => ({
    name: b.player_name.split(' ').slice(-1)[0],
    fullName: b.player_name,
    BCE: Number((Math.max(0, b.z_bce + 3) * 0.40).toFixed(2)),
    BCR: Number((Math.max(0, b.z_bcr + 3) * 0.30).toFixed(2)),
    BGI: Number((Math.max(0, b.z_bgi + 3) * 0.30).toFixed(2)),
    bpga: b.b_pgai_100,
  }));

  // Scatter: Economy vs Wickets
  const scatterData = top10.map((b) => ({
    name: b.player_name,
    economy: b.economy,
    wickets: b.wickets,
    balls: b.legal_balls,
    b_pgai: b.b_pgai_100,
    archetype: b.archetype,
  }));

  // Radar Data for currently selected bowler
  const radarData = selectedBowler ? [
    { subject: 'BCE (Execution)', value: Math.max(20, Math.min(100, Math.round(50 + selectedBowler.z_bce * 16))), fullMark: 100 },
    { subject: 'BCR (Composure)', value: Math.max(20, Math.min(100, Math.round(50 + selectedBowler.z_bcr * 16))), fullMark: 100 },
    { subject: 'BGI (Game IQ)', value: Math.max(20, Math.min(100, Math.round(50 + selectedBowler.z_bgi * 16))), fullMark: 100 },
    { subject: 'Economy Index', value: Math.max(20, Math.min(100, Math.round(Math.max(0, (12 - selectedBowler.economy) * 12)))), fullMark: 100 },
    { subject: 'Wicket Strike', value: Math.max(20, Math.min(100, Math.round(Math.min(100, selectedBowler.wickets * 1.2)))), fullMark: 100 },
  ] : [];

  const podiumColors = [
    { border: 'border-blue-400', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40', text: 'text-blue-400', medal: '🥇 RANK 1' },
    { border: 'border-slate-300', badge: 'bg-slate-300/20 text-slate-200 border-slate-300/40', text: 'text-slate-300', medal: '🥈 RANK 2' },
    { border: 'border-amber-700', badge: 'bg-amber-700/20 text-amber-500 border-amber-700/40', text: 'text-amber-500', medal: '🥉 RANK 3' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
              MAIN DECISION LEADERBOARD
            </span>
            <span className="text-xs font-mono text-slate-400">Hard Cutoff: ≥ 240 Legal Balls (40 Overs)</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
            <span>Top 10 Pressure & Game-Smart Bowlers</span>
            <span className="text-sm font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
              B-PGAI_100
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
            {data.formula}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search top 10..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#091122] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono w-44"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top10.slice(0, 3).map((bowler, idx) => {
          const style = podiumColors[idx];
          const isSelected = selectedBowler?.player_id === bowler.player_id;
          return (
            <div
              key={bowler.player_id}
              onClick={() => handleSelectBowler(bowler)}
              className={`cursor-pointer rounded-2xl p-5 relative overflow-hidden transition-all duration-200 border ${
                isSelected ? 'ring-2 ring-blue-500 border-blue-400' : style.border
              } bg-gradient-to-b from-[#0F1E3D] to-[#0A1020] hover:scale-[1.01] shadow-xl group`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                    {style.medal}
                  </span>
                  <h3 className="text-lg font-black text-white mt-2 group-hover:text-blue-400 transition-colors">
                    {bowler.player_name}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    {bowler.archetype}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black font-mono-stats text-blue-400">
                    {bowler.b_pgai_100}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">B-PGAI_100</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 font-mono-stats text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Wickets (Balls)</span>
                  <span className="font-bold text-white">{bowler.wickets}w ({bowler.legal_balls}b)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Economy</span>
                  <span className="font-bold text-emerald-400">{bowler.economy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Pressure Balls</span>
                  <span className="font-bold text-amber-400">{bowler.pressure_balls}</span>
                </div>
              </div>

              {/* Functional Select to Inspect Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBowler(bowler);
                }}
                className="w-full mt-3 flex items-center justify-between text-[11px] font-mono text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-all group-hover:border-blue-500/60"
              >
                <span className="font-semibold">Select to inspect pressure profile below</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Top 10 Ranked Table */}
      <div className="bg-[#0F172A] rounded-2xl p-5 border border-[#1E293B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Top 10 Bowlers Leaderboard (Formula-Calibrated Containment & Clutch Rankings)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Click any row to display stats, radar graph & dominated bunnies below
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0A1020]">
          <table className="w-full text-left text-xs font-mono-stats">
            <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-3.5 text-center w-14">Rank</th>
                <th className="py-3 px-3.5">Bowler Name</th>
                <th className="py-3 px-3.5 text-center">Legal Balls</th>
                <th className="py-3 px-3.5 text-center">Wickets</th>
                <th className="py-3 px-3.5 text-center">Runs Conc.</th>
                <th className="py-3 px-3.5 text-center">Economy</th>
                <th className="py-3 px-3.5 text-center">Pressure Balls</th>
                <th className="py-3 px-3.5 text-center text-blue-400">Z_BCE</th>
                <th className="py-3 px-3.5 text-center text-emerald-400">Z_BCR</th>
                <th className="py-3 px-3.5 text-center text-amber-400">Z_BGI</th>
                <th className="py-3 px-4 w-40 text-center">B-PGAI_100 Score</th>
                <th className="py-3 px-3.5">Archetype Tag</th>
                <th className="py-3 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTop10.map((b) => {
                const isSelected = selectedBowler?.player_id === b.player_id;
                return (
                  <tr
                    key={b.player_id}
                    onClick={() => handleSelectBowler(b)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#132247] text-white font-semibold' : 'hover:bg-[#131F37]'
                    }`}
                  >
                    <td className="py-3 px-3.5 text-center font-bold">
                      <span
                        className={`inline-block w-6 h-6 rounded-full leading-6 text-[11px] ${
                          b.rank === 1
                            ? 'bg-blue-500 text-white font-black'
                            : b.rank === 2
                            ? 'bg-slate-300 text-slate-950 font-black'
                            : b.rank === 3
                            ? 'bg-amber-700 text-white font-black'
                            : 'text-slate-400'
                        }`}
                      >
                        {b.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-white group-hover:text-blue-400 transition-colors">
                      {b.player_name}
                    </td>
                    <td className="py-3 px-3.5 text-center text-slate-400">{b.legal_balls}</td>
                    <td className="py-3 px-3.5 text-center font-bold text-emerald-400">{b.wickets}</td>
                    <td className="py-3 px-3.5 text-center text-slate-400">{b.runs_conceded}</td>
                    <td className="py-3 px-3.5 text-center font-semibold text-white">{b.economy}</td>
                    <td className="py-3 px-3.5 text-center text-amber-400">{b.pressure_balls}</td>
                    <td className="py-3 px-3.5 text-center font-bold text-blue-400">
                      {b.z_bce > 0 ? `+${b.z_bce}` : b.z_bce}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-emerald-400">
                      {b.z_bcr > 0 ? `+${b.z_bcr}` : b.z_bcr}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-amber-400">
                      {b.z_bgi > 0 ? `+${b.z_bgi}` : b.z_bgi}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-white w-10 text-right text-sm">
                          {b.b_pgai_100}
                        </span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(10, b.b_pgai_100))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {b.archetype}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBowler(b);
                        }}
                        className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[11px] font-mono font-semibold transition-colors border border-blue-500/30"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Bowler Deep Dive: Stats & Radar Graph + Bunnies & Matches */}
      {selectedBowler && (
        <div id="bowler-deep-dive" className="space-y-5 scroll-mt-6">
          {/* Header Banner & Stats Overview */}
          <div className="bg-gradient-to-r from-[#0E1D3E] via-[#0D152A] to-[#090F1E] rounded-2xl border border-blue-500/40 p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    RANK #{selectedBowler.rank} • BOWLER PRESSURE PROFILE
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedBowler.archetype}
                  </span>
                  {selectedBowler.rating_band && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {selectedBowler.rating_band}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight mt-1">
                  {selectedBowler.player_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Detailed Situational Containment & Head-to-Head Batter Dominance
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">B-PGAI_100 Score</span>
                  <span className="text-4xl font-black text-blue-400 font-mono-stats">{selectedBowler.b_pgai_100}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/80 font-mono-stats text-xs">
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Wickets Taken</span>
                <span className="text-base font-bold text-emerald-400">{selectedBowler.wickets}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Legal Balls</span>
                <span className="text-base font-bold text-white">{selectedBowler.legal_balls}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Economy Rate</span>
                <span className="text-base font-bold text-white">{selectedBowler.economy} rpo</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Pressure Balls</span>
                <span className="text-base font-bold text-amber-400">{selectedBowler.pressure_balls}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Runs Conceded</span>
                <span className="text-base font-bold text-slate-300">{selectedBowler.runs_conceded}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Z-Scores (E/C/G)</span>
                <span className="text-xs font-bold text-slate-300">
                  <span className="text-blue-400">{selectedBowler.z_bce}</span> • <span className="text-emerald-400">{selectedBowler.z_bcr}</span> • <span className="text-amber-400">{selectedBowler.z_bgi}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Radar Chart + Bunnies & Matches Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Spider Radar Chart */}
            <div className="lg:col-span-5 bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span>5-Axis Situational Capability Radar</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Normalized 0-100</span>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#1E293B" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      stroke="#94A3B8" 
                      tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      stroke="#334155" 
                      tick={false} 
                    />
                    <Radar
                      name={selectedBowler.player_name}
                      dataKey="value"
                      stroke="#2563EB"
                      fill="#2563EB"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full mt-2 font-mono-stats text-xs text-center">
                <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">BCE (40%)</span>
                  <span className="font-bold text-blue-400">{selectedBowler.z_bce > 0 ? `+${selectedBowler.z_bce}` : selectedBowler.z_bce}</span>
                </div>
                <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">BCR (30%)</span>
                  <span className="font-bold text-emerald-400">{selectedBowler.z_bcr > 0 ? `+${selectedBowler.z_bcr}` : selectedBowler.z_bcr}</span>
                </div>
                <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">BGI (30%)</span>
                  <span className="font-bold text-amber-400">{selectedBowler.z_bgi > 0 ? `+${selectedBowler.z_bgi}` : selectedBowler.z_bgi}</span>
                </div>
              </div>

              {selectedBowler.bci !== undefined && (
                <div className="grid grid-cols-3 gap-2 w-full mt-2 font-mono-stats text-xs text-center">
                  <div className="bg-[#090F1E] p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">Clutch (BCI)</span>
                    <span className="font-bold text-sky-400">{selectedBowler.bci}</span>
                  </div>
                  <div className="bg-[#090F1E] p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">Pressure (BPI)</span>
                    <span className="font-bold text-purple-400">{selectedBowler.bpi}</span>
                  </div>
                  <div className="bg-[#090F1E] p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">Consistency</span>
                    <span className="font-bold text-teal-400">{selectedBowler.consistency_score}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Box 1: Batsmen Dominated (Bunnies) by this Bowler */}
            <div className="lg:col-span-7 bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Batsmen Dominated by {selectedBowler.player_name}</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Historical Match-up Edge</span>
              </div>

              {selectedBowler.bunnies_log?.length > 0 ? (
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#090F1E]">
                  <table className="w-full text-left text-xs font-mono-stats">
                    <thead className="bg-[#0A1020] text-slate-400 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Batsman</th>
                        <th className="py-2.5 px-3 text-center">Balls</th>
                        <th className="py-2.5 px-3 text-center">Runs</th>
                        <th className="py-2.5 px-3 text-center text-emerald-400">Dismissals</th>
                        <th className="py-2.5 px-3 text-right">SR</th>
                        <th className="py-2.5 px-3 text-right">Avg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedBowler.bunnies_log.map((bunny, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 font-semibold text-white">{bunny.batter_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-400">{bunny.balls}</td>
                          <td className="py-2.5 px-3 text-center">{bunny.runs}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{bunny.dismissals}</td>
                          <td className="py-2.5 px-3 text-right">{bunny.sr}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-200">{bunny.avg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-500 py-3">No repeat dismissals against any batsman recorded.</p>
              )}

              {/* Box 2: Performance in Last Pressure Matches */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Recent High-Pressure Matches Log</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">Chronological Spells</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedBowler.last_pressure_matches?.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-[#090F1E] border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between font-mono-stats text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                            m.won ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {m.won ? 'W' : 'L'}
                        </div>
                        <div>
                          <div className="text-white font-bold">
                            {m.wickets ?? 0}w / {m.runs}r <span className="text-slate-400 text-[10px] font-normal">({m.balls}b)</span>
                          </div>
                          <span className="text-[9px] text-slate-500">{m.date}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold text-xs ${
                            m.wpa >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {m.wpa >= 0 ? `+${m.wpa}` : m.wpa} WPA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2x2 Analytical Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Pillar Decomposition Stacked Bar */}
        <div className="bg-[#0F172A] rounded-2xl p-5 border border-[#1E293B]">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
            Pillar Decomposition Stacked Bar Across Top 10 Bowlers
          </h4>
          <p className="text-[11px] text-slate-400 mb-4 font-mono">
            BCE (Execution 40% Blue) • BCR (Composure 30% Emerald) • BGI (Game IQ 30% Gold)
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillarData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94A3B8" 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="BCE" stackId="a" fill="#2563EB" name="BCE (Execution 40%)" />
                <Bar dataKey="BCR" stackId="a" fill="#10B981" name="BCR (Composure 30%)" />
                <Bar dataKey="BGI" stackId="a" fill="#F59E0B" name="BGI (Game IQ 30%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Economy vs Wickets Scatter */}
        <div className="bg-[#0F172A] rounded-2xl p-5 border border-[#1E293B]">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
            Economy vs. Total Wickets (Top 10 Bowlers)
          </h4>
          <p className="text-[11px] text-slate-400 mb-4 font-mono">
            Top left zone: lower economy with high wicket impact
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis 
                  type="number" 
                  dataKey="economy" 
                  name="Economy" 
                  stroke="#94A3B8" 
                  tick={{ fill: '#94A3B8', fontSize: 10 }} 
                  domain={[5.5, 9.5]}
                  unit=" rpo"
                />
                <YAxis 
                  type="number" 
                  dataKey="wickets" 
                  name="Wickets" 
                  stroke="#94A3B8" 
                  tick={{ fill: '#94A3B8', fontSize: 10 }} 
                />
                <ZAxis type="number" dataKey="b_pgai" range={[100, 300]} name="B-PGAI" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg font-mono text-xs text-white">
                          <div className="font-bold text-blue-400">{d.name}</div>
                          <div>Economy: {d.economy} rpo</div>
                          <div>Wickets: {d.wickets} ({d.balls}b)</div>
                          <div>B-PGAI: {d.b_pgai}</div>
                          <div className="text-[10px] text-emerald-400">{d.archetype}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Bowlers" data={scatterData} fill="#2563EB">
                  {scatterData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#38BDF8' : index < 3 ? '#2563EB' : '#10B981'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
