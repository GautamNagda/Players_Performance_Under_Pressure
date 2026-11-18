import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Flame, 
  ShieldCheck, 
  Target, 
  Zap, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Activity,
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { BatterProfile, BowlerProfile } from '../types/analytics';

interface PlayerSearchViewProps {
  batters: BatterProfile[];
  bowlers: BowlerProfile[];
}

export const PlayerSearchView: React.FC<PlayerSearchViewProps> = ({
  batters,
  bowlers,
}) => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'batters' | 'bowlers'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<{
    type: 'batter' | 'bowler';
    data: BatterProfile | BowlerProfile;
  } | null>(() => {
    // Default to #1 Batter on mount
    return batters[0] ? { type: 'batter', data: batters[0] } : null;
  });

  // Filtered player pool
  const filteredPlayers = useMemo(() => {
    const list: Array<{ type: 'batter' | 'bowler'; data: BatterProfile | BowlerProfile }> = [];

    if (roleFilter === 'all' || roleFilter === 'batters') {
      batters.forEach((b) => {
        if (!searchQuery || b.player_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          list.push({ type: 'batter', data: b });
        }
      });
    }

    if (roleFilter === 'all' || roleFilter === 'bowlers') {
      bowlers.forEach((b) => {
        if (!searchQuery || b.player_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          list.push({ type: 'bowler', data: b });
        }
      });
    }

    // Sort by index score
    return list.sort((a, b) => {
      const scoreA = a.type === 'batter' ? (a.data as BatterProfile).pgai_100 : (a.data as BowlerProfile).b_pgai_100;
      const scoreB = b.type === 'batter' ? (b.data as BatterProfile).pgai_100 : (b.data as BowlerProfile).b_pgai_100;
      return scoreB - scoreA;
    });
  }, [batters, bowlers, roleFilter, searchQuery]);

  // Construct radar data for selected player
  const radarData = useMemo(() => {
    if (!selectedPlayer) return [];
    if (selectedPlayer.type === 'batter') {
      const b = selectedPlayer.data as BatterProfile;
      return [
        { subject: 'Clutch Execution (PCE)', value: Math.max(15, Math.min(100, Math.round(50 + b.z_pce * 16))) },
        { subject: 'Pace & Resilience (PRR)', value: Math.max(15, Math.min(100, Math.round(50 + b.z_prr * 16))) },
        { subject: 'Game Awareness (GIQ)', value: Math.max(15, Math.min(100, Math.round(50 + b.z_giq * 16))) },
        { subject: 'Chase Finish Rate', value: Math.max(15, Math.min(100, Math.round(b.finish_rate * 120))) },
        { subject: 'Overall Tempo (SR)', value: Math.max(15, Math.min(100, Math.round((b.strike_rate / 220) * 100))) },
      ];
    } else {
      const b = selectedPlayer.data as BowlerProfile;
      return [
        { subject: 'Clutch Execution (BCE)', value: Math.max(15, Math.min(100, Math.round(50 + b.z_bce * 16))) },
        { subject: 'Composure (BCR)', value: Math.max(15, Math.min(100, Math.round(50 + b.z_bcr * 16))) },
        { subject: 'Deception & Plan (BGI)', value: Math.max(15, Math.min(100, Math.round(50 + b.z_bgi * 16))) },
        { subject: 'Wicket Strike Rate', value: Math.max(15, Math.min(100, Math.round((b.wickets / Math.max(b.legal_balls, 1)) * 1200))) },
        { subject: 'Economy Containment', value: Math.max(15, Math.min(100, Math.round(Math.max(10, (12 - b.economy) * 12)))) },
      ];
    }
  }, [selectedPlayer]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-5">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rr-pink/20 text-rr-pink border border-rr-pink/30 rounded">
            PRESSURE SCOUTING SEARCH
          </span>
          <span className="text-xs font-mono text-slate-400">Search Any Player Across 200,999 Deliveries</span>
        </div>
        <h2 className="text-2xl font-black text-white mt-1 tracking-tight">
          Player Pressure Intelligence & Matchup Explorer
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
          Search any batsman or bowler to inspect their pressure score, recent clutch match outcomes, and exact head-to-head nemeses/bunnies.
        </p>
      </div>

      {/* Search & Filters Strip */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0F172A] p-4 rounded-2xl border border-[#1E293B]">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by player name (e.g. Jasprit Bumrah, Vaibhav, Salt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#090F1E] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rr-pink font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
              roleFilter === 'all'
                ? 'bg-slate-700 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            All Players ({batters.length + bowlers.length})
          </button>
          <button
            onClick={() => setRoleFilter('batters')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
              roleFilter === 'batters'
                ? 'bg-rr-pink text-white shadow-lg shadow-rr-pink/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Batsmen ({batters.length})</span>
          </button>
          <button
            onClick={() => setRoleFilter('bowlers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
              roleFilter === 'bowlers'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bowlers ({bowlers.length})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Selector List & Right Deep Scouting Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Player Search Results List */}
        <div className="lg:col-span-4 bg-[#0F172A] rounded-2xl border border-[#1E293B] p-4 flex flex-col h-[700px]">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-xs font-mono text-slate-400">
            <span>Search Results ({filteredPlayers.length})</span>
            <span>Sorted by Index</span>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {filteredPlayers.slice(0, 50).map((item, idx) => {
              const isSelected = selectedPlayer?.data.player_id === item.data.player_id;
              const isBatter = item.type === 'batter';
              const b = item.data as BatterProfile;
              const bowl = item.data as BowlerProfile;

              return (
                <div
                  key={`${item.type}-${item.data.player_id}`}
                  onClick={() => setSelectedPlayer(item)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all duration-200 flex items-center justify-between group ${
                    isSelected
                      ? isBatter
                        ? 'bg-[#182038] border-rr-pink ring-1 ring-rr-pink/50 shadow-md'
                        : 'bg-[#12234A] border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                      : 'bg-[#090F1E] border-slate-800 hover:border-slate-700 hover:bg-[#0D152A]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                        idx < 3
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white group-hover:text-rr-pink transition-colors truncate">
                        {item.data.player_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                        <span className={isBatter ? 'text-rr-pink' : 'text-blue-400'}>
                          {isBatter ? 'BAT' : 'BOWL'}
                        </span>
                        <span>•</span>
                        <span>{item.data.archetype}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-black font-mono-stats ${
                        isBatter ? 'text-rr-pink' : 'text-blue-400'
                      }`}
                    >
                      {isBatter ? b.pgai_100 : bowl.b_pgai_100}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {isBatter ? `${b.balls_faced}b` : `${bowl.legal_balls}b`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Scouting Dossier */}
        <div className="lg:col-span-8 space-y-5">
          {selectedPlayer ? (
            <>
              {/* Hero Banner Card */}
              <div
                className={`rounded-2xl p-6 border relative overflow-hidden shadow-2xl ${
                  selectedPlayer.type === 'batter'
                    ? 'bg-gradient-to-r from-[#171F38] via-[#0E172C] to-[#0A1020] border-rr-pink/50'
                    : 'bg-gradient-to-r from-[#0F224A] via-[#0D1833] to-[#0A1020] border-blue-500/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          selectedPlayer.type === 'batter'
                            ? 'bg-rr-pink/20 text-rr-pink border border-rr-pink/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}
                      >
                        {selectedPlayer.type === 'batter' ? 'BATSMAN DOSSIER' : 'BOWLER DOSSIER'} • RANK #{selectedPlayer.data.rank}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {selectedPlayer.data.archetype}
                      </span>
                    </div>

                    <h2 className="text-3xl font-black text-white tracking-tight">
                      {selectedPlayer.data.player_name}
                    </h2>

                    <div className="flex items-center space-x-3 text-xs font-mono text-slate-300 mt-2">
                      <span>ID: #{selectedPlayer.data.player_id}</span>
                      <span>•</span>
                      <span>Pressure Balls: <strong className="text-amber-400">{selectedPlayer.data.pressure_balls}</strong></span>
                    </div>
                  </div>

                  <div className="text-right bg-slate-900/80 px-5 py-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      {selectedPlayer.type === 'batter' ? 'PGAI_100 Score' : 'B-PGAI_100 Score'}
                    </span>
                    <div
                      className={`text-4xl font-black font-mono-stats ${
                        selectedPlayer.type === 'batter' ? 'text-rr-pink' : 'text-blue-400'
                      }`}
                    >
                      {selectedPlayer.type === 'batter'
                        ? (selectedPlayer.data as BatterProfile).pgai_100
                        : (selectedPlayer.data as BowlerProfile).b_pgai_100}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      Elite Pressure Tier
                    </span>
                  </div>
                </div>

                {/* Sub-Pillars Strip */}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80 font-mono-stats text-xs">
                  {selectedPlayer.type === 'batter' ? (
                    <>
                      <div className="bg-[#090F1E] p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Z_PCE (Clutch)</span>
                        <span className="text-base font-bold text-rr-pink">
                          {(selectedPlayer.data as BatterProfile).z_pce > 0 ? `+${(selectedPlayer.data as BatterProfile).z_pce}` : (selectedPlayer.data as BatterProfile).z_pce}
                        </span>
                      </div>
                      <div className="bg-[#090F1E] p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Z_PRR (Pace & Survival)</span>
                        <span className="text-base font-bold text-blue-400">
                          {(selectedPlayer.data as BatterProfile).z_prr > 0 ? `+${(selectedPlayer.data as BatterProfile).z_prr}` : (selectedPlayer.data as BatterProfile).z_prr}
                        </span>
                      </div>
                      <div className="bg-[#090F1E] p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Z_GIQ (Game IQ)</span>
                        <span className="text-base font-bold text-amber-400">
                          {(selectedPlayer.data as BatterProfile).z_giq > 0 ? `+${(selectedPlayer.data as BatterProfile).z_giq}` : (selectedPlayer.data as BatterProfile).z_giq}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#090F1E] p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Z_BCE (Execution)</span>
                        <span className="text-base font-bold text-blue-400">
                          {(selectedPlayer.data as BowlerProfile).z_bce > 0 ? `+${(selectedPlayer.data as BowlerProfile).z_bce}` : (selectedPlayer.data as BowlerProfile).z_bce}
                        </span>
                      </div>
                      <div className="bg-[#090F1E] p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Z_BCR (Composure)</span>
                        <span className="text-base font-bold text-emerald-400">
                          {(selectedPlayer.data as BowlerProfile).z_bcr > 0 ? `+${(selectedPlayer.data as BowlerProfile).z_bcr}` : (selectedPlayer.data as BowlerProfile).z_bcr}
                        </span>
                      </div>
                      <div className="bg-[#090F1E] p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Z_BGI (Deception)</span>
                        <span className="text-base font-bold text-amber-400">
                          {(selectedPlayer.data as BowlerProfile).z_bgi > 0 ? `+${(selectedPlayer.data as BowlerProfile).z_bgi}` : (selectedPlayer.data as BowlerProfile).z_bgi}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Middle Grid: Radar Chart + Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Radar Chart */}
                <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <Zap className="w-3.5 h-3.5 text-rr-pink" />
                    <span>Multi-Pillar Decision Radar</span>
                  </h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="75%">
                        <PolarGrid stroke="#1E293B" />
                        <PolarAngleAxis
                          dataKey="subject"
                          stroke="#94A3B8"
                          tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" tick={false} />
                        <Radar
                          name={selectedPlayer.data.player_name}
                          dataKey="value"
                          stroke={selectedPlayer.type === 'batter' ? '#EA1A85' : '#2563EB'}
                          fill={selectedPlayer.type === 'batter' ? '#EA1A85' : '#2563EB'}
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Key Attributes Overview */}
                <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Key Pressure Telemetry</span>
                  </h3>

                  <div className="space-y-3 font-mono-stats text-xs">
                    {selectedPlayer.type === 'batter' ? (
                      <>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Total Career Runs:</span>
                          <span className="text-white font-bold">{(selectedPlayer.data as BatterProfile).total_runs}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Balls Faced (excl. wides):</span>
                          <span className="text-white font-bold">{(selectedPlayer.data as BatterProfile).balls_faced}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Career Strike Rate:</span>
                          <span className="text-emerald-400 font-bold">{(selectedPlayer.data as BatterProfile).strike_rate}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Chase Finish Rate:</span>
                          <span className="text-amber-400 font-bold">{Math.round((selectedPlayer.data as BatterProfile).finish_rate * 100)}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Total Wickets:</span>
                          <span className="text-emerald-400 font-bold">{(selectedPlayer.data as BowlerProfile).wickets}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Legal Balls Bowled:</span>
                          <span className="text-white font-bold">{(selectedPlayer.data as BowlerProfile).legal_balls}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Economy Rate:</span>
                          <span className="text-blue-400 font-bold">{(selectedPlayer.data as BowlerProfile).economy}</span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#090F1E] border border-slate-800">
                          <span className="text-slate-400">Runs Conceded:</span>
                          <span className="text-slate-200 font-bold">{(selectedPlayer.data as BowlerProfile).runs_conceded}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Struggling Bowlers (for Batsmen) or Dominated Bunnies (for Bowlers) */}
              <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      {selectedPlayer.type === 'batter'
                        ? 'Bowlers On Which This Batsman Struggles (H2H Nemesis Record)'
                        : 'Batsmen Dominated by This Bowler (H2H Bunny Record)'}
                    </span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Historical Head-to-Head</span>
                </div>

                {selectedPlayer.type === 'batter' ? (
                  (selectedPlayer.data as BatterProfile).nemesis_log?.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#090F1E]">
                      <table className="w-full text-left text-xs font-mono-stats">
                        <thead className="bg-[#0A1020] text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Bowler Nemesis</th>
                            <th className="py-2.5 px-3 text-center">Balls Faced</th>
                            <th className="py-2.5 px-3 text-center">Runs Scored</th>
                            <th className="py-2.5 px-3 text-center text-rose-400">Dismissals</th>
                            <th className="py-2.5 px-3 text-right">SR</th>
                            <th className="py-2.5 px-3 text-right">Batting Avg</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {(selectedPlayer.data as BatterProfile).nemesis_log.map((nem, idx) => (
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
                    <p className="text-xs font-mono text-slate-500 py-2">No repeat nemesis bowlers recorded with multiple dismissals.</p>
                  )
                ) : (
                  (selectedPlayer.data as BowlerProfile).bunnies_log?.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#090F1E]">
                      <table className="w-full text-left text-xs font-mono-stats">
                        <thead className="bg-[#0A1020] text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Dominated Batsman</th>
                            <th className="py-2.5 px-3 text-center">Balls Bowled</th>
                            <th className="py-2.5 px-3 text-center">Runs Given</th>
                            <th className="py-2.5 px-3 text-center text-emerald-400">Dismissals</th>
                            <th className="py-2.5 px-3 text-right">SR</th>
                            <th className="py-2.5 px-3 text-right">Opp Avg</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {(selectedPlayer.data as BowlerProfile).bunnies_log.map((bun, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/60">
                              <td className="py-2.5 px-3 font-semibold text-white">{bun.batter_name}</td>
                              <td className="py-2.5 px-3 text-center text-slate-400">{bun.balls}</td>
                              <td className="py-2.5 px-3 text-center">{bun.runs}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{bun.dismissals}</td>
                              <td className="py-2.5 px-3 text-right">{bun.sr}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-200">{bun.avg}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-slate-500 py-2">No repeat bunnies recorded with multiple dismissals.</p>
                  )
                )}
              </div>

              {/* Performance in Last Pressure Matches */}
              <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>Performance in Recent Pressure Matches (High-Leverage State)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Chronological Match Log</span>
                </div>

                <div className="space-y-2">
                  {selectedPlayer.data.last_pressure_matches?.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-[#090F1E] border border-slate-800/80 p-3 rounded-xl flex items-center justify-between font-mono-stats text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                            m.won ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {m.won ? 'W' : 'L'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-bold text-sm">
                              {selectedPlayer.type === 'batter'
                                ? `${m.runs} runs (${m.balls}b)`
                                : `${m.wickets ?? 0} wkts for ${m.runs} (${m.balls}b)`}
                            </span>
                            <span className="text-[10px] text-slate-500">Match #{m.match_id}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">Date: {m.date}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold block ${
                            m.wpa >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {m.wpa >= 0 ? `+${m.wpa}` : m.wpa} WPA
                        </span>
                        <span className="text-[9px] text-slate-500">Win Prob Added</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-12 text-center text-slate-500 font-mono text-xs">
              Select a player from the left panel to inspect their pressure telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
