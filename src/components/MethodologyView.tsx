import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  Calculator, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Sliders, 
  ArrowRight,
  Database,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AnalyticsMetaData } from '../types/analytics';

interface MethodologyViewProps {
  meta: AnalyticsMetaData | null;
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ meta }) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'pillars' | 'formulas' | 'schema'>('concepts');
  const [expandedPillar, setExpandedPillar] = useState<number | null>(1);

  const pillars = meta?.pillars || [];

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="border-b border-[#1E293B] pb-5">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
            DATA SCIENCE ARCHITECTURE & CODE EXPLAINER
          </span>
          <span className="text-xs font-mono text-slate-400">Master Cricket Analytics Framework</span>
        </div>
        <h2 className="text-2xl font-black text-white mt-1 tracking-tight">
          How the Code & Pressure Model Works (Plain-English & Math Guide)
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl font-mono">
          An intuitive walkthrough of the 8 Pillars, 36 Derived Aspects, zero-leakage ML regressors, and Empirical Bayes shrinkage engineering.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('concepts')}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'concepts'
              ? 'bg-rr-pink text-white shadow-lg shadow-rr-pink/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Core Concepts in Plain English</span>
        </button>
        <button
          onClick={() => setActiveTab('formulas')}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'formulas'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>The Exact Math Formulas</span>
        </button>
        <button
          onClick={() => setActiveTab('pillars')}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'pillars'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>8 Pillars & 36 Aspects</span>
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'schema'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>77-Column Schema Coverage</span>
        </button>
      </div>

      {/* TAB 1: Core Concepts in Plain English */}
      {activeTab === 'concepts' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-rr-pink/20 text-rr-pink flex items-center justify-center mb-3">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">What is Delivery Pressure Multiplier ($M_t$)?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Not all deliveries are created equal. A ball faced in a <strong>Knockout Final</strong> against a <strong>historical nemesis</strong> carries far more pressure than a dead-rubber league match. We multiply the delivery stakes dynamically by up to <strong>3.0x</strong>.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">What is Expected Runs & Wickets ($xR / xW$)?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Using <strong>LightGBM Gradient Boosted Trees</strong>, we predict how many runs a normal batsman would score on that delivery given the ball speed, bowler style, angle, and venue. A player scoring 12 runs on a ball where average is 1.1 achieves <strong>Runs Above Expectation (RAE)</strong>.
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 relative overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Why Empirical Bayes Shrinkage ($k=50$)?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If a player faces only 15 pressure balls and hits 2 sixes, their raw clutch average looks deceptively high. <strong>Empirical Bayes shrinkage</strong> acts as a gravitational anchor, pulling small-sample stats toward the league average until proven over hundreds of balls.
              </p>
            </div>
          </div>

          {/* Step-by-Step Pipeline Flow */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Step-by-Step Code Execution Pipeline</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] text-rr-pink font-bold block mb-1">STAGE 1</span>
                <h4 className="text-white font-bold mb-1">Domain Cleaning</h4>
                <p className="text-[11px] text-slate-400">
                  Separates raw deliveries into 192,709 legal balls, filters 7,714 wides, and deducts byes/leg-byes from bowler runs.
                </p>
              </div>

              <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] text-blue-400 font-bold block mb-1">STAGE 2</span>
                <h4 className="text-white font-bold mb-1">Zero-Leakage ML</h4>
                <p className="text-[11px] text-slate-400">
                  Trains out-of-fold LightGBM $xR/xW$ models and XGBoost Win Probability trees using 3-fold GroupKFold by match.
                </p>
              </div>

              <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] text-amber-400 font-bold block mb-1">STAGE 3</span>
                <h4 className="text-white font-bold mb-1">Micro-Momentum Vectors</h4>
                <p className="text-[11px] text-slate-400">
                  Calculates 3-dot chokehold escapes, post-boundary bounce-back rates, tail-ender strike farming, and nemesis survival.
                </p>
              </div>

              <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] text-emerald-400 font-bold block mb-1">STAGE 4</span>
                <h4 className="text-white font-bold mb-1">Shrunk Z-Score Index</h4>
                <p className="text-[11px] text-slate-400">
                  Applies Empirical Bayes shrinkage (k=50 for pressure events, +120 for bowler cohort shrinkage), winsorizes outliers at [-3, 3], and maps scores via clip(50 + 15·Z, 0, 100).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: The Exact Math Formulas */}
      {activeTab === 'formulas' && (
        <div className="space-y-5">
          {/* Batsmen Formula */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-3">
              <Flame className="w-5 h-5 text-rr-pink" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Batsman Pressure & Game-Awareness Index (PGAI_100)
              </h3>
            </div>

            <div className="p-4 bg-[#090F1E] border border-slate-800 rounded-xl font-mono text-sm text-rr-pink font-bold mb-4">
              PGAI_100 = clip(50 + 15 · (0.38 · Z_PCE + 0.32 · Z_PRR + 0.30 · Z_GIQ), 0, 100)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800">
                <span className="text-rr-pink font-bold block mb-1">PCE (Clutch Execution - 38%)</span>
                <p className="text-slate-400 text-[11px] mb-2">
                  0.55 · shrunk(WPA) + 0.30 · shrunk(RAE_pressure) + 0.15 · FinishRate
                </p>
                <div className="text-[10px] text-slate-500">
                  Shrinks high-leverage Win Probability Added and Runs Above Expectation over applicable deliveries.
                </div>
              </div>

              <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800">
                <span className="text-blue-400 font-bold block mb-1">PRR (Pace & Resilience - 32%)</span>
                <p className="text-slate-400 text-[11px] mb-2 font-mono">
                  0.30·S_pace_var + 0.25·S_chain + 0.25·S_collapse + 0.20·S_matchup
                </p>
                <div className="text-[10px] text-slate-500">
                  Measures survival & RAE against 140+ km/h pace or &gt;12 km/h variation, 3-dot chokehold escapes, and recovery when entering at &gt;= 2 wickets down.
                </div>
              </div>

              <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">GIQ (Game Intelligence - 30%)</span>
                <p className="text-slate-400 text-[11px] mb-2 font-mono">
                  0.35·I_tempo_align + 0.25·I_rotation + 0.20·I_strike_farm + 0.20·I_control
                </p>
                <div className="text-[10px] text-slate-500">
                  Evaluates crisis rebuild vs attack tempo, middle-over strike rotation, tail-ender strike farming (1-4 boundary, 5-6 single), and anti-panic control.
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
              <span className="text-amber-400 font-bold">Delivery Multiplier:</span> M_t = (1 + 0.75·knockout) · (1 + 0.40·away) · (1 + 0.50·opener_elite) · (1 + 0.35·nemesis)
            </div>
          </div>

          {/* Bowler Formula */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Bowler Pressure & Game-Awareness Index (B-PGAI_100)
              </h3>
            </div>

            <div className="p-4 bg-[#090F1E] border border-slate-800 rounded-xl font-mono text-sm text-blue-400 font-bold mb-4">
              B-PGAI_100 = clip(50 + 15 · (0.40 · Z_BCE + 0.30 · Z_BCR + 0.30 · Z_BGI), 0, 100)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800">
                <span className="text-blue-400 font-bold block mb-1">BCE (Clutch Execution - 40%)</span>
                <p className="text-slate-400 text-[11px] mb-2">
                  0.45 · shrunk(BowlWPA) + 0.30 · shrunk(RunsSaved) + 0.25 · shrunk(WAE)
                </p>
                <div className="text-[10px] text-slate-500">
                  Wickets Above Expectation with 1.4x multiplier for set batsmen and unassisted bowled/LBW dismissals.
                </div>
              </div>

              <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">BCR (Composure & Resilience - 30%)</span>
                <p className="text-slate-400 text-[11px] mb-2 font-mono">
                  0.30·S_bounce + 0.25·S_spell_close + 0.25·S_matchup_env + 0.20·S_disc
                </p>
                <div className="text-[10px] text-slate-500">
                  Post-boundary dot/wicket bounce-back, 6th-ball over-closing, night dew defense, and high-leverage extra discipline with cohort shrinkage (N+120).
                </div>
              </div>

              <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">BGI (Tactical Deception & Game IQ - 30%)</span>
                <p className="text-slate-400 text-[11px] mb-2 font-mono">
                  0.35·I_deception + 0.30·I_choke + 0.20·I_plan + 0.15·I_role_load
                </p>
                <div className="text-[10px] text-slate-500">
                  Speed deviation (&gt;6 km/h) & angle changes, 3-dot chokeholds, wide-off death line execution, and captaincy/impact role load.
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
              <span className="text-blue-400 font-bold">Delivery Multiplier:</span> M_bowl = (1 + 0.75·knockout) · (1 + 0.40·away) · (1 + 0.30·dew) · (1 + 0.35·bunny) · (1 + 0.30·set_bat) · (1 + 0.25·dls_toss)
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 8 Pillars & 36 Aspects Accordion */}
      {activeTab === 'pillars' && (
        <div className="space-y-4">
          <div className="text-xs font-mono text-slate-400 mb-2">
            Click any pillar to view its derived aspects, mapped CSV columns, and engineering methods:
          </div>

          {pillars.map((pillar) => {
            const isExpanded = expandedPillar === pillar.pillar_id;
            return (
              <div
                key={pillar.pillar_id}
                className="bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedPillar(isExpanded ? null : pillar.pillar_id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-xs border border-slate-700">
                      {pillar.pillar_id}
                    </span>
                    <h3 className="text-sm font-bold text-white">{pillar.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                    <span>{pillar.aspects.length} Aspects</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 bg-[#090F1E] space-y-3">
                    {pillar.aspects.map((asp) => (
                      <div
                        key={asp.code}
                        className="p-3.5 bg-[#0F172A] border border-slate-800/80 rounded-xl font-mono text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-white flex items-center space-x-2">
                            <span className="text-amber-400 font-semibold">{asp.code}</span>
                            <span>{asp.name}</span>
                          </span>
                          <span className="text-[10px] text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-900 truncate max-w-xs">
                            {asp.columns}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-1">{asp.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: 77-Column Schema Coverage Checklist */}
      {activeTab === 'schema' && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                100% 77-Column Schema Coverage Verification
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Every single column across the 6 CSV files is ingested into direct or derived analytical features.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono font-bold text-xs rounded-xl">
              77 / 77 Columns Mapped
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
              <span className="text-sky-400 font-bold block mb-1">ball_by_ball.csv (33 Columns)</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                match_id, innings, overid, over_ball_num, innings_ball_num, batting_team_id, bowling_team_id, striker_id, striker_name, non_striker_id, non_striker_name, bowler_id, bowler_name, batting_type, bowling_type, batting_order, runs, is_four, is_six, is_wicket, dismissal_type_id, dismissal_type, dismissed_player_id, extras_type, extras1_runs, extras_2_runs, pace_or_spin, bowl_speed, stroke, delivery_style, over_or_around, on_or_off, delivery_ist_time.
              </p>
            </div>

            <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
              <span className="text-amber-400 font-bold block mb-1">matches.csv (22 Columns)</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                match_id, comp_id, match_number, match_date, stage, venue_id, venue_country, home_team_id, home_team, away_team_id, away_team, home_team_captain_id, away_team_captain_id, toss_win_team_id, toss_opted, man_of_the_match, first_inn_revised_overs, second_inn_revised_overs, revised_target, knock_out, win_team_id, result.
              </p>
            </div>

            <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
              <span className="text-purple-400 font-bold block mb-1">playing_eleven.csv (9 Columns)</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                match_id, team_id, player_id, batting_order, is_played, is_captain, is_wk, is_impact, is_impact_off.
              </p>
            </div>

            <div className="bg-[#090F1E] border border-slate-800 p-4 rounded-xl">
              <span className="text-emerald-400 font-bold block mb-1">Supporting Mappings (13 Columns)</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                competition_team_player_mapping.csv (6 cols), competitions.csv (4 cols: comp_id, comp_name, match_format, season), teams.csv (3 cols: comp_id, team_id, team_name).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
