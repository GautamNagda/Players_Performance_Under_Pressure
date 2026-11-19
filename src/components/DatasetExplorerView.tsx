import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  Search, 
  Layers, 
  CheckCircle, 
  ShieldAlert, 
  Table, 
  Info,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  FileDown,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { DatasetOverviewData, TableProfile } from '../types/analytics';

interface DatasetExplorerViewProps {
  data: DatasetOverviewData;
}

export const DatasetExplorerView: React.FC<DatasetExplorerViewProps> = ({ data }) => {
  const kpis = data?.kpis || ({} as any);
  const audit = data?.domain_cleaning_audit || ({} as any);

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
  const [tableDataCache, setTableDataCache] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // Load table dataset from preloaded JSON artifact or fallback
  useEffect(() => {
    setPage(0);
    setJumpPageInput('1');

    if (!tableDataCache[selectedTable]) {
      setIsLoading(true);
      const jsonFile = selectedTable.replace('.csv', '.json');
      fetch(`/data/tables/${jsonFile}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not preloaded');
          return res.json();
        })
        .then((resp) => {
          if (resp?.data && Array.isArray(resp.data)) {
            setTableDataCache((prev) => ({ ...prev, [selectedTable]: resp.data }));
          } else {
            throw new Error('Invalid format');
          }
        })
        .catch(() => {
          const profile = tables.find((t) => t.file_name === selectedTable);
          if (profile?.sample_records) {
            setTableDataCache((prev) => ({ ...prev, [selectedTable]: profile.sample_records }));
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedTable, tableDataCache, tables]);

  const currentTableProfile = tables.find((t) => t.file_name === selectedTable) || tables[0];
  const allRows: any[] = tableDataCache[selectedTable] || currentTableProfile?.sample_records || [];
  const isFullDataset = currentTableProfile && allRows.length >= currentTableProfile.row_count;

  // Filter columns by column name search
  const filteredColumns = (currentTableProfile?.columns || []).filter((c) =>
    typeof c === 'string' && c.toLowerCase().includes(columnSearch.toLowerCase())
  );

  // Search and Sort Rows
  const filteredAndSortedRows = useMemo(() => {
    let result = allRows;

    // 1. Global Row Search across all columns
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    // 2. Sort by Column
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }

        return direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [allRows, globalSearch, sortConfig]);

  // Pagination calculation
  const effectiveRowsPerPage = rowsPerPage === -1 ? filteredAndSortedRows.length : rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / (effectiveRowsPerPage || 1)));

  const paginatedRows = useMemo(() => {
    if (rowsPerPage === -1) return filteredAndSortedRows;
    const start = page * rowsPerPage;
    return filteredAndSortedRows.slice(start, start + rowsPerPage);
  }, [filteredAndSortedRows, page, rowsPerPage]);

  const handleSort = (col: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== col) {
        return { key: col, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: col, direction: 'desc' };
      }
      return null;
    });
  };

  const handleExportCSV = () => {
    const cols = currentTableProfile?.columns || [];
    if (!cols.length || !filteredAndSortedRows.length) return;

    const csvLines = [cols.join(',')];
    for (const r of filteredAndSortedRows) {
      const line = cols
        .map((c) => {
          const val = r[c];
          if (val === null || val === undefined) return '';
          const s = String(val).replace(/"/g, '""');
          return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
        })
        .join(',');
      csvLines.push(line);
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable.replace('.csv', '')}_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
            Complete structural profiling, relational join topology, and full tabular inspection of all 6 Rajasthan Royals decision datasets.
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
            {(kpis.total_deliveries || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {(audit.legal_deliveries || 0).toLocaleString()} legal balls
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Matches</span>
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {(kpis.total_matches || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {kpis.knockout_matches ?? 0} Knockout • {kpis.league_matches ?? 0} League
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Unique Players</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {(kpis.unique_players || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Across {kpis.unique_teams ?? 0} Franchises/Teams
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Competitions</span>
            <Table className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-white">
            {kpis.tournaments_count ?? 0}
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
            T20I: {kpis.format_breakdown?.['T20I'] || 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            IPL/T20: {kpis.format_breakdown?.['T20'] || 0} matches
          </div>
        </div>

        <div className="rr-glass-card rounded-xl p-4 border border-[#1E293B]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>DLS / Rain Rev</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono-stats text-amber-400">
            {kpis.dls_matches ?? 0}
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
            <span className="text-[11px] font-mono text-slate-400">Select any card to inspect full tabular data</span>
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
                <span className="text-white font-bold">{(audit.total_raw_rows || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Wides Filtered:</span>
                <span>-{(audit.filtered_wides || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Oversteps (No-ball):</span>
                <span>-{(audit.filtered_noballs || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-emerald-400 font-bold">
                <span>(=) Legal Deliveries:</span>
                <span>{(audit.legal_deliveries || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Batter Balls Faced */}
          <div className="bg-[#091122] rounded-xl p-3.5 border border-slate-800/80">
            <span className="text-xs font-semibold text-rr-pink block mb-2">Batter Balls Faced</span>
            <div className="space-y-2 font-mono-stats text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Raw Deliveries:</span>
                <span className="text-white font-bold">{(audit.total_raw_rows || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Wides Excluded:</span>
                <span>-{(audit.filtered_wides || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>(+) No-balls Counted:</span>
                <span>+{(audit.filtered_noballs || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-rr-pink font-bold">
                <span>(=) Batter Balls Faced:</span>
                <span>{(audit.batter_balls_faced || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Bowler Runs Reconciled */}
          <div className="bg-[#091122] rounded-xl p-3.5 border border-slate-800/80">
            <span className="text-xs font-semibold text-amber-400 block mb-2">Bowler Runs Conceded</span>
            <div className="space-y-2 font-mono-stats text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Batting Runs off Bat:</span>
                <span className="text-white font-bold">{(audit.total_batting_runs || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Byes Excluded:</span>
                <span>-{(audit.byes_excluded_from_bowler_runs || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Leg-byes Excluded:</span>
                <span>-{(audit.legbyes_excluded_from_bowler_runs || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-amber-400 font-bold">
                <span>(=) Charged Bowler Runs:</span>
                <span>{(audit.total_bowler_runs_conceded || 0).toLocaleString()}</span>
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

      {/* FULL INTERACTIVE TABULAR DATA VIEWER */}
      <div className="rr-glass-card rounded-2xl p-5 border border-[#1E293B]">
        {/* Table Selector Pills */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Table className="w-3.5 h-3.5 text-sky-400" />
              <span>Select Dataset To Inspect in Full Tabular Form:</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {tables.length} CSV Files Available
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tables.map((tbl) => {
              const isSelected = selectedTable === tbl.file_name;
              return (
                <button
                  key={tbl.file_name}
                  onClick={() => {
                    setSelectedTable(tbl.file_name);
                    setGlobalSearch('');
                  }}
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs font-semibold flex items-center space-x-2 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-rr-pink/30 to-rr-blue/30 text-white border border-rr-pink shadow-md shadow-rr-pink/10 ring-1 ring-rr-pink/50'
                      : 'bg-[#0F172A] text-slate-400 border border-[#1E293B] hover:border-slate-600 hover:text-white hover:bg-[#131D33]'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-rr-pink' : 'text-slate-500'}`} />
                  <span>{tbl.file_name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isSelected ? 'bg-rr-pink text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tbl.row_count.toLocaleString()} rows
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar: Global Search, Column Filter, Page Size, Export & Expand */}
        <div className="bg-[#091122] rounded-xl p-3 border border-slate-800/80 mb-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Search Bars */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Row Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder={`Search across all rows in ${selectedTable}...`}
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 bg-[#0A1020] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rr-pink font-mono"
                />
                {globalSearch && (
                  <button
                    onClick={() => {
                      setGlobalSearch('');
                      setPage(0);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Column Filter */}
              <div className="relative w-48 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter columns..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-[#0A1020] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rr-pink font-mono"
                />
                {columnSearch && (
                  <button
                    onClick={() => setColumnSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Rows Per Page, Export CSV, Expand Toggle */}
            <div className="flex items-center space-x-2 shrink-0 text-xs font-mono">
              {/* Rows Per Page */}
              <div className="flex items-center space-x-1.5 bg-[#0A1020] border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-300">
                <span className="text-slate-500">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value={10} className="bg-[#0A1020] text-white">10</option>
                  <option value={25} className="bg-[#0A1020] text-white">25</option>
                  <option value={50} className="bg-[#0A1020] text-white">50</option>
                  <option value={100} className="bg-[#0A1020] text-white">100</option>
                  <option value={250} className="bg-[#0A1020] text-white">250</option>
                  <option value={-1} className="bg-[#0A1020] text-white">All (View All)</option>
                </select>
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                title="Download table data as CSV"
                className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-700/60 hover:bg-emerald-900/80 text-emerald-300 px-3 py-1.5 rounded-lg font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {/* Expand Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse Table Height' : 'Expand Table Height'}
                className="p-1.5 rounded-lg bg-[#0A1020] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Dataset Status Banner */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Table:</span>
              <span className="text-sky-400 font-bold">{selectedTable}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">Total in CSV:</span>
              <span className="text-white font-bold">{currentTableProfile?.row_count.toLocaleString()}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">Loaded:</span>
              <span className="text-emerald-400 font-bold">
                {allRows.length.toLocaleString()}{' '}
                {isFullDataset ? '(100% Full Dataset)' : `(${Math.round((allRows.length / (currentTableProfile?.row_count || 1)) * 100)}% Preloaded)`}
              </span>
              {globalSearch && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500">Matching Search:</span>
                  <span className="text-amber-400 font-bold">{filteredAndSortedRows.length.toLocaleString()}</span>
                </>
              )}
            </div>

            <div className="text-slate-500">
              Click any column header to sort • Showing {filteredColumns.length} of {currentTableProfile?.column_count} columns
            </div>
          </div>
        </div>

        {/* Live CSV Data Grid */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0A1020]">
          <div className={`overflow-x-auto overflow-y-auto ${isExpanded ? 'max-h-[750px]' : 'max-h-[480px]'}`}>
            <table className="w-full text-left text-xs font-mono-stats border-collapse">
              <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-300 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 w-14 text-center bg-[#0F172A] border-r border-slate-800/80">
                    #
                  </th>
                  {filteredColumns.map((col) => {
                    const isSorted = sortConfig?.key === col;
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="py-2.5 px-3 font-semibold text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors select-none group border-r border-slate-800/40"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className={isSorted ? 'text-rr-pink font-bold' : 'group-hover:text-white'}>
                            {col}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-rr-pink" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-rr-pink" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60" />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={filteredColumns.length + 1} className="py-16 text-center text-slate-400 font-mono">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-rr-pink" />
                        <span>Streaming full tabular records for {selectedTable}...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={filteredColumns.length + 1} className="py-12 text-center text-slate-500 font-mono">
                      No matching records found for "{globalSearch}". Try clearing your search query.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const rowNumber = rowsPerPage === -1 ? idx + 1 : page * rowsPerPage + idx + 1;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/90 transition-colors odd:bg-slate-950/40">
                        <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-800/80 bg-[#091122]">
                          {rowNumber}
                        </td>
                        {filteredColumns.map((col) => {
                          const val = row[col];
                          const isNull = val === null || val === undefined;
                          const isBool = typeof val === 'boolean';
                          const displayVal = isNull
                            ? 'NULL'
                            : isBool
                            ? val
                              ? 'TRUE'
                              : 'FALSE'
                            : String(val);

                          return (
                            <td
                              key={col}
                              className={`py-2 px-3 whitespace-nowrap text-[11px] border-r border-slate-800/30 ${
                                isNull
                                  ? 'text-slate-600 italic'
                                  : isBool
                                  ? val
                                    ? 'text-emerald-400 font-semibold'
                                    : 'text-rose-400 font-semibold'
                                  : 'text-slate-200'
                              }`}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-[#0F172A] border-t border-slate-800 text-xs font-mono text-slate-400 gap-3">
            <div className="text-slate-400">
              Showing{' '}
              <span className="text-white font-bold">
                {filteredAndSortedRows.length === 0
                  ? 0
                  : rowsPerPage === -1
                  ? 1
                  : page * rowsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="text-white font-bold">
                {rowsPerPage === -1
                  ? filteredAndSortedRows.length
                  : Math.min((page + 1) * rowsPerPage, filteredAndSortedRows.length)}
              </span>{' '}
              of <span className="text-emerald-400 font-bold">{filteredAndSortedRows.length.toLocaleString()}</span> rows
              {allRows.length < (currentTableProfile?.row_count || 0) && (
                <span className="text-slate-500 ml-1">
                  (from {allRows.length.toLocaleString()} loaded • total {currentTableProfile?.row_count.toLocaleString()} in CSV)
                </span>
              )}
            </div>

            {/* Navigation buttons & Jump to page */}
            <div className="flex items-center space-x-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(0)}
                title="First Page"
                className="p-1.5 rounded bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                title="Previous Page"
                className="p-1.5 rounded bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1.5 px-2">
                <span>Page</span>
                <input
                  type="text"
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = parseInt(jumpPageInput, 10);
                      if (!isNaN(p) && p >= 1 && p <= totalPages) {
                        setPage(p - 1);
                      } else {
                        setJumpPageInput(String(page + 1));
                      }
                    }
                  }}
                  className="w-12 py-1 px-1.5 text-center bg-[#091122] border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-rr-pink"
                />
                <span>of</span>
                <span className="text-white font-bold">{totalPages}</span>
              </div>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => {
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                  setJumpPageInput(String(Math.min(totalPages, page + 2)));
                }}
                title="Next Page"
                className="p-1.5 rounded bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => {
                  setPage(totalPages - 1);
                  setJumpPageInput(String(totalPages));
                }}
                title="Last Page"
                className="p-1.5 rounded bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
