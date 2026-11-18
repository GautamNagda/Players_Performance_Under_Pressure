// Updated TypeScript schemas aligned with the Master Cricket Analytics Framework

export interface DatasetKPIs {
  total_deliveries: number;
  total_matches: number;
  unique_players: number;
  unique_teams: number;
  tournaments_count: number;
  format_breakdown: Record<string, number>;
  season_breakdown: Record<string, number>;
  dls_matches: number;
  knockout_matches: number;
  league_matches: number;
}

export interface DomainCleaningAudit {
  total_raw_rows: number;
  filtered_wides: number;
  filtered_noballs: number;
  byes_excluded_from_bowler_runs: number;
  legbyes_excluded_from_bowler_runs: number;
  other_extras: number;
  legal_deliveries: number;
  batter_balls_faced: number;
  total_wickets: number;
  bowler_credited_wickets: number;
  non_bowler_wickets_excluded: number;
  total_batting_runs: number;
  total_bowler_runs_conceded: number;
}

export interface TableProfile {
  file_name: string;
  row_count: number;
  column_count: number;
  columns: string[];
  size_bytes: number;
  size_mb: number;
  primary_keys: string[];
  foreign_keys: string[];
  null_percentages: Record<string, number>;
  sample_records: Record<string, any>[];
}

export interface DatasetOverviewData {
  kpis: DatasetKPIs;
  domain_cleaning_audit: DomainCleaningAudit;
  tables: TableProfile[];
}

export interface NemesisLogEntry {
  bowler_name: string;
  balls: number;
  runs: number;
  dismissals: number;
  sr: number;
  avg: number;
}

export interface BunnyLogEntry {
  batter_name: string;
  balls: number;
  runs: number;
  dismissals: number;
  sr: number;
  avg: number;
}

export interface PressureMatchLog {
  match_id: number;
  date: string;
  runs: number;
  balls: number;
  wpa: number;
  won: boolean;
  wickets?: number;
}

export interface BatterProfile {
  rank: number;
  player_id: number;
  player_name: string;
  balls_faced: number;
  total_runs: number;
  strike_rate: number;
  pressure_balls: number;
  z_pce: number;
  z_prr: number;
  z_giq: number;
  pgai_100: number;
  finish_rate: number;
  archetype: string;
  nemesis_log: NemesisLogEntry[];
  last_pressure_matches: PressureMatchLog[];
}

export interface BattersPGAIData {
  formula: string;
  cutoff_balls: number;
  total_evaluated: number;
  top_10: BatterProfile[];
  all_batters: BatterProfile[];
}

export interface BowlerProfile {
  rank: number;
  player_id: number;
  player_name: string;
  legal_balls: number;
  wickets: number;
  runs_conceded: number;
  economy: number;
  pressure_balls: number;
  z_bce: number;
  z_bcr: number;
  z_bgi: number;
  b_pgai_100: number;
  archetype: string;
  rating_band?: string;
  bci?: number;
  bpi?: number;
  consistency_score?: number;
  leverage_exposure?: number;
  reliability_exposure?: number;
  bunnies_log: BunnyLogEntry[];
  last_pressure_matches: PressureMatchLog[];
}

export interface BowlersPGAIData {
  formula: string;
  cutoff_balls: number;
  total_evaluated: number;
  top_10: BowlerProfile[];
  all_bowlers: BowlerProfile[];
}

export interface FrameworkAspect {
  code: string;
  name: string;
  columns: string;
  description: string;
}

export interface FrameworkPillar {
  pillar_id: number;
  title: string;
  aspects: FrameworkAspect[];
}

export interface AnalyticsMetaData {
  execution_time_sec: number;
  pillars: FrameworkPillar[];
  formulas: {
    batters: {
      equation: string;
      pce: string;
      prr: string;
      giq: string;
      multipliers: string;
    };
    bowlers: {
      equation: string;
      bce: string;
      bcr: string;
      bgi: string;
      multipliers: string;
    };
  };
}
