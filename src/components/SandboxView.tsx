import React, { useState, useMemo } from 'react';
import { 
  SlidersHorizontal, 
  RotateCcw, 
  Flame, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  Sparkles,
  Info
} from 'lucide-react';
import { BattersPGAIData, BowlersPGAIData, BatterProfile, BowlerProfile } from '../types/analytics';

interface SandboxViewProps {
  battersData: BattersPGAIData;
  bowlersData: BowlersPGAIData;
}

export const SandboxView: React.FC<SandboxViewProps> = ({
  battersData,
  bowlersData,
}) => {
  const [activeTab, setActiveTab] = useState<'batters' | 'bowlers'>('batters');

  // Batter Weights (Default: PCE 38%, PRR 32%, GIQ 30%)
  const [pceWeight, setPceWeight] = useState<number>(38);
  const [prrWeight, setPrrWeight] = useState<number>(32);
  const [giqWeight, setGiqWeight] = useState<number>(30);
  const [batterCutoff, setBatterCutoff] = useState<number>(300);

  // Bowler Weights (Default: BCE 40%, BCR 30%, BGI 30%)
  const [bceWeight, setBceWeight] = useState<number>(40);
  const [bcrWeight, setBcrWeight] = useState<number>(30);
  const [bgiWeight, setBgiWeight] = useState<number>(30);
  const [bowlerCutoff, setBowlerCutoff] = useState<number>(240);

  // Situational Multipliers
  const [knockoutMult, setKnockoutMult] = useState<number>(1.75);
  const [awayMult, setAwayMult] = useState<number>(1.40);
  const [nemesisMult, setNemesisMult] = useState<number>(1.35);

  // Reset to default
  const handleReset = () => {
    setPceWeight(38);
    setPrrWeight(32);
    setGiqWeight(30);
    setBatterCutoff(300);

    setBceWeight(40);
    setBcrWeight(30);
    setBgiWeight(30);
    setBowlerCutoff(240);

    setKnockoutMult(1.75);
    setAwayMult(1.40);
    setNemesisMult(1.35);
  };

  // Recompute Batters dynamically
  const simulatedBatters = useMemo(() => {
    const all = battersData.all_batters || [];
    // Filter by dynamic cutoff
    const eligible = all.filter((b) => b.balls_faced >= batterCutoff);
    if (eligible.length === 0) return [];

    // Total normalized weights
    const totalW = (pceWeight + prrWeight + giqWeight) || 100;
    const wPCE = pceWeight / totalW;
    const wPRR = prrWeight / totalW;
    const wGIQ = giqWeight / totalW;

    // Multiplier scalar adjustment ratio vs baseline
    const multAdjustment = ((knockoutMult / 1.75) * 0.4 + (awayMult / 1.40) * 0.3 + (nemesisMult / 1.35) * 0.3);

    const scored = eligible.map((b) => {
      // Dynamic simulated PGAI
      const rawScore = 50.0 + 15.0 * (wPCE * b.z_pce + wPRR * b.z_prr * multAdjustment + wGIQ * b.z_giq);
      const simPGAI = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));
      return {
        ...b,
        simPGAI,
      };
    });

    // Sort descending
    scored.sort((a, b) => b.simPGAI - a.simPGAI);

    // Attach simulated rank and compare with base rank
    return scored.slice(0, 10).map((b, idx) => {
      const newRank = idx + 1;
      const rankDelta = b.rank - newRank; // positive means improved rank
      return {
        ...b,
        newRank,
        rankDelta,
      };
    });
  }, [battersData, pceWeight, prrWeight, giqWeight, batterCutoff, knockoutMult, awayMult, nemesisMult]);

  // Recompute Bowlers dynamically
  const simulatedBowlers = useMemo(() => {
    const all = bowlersData.all_bowlers || [];
    const eligible = all.filter((b) => b.legal_balls >= bowlerCutoff);
    if (eligible.length === 0) return [];

    const totalW = (bceWeight + bcrWeight + bgiWeight) || 100;
    const wBCE = bceWeight / totalW;
    const wBCR = bcrWeight / totalW;
    const wBGI = bgiWeight / totalW;

    const multAdjustment = ((knockoutMult / 1.75) * 0.4 + (awayMult / 1.40) * 0.3 + (nemesisMult / 1.35) * 0.3);

    const scored = eligible.map((b) => {
      const rawScore = 50.0 + 15.0 * (wBCE * b.z_bce + wBCR * b.z_bcr * multAdjustment + wBGI * b.z_bgi);
      const simBPGAI = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));
      return {
        ...b,
        simBPGAI,
      };
    });

    scored.sort((a, b) => b.simBPGAI - a.simBPGAI);

    return scored.slice(0, 10).map((b, idx) => {
      const newRank = idx + 1;
      const rankDelta = b.rank - newRank;
      return {
        ...b,
        newRank,
        rankDelta,
      };
    });
  }, [bowlersData, bceWeight, bcrWeight, bgiWeight, bowlerCutoff, knockoutMult, awayMult, nemesisMult]);

  const handleExportJSON = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      weights: {
        active_tab: activeTab,
        pce_weight: pceWeight,
        prr_weight: prrWeight,
        giq_weight: giqWeight,
        bce_weight: bceWeight,
        bcr_weight: bcrWeight,
        bgi_weight: bgiWeight,
        knockout_mult: knockoutMult,
        away_mult: awayMult,
        nemesis_mult: nemesisMult,
      },
      top10_batters_simulated: simulatedBatters,
      top10_bowlers_simulated: simulatedBowlers,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rr_selection_sandbox_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              INTERACTIVE RE-RANKING ENGINE
            </span>
            <span className="text-xs font-mono text-slate-400">Players Under Pressure Calibration</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
            <span>Rajasthan Royals Selection Sandbox</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
            Simulate custom strategic philosophies by tuning clutch weights, situational leverage, and sample cutoffs in real time.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-mono border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rr-pink hover:bg-rr-pinkDark text-white transition-colors text-xs font-mono font-semibold shadow-lg shadow-rr-pink/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Simulator Control Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel 1: Batsmen Pillar Weights */}
        <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rr-pink" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Batter Pillar Weights
              </h3>
            </div>
            <span className="text-[10px] font-mono text-rr-pink font-bold">
              Sum: {pceWeight + prrWeight + giqWeight}%
            </span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">PCE Weight (Clutch WPA & RAE):</span>
                <span className="text-rr-pink font-bold">{pceWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={pceWeight}
                onChange={(e) => setPceWeight(Number(e.target.value))}
                className="w-full accent-rr-pink"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">PRR Weight (Pace & Survival):</span>
                <span className="text-blue-400 font-bold">{prrWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={prrWeight}
                onChange={(e) => setPrrWeight(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">GIQ Weight (Game IQ & Strike Rot):</span>
                <span className="text-amber-400 font-bold">{giqWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={giqWeight}
                onChange={(e) => setGiqWeight(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Min Balls Cutoff:</span>
                <span className="text-white font-bold">{batterCutoff} balls</span>
              </div>
              <input
                type="range"
                min="200"
                max="600"
                step="25"
                value={batterCutoff}
                onChange={(e) => setBatterCutoff(Number(e.target.value))}
                className="w-full accent-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Panel 2: Bowler Pillar Weights */}
        <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Bowler Pillar Weights
              </h3>
            </div>
            <span className="text-[10px] font-mono text-blue-400 font-bold">
              Sum: {bceWeight + bcrWeight + bgiWeight}%
            </span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">BCE Weight (Runs Saved & WAE):</span>
                <span className="text-blue-400 font-bold">{bceWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={bceWeight}
                onChange={(e) => setBceWeight(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">BCR Weight (Bounce-Back & Dew):</span>
                <span className="text-emerald-400 font-bold">{bcrWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={bcrWeight}
                onChange={(e) => setBcrWeight(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">BGI Weight (Variation & Death Plan):</span>
                <span className="text-amber-400 font-bold">{bgiWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={bgiWeight}
                onChange={(e) => setBgiWeight(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Min Legal Balls Cutoff:</span>
                <span className="text-white font-bold">{bowlerCutoff} balls</span>
              </div>
              <input
                type="range"
                min="180"
                max="500"
                step="20"
                value={bowlerCutoff}
                onChange={(e) => setBowlerCutoff(Number(e.target.value))}
                className="w-full accent-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Panel 3: Situational Leverage Multipliers */}
        <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Contextual Multipliers
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live Multipliers</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Knockout Stage Multiplier:</span>
                <span className="text-amber-400 font-bold">{knockoutMult}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={knockoutMult}
                onChange={(e) => setKnockoutMult(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Away Fixture Multiplier:</span>
                <span className="text-sky-400 font-bold">{awayMult}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.05"
                value={awayMult}
                onChange={(e) => setAwayMult(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">H2H Nemesis/Bunny Threat:</span>
                <span className="text-rose-400 font-bold">{nemesisMult}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.05"
                value={nemesisMult}
                onChange={(e) => setNemesisMult(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Changes apply instantly across both batsmen and bowler leaderboards with live rank shift indicators.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Results Leaderboard */}
      <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
        {/* Sub-tab Switcher */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('batters')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'batters'
                  ? 'bg-rr-pink text-white shadow-lg shadow-rr-pink/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulated Batsmen Top 10</span>
            </button>
            <button
              onClick={() => setActiveTab('bowlers')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'bowlers'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Simulated Bowlers Top 10</span>
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Rank Delta Legend: <span className="text-emerald-400 font-bold">▲ Gain</span> •{' '}
            <span className="text-rose-400 font-bold">▼ Drop</span> •{' '}
            <span className="text-slate-500">• Unchanged</span>
          </div>
        </div>

        {/* Batsmen Table */}
        {activeTab === 'batters' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0A1020]">
            <table className="w-full text-left text-xs font-mono-stats">
              <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-3 text-center w-14">Sim Rank</th>
                  <th className="py-3 px-3 text-center w-20">Shift</th>
                  <th className="py-3 px-3.5">Player Name</th>
                  <th className="py-3 px-3 text-center">Balls</th>
                  <th className="py-3 px-3 text-center">Runs</th>
                  <th className="py-3 px-3 text-center">SR</th>
                  <th className="py-3 px-3.5 text-center text-rr-pink">Z_PCE</th>
                  <th className="py-3 px-3.5 text-center text-blue-400">Z_PRR</th>
                  <th className="py-3 px-3.5 text-center text-amber-400">Z_GIQ</th>
                  <th className="py-3 px-3 text-center text-slate-500">Base PGAI</th>
                  <th className="py-3 px-4 text-center text-rr-pink font-bold">Sim PGAI</th>
                  <th className="py-3 px-3.5">Archetype</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {simulatedBatters.map((b) => (
                  <tr key={b.player_id} className="hover:bg-[#131F37] transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-white">
                      #{b.newRank}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {b.rankDelta > 0 ? (
                        <span className="inline-flex items-center space-x-0.5 text-emerald-400 font-bold text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                          <TrendingUp className="w-3 h-3" />
                          <span>+{b.rankDelta}</span>
                        </span>
                      ) : b.rankDelta < 0 ? (
                        <span className="inline-flex items-center space-x-0.5 text-rose-400 font-bold text-[11px] bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                          <TrendingDown className="w-3 h-3" />
                          <span>{b.rankDelta}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-500 text-[11px]">
                          <Minus className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-white">{b.player_name}</td>
                    <td className="py-3 px-3 text-center text-slate-400">{b.balls_faced}</td>
                    <td className="py-3 px-3 text-center font-semibold text-white">{b.total_runs}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{b.strike_rate}</td>
                    <td className="py-3 px-3.5 text-center text-rr-pink">{b.z_pce}</td>
                    <td className="py-3 px-3.5 text-center text-blue-400">{b.z_prr}</td>
                    <td className="py-3 px-3.5 text-center text-amber-400">{b.z_giq}</td>
                    <td className="py-3 px-3 text-center text-slate-500">{b.pgai_100}</td>
                    <td className="py-3 px-4 text-center font-black text-rr-pink text-sm">
                      {b.simPGAI}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {b.archetype}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bowlers Table */}
        {activeTab === 'bowlers' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0A1020]">
            <table className="w-full text-left text-xs font-mono-stats">
              <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-3 text-center w-14">Sim Rank</th>
                  <th className="py-3 px-3 text-center w-20">Shift</th>
                  <th className="py-3 px-3.5">Bowler Name</th>
                  <th className="py-3 px-3 text-center">Legal Balls</th>
                  <th className="py-3 px-3 text-center">Wkts</th>
                  <th className="py-3 px-3 text-center">Economy</th>
                  <th className="py-3 px-3.5 text-center text-blue-400">Z_BCE</th>
                  <th className="py-3 px-3.5 text-center text-emerald-400">Z_BCR</th>
                  <th className="py-3 px-3.5 text-center text-amber-400">Z_BGI</th>
                  <th className="py-3 px-3 text-center text-slate-500">Base B-PGAI</th>
                  <th className="py-3 px-4 text-center text-blue-400 font-bold">Sim B-PGAI</th>
                  <th className="py-3 px-3.5">Archetype</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {simulatedBowlers.map((b) => (
                  <tr key={b.player_id} className="hover:bg-[#131F37] transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-white">
                      #{b.newRank}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {b.rankDelta > 0 ? (
                        <span className="inline-flex items-center space-x-0.5 text-emerald-400 font-bold text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                          <TrendingUp className="w-3 h-3" />
                          <span>+{b.rankDelta}</span>
                        </span>
                      ) : b.rankDelta < 0 ? (
                        <span className="inline-flex items-center space-x-0.5 text-rose-400 font-bold text-[11px] bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                          <TrendingDown className="w-3 h-3" />
                          <span>{b.rankDelta}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-500 text-[11px]">
                          <Minus className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-white">{b.player_name}</td>
                    <td className="py-3 px-3 text-center text-slate-400">{b.legal_balls}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{b.wickets}</td>
                    <td className="py-3 px-3 text-center font-semibold text-white">{b.economy}</td>
                    <td className="py-3 px-3.5 text-center text-blue-400">{b.z_bce}</td>
                    <td className="py-3 px-3.5 text-center text-emerald-400">{b.z_bcr}</td>
                    <td className="py-3 px-3.5 text-center text-amber-400">{b.z_bgi}</td>
                    <td className="py-3 px-3 text-center text-slate-500">{b.b_pgai_100}</td>
                    <td className="py-3 px-4 text-center font-black text-blue-400 text-sm">
                      {b.simBPGAI}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {b.archetype}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
