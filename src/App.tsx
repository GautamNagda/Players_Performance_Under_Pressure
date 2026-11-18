import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { DatasetExplorerView } from './components/DatasetExplorerView';
import { BattersView } from './components/BattersView';
import { BowlersView } from './components/BowlersView';
import { PlayerSearchView } from './components/PlayerSearchView';
import { MethodologyView } from './components/MethodologyView';
import { SandboxView } from './components/SandboxView';
import { 
  DatasetOverviewData, 
  BattersPGAIData, 
  BowlersPGAIData, 
  AnalyticsMetaData 
} from './types/analytics';
import { 
  AlertCircle
} from 'lucide-react';

export const App: React.FC = () => {
  // Main focus requested: display top 10 batsmen and bowlers
  const [activeTab, setActiveTab] = useState<NavTab>('batters');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [datasetOverview, setDatasetOverview] = useState<DatasetOverviewData | null>(null);
  const [battersData, setBattersData] = useState<BattersPGAIData | null>(null);
  const [bowlersData, setBowlersData] = useState<BowlersPGAIData | null>(null);
  const [analyticsMeta, setAnalyticsMeta] = useState<AnalyticsMetaData | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [resOverview, resBatters, resBowlers, resMeta] = await Promise.all([
          fetch('/data/dataset_overview.json'),
          fetch('/data/batters_pgai.json'),
          fetch('/data/bowlers_pgai.json'),
          fetch('/data/analytics_meta.json'),
        ]);

        if (!resOverview.ok || !resBatters.ok || !resBowlers.ok) {
          throw new Error('Failed to load JSON analytics artifacts from public/data/');
        }

        const dataOverview: DatasetOverviewData = await resOverview.json();
        const dataBatters: BattersPGAIData = await resBatters.json();
        const dataBowlers: BowlersPGAIData = await resBowlers.json();
        const dataMeta: AnalyticsMetaData = await resMeta.json();

        setDatasetOverview(dataOverview);
        setBattersData(dataBatters);
        setBowlersData(dataBowlers);
        setAnalyticsMeta(dataMeta);
        setLoading(false);
      } catch (err: any) {
        console.error('Data load error:', err);
        setError(err.message || 'Error loading dashboard data');
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rr-pink to-rr-blue flex items-center justify-center animate-pulse shadow-xl shadow-rr-pink/30">
            <span className="text-2xl font-black">RR</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-rr-pink/20 filter blur-sm animate-ping"></div>
        </div>
        <div className="text-center font-mono space-y-1">
          <h2 className="text-sm font-bold tracking-wider uppercase text-rr-pink">
            Rajasthan Royals Analytics Engine
          </h2>
          <p className="text-xs text-slate-400">Loading 199,067 White-Ball Deliveries & Decision Models...</p>
        </div>
      </div>
    );
  }

  if (error || !datasetOverview || !battersData || !bowlersData) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md bg-[#0F172A] border border-red-500/30 p-6 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold">Analytics Engine Offline</h3>
          <p className="text-xs text-slate-400 font-mono">{error || 'Data artifacts missing'}</p>
          <div className="pt-2 text-xs font-mono text-slate-500">
            Ensure <code className="text-amber-400">python scripts/build_rr_analytics.py</code> ran successfully.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#080D1A] text-[#F8FAFC]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        totalDeliveries={datasetOverview.kpis.total_deliveries}
        totalMatches={datasetOverview.kpis.total_matches}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Top Header Strip */}
        <header className="h-14 border-b border-[#1E293B] bg-[#0A1020]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              RR Analytics War Room
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {activeTab === 'batters' && 'Top 10 Pressure Batsmen (PGAI)'}
              {activeTab === 'bowlers' && 'Top 10 Pressure Bowlers (B-PGAI)'}
              {activeTab === 'search' && 'Player Pressure Search & Matchup Scout'}
              {activeTab === 'methodology' && 'Methodology & Code Architecture (8 Pillars)'}
              {activeTab === 'dataset' && 'Dataset Hygiene & Domain Cleaning Audit'}
              {activeTab === 'sandbox' && 'Selection Weights Simulator'}
            </span>
          </div>

          <div className="flex items-center space-x-4 font-mono-stats text-xs">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400">
              <span className="text-slate-500">Models:</span>
              <span className="text-rr-pink font-semibold">xR (LightGBM)</span>
              <span className="text-slate-600">•</span>
              <span className="text-blue-400 font-semibold">WPA (XGBoost)</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>CALIBRATED</span>
            </div>
          </div>
        </header>

        {/* View Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'batters' && <BattersView data={battersData} />}
          {activeTab === 'bowlers' && <BowlersView data={bowlersData} />}
          {activeTab === 'search' && (
            <PlayerSearchView
              batters={battersData.all_batters || battersData.top_10}
              bowlers={bowlersData.all_bowlers || bowlersData.top_10}
            />
          )}
          {activeTab === 'methodology' && (
            <MethodologyView meta={analyticsMeta} />
          )}
          {activeTab === 'dataset' && <DatasetExplorerView data={datasetOverview} />}
          {activeTab === 'sandbox' && (
            <SandboxView
              battersData={battersData}
              bowlersData={bowlersData}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
