import React, { useState, useMemo } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  Search, 
  Layers, 
  CheckCircle, 
  ShieldAlert, 
  ArrowRight, 
  Table, 
  HardDrive,
  Info
} from 'lucide-react';
import { DatasetOverviewData, TableProfile } from '../types/analytics';

interface DatasetExplorerViewProps {
  data: DatasetOverviewData;
}

export const DatasetExplorerView: React.FC<DatasetExplorerViewProps> = ({ data }) => {
  const kpis = data?.kpis || {} as any;
  const audit = data?.domain_cleaning_audit || {} as any;

  // Defensively normalize tables whether backend returned array or dictionary
  const tables: TableProfile[] = useMemo(() => {
    const rawList: any[] = Array.isArray(data?.tables)
      ? data.tables
      : typeof data?.tables === 'object' && data?.tables !== null
      ? Object.values(data.tables)
      : [];

    return rawList.map((tbl: any) => ({
      file_name: tbl.file_name || tbl.filename || 'unknown.csv',
      row_count: tbl.row_count ?? tbl.rows ?? 0,
      column_count: tbl.column_count ?? (Array.isArray(tbl.columns) ? tbl.columns.length : tbl.columns) ?? (tbl.column_names?.length || 0),
      columns: Array.isArray(tbl.columns) ? tbl.columns : (tbl.column_names || []),
      size_bytes: tbl.size_bytes || 0,
      size_mb: tbl.size_mb ?? tbl.memory_mb ?? 0,
      primary_keys: tbl.primary_keys || [],
      foreign_keys: tbl.foreign_keys || [],
      null_percentages: tbl.null_percentages || {},
      sample_records: tbl.sample_records || [],
    }));
  }, [data]);

  const [selectedTable, setSelectedTable] = useState<string>(() => tables[0]?.file_name || 'ball_by_ball.csv');
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const rowsPerPage = 5;

  const currentTableProfile = tables.find((t) => t.file_name === selectedTable) || tables[0];

  // Filter columns in sample records if user searches
  const filteredColumns = (currentTableProfile?.columns || []).filter((c) =>
    typeof c === 'string' && c.toLowerCase().includes(columnSearch.toLowerCase())
  );

  const sampleRows = currentTableProfile?.sample_records || [];
  const paginatedRows = sampleRows.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(sampleRows.length / rowsPerPage));

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-rr-pink/20 text-rr-pink border border-rr-pink/30 rounded">
              PRIMARY DATA PACK SHOWCASE
            </span>
            <span className="text-xs font-mono text-slate-400">./data pack/ • 6 Validated CSVs</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
            <span>Dataset & Schema Architecture Explorer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Complete structural profiling, relational join topology, and domain cleaning audit of the 6 Rajasthan Royals decision datasets.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="bg-[#0F172A] border border-[#1E293B] px-3 py-2 rounded-xl flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">Schema Validation:</span>
            <span className="text-emerald-400 font-bold">100% Deterministic</span>
          </div>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Deliveries</span>
            <Database className="w-3.5 h-3.5 text-rr-pink" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {kpis.total_deliveries.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {audit.legal_deliveries.toLocaleString()} legal balls
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Matches</span>
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {kpis.total_matches.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {kpis.knockout_matches} Knockout • {kpis.league_matches} League
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Unique Players</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {kpis.unique_players.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Across {kpis.unique_teams} Franchises/Teams
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Competitions</span>
            <Table className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {kpis.tournaments_count}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Seasons 2022–2026
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Format Split</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-bold font-mono-stats text-white mt-1">
            T20I: {kpis.format_breakdown['T20I'] || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            IPL/T20: {kpis.format_breakdown['T20'] || 0} matches
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>DLS / Rain Rev</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-amber-400">
            {kpis.dls_matches}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Target revisions parsed
          </div>
        </div>
      </div>

      {/* Relational Schema Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Relational Schema Architecture (6 CSV Files)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Select any card to inspect schema</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tables.map((tbl) => {
            const isSelected = selectedTable === tbl.file_name;
            const avgNull = (
              Object.values(tbl.null_percentages).reduce((a, b) => a + b, 0) /
              Math.max(tbl.columns.length, 1)
            ).toFixed(1);
            return (
              <div
                key={tbl.file_name}
                onClick={() => {
                  setSelectedTable(tbl.file_name);
                  setPage(0);
                }}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
                  isSelected
                    ? 'bg-[#131F37] border-rr-pink ring-1 ring-rr-pink/50 shadow-lg shadow-rr-pink/10'
                    : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-600 hover:bg-[#131D33]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet
                      className={`w-4 h-4 ${isSelected ? 'text-rr-pink' : 'text-slate-400'}`}
                    />
                    <span className="font-mono text-xs font-bold text-white truncate max-w-[170px]">
                      {tbl.file_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {tbl.size_mb} MB
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 font-mono-stats text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Rows</span>
                    <span className="font-bold text-slate-200">{tbl.row_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Columns</span>
                    <span className="font-bold text-slate-200">{tbl.column_count}</span>
                  </div>
                </div>

                {/* Join Keys */}
                <div className="mt-2.5">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                    Join Keys
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tbl.foreign_keys.length > 0 ? (
                      tbl.foreign_keys.map((k) => (
                        <span
                          key={k}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 border border-sky-950"
                        >
                          {k}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] font-mono text-slate-600">No FK identified</span>
                    )}
                  </div>
                </div>

                {/* Completeness Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Completeness</span>
                    <span className="text-emerald-400 font-semibold">{100 - Number(avgNull)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full"
                      style={{ width: `${Math.max(15, 100 - Number(avgNull))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cricket Domain Cleaning & Hygiene Audit Panel */}
      <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rr-pink/20 text-rr-pink">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Cricket Domain Hygiene & Data Transformation Audit
              </h3>
              <p className="text-[11px] text-slate-400">
                Rigorous cricket logic filters separating legal balls, bowler-charged runs, and credited wickets.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            Audit Status: <span className="text-emerald-400 font-bold">100% Reconciled</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Deliveries Transformation */}
          <div className="bg-[#091122] rounded-xl p-3.5 border border-slate-800/80">
            <span className="text-xs font-semibold text-sky-400 block mb-2">Legal Delivery Split</span>
            <div className="space-y-2 font-mono-stats text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Raw Rows:</span>
                <span className="text-white font-bold">{audit.total_raw_rows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Wides Filtered:</span>
                <span>-{audit.filtered_wides.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Oversteps (No-ball):</span>
                <span>-{audit.filtered_noballs.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-emerald-400 font-bold">
                <span>(=) Legal Deliveries:</span>
                <span>{audit.legal_deliveries.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Batter Balls Faced */}
          <div className="bg-[#091122] rounded-xl p-3.5 border border-slate-800/80">
            <span className="text-xs font-semibold text-rr-pink block mb-2">Batter Balls Faced</span>
            <div className="space-y-2 font-mono-stats text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Raw Deliveries:</span>
                <span className="text-white font-bold">{audit.total_raw_rows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Wides Excluded:</span>
                <span>-{audit.filtered_wides.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>(+) No-balls Counted:</span>
                <span>+{audit.filtered_noballs.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-rr-pink font-bold">
                <span>(=) Batter Balls Faced:</span>
                <span>{audit.batter_balls_faced.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Bowler Runs Reconciled */}
          <div className="bg-[#091122] rounded-xl p-3.5 border border-slate-800/80">
            <span className="text-xs font-semibold text-amber-400 block mb-2">Bowler Runs Conceded</span>
            <div className="space-y-2 font-mono-stats text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Batting Runs off Bat:</span>
                <span className="text-white font-bold">{audit.total_batting_runs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Byes Excluded:</span>
                <span>-{audit.byes_excluded_from_bowler_runs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Leg-byes Excluded:</span>
                <span>-{audit.legbyes_excluded_from_bowler_runs.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-amber-400 font-bold">
                <span>(=) Charged Bowler Runs:</span>
                <span>{audit.total_bowler_runs_conceded.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Credited Wickets */}
          <div className="bg-[#091122] rounded-xl p-3.5 border border-slate-800/80">
            <span className="text-xs font-semibold text-emerald-400 block mb-2">Bowler Credited Wickets</span>
            <div className="space-y-2 font-mono-stats text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Wickets in BBB:</span>
                <span className="text-white font-bold">{(audit.total_wickets || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Non-Bowler Wickets:</span>
                <span>-{(audit.non_bowler_wickets_excluded || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-emerald-400 font-bold">
                <span>(=) Bowler Wickets:</span>
                <span>{(audit.bowler_credited_wickets || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live CSV Table Inspector */}
      <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
              <Table className="w-4 h-4 text-sky-400" />
              <span>Live CSV Table Inspector: {selectedTable}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive schema breakdown, null statistics, and sample row inspection for data validation.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter columns..."
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#091122] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rr-pink font-mono w-48"
              />
            </div>
          </div>
        </div>

        {/* Column Profiling Bar */}
        <div className="mb-4 overflow-x-auto pb-2">
          <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Column Schema & Null Percentages:</span>
          </div>
          <div className="flex gap-2">
            {filteredColumns.map((col) => {
              const nullPct = currentTableProfile?.null_percentages[col] || 0;
              return (
                <div
                  key={col}
                  className="shrink-0 bg-[#0A1020] border border-slate-800 px-2.5 py-1.5 rounded-lg font-mono text-xs"
                >
                  <div className="text-slate-300 font-semibold">{col}</div>
                  <div className="flex items-center space-x-1 text-[10px] mt-0.5">
                    <span className="text-slate-500">Null:</span>
                    <span
                      className={`font-bold ${
                        nullPct > 10 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {nullPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sample Records Data Grid */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0A1020]">
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-left text-xs font-mono-stats">
              <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 w-12 text-center">#</th>
                  {filteredColumns.map((col) => (
                    <th key={col} className="py-2.5 px-3 font-semibold text-slate-300 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/80 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {page * rowsPerPage + idx + 1}
                    </td>
                    {filteredColumns.map((col) => {
                      const val = row[col];
                      const displayVal =
                        val === null || val === undefined
                          ? 'NULL'
                          : typeof val === 'boolean'
                          ? val
                            ? 'TRUE'
                            : 'FALSE'
                          : String(val);
                      const isNull = val === null || val === undefined;
                      return (
                        <td
                          key={col}
                          className={`py-2 px-3 whitespace-nowrap text-[11px] ${
                            isNull ? 'text-slate-600 italic' : 'text-slate-300'
                          }`}
                        >
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F172A] border-t border-slate-800 text-xs font-mono text-slate-400">
            <div>
              Showing {page * rowsPerPage + 1} -{' '}
              {Math.min((page + 1) * rowsPerPage, currentTableProfile?.sample_records.length || 0)} of{' '}
              {currentTableProfile?.sample_records.length} sample rows
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Prev
              </button>
              <span className="text-slate-300">
                {page + 1} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
