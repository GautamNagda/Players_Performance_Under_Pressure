import React, { useState } from 'react';
import { 
  Flame, 
  Crown, 
  TrendingUp, 
  Zap, 
  Clock, 
  Search, 
  ChevronRight, 
  ShieldAlert,
  Calendar,
  Award,
  Sparkles,
  Activity,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis
} from 'recharts';
import { BattersPGAIData, BatterProfile } from '../types/analytics';

interface BattersViewProps {
  data: BattersPGAIData;
  onSelectPlayerForScout?: (batter: BatterProfile) => void;
}

export const BattersView: React.FC<BattersViewProps> = ({ data }) => {
  const top10 = data.top_10 || [];
  const [selectedBatter, setSelectedBatter] = useState<BatterProfile | null>(top10[0] || null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTop10 = top10.filter((b) =>
    b.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBatter = (batter: BatterProfile) => {
    setSelectedBatter(batter);
    // Smooth scroll down to deep dive profile section
    setTimeout(() => {
      const el = document.getElementById('batter-deep-dive');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Stacked Bar Data: PCE (38%), PRR (32%), GIQ (30%)
  const pillarData = top10.map((b) => ({
    name: b.player_name.split(' ').slice(-1)[0],
    fullName: b.player_name,
    PCE: Number((Math.max(0, b.z_pce + 3) * 0.38).toFixed(2)),
    PRR: Number((Math.max(0, b.z_prr + 3) * 0.32).toFixed(2)),
    GIQ: Number((Math.max(0, b.z_giq + 3) * 0.30).toFixed(2)),
    pgai: b.pgai_100,
  }));

  // Radar Data for currently selected player
  const radarData = selectedBatter ? [
    { subject: 'PCE (Clutch)', value: Math.max(20, Math.min(100, Math.round(50 + selectedBatter.z_pce * 16))), fullMark: 100 },
    { subject: 'PRR (Pace)', value: Math.max(20, Math.min(100, Math.round(50 + selectedBatter.z_prr * 16))), fullMark: 100 },
    { subject: 'GIQ (Game IQ)', value: Math.max(20, Math.min(100, Math.round(50 + selectedBatter.z_giq * 16))), fullMark: 100 },
    { subject: 'Strike Rate', value: Math.max(20, Math.min(100, Math.round(selectedBatter.strike_rate / 2))), fullMark: 100 },
    { subject: 'Finish Rate', value: Math.max(20, Math.min(100, Math.round((selectedBatter.finish_rate || 0.25) * 120))), fullMark: 100 },
  ] : [];

  const podiumColors = [
    { border: 'border-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: 'text-amber-400', medal: '🥇 RANK 1' },
    { border: 'border-slate-300', badge: 'bg-slate-300/20 text-slate-200 border-slate-300/40', text: 'text-slate-300', medal: '🥈 RANK 2' },
    { border: 'border-amber-700', badge: 'bg-amber-700/20 text-amber-500 border-amber-700/40', text: 'text-amber-500', medal: '🥉 RANK 3' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rr-pink/20 text-rr-pink border border-rr-pink/30 rounded">
              MAIN DECISION LEADERBOARD
            </span>
            <span className="text-xs font-mono text-slate-400">Hard Cutoff: ≥ 300 Balls Faced (excl. wides)</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
            <span>Top 10 Pressure & Game-Smart Batsmen</span>
            <span className="text-sm font-mono font-bold text-rr-pink bg-rr-pink/10 px-2 py-0.5 rounded border border-rr-pink/30">
              PGAI_100
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
              className="pl-8 pr-3 py-1.5 bg-[#091122] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rr-pink font-mono w-44"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top10.slice(0, 3).map((batter, idx) => {
          const style = podiumColors[idx];
          const isSelected = selectedBatter?.player_id === batter.player_id;
          return (
            <div
              key={batter.player_id}
              onClick={() => handleSelectBatter(batter)}
              className={`cursor-pointer rounded-2xl p-5 relative overflow-hidden transition-all duration-200 border ${
                isSelected ? 'ring-2 ring-rr-pink border-rr-pink' : style.border
              } bg-gradient-to-b from-[#111A33] to-[#0A1020] hover:scale-[1.01] shadow-xl group`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                    {style.medal}
                  </span>
                  <h3 className="text-lg font-black text-white mt-2 group-hover:text-rr-pink transition-colors">
                    {batter.player_name}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    {batter.archetype}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black font-mono-stats text-rr-pink">
                    {batter.pgai_100}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">PGAI_100</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 font-mono-stats text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Runs (Balls)</span>
                  <span className="font-bold text-white">{batter.total_runs} ({batter.balls_faced})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Strike Rate</span>
                  <span className="font-bold text-emerald-400">{batter.strike_rate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Pressure Balls</span>
                  <span className="font-bold text-amber-400">{batter.pressure_balls}</span>
                </div>
              </div>

              {/* Functional Select to Inspect Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBatter(batter);
                }}
                className="w-full mt-3 flex items-center justify-between text-[11px] font-mono text-rr-pink bg-rr-pink/10 hover:bg-rr-pink/20 border border-rr-pink/30 px-3 py-1.5 rounded-lg transition-all group-hover:border-rr-pink/60"
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
            <Flame className="w-4 h-4 text-rr-pink" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Top 10 Batsmen Leaderboard (Formula-Calibrated Rankings)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Click any row to display stats, radar graph & struggle bowlers below
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0A1020]">
          <table className="w-full text-left text-xs font-mono-stats">
            <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-3.5 text-center w-14">Rank</th>
                <th className="py-3 px-3.5">Player Name</th>
                <th className="py-3 px-3.5 text-center">Balls Faced</th>
                <th className="py-3 px-3.5 text-center">Runs</th>
                <th className="py-3 px-3.5 text-center">SR</th>
                <th className="py-3 px-3.5 text-center">Pressure Balls</th>
                <th className="py-3 px-3.5 text-center text-rr-pink">Z_PCE</th>
                <th className="py-3 px-3.5 text-center text-blue-400">Z_PRR</th>
                <th className="py-3 px-3.5 text-center text-amber-400">Z_GIQ</th>
                <th className="py-3 px-4 w-40 text-center">PGAI_100 Score</th>
                <th className="py-3 px-3.5">Archetype Tag</th>
                <th className="py-3 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTop10.map((b) => {
                const isSelected = selectedBatter?.player_id === b.player_id;
                return (
                  <tr
                    key={b.player_id}
                    onClick={() => handleSelectBatter(b)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#18233D] text-white font-semibold' : 'hover:bg-[#131F37]'
                    }`}
                  >
                    <td className="py-3 px-3.5 text-center font-bold">
                      <span
                        className={`inline-block w-6 h-6 rounded-full leading-6 text-[11px] ${
                          b.rank === 1
                            ? 'bg-amber-500 text-slate-950 font-black'
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
                    <td className="py-3 px-3.5 font-bold text-white group-hover:text-rr-pink transition-colors">
                      {b.player_name}
                    </td>
                    <td className="py-3 px-3.5 text-center text-slate-400">{b.balls_faced}</td>
                    <td className="py-3 px-3.5 text-center font-semibold text-white">{b.total_runs}</td>
                    <td className="py-3 px-3.5 text-center font-bold text-emerald-400">{b.strike_rate}</td>
                    <td className="py-3 px-3.5 text-center text-slate-400">{b.pressure_balls}</td>
                    <td className="py-3 px-3.5 text-center font-bold text-rr-pink">
                      {b.z_pce > 0 ? `+${b.z_pce}` : b.z_pce}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-blue-400">
                      {b.z_prr > 0 ? `+${b.z_prr}` : b.z_prr}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-amber-400">
                      {b.z_giq > 0 ? `+${b.z_giq}` : b.z_giq}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-white w-10 text-right text-sm">
                          {b.pgai_100}
                        </span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rr-pink to-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(10, b.pgai_100))}%` }}
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
                          handleSelectBatter(b);
                        }}
                        className="px-2 py-1 rounded bg-rr-pink/10 hover:bg-rr-pink text-rr-pink hover:text-white text-[11px] font-mono font-semibold transition-colors border border-rr-pink/30"
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

      {/* Selected Batsman Deep Dive: Stats & Radar Graph + Nemeses & Matches */}
      {selectedBatter && (
        <div id="batter-deep-dive" className="space-y-5 scroll-mt-6">
          {/* Header Banner & Stats Overview */}
          <div className="bg-gradient-to-r from-[#1E0E25] via-[#111A33] to-[#0A1020] rounded-2xl border border-rr-pink/40 p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rr-pink/20 text-rr-pink border border-rr-pink/40">
                    RANK #{selectedBatter.rank} • BATSMAN PRESSURE PROFILE
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedBatter.archetype}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight mt-1">
                  {selectedBatter.player_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Detailed Situational Analytics & Head-to-Head Vulnerabilities
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">PGAI_100 Score</span>
                  <span className="text-4xl font-black text-rr-pink font-mono-stats">{selectedBatter.pgai_100}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/80 font-mono-stats text-xs">
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Total Runs</span>
                <span className="text-base font-bold text-white">{selectedBatter.total_runs}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Balls Faced</span>
                <span className="text-base font-bold text-white">{selectedBatter.balls_faced}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Strike Rate</span>
                <span className="text-base font-bold text-emerald-400">{selectedBatter.strike_rate}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Pressure Balls</span>
                <span className="text-base font-bold text-amber-400">{selectedBatter.pressure_balls}</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Finish Rate</span>
                <span className="text-base font-bold text-sky-400">{Math.round((selectedBatter.finish_rate || 0) * 100)}%</span>
              </div>
              <div className="bg-[#090F1E] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Z-Scores (P/R/G)</span>
                <span className="text-xs font-bold text-slate-300">
                  <span className="text-rr-pink">{selectedBatter.z_pce}</span> • <span className="text-blue-400">{selectedBatter.z_prr}</span> • <span className="text-amber-400">{selectedBatter.z_giq}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Radar Chart + Pillars Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Spider Radar Chart */}
            <div className="lg:col-span-5 bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-rr-pink" />
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
                      name={selectedBatter.player_name}
                      dataKey="value"
                      stroke="#EA1A85"
                      fill="#EA1A85"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full mt-2 font-mono-stats text-xs text-center">
                <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">PCE (38%)</span>
                  <span className="font-bold text-rr-pink">{selectedBatter.z_pce > 0 ? `+${selectedBatter.z_pce}` : selectedBatter.z_pce}</span>
                </div>
                <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">PRR (32%)</span>
                  <span className="font-bold text-blue-400">{selectedBatter.z_prr > 0 ? `+${selectedBatter.z_prr}` : selectedBatter.z_prr}</span>
                </div>
                <div className="bg-[#090F1E] p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block">GIQ (30%)</span>
                  <span className="font-bold text-amber-400">{selectedBatter.z_giq > 0 ? `+${selectedBatter.z_giq}` : selectedBatter.z_giq}</span>
                </div>
              </div>
            </div>

            {/* Box 1: Bowlers On Which This Batsman Struggles */}
            <div className="lg:col-span-7 bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Bowlers Against Whom {selectedBatter.player_name} Struggles</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Historical Nemeses</span>
              </div>

              {selectedBatter.nemesis_log?.length > 0 ? (
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#090F1E]">
                  <table className="w-full text-left text-xs font-mono-stats">
                    <thead className="bg-[#0A1020] text-slate-400 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Bowler</th>
                        <th className="py-2.5 px-3 text-center">Balls</th>
                        <th className="py-2.5 px-3 text-center">Runs</th>
                        <th className="py-2.5 px-3 text-center text-rose-400">Dismissals</th>
                        <th className="py-2.5 px-3 text-right">SR</th>
                        <th className="py-2.5 px-3 text-right">Avg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedBatter.nemesis_log.map((nem, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 font-semibold text-white">{nem.bowler_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-400">{nem.balls}</td>
                          <td className="py-2.5 px-3 text-center">{nem.runs}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-400">{nem.dismissals}</td>
                          <td className="py-2.5 px-3 text-right">{nem.sr}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-200">{nem.avg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-500 py-3">No repeat dismissals against any bowler recorded.</p>
              )}

              {/* Box 2: Performance in Last Pressure Matches */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Recent High-Pressure Matches Log</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">Chronological Spells</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedBatter.last_pressure_matches?.map((m, idx) => (
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
                            {m.runs} runs <span className="text-slate-400 text-[10px] font-normal">({m.balls}b)</span>
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

      {/* Analytical Stacked Bar Chart */}
      <div className="bg-[#0F172A] rounded-2xl p-5 border border-[#1E293B]">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
          Pillar Decomposition Stacked Bar Across Top 10 Batsmen
        </h3>
        <p className="text-[11px] text-slate-400 mb-4 font-mono">
          PCE (Clutch 38% Pink) • PRR (Pace & Survival 32% Blue) • GIQ (Game IQ 30% Gold)
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
              <Bar dataKey="PCE" stackId="a" fill="#EA1A85" name="PCE (Clutch 38%)" />
              <Bar dataKey="PRR" stackId="a" fill="#3B82F6" name="PRR (Resilience 32%)" />
              <Bar dataKey="GIQ" stackId="a" fill="#F59E0B" name="GIQ (Game IQ 30%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
