"""
build_rr_analytics.py
Deterministic Python Analytics Engine implementing the exact Master Cricket Analytics
Framework, PGAI_100 (pgai100.py) and B-PGAI_100 (b_pgai100.py) specifications.
"""

from __future__ import annotations

import os
import sys
import json
import time
import warnings
from pathlib import Path
from typing import Dict, Any, List, Set, Iterable

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
import lightgbm as lgb
import xgboost as xgb

# Suppress pandas & sklearn future downcasting/deprecations
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
try:
    pd.set_option("future.no_silent_downcasting", True)
except Exception:
    pass

# Ensure project root and scripts dir are in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
for p in [str(PROJECT_ROOT), str(SCRIPTS_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ----------------------------------------------------------------- CONFIG
MIN_BAT_BALLS = 300
MIN_BOWL_BALLS = 240
K_SHRINK = 50.0                    # Empirical-Bayes shrinkage constant
N_FOLDS = 3                        # Out-of-fold folds for xR, xW, WP models
FALSE_SHOT_LABELS = {"edge", "beaten", "missed", "false shot", "mistimed", "top edge"}
NON_BOWLER_OUTS = {"none", "run out", "retired hurt", "retired out", "retired not out",
                   "obstructing the field", "timed out"}

BBB_COLS = {
    "match_id", "innings", "innings_ball_num", "over_ball_num", "overid", "runs",
    "extras_type", "extras1_runs", "extras_2_runs", "is_wicket", "is_four", "is_six",
    "dismissal_type", "dismissed_player_id", "striker_id", "striker_name",
    "non_striker_id", "bowler_id", "bowler_name", "batting_team_id", "bowling_team_id",
    "batting_order", "bowl_speed", "pace_or_spin", "delivery_style", "on_or_off",
    "over_or_around", "stroke", "batting_type", "bowling_type", "delivery_ist_time",
}

MATCH_COLS = [
    "match_id", "comp_id", "match_date", "venue_id", "home_team_id",
    "away_team_id", "toss_win_team_id", "knock_out", "win_team_id",
    "first_inn_revised_overs", "second_inn_revised_overs", "revised_target", "result"
]


def scale100(s: pd.Series, higher: bool = True) -> pd.Series:
    """Robust 5th-95th percentile min-max normalization to 0-100 scale."""
    x = pd.to_numeric(s, errors="coerce").replace([np.inf, -np.inf], np.nan)
    if not higher:
        x = -x
    if x.notna().sum() < 2:
        return pd.Series(50.0, index=s.index)
    lo, hi = x.quantile([0.05, 0.95])
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        return pd.Series(50.0, index=s.index)
    return ((x.clip(lo, hi) - lo) / (hi - lo) * 100.0).fillna(50.0)


def winsorized_z(s: pd.Series, limit: float = 3.0) -> pd.Series:
    """Winsorize raw observations at 1st/99th percentiles, then z-standardize."""
    x = pd.to_numeric(s, errors="coerce").replace([np.inf, -np.inf], np.nan)
    if x.notna().sum() < 2:
        return pd.Series(0.0, index=s.index)
    low, high = x.quantile([0.01, 0.99])
    x = x.clip(low, high)
    sd = x.std(ddof=0)
    if not np.isfinite(sd) or sd < 1e-12:
        return pd.Series(0.0, index=s.index)
    z = (x - x.mean()) / sd
    return z.clip(-limit, limit).fillna(0.0)


def oof_predict(model_fn, X, y, groups, proba=False):
    """Out-of-fold predictions grouped by match -> zero in-sample data leakage."""
    out = np.zeros(len(X), dtype=np.float32)
    for tr, va in GroupKFold(N_FOLDS).split(X, y, groups):
        m = model_fn().fit(X.iloc[tr], y.iloc[tr])
        out[va] = m.predict_proba(X.iloc[va])[:, 1] if proba else m.predict(X.iloc[va])
    return out


def find_data_pack_dir() -> Path:
    candidates = [
        PROJECT_ROOT / "Data Pack",
        PROJECT_ROOT / "data pack",
        Path("Data Pack"),
        Path("data pack"),
        Path("./Data Pack"),
        Path("./data pack"),
        Path("../Data Pack"),
    ]
    for c in candidates:
        if c.exists() and (c / "ball_by_ball.csv").exists():
            return c
    for root_cand in [PROJECT_ROOT, Path(".")]:
        if root_cand.exists():
            for p in root_cand.iterdir():
                if p.is_dir() and "data" in p.name.lower() and "pack" in p.name.lower():
                    if (p / "ball_by_ball.csv").exists():
                        return p
    raise FileNotFoundError("Could not locate './data pack/' directory with required CSV files.")


def run_pipeline():
    start_time = time.time()
    print("=" * 75)
    print("PLAYERS UNDER PRESSURE - RAJASTHAN ROYALS DECISION-INTELLIGENCE ENGINE")
    print("=" * 75)

    data_dir = find_data_pack_dir()
    print(f"[*] Reading dataset from: {data_dir.resolve()}")

    out_dir = PROJECT_ROOT / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load CSVs and generate Table Profiles
    files_to_load = [
        "ball_by_ball.csv",
        "competition_team_player_mapping.csv",
        "competitions.csv",
        "matches.csv",
        "playing_eleven.csv",
        "teams.csv"
    ]

    table_key_metadata = {
        "ball_by_ball.csv": {
            "primary_keys": ["match_id", "innings", "innings_ball_num"],
            "foreign_keys": ["match_id", "striker_id", "non_striker_id", "bowler_id", "batting_team_id", "bowling_team_id"]
        },
        "matches.csv": {
            "primary_keys": ["match_id"],
            "foreign_keys": ["comp_id", "venue_id", "home_team_id", "away_team_id", "toss_win_team_id", "win_team_id"]
        },
        "competitions.csv": {
            "primary_keys": ["comp_id"],
            "foreign_keys": []
        },
        "teams.csv": {
            "primary_keys": ["team_id"],
            "foreign_keys": []
        },
        "playing_eleven.csv": {
            "primary_keys": ["match_id", "player_id"],
            "foreign_keys": ["match_id", "team_id", "player_id"]
        },
        "competition_team_player_mapping.csv": {
            "primary_keys": ["comp_id", "team_id", "player_id"],
            "foreign_keys": ["comp_id", "team_id", "player_id"]
        }
    }

    raw_dfs: Dict[str, pd.DataFrame] = {}
    table_profiles: List[Dict[str, Any]] = []

    for fname in files_to_load:
        fpath = data_dir / fname
        if not fpath.exists():
            for fp in data_dir.glob("*.csv"):
                if fp.name.lower() == fname.lower():
                    fpath = fp
                    break
        print(f"  -> Loading {fpath.name}...")
        df_raw = pd.read_csv(fpath, low_memory=False)
        raw_dfs[fname] = df_raw

        null_counts = df_raw.isnull().sum()
        null_pct = (null_counts / len(df_raw) * 100).round(2).to_dict()
        file_size_bytes = fpath.stat().st_size if fpath.exists() else int(df_raw.memory_usage(deep=True).sum())
        meta_keys = table_key_metadata.get(fname, {"primary_keys": [], "foreign_keys": []})

        table_profiles.append({
            "file_name": fname,
            "filename": fname,
            "row_count": int(len(df_raw)),
            "rows": int(len(df_raw)),
            "column_count": int(len(df_raw.columns)),
            "columns": list(df_raw.columns),
            "column_names": list(df_raw.columns),
            "size_bytes": int(file_size_bytes),
            "size_mb": round(file_size_bytes / (1024 * 1024), 2),
            "memory_mb": round(file_size_bytes / (1024 * 1024), 2),
            "primary_keys": meta_keys["primary_keys"],
            "foreign_keys": meta_keys["foreign_keys"],
            "null_percentages": null_pct,
            "sample_records": df_raw.head(25).replace({np.nan: None}).to_dict(orient="records")
        })

    bbb = raw_dfs["ball_by_ball.csv"]
    matches = raw_dfs["matches.csv"]
    competitions = raw_dfs["competitions.csv"]
    teams = raw_dfs["teams.csv"]
    p11 = raw_dfs["playing_eleven.csv"]

    # 2. Cricket Domain Hygiene Audit
    print("\n[*] Performing Cricket Domain Data Hygiene Audit...")
    total_deliveries = len(bbb)
    wides_count = int(bbb["extras_type"].str.lower().eq("wide").sum())
    noballs_count = int(bbb["extras_type"].str.lower().str.contains("noball|no.ball", regex=True).sum())
    byes_count = int(bbb["extras_type"].str.lower().eq("byes").sum())
    legbyes_count = int(bbb["extras_type"].str.lower().eq("legbyes").sum())
    other_extras = int(bbb["extras_type"].notnull().sum() - (wides_count + noballs_count + byes_count + legbyes_count))

    legal_deliveries = total_deliveries - (wides_count + noballs_count)
    batter_balls_faced = total_deliveries - wides_count

    non_bowler_wkt_mask = bbb["is_wicket"] & bbb["dismissal_type"].isin(NON_BOWLER_OUTS)
    bowler_wkt_mask = bbb["is_wicket"] & ~bbb["dismissal_type"].isin(NON_BOWLER_OUTS)

    extras_total = bbb["extras1_runs"].fillna(0) + bbb["extras_2_runs"].fillna(0)
    bowler_runs_series = bbb["runs"] + np.where(~bbb["extras_type"].isin(["byes", "legbyes"]), extras_total, 0)

    matches_comp = matches.merge(competitions, on="comp_id", how="left")
    format_counts = matches_comp["match_format"].value_counts().to_dict()
    season_counts = matches_comp["season"].value_counts().to_dict()

    dataset_overview_json = {
        "kpis": {
            "total_deliveries": total_deliveries,
            "total_matches": len(matches),
            "unique_players": int(len(set(bbb["striker_id"]).union(set(bbb["bowler_id"])))),
            "unique_teams": int(teams["team_id"].nunique()),
            "tournaments_count": int(competitions["comp_id"].nunique()),
            "format_breakdown": format_counts,
            "season_breakdown": season_counts,
            "dls_matches": int(matches["revised_target"].notna().sum()),
            "knockout_matches": int((matches["knock_out"] == 1).sum()),
            "league_matches": int((matches["knock_out"] == 0).sum())
        },
        "domain_cleaning_audit": {
            "total_raw_rows": total_deliveries,
            "filtered_wides": wides_count,
            "filtered_noballs": noballs_count,
            "byes_excluded_from_bowler_runs": byes_count,
            "legbyes_excluded_from_bowler_runs": legbyes_count,
            "other_extras": other_extras,
            "legal_deliveries": legal_deliveries,
            "batter_balls_faced": batter_balls_faced,
            "total_wickets": int(bbb["is_wicket"].sum()),
            "bowler_credited_wickets": int(bowler_wkt_mask.sum()),
            "non_bowler_wickets_excluded": int(non_bowler_wkt_mask.sum()),
            "total_batting_runs": int(bbb["runs"].sum()),
            "total_bowler_runs_conceded": int(bowler_runs_series.sum())
        },
        "tables": table_profiles
    }

    with open(out_dir / "dataset_overview.json", "w", encoding="utf-8") as f:
        json.dump(dataset_overview_json, f, indent=2)
    print(f"[✓] Exported {out_dir / 'dataset_overview.json'}")

    # Export Full/Rich Table Datasets for Deep Tabular Inspection
    tables_dir = out_dir / "tables"
    tables_dir.mkdir(parents=True, exist_ok=True)
    table_limits = {
        "competitions.csv": None,
        "teams.csv": None,
        "matches.csv": None,
        "competition_team_player_mapping.csv": None,
        "playing_eleven.csv": 5000,
        "ball_by_ball.csv": 2000,
    }
    for fname, lim in table_limits.items():
        if fname in raw_dfs:
            df_full = raw_dfs[fname]
            df_slice = df_full if lim is None else df_full.head(lim)
            records = df_slice.replace({np.nan: None}).to_dict(orient="records")
            tbl_payload = {
                "file_name": fname,
                "total_rows": len(df_full),
                "returned_rows": len(records),
                "columns": list(df_full.columns),
                "data": records
            }
            with open(tables_dir / fname.replace(".csv", ".json"), "w", encoding="utf-8") as f:
                json.dump(tbl_payload, f)
    print(f"[✓] Exported interactive table datasets to {tables_dir}")

    # 3. Merging & Feature Engineering for Spec Formulas
    print("\n[*] Preparing Unified Match Dataset...")
    df = (bbb.merge(matches[MATCH_COLS], on="match_id", how="left")
             .merge(competitions[["comp_id", "match_format"]], on="comp_id", how="left"))
    # Filter to White-Ball 20-Over Cricket (T20 & T20I), drop no-results
    df = df[df["match_format"].isin(["T20", "T20I"]) & df["win_team_id"].notna()].copy()
    df["match_date"] = pd.to_datetime(df["match_date"])
    df = df.sort_values(["match_date", "match_id", "innings", "innings_ball_num"], ignore_index=True)

    # Non-striker batting order from playing_eleven (for tail-ender protection)
    ns = p11.rename(columns={"player_id": "non_striker_id", "batting_order": "ns_order"})
    df = df.merge(ns.drop_duplicates(["match_id", "non_striker_id"])[["match_id", "non_striker_id", "ns_order"]],
                  on=["match_id", "non_striker_id"], how="left")

    # Bowler role load from playing_eleven
    role = p11.drop_duplicates(["match_id", "player_id"]).rename(columns={"player_id": "bowler_id"})
    for rc in ["is_captain", "is_impact_off"]:
        if rc not in role: role[rc] = 0
    df = df.merge(role[["match_id", "bowler_id", "is_captain", "is_impact_off"]], on=["match_id", "bowler_id"], how="left")
    df["is_captain"] = df["is_captain"].fillna(0).astype(float)
    df["is_impact_off"] = df["is_impact_off"].fillna(0).astype(float)
    df["role_load"] = 0.5 * df["is_captain"] + 0.5 * df["is_impact_off"]

    GI = ["match_id", "innings"]
    GB = ["match_id", "innings", "striker_id"]
    GBW = ["match_id", "innings", "bowler_id"]

    df["extras_type"] = df["extras_type"].fillna("none").str.lower()
    df["dismissal_type"] = df["dismissal_type"].fillna("none").str.lower()
    for c in ("extras1_runs", "extras_2_runs", "knock_out"):
        df[c] = df[c].fillna(0)

    df["is_batter_ball"] = df["extras_type"].ne("wide")
    df["is_legal"] = ~df["extras_type"].isin(["wide", "noball"])
    df["is_extra_pen"] = df["extras_type"].isin(["wide", "noball"])
    extras_series = df["extras1_runs"] + df["extras_2_runs"]
    df["total_ball_runs"] = df["runs"] + extras_series
    df["bowler_runs"] = np.where(df["extras_type"].isin(["bye", "legbye"]), df["runs"], df["runs"] + extras_series)

    df["is_boundary"] = (df["is_four"].eq(1) | df["is_six"].eq(1))
    df["is_dot"] = df["runs"].eq(0) & df["extras_type"].eq("none") & df["is_wicket"].eq(0)
    df["is_single_double"] = ~df["is_boundary"] & df["runs"].isin([1, 2, 3])
    df["striker_out"] = df["is_wicket"].eq(1) & df["dismissed_player_id"].eq(df["striker_id"])
    df["is_runout"] = df["striker_out"] & df["dismissal_type"].eq("run out")
    df["is_away"] = df["batting_team_id"].eq(df["away_team_id"])
    df["false_shot"] = df["stroke"].fillna("").str.lower().isin(FALSE_SHOT_LABELS) | df["striker_out"]

    df["bowler_wkt"] = (df["is_wicket"].eq(1) & ~df["dismissal_type"].isin(NON_BOWLER_OUTS)).astype(np.int8)
    df["unassisted_wkt"] = df["bowler_wkt"].eq(1) & df["dismissal_type"].isin(["bowled", "lbw"])

    df["bat_faced_before"] = df.groupby(["match_id", "innings", "striker_id"])["is_batter_ball"].cumsum() - df["is_batter_ball"]
    df["spell_over"] = df.groupby(GBW)["overid"].rank(method="dense")

    # 4. H2H Nemesis & Bunny (Strictly No Leakage: prior to current match date)
    print("[*] Computing Zero-Leakage H2H Matrix (strictly prior dates)...")
    h2h = (df.groupby(["striker_id", "bowler_id", "match_id", "match_date"], sort=False)
             .agg(r=("runs", "sum"), o=("bowler_wkt", "sum")).reset_index()
             .sort_values(["striker_id", "bowler_id", "match_date", "match_id"]))
    g = h2h.groupby(["striker_id", "bowler_id"])
    h2h["p_outs"] = g["o"].cumsum() - h2h["o"]      # strictly before this match
    h2h["p_runs"] = g["r"].cumsum() - h2h["r"]
    h2h["is_nemesis"] = ((h2h["p_outs"] >= 3) |
                         ((h2h["p_outs"] >= 2) &
                          (h2h["p_runs"] / h2h["p_outs"].clip(lower=1) < 15.0)))
    h2h["is_bunny"] = ((h2h["p_outs"] >= 3) |
                       ((h2h["p_outs"] >= 2) &
                        (h2h["p_runs"] / h2h["p_outs"].clip(lower=1) < 15.0)))

    df = df.merge(h2h[["striker_id", "bowler_id", "match_id", "is_nemesis", "is_bunny"]],
                  on=["striker_id", "bowler_id", "match_id"], how="left")
    df["is_nemesis"] = df["is_nemesis"].fillna(False).astype(bool)
    df["is_bunny"] = df["is_bunny"].fillna(False).astype(bool)

    # 1st-over elite opening threat (bowler in top 20% economy, min 120 balls)
    be = df.groupby("bowler_id").agg(r=("total_ball_runs", "sum"), b=("is_legal", "sum"))
    be = be[be["b"] >= 120]
    be["econ"] = be["r"] / be["b"] * 6
    elite = set(be.index[be["econ"] <= be["econ"].quantile(0.20)])

    df["opener_elite"] = (df["batting_order"].isin([1, 2]) & df["overid"].eq(1)
                          & df["bowler_id"].isin(elite))

    # Dew, Set Batter, DLS/Toss
    hour = pd.to_datetime(df["delivery_ist_time"], errors="coerce").dt.hour
    df["is_dew"] = df["innings"].eq(2) & hour.ge(19)
    df["is_set_batter"] = df["bat_faced_before"] >= 20
    df["is_dls_or_toss"] = df["revised_target"].notna() | (
        df["toss_win_team_id"].ne(df["bowling_team_id"]) & df["innings"].eq(2))

    # Multipliers
    df["M_t"] = ((1 + 0.75 * df["knock_out"]) * (1 + 0.40 * df["is_away"])
                 * (1 + 0.50 * df["opener_elite"]) * (1 + 0.35 * df["is_nemesis"])).astype(np.float32)

    df["M_bowl"] = ((1 + 0.75 * df["knock_out"]) * (1 + 0.40 * df["is_away"])
                    * (1 + 0.30 * df["is_dew"]) * (1 + 0.35 * df["is_bunny"])
                    * (1 + 0.30 * df["is_set_batter"]) * (1 + 0.25 * df["is_dls_or_toss"])).astype(np.float32)

    # Match state features
    df["cum_runs"] = df.groupby(GI)["total_ball_runs"].cumsum()
    df["cum_wkts"] = df.groupby(GI)["is_wicket"].cumsum()
    df["legal_no"] = df.groupby(GI)["is_legal"].cumsum()
    df["wkts_before"] = df["cum_wkts"] - df["is_wicket"]

    inn1_total = df[df["innings"] == 1].groupby("match_id")["total_ball_runs"].sum().rename("inn1_total")
    df = df.join(inn1_total, on="match_id")
    df["target"] = df["revised_target"].fillna(df["inn1_total"] + 1)
    df["max_overs"] = np.where(df["innings"] == 1,
                               df["first_inn_revised_overs"].fillna(20),
                               df["second_inn_revised_overs"].fillna(20))
    df["balls_left"] = (df["max_overs"] * 6 - df["legal_no"]).clip(lower=0)
    df["wkts_left"] = 10 - df["cum_wkts"]
    chase = df["innings"].eq(2)
    df["runs_left"] = np.where(chase, (df["target"] - df["cum_runs"]).clip(lower=0), np.nan)
    df["rrr"] = np.where(chase, df["runs_left"] / df["balls_left"].clip(lower=1) * 6, np.nan)
    df["crr"] = df["cum_runs"] / df["legal_no"].clip(lower=1) * 6
    df["bat_won"] = df["batting_team_id"].eq(df["win_team_id"]).astype(int)
    df["bowl_won"] = df["bowling_team_id"].eq(df["win_team_id"]).astype(int)

    for c in ("pace_or_spin", "delivery_style", "on_or_off", "over_or_around", "venue_id"):
        df[c] = df[c].astype("category")

    # 5. Out-of-fold xR, xW, WP Models
    print("\n[*] Training Out-of-Fold LightGBM xR/xW & XGBoost WP Models...")
    groups = df["match_id"]
    exp_feats = ["overid", "bowl_speed", "venue_id", "pace_or_spin", "delivery_style",
                 "on_or_off", "over_or_around"]
    lgb_kw = dict(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42, verbose=-1, n_jobs=-1)

    df["xR"] = oof_predict(lambda: lgb.LGBMRegressor(**lgb_kw), df[exp_feats], df["runs"], groups)
    df["rae"] = (df["runs"] - df["xR"]).astype(np.float32)
    df["runs_saved"] = (df["xR"] - df["bowler_runs"]).astype(np.float32)

    df["xW"] = oof_predict(lambda: lgb.LGBMClassifier(**lgb_kw), df[exp_feats], df["bowler_wkt"], groups, proba=True)
    df["wkts_above_exp"] = np.where(df["is_set_batter"] | df["unassisted_wkt"], 1.40, 1.0) * (df["bowler_wkt"] - df["xW"])

    wp_feats = ["innings", "runs_left", "balls_left", "wkts_left", "rrr", "crr", "venue_id"]
    df["wp"] = oof_predict(
        lambda: xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.08,
                                  tree_method="hist", enable_categorical=True,
                                  eval_metric="logloss", random_state=42, n_jobs=-1),
        df[wp_feats], df["bat_won"], groups, proba=True)
    df["wp_prev"] = df.groupby(GI)["wp"].shift(1).fillna(0.5)
    df["wpa"] = df["wp"] - df["wp_prev"]
    df["bowl_wpa"] = -df["wpa"]

    # 6. Sequential Indicators & Pressure Set
    print("[*] Vectorising Micro-Momentum & Pressure Indicators...")
    gb_bowl = df.groupby(["match_id", "innings", "bowler_id"])
    s0 = df["bowl_speed"]
    s1, s2 = gb_bowl["bowl_speed"].shift(1), gb_bowl["bowl_speed"].shift(2)
    speeds = np.column_stack([s0, s1, s2])
    with np.errstate(all="ignore"):
        spd_range = np.nanmax(speeds, axis=1) - np.nanmin(speeds, axis=1)
    prev_style = gb_bowl["delivery_style"].shift(1)
    style_changed = prev_style.notna() & prev_style.astype(object).ne(df["delivery_style"].astype(object))
    df["pace_or_var"] = (s0 > 140) | (spd_range > 12) | style_changed

    dot_i = df["is_dot"].astype(np.int8)
    gdot = dot_i.groupby([df[c] for c in GB])
    s1_d = gdot.shift(1).fillna(0.0)
    s2_d = gdot.shift(2).fillna(0.0)
    s3_d = gdot.shift(3).fillna(0.0)
    df["after_3_dots"] = (s1_d + s2_d + s3_d) >= 3.0
    df["post_wkt"] = df.groupby(GI)["is_wicket"].shift(1).eq(1) & ~df["striker_out"].shift(1).eq(True)

    cw_prev = df.groupby(GI)["cum_wkts"].shift(1).fillna(0)
    cw_prev12 = df.groupby(GI)["cum_wkts"].shift(13).fillna(0)
    df["rebuild"] = (cw_prev - cw_prev12) >= 2
    df["attack"] = ((df["rrr"] > 10.5) | df["revised_target"].notna()
                    | (df["overid"].between(16, 20) & (df["wkts_left"] >= 5)))

    df["is_pressure"] = (((df["wp_prev"].between(0.25, 0.75)) & df["overid"].between(15, 20))
                         | (chase & (df["rrr"] > 10.0))
                         | df["knock_out"].eq(1) | df["revised_target"].notna())

    # Bowler boundary bounce & deception
    prev_boundary = gb_bowl["is_boundary"].shift(1).eq(True)
    sp_b = pd.concat([df["bowl_speed"], gb_bowl["bowl_speed"].shift(1), gb_bowl["bowl_speed"].shift(2)], axis=1)
    speed_std3 = sp_b.std(axis=1).fillna(0)
    def changed(col):
        prev = gb_bowl[col].shift(1)
        return prev.notna() & prev.astype(object).ne(df[col].astype(object))
    deceptive = (speed_std3 > 6.0) | changed("delivery_style") | changed("on_or_off") | changed("over_or_around")

    gdot_b = dot_i.groupby([df[c] for c in GBW])
    s1_b = gdot_b.shift(1).fillna(0.0)
    s2_b = gdot_b.shift(2).fillna(0.0)
    s3_b = gdot_b.shift(3).fillna(0.0)
    after_3_dots_b = (s1_b + s2_b + s3_b) >= 3.0
    post_wkt_b = gb_bowl["bowler_wkt"].shift(1).eq(1)
    new_batter_b = df["bat_faced_before"] < 6

    # Unfavourable matchups
    bt = df["bowling_type"].fillna("").astype(str).str.lower()
    ht = df["batting_type"].fillna("").astype(str).str.lower()
    df["unfav_bowler"] = (
        (bt.str.contains("off") & ht.str.contains("left"))
        | (bt.str.contains("leg") & ht.str.contains("right"))
        | (bt.str.contains("orthodox") & ht.str.contains("right"))
    )

    # Finish rate in tight successful chases (tight: winning match and RRR >= 8.0 or balls_left <= 12)
    last = (df[chase].groupby("match_id").agg(bl=("balls_left", "last"),
                                              win=("bat_won", "last"), team=("batting_team_id", "last")))
    tight = last[(last["win"] == 1) & (last["bl"] <= 12)].index
    ch = df[chase & df["match_id"].isin(tight) & df["is_batter_ball"]]
    fin = (ch.groupby(["striker_id", "match_id"])["striker_out"].any().rename("out").reset_index()
             .groupby("striker_id").agg(n=("out", "size"), nout=("out", lambda s: (s == False).sum())))
    finish_rate = (fin["nout"] / (fin["n"] + K_SHRINK)).rename("finish_rate")

    # =========================================================================
    # 7. BATTERS PGAI_100 (Exact Spec Math from pgai100.py)
    # =========================================================================
    print("\n[*] Computing Batter PGAI_100 Index (pgai100.py exact mathematical formulation)...")
    bat = df[df["is_batter_ball"]].copy()

    # Filter eligible batters >= 300 balls faced (excl. wides)
    bat_faced = bat.groupby("striker_id").size().rename("balls_faced")
    eligible_bat_ids = bat_faced[bat_faced >= MIN_BAT_BALLS].index
    bat = bat[bat["striker_id"].isin(eligible_bat_ids)].copy()

    # PCE Calculation
    p_bat = bat[bat["is_pressure"]].copy()
    p_bat["weighted_wpa"] = p_bat["M_t"] * p_bat["wpa"]
    p_bat["weighted_rae"] = p_bat["M_t"] * p_bat["rae"]
    pce_df = p_bat.groupby("striker_id").agg(
        press_balls=("is_batter_ball", "sum"),
        pce_wpa=("weighted_wpa", "sum"),
        pce_rae=("weighted_rae", "sum")
    )
    pce_df["pce_wpa_smoothed"] = pce_df["pce_wpa"] / (pce_df["press_balls"] + K_SHRINK)
    pce_df["pce_rae_smoothed"] = pce_df["pce_rae"] / (pce_df["press_balls"] + K_SHRINK)
    pce_df = pce_df.join(finish_rate, how="left")
    pce_df["finish_rate"] = pce_df["finish_rate"].fillna(0.0)

    # PCE Formula: 0.55 * wpa + 0.30 * rae + 0.15 * finish_rate
    pce_df["PCE"] = (0.55 * pce_df["pce_wpa_smoothed"].fillna(0.0) +
                     0.30 * pce_df["pce_rae_smoothed"].fillna(0.0) +
                     0.15 * pce_df["finish_rate"].fillna(0.0))

    # PRR Subcomponents
    # 1. Pace / Variation
    pace_rows = bat[bat["bowl_speed"] > 140]
    pace_score = pace_rows.groupby("striker_id")["rae"].mean()
    var_rows = bat[bat["pace_or_var"]]
    var_score = var_rows.groupby("striker_id")["rae"].mean()
    pace_var_raw = pd.concat([pace_score.rename("pace"), var_score.rename("var")], axis=1).mean(axis=1)

    # 2. Chain release (after 3 dots) & partner survival
    after_dots = bat[bat["after_3_dots"]]
    chain_release = (after_dots["runs"] > 0).astype(float).groupby(after_dots["striker_id"]).mean() if len(after_dots) else pd.Series(dtype=float)
    after_wkt = bat[bat["post_wkt"]]
    partner_survival = 1.0 - after_wkt.groupby("striker_id")["striker_out"].mean() if len(after_wkt) else pd.Series(dtype=float)
    chain_raw = pd.concat([chain_release.rename("rel"), partner_survival.rename("surv")], axis=1).mean(axis=1)

    # 3. Collapse (overs 1-6 with >= 2 wickets down)
    coll = bat[bat["overid"].le(6) & bat["wkts_before"].ge(2)]
    coll_runs = coll.groupby("striker_id")["runs"].mean() if len(coll) else pd.Series(dtype=float)
    coll_surv = 1.0 - coll.groupby("striker_id")["striker_out"].mean() if len(coll) else pd.Series(dtype=float)
    collapse_raw = pd.concat([coll_runs.rename("r"), coll_surv.rename("s")], axis=1).mean(axis=1)

    # 4. Matchup against nemesis bowlers
    nem_rows = bat[bat["is_nemesis"]]
    matchup_raw = (nem_rows.groupby("striker_id")["runs"].sum() + 1.0) / (nem_rows.groupby("striker_id").size() + 2.0) if len(nem_rows) else pd.Series(dtype=float)

    # PRR: scale100 normalisation and exact weights (30% pace, 25% chain, 25% collapse, 20% matchup)
    S_pace_var = scale100(pace_var_raw)
    S_chain = scale100(chain_raw)
    S_collapse = scale100(collapse_raw)
    S_matchup = scale100(matchup_raw)
    prr_series = (0.30 * S_pace_var + 0.25 * S_chain + 0.25 * S_collapse + 0.20 * S_matchup)

    # GIQ Subcomponents
    # 1. Tempo alignment
    tempo_rows = bat[bat["rebuild"] | bat["attack"]].copy()
    tempo_rows["tempo_good"] = np.where(
        tempo_rows["rebuild"],
        (~tempo_rows["false_shot"] & ~tempo_rows["striker_out"]).astype(float),
        tempo_rows["is_boundary"].astype(float)
    )
    tempo_raw = tempo_rows.groupby("striker_id")["tempo_good"].mean() if len(tempo_rows) else pd.Series(dtype=float)

    # 2. Strike rotation in middle overs (7-15)
    mid_rows = bat[bat["overid"].between(7, 15)].copy()
    if len(mid_rows):
        mid_rows["_rot"] = np.where(mid_rows["runs"].isin([1, 2, 3]), 1.0, np.where(mid_rows["runs"].eq(0), -1.0, 0.0))
        rotation_raw = mid_rows.groupby("striker_id")["_rot"].mean()
    else:
        rotation_raw = pd.Series(dtype=float)

    # 3. Strike farming with tail (non_striker order 8-11)
    tail_rows = bat[bat["ns_order"].between(8, 11) & (bat["rrr"].ge(8.0) | bat["wp_prev"].between(0.25, 0.75))].copy()
    if len(tail_rows):
        tail_rows["farm_good"] = np.where(
            tail_rows["over_ball_num"].le(4),
            tail_rows["is_boundary"].astype(float),
            tail_rows["runs"].eq(1).astype(float)
        )
        farm_raw = tail_rows.groupby("striker_id")["farm_good"].mean()
    else:
        farm_raw = pd.Series(dtype=float)

    # 4. Anti-panic control
    bat_fs = bat.groupby("striker_id")["false_shot"].mean()
    bat_ro = bat.groupby("striker_id")["is_runout"].mean()
    control_raw = 1.0 - (0.7 * bat_fs + 0.3 * bat_ro).clip(upper=1.0)

    # GIQ: scale100 normalisation and exact weights (35% tempo, 25% rotation, 20% farm, 20% control)
    I_tempo_align = scale100(tempo_raw)
    I_rotation = scale100(rotation_raw)
    I_strike_farm = scale100(farm_raw)
    I_control = scale100(control_raw)
    giq_series = (0.35 * I_tempo_align + 0.25 * I_rotation + 0.20 * I_strike_farm + 0.20 * I_control)

    # Combine Batters Table
    bat_summary = bat.groupby("striker_id").agg(
        striker_name=("striker_name", "first"),
        total_balls=("is_batter_ball", "sum"),
        total_runs=("runs", "sum"),
        fours=("is_four", "sum"),
        sixes=("is_six", "sum")
    )
    bat_summary = bat_summary.join(pce_df[["PCE", "press_balls", "finish_rate"]], how="left")
    bat_summary["press_balls"] = bat_summary["press_balls"].fillna(0).astype(int)
    bat_summary["PCE"] = bat_summary["PCE"].fillna(0.0)
    bat_summary["PRR"] = prr_series
    bat_summary["GIQ"] = giq_series

    # Exact Winsorized Z-Scores
    bat_summary["Z_PCE"] = winsorized_z(bat_summary["PCE"], 3.0)
    bat_summary["Z_PRR"] = winsorized_z(bat_summary["PRR"], 3.0)
    bat_summary["Z_GIQ"] = winsorized_z(bat_summary["GIQ"], 3.0)

    # Final Master PGAI_100: clip(50 + 15 * (0.38*Z_PCE + 0.32*Z_PRR + 0.30*Z_GIQ), 0, 100)
    bat_summary["Z_raw"] = 0.38 * bat_summary["Z_PCE"] + 0.32 * bat_summary["Z_PRR"] + 0.30 * bat_summary["Z_GIQ"]
    bat_summary["PGAI_100"] = (50.0 + 15.0 * bat_summary["Z_raw"]).clip(0, 100).round(2)
    bat_summary["rank"] = bat_summary["PGAI_100"].rank(method="min", ascending=False).astype(int)
    bat_summary = bat_summary.sort_values("PGAI_100", ascending=False).reset_index()

    # =========================================================================
    # 8. BOWLERS B-PGAI_100 (Exact Spec Math from b_pgai100.py)
    # =========================================================================
    print("\n[*] Computing Bowler B-PGAI_100 Index (b_pgai100.py exact mathematical formulation)...")
    bowl = df[df["is_legal"]].copy()

    # Filter eligible bowlers >= 240 legal balls
    bowl_legal = bowl.groupby("bowler_id").size().rename("legal_balls")
    eligible_bowl_ids = bowl_legal[bowl_legal >= MIN_BOWL_BALLS].index
    bowl = bowl[bowl["bowler_id"].isin(eligible_bowl_ids)].copy()

    # BCE: w_wpa, w_runs, w_wkt on pressure deliveries
    p_bowl = df[df["is_pressure"] & df["bowler_id"].isin(eligible_bowl_ids)].copy()
    p_bowl["w_wpa"] = p_bowl["M_bowl"] * p_bowl["bowl_wpa"]
    p_bowl["w_runs"] = p_bowl["M_bowl"] * (p_bowl["xR"] - p_bowl["bowler_runs"])
    w_val = np.where(p_bowl["is_set_batter"] | p_bowl["unassisted_wkt"], 1.4, 1.0)
    p_bowl["w_wkt"] = p_bowl["M_bowl"] * w_val * (p_bowl["bowler_wkt"] - p_bowl["xW"])

    bce_df = p_bowl.groupby("bowler_id").agg(
        npress=("is_legal", "sum"),
        wpa=("w_wpa", "sum"),
        runs=("w_runs", "sum"),
        wkt=("w_wkt", "sum")
    )
    bce_den = bce_df["npress"] + K_SHRINK
    bce_df["BCE_raw"] = 0.45 * bce_df["wpa"] / bce_den + 0.30 * bce_df["runs"] / bce_den + 0.25 * bce_df["wkt"] / bce_den

    # BCR: post boundary bounce, spell close (6th ball / long spell), matchup/env, discipline
    post_bnd = bowl[prev_boundary.loc[bowl.index]].copy()
    if len(post_bnd):
        post_bnd["_score"] = post_bnd["is_dot"].astype(float) + post_bnd["bowler_wkt"].astype(float) - post_bnd["is_boundary"].astype(float) - post_bnd["is_extra_pen"].astype(float)
        bounce_raw = post_bnd.groupby("bowler_id")["_score"].mean()
    else:
        bounce_raw = pd.Series(dtype=float)

    spell_b = bowl[bowl["over_ball_num"].eq(6) | bowl["spell_over"].ge(3)].copy()
    if len(spell_b):
        spell_b["_score"] = (spell_b["xR"] - spell_b["bowler_runs"]) + spell_b["is_dot"].astype(float) + spell_b["bowler_wkt"].astype(float)
        spell_raw = spell_b.groupby("bowler_id")["_score"].mean()
    else:
        spell_raw = pd.Series(dtype=float)

    env_b = bowl[bowl["unfav_bowler"] | bowl["is_away"] | bowl["is_dew"]].copy()
    if len(env_b):
        env_b["_score"] = (env_b["xR"] - env_b["bowler_runs"]) + env_b["bowler_wkt"].astype(float)
        env_raw = env_b.groupby("bowler_id")["_score"].mean()
    else:
        env_raw = pd.Series(dtype=float)

    disc_b = bowl[bowl["is_pressure"] | bowl["overid"].between(16, 20)]
    disc_raw = 1.0 - disc_b.groupby("bowler_id")["is_extra_pen"].mean() if len(disc_b) else pd.Series(dtype=float)

    # BGI: deception, chokehold (after 3 dots / post wkt / new batter), planning (off-side line), role load
    dec_b = bowl[deceptive.loc[bowl.index]].copy()
    if len(dec_b):
        dec_b["_score"] = (dec_b["xR"] - dec_b["bowler_runs"]) + dec_b["false_shot"].astype(float)
        deception_raw = dec_b.groupby("bowler_id")["_score"].mean()
    else:
        deception_raw = pd.Series(dtype=float)

    choke_b = bowl[after_3_dots_b.loc[bowl.index] | post_wkt_b.loc[bowl.index] | new_batter_b.loc[bowl.index]].copy()
    if len(choke_b):
        choke_b["_score"] = choke_b["is_dot"].astype(float) + choke_b["bowler_wkt"].astype(float)
        choke_raw = choke_b.groupby("bowler_id")["_score"].mean()
    else:
        choke_raw = pd.Series(dtype=float)

    plan_b = bowl[(bowl["is_pressure"] | bowl["overid"].ge(16)) & bowl["on_or_off"].astype(str).str.lower().eq("off")].copy()
    if len(plan_b):
        plan_b["_score"] = (1.0 - plan_b["is_boundary"].astype(float)) + plan_b["false_shot"].astype(float)
        plan_raw = plan_b.groupby("bowler_id")["_score"].mean()
    else:
        plan_raw = pd.Series(dtype=float)

    role_raw = bowl.groupby("bowler_id")["role_load"].mean()

    # Combine Bowlers Table
    bowl_summary = bowl.groupby("bowler_id").agg(
        bowler_name=("bowler_name", "first"),
        legal_balls=("is_legal", "sum"),
        runs_conceded=("bowler_runs", "sum"),
        wickets=("bowler_wkt", "sum")
    )
    bowl_summary["economy"] = (bowl_summary["runs_conceded"] / bowl_summary["legal_balls"] * 6.0).round(2)
    bowl_summary = bowl_summary.join(bce_df[["BCE_raw", "npress"]], how="left")
    bowl_summary["press_balls"] = bowl_summary["npress"].fillna(0).astype(int)
    bowl_summary["BCE"] = bowl_summary["BCE_raw"].fillna(0.0)

    # Bowler Component Shrinkage toward eligible cohort mean: shrink = legal_balls / (legal_balls + 120)
    raw_bw = {
        "bounce_raw": bounce_raw,
        "spell_raw": spell_raw,
        "env_raw": env_raw,
        "disc_raw": disc_raw,
        "deception_raw": deception_raw,
        "choke_raw": choke_raw,
        "plan_raw": plan_raw,
        "role_raw": role_raw
    }
    shrink_bw = bowl_summary["legal_balls"] / (bowl_summary["legal_balls"] + 120.0)
    for c, s in raw_bw.items():
        bowl_summary[c] = s
        mu = bowl_summary[c].mean()
        if not np.isfinite(mu):
            mu = 0.0
        bowl_summary[c] = bowl_summary[c].fillna(mu)
        bowl_summary[c] = shrink_bw * bowl_summary[c] + (1.0 - shrink_bw) * mu

    S_bounce = scale100(bowl_summary["bounce_raw"])
    S_spell_close = scale100(bowl_summary["spell_raw"])
    S_matchup_env = scale100(bowl_summary["env_raw"])
    S_disc = scale100(bowl_summary["disc_raw"])
    bowl_summary["BCR"] = 0.30 * S_bounce + 0.25 * S_spell_close + 0.25 * S_matchup_env + 0.20 * S_disc

    I_deception = scale100(bowl_summary["deception_raw"])
    I_choke = scale100(bowl_summary["choke_raw"])
    I_plan = scale100(bowl_summary["plan_raw"])
    I_role_load = scale100(bowl_summary["role_raw"])
    bowl_summary["BGI"] = 0.35 * I_deception + 0.30 * I_choke + 0.20 * I_plan + 0.15 * I_role_load

    # Exact Winsorized Z-Scores
    bowl_summary["Z_BCE"] = winsorized_z(bowl_summary["BCE"], 3.0)
    bowl_summary["Z_BCR"] = winsorized_z(bowl_summary["BCR"], 3.0)
    bowl_summary["Z_BGI"] = winsorized_z(bowl_summary["BGI"], 3.0)

    # Final Master B-PGAI_100: clip(50 + 15 * (0.40*Z_BCE + 0.30*Z_BCR + 0.30*Z_BGI), 0, 100)
    bowl_summary["Z_raw"] = 0.40 * bowl_summary["Z_BCE"] + 0.30 * bowl_summary["Z_BCR"] + 0.30 * bowl_summary["Z_BGI"]
    bowl_summary["B_PGAI_100"] = (50.0 + 15.0 * bowl_summary["Z_raw"]).clip(0, 100).round(2)
    bowl_summary["rank"] = bowl_summary["B_PGAI_100"].rank(method="min", ascending=False).astype(int)
    bowl_summary = bowl_summary.sort_values("B_PGAI_100", ascending=False).reset_index()

    # =========================================================================
    # 9. Enrich Profiles: Last Pressure Matches & Struggling Bowlers / Bunnies
    # =========================================================================
    print("\n[*] Enriching Player Profiles with Pressure Matches & Nemesis Logs...")
    bat_group = df[df["is_batter_ball"]].groupby("striker_id")
    bowl_group = df[df["is_legal"]].groupby("bowler_id")

    # Batsmen Profile Builder
    final_batters = []
    for rank_idx, brow in bat_summary.iterrows():
        pid = brow["striker_id"]
        pname = brow["striker_name"]
        pdf = bat_group.get_group(pid)

        # Struggling Bowlers (Top Nemeses with balls, runs, dismissals, SR, avg)
        nemeses_df = (pdf[pdf["bowler_wkt"].eq(1)].groupby("bowler_name")
                         .agg(dismissals=("bowler_wkt", "sum"), runs=("runs", "sum"))
                         .reset_index().sort_values(by="dismissals", ascending=False).head(5))
        nemesis_list = []
        for _, nrow in nemeses_df.iterrows():
            b_name = nrow["bowler_name"]
            b_balls = len(pdf[pdf["bowler_name"] == b_name])
            nemesis_list.append({
                "bowler_name": b_name,
                "balls": b_balls,
                "runs": int(nrow["runs"]),
                "dismissals": int(nrow["dismissals"]),
                "sr": round((nrow["runs"] / max(b_balls, 1)) * 100.0, 1),
                "avg": round(nrow["runs"] / max(nrow["dismissals"], 1), 1)
            })

        # Last 5 Pressure Matches
        press_matches = (pdf[pdf["is_pressure"]].groupby("match_id")
                            .agg(date=("match_date", "first"), runs=("runs", "sum"), balls=("runs", "count"),
                                 wpa=("wpa", "sum"), won=("bat_won", "first"))
                            .reset_index().sort_values(by="date", ascending=False).head(5))
        last_pressure_list = []
        for _, mrow in press_matches.iterrows():
            last_pressure_list.append({
                "match_id": int(mrow["match_id"]),
                "date": str(mrow["date"].strftime("%Y-%m-%d")),
                "runs": int(mrow["runs"]),
                "balls": int(mrow["balls"]),
                "wpa": round(float(mrow["wpa"]), 3),
                "won": bool(mrow["won"])
            })

        z_pce, z_prr, z_giq = brow["Z_PCE"], brow["Z_PRR"], brow["Z_GIQ"]
        if z_pce >= 2.0:
            arch = "Crisis Finisher"
        elif z_prr >= 2.0:
            arch = "Pace Demolisher"
        elif z_giq >= 2.0:
            arch = "Tactical General"
        elif brow["PGAI_100"] >= 75:
            arch = "All-Phase Anchor"
        else:
            arch = "Pressure Contender"

        final_batters.append({
            "rank": rank_idx + 1,
            "player_id": int(pid),
            "player_name": pname,
            "balls_faced": int(brow["total_balls"]),
            "total_runs": int(brow["total_runs"]),
            "strike_rate": round((brow["total_runs"] / brow["total_balls"]) * 100.0, 1),
            "pressure_balls": int(brow["press_balls"]),
            "z_pce": round(float(z_pce), 2),
            "z_prr": round(float(z_prr), 2),
            "z_giq": round(float(z_giq), 2),
            "pgai_100": round(float(brow["PGAI_100"]), 2),
            "finish_rate": round(float(brow["finish_rate"]), 3),
            "archetype": arch,
            "nemesis_log": nemesis_list,
            "last_pressure_matches": last_pressure_list,
        })

    # Bowlers Profile Builder
    final_bowlers = []
    for rank_idx, bwrow in bowl_summary.iterrows():
        bpid = bwrow["bowler_id"]
        bpname = bwrow["bowler_name"]
        bdf = bowl_group.get_group(bpid)

        # Dominated Batsmen (Top Bunnies with balls, runs, dismissals, SR, avg)
        bunnies_df = (bdf[bdf["bowler_wkt"].eq(1)].groupby("striker_name")
                         .agg(dismissals=("bowler_wkt", "sum"), runs=("runs", "sum"))
                         .reset_index().sort_values(by="dismissals", ascending=False).head(5))
        bunnies_list = []
        for _, bnrow in bunnies_df.iterrows():
            s_name = bnrow["striker_name"]
            s_balls = len(bdf[bdf["striker_name"] == s_name])
            bunnies_list.append({
                "batter_name": s_name,
                "balls": s_balls,
                "runs": int(bnrow["runs"]),
                "dismissals": int(bnrow["dismissals"]),
                "sr": round((bnrow["runs"] / max(s_balls, 1)) * 100.0, 1),
                "avg": round(bnrow["runs"] / max(bnrow["dismissals"], 1), 1)
            })

        # Last 5 Pressure Matches for Bowler
        bowl_press_matches = (bdf[bdf["is_pressure"]].groupby("match_id")
                                 .agg(date=("match_date", "first"), runs=("bowler_runs", "sum"),
                                      balls=("is_legal", "sum"), wickets=("bowler_wkt", "sum"),
                                      wpa=("bowl_wpa", "sum"), won=("bowl_won", "first"))
                                 .reset_index().sort_values(by="date", ascending=False).head(5))
        bowl_last_pressure = []
        for _, bmrow in bowl_press_matches.iterrows():
            bowl_last_pressure.append({
                "match_id": int(bmrow["match_id"]),
                "date": str(bmrow["date"].strftime("%Y-%m-%d")),
                "runs": int(bmrow["runs"]),
                "balls": int(bmrow["balls"]),
                "wickets": int(bmrow["wickets"]),
                "wpa": round(float(bmrow["wpa"]), 3),
                "won": bool(bmrow["won"] == 1)
            })

        z_bce, z_bcr, z_bgi = bwrow["Z_BCE"], bwrow["Z_BCR"], bwrow["Z_BGI"]
        if z_bce >= 2.0:
            b_arch = "Clutch Strike Weapon"
        elif z_bcr >= 2.0:
            b_arch = "Chokehold Spin Maestro"
        elif z_bgi >= 2.0:
            b_arch = "Deceptive Mystery Weapon"
        elif bwrow["B_PGAI_100"] >= 75:
            b_arch = "Death-Overs Specialist"
        else:
            b_arch = "Pressure Phase Enforcer"

        final_bowlers.append({
            "rank": rank_idx + 1,
            "player_id": int(bpid),
            "player_name": bpname,
            "legal_balls": int(bwrow["legal_balls"]),
            "wickets": int(bwrow["wickets"]),
            "runs_conceded": int(bwrow["runs_conceded"]),
            "economy": round(float(bwrow["economy"]), 2),
            "pressure_balls": int(bwrow["press_balls"]),
            "z_bce": round(float(z_bce), 2),
            "z_bcr": round(float(z_bcr), 2),
            "z_bgi": round(float(z_bgi), 2),
            "b_pgai_100": round(float(bwrow["B_PGAI_100"]), 2),
            "archetype": b_arch,
            "bunnies_log": bunnies_list,
            "last_pressure_matches": bowl_last_pressure,
        })

    # Export Final JSONs
    batters_json = {
        "formula": "PGAI_100 = clip(50 + 15 * (0.38*Z_PCE + 0.32*Z_PRR + 0.30*Z_GIQ), 0, 100)",
        "cutoff_balls": MIN_BAT_BALLS,
        "total_evaluated": len(final_batters),
        "top_10": final_batters[:10],
        "all_batters": final_batters
    }
    with open(out_dir / "batters_pgai.json", "w", encoding="utf-8") as f:
        json.dump(batters_json, f, indent=2)
    print(f"[✓] Exported {out_dir / 'batters_pgai.json'} ({len(final_batters)} batters)")

    bowlers_json = {
        "formula": "B_PGAI_100 = clip(50 + 15 * (0.40*Z_BCE + 0.30*Z_BCR + 0.30*Z_BGI), 0, 100)",
        "cutoff_balls": MIN_BOWL_BALLS,
        "total_evaluated": len(final_bowlers),
        "top_10": final_bowlers[:10],
        "all_bowlers": final_bowlers
    }
    with open(out_dir / "bowlers_pgai.json", "w", encoding="utf-8") as f:
        json.dump(bowlers_json, f, indent=2)
    print(f"[✓] Exported {out_dir / 'bowlers_pgai.json'} ({len(final_bowlers)} bowlers)")

    # Metadata & Framework JSON
    analytics_meta = {
        "system_name": "PLAYERS UNDER PRESSURE - RAJASTHAN ROYALS DECISION-INTELLIGENCE COMMAND CENTER",
        "version": "3.2.0-spec",
        "computation_time_sec": round(time.time() - start_time, 2),
        "evaluation_scope": {
            "formats": ["T20", "T20I"],
            "batter_cutoff_balls": MIN_BAT_BALLS,
            "bowler_cutoff_balls": MIN_BOWL_BALLS,
            "eligible_batters": len(final_batters),
            "eligible_bowlers": len(final_bowlers),
            "shrinkage_k": K_SHRINK
        },
        "pillars": [
            {
                "pillar_id": 1,
                "title": "Pillar 1: Match Context & Tournament Stakes",
                "description": "Adjusts baseline execution for structural match stakes, venue hostility, and knockout weight.",
                "aspects": [
                    {"code": "A1", "name": "Tournament Stage Multiplier", "columns": "knock_out", "description": "1.75x weight for knockout/playoff matches vs 1.0x league."},
                    {"code": "A2", "name": "Home / Away Context", "columns": "batting_team_id, away_team_id", "description": "1.40x multiplier for away encounters in hostile conditions."},
                    {"code": "A3", "name": "DLS Adjusted Target", "columns": "revised_target", "description": "Correct target scaling in rain-curtailed equations."},
                    {"code": "A4", "name": "Opening Elite Threat", "columns": "overid, bowling_team_id", "description": "1.50x multiplier facing top 20% economy bowlers in Over 1."},
                    {"code": "A5", "name": "Historical Head-to-Head", "columns": "striker_id, bowler_id", "description": "1.35x multiplier against proven historical nemeses / bunnies."}
                ]
            },
            {
                "pillar_id": 2,
                "title": "Pillar 2: In-Game Situation & Match Equation",
                "description": "Dynamic in-play leverage tracking and win probability fluctuation under fluctuating equations.",
                "aspects": [
                    {"code": "A6", "name": "Required Run Rate Inflation", "columns": "rrr, runs_left, balls_left", "description": "High pressure triggered when RRR > 10.0 in chase."},
                    {"code": "A7", "name": "Competitive Win Probability", "columns": "wp, wp_prev", "description": "High leverage state when Win Probability is within [0.25, 0.75]."},
                    {"code": "A8", "name": "Death Over Clutches", "columns": "overid (16-20)", "description": "High leverage delivery execution in closing 5 overs."},
                    {"code": "A9", "name": "Wicket Cluster Shock", "columns": "cum_wkts, post_wkt", "description": "Immediate delivery resilience following partner dismissal."}
                ]
            },
            {
                "pillar_id": 3,
                "title": "Pillar 3: Match-Up & Individual Head-to-Head",
                "description": "Zero-leakage historical head-to-head records and pace/spin archetype resistance.",
                "aspects": [
                    {"code": "A10", "name": "Express Pace Resistance", "columns": "bowl_speed > 140", "description": "Performance and runs above expectation against express pace."},
                    {"code": "A11", "name": "Delivery Speed Variation", "columns": "bowl_speed rolling delta > 12", "description": "Deception resistance against varying bowling speeds."},
                    {"code": "A12", "name": "Delivery Style Changes", "columns": "delivery_style", "description": "Handling unexpected changes in arm angle and bowling styles."}
                ]
            },
            {
                "pillar_id": 4,
                "title": "Pillar 4: Dynamic Strategy & Game Awareness",
                "description": "Context-aware game pacing, strike rotation, and crisis rebuild tactics.",
                "aspects": [
                    {"code": "A13", "name": "Crisis Rebuild Tempo", "columns": "rebuild, stroke", "description": "Risk mitigation and dot minimization after early collapses."},
                    {"code": "A14", "name": "Target Pacing Acceleration", "columns": "attack, rrr", "description": "Calculated boundary assault when required rate escalates."},
                    {"code": "A15", "name": "Middle-Over Rotation", "columns": "runs in [1,2,3], overid 7-15", "description": "Strike rotation rate vs dot-ball avoidance in overs 7-15."},
                    {"code": "A16", "name": "Tail-End Strike Farming", "columns": "ns_order (8-11), over_ball_num", "description": "Boundary attempts on balls 1-4, single retention on balls 5-6."}
                ]
            },
            {
                "pillar_id": 5,
                "title": "Pillar 5: Tactical Execution Under Pressure",
                "description": "Chokehold release, boundary bounce-back composure, and over closing.",
                "aspects": [
                    {"code": "A17", "name": "3-Dot Chokehold Release", "columns": "after_3_dots", "description": "Scoring immediately after absorbing 3 consecutive dot balls."},
                    {"code": "A18", "name": "Post-Boundary Bounce-Back", "columns": "prev_boundary", "description": "Bowler recovery (dot/wicket) immediately after conceding 4 or 6."},
                    {"code": "A19", "name": "6th-Ball Over Closing", "columns": "over_ball_num == 6", "description": "Denying strike rotation or taking wickets on the final delivery of an over."}
                ]
            },
            {
                "pillar_id": 6,
                "title": "Pillar 6: Physical & Environmental Conditions",
                "description": "Environmental resistance against night dew, fatigue, and hostile venue conditions.",
                "aspects": [
                    {"code": "A20", "name": "2nd-Innings Dew Factor", "columns": "innings == 2, delivery_ist_time >= 19:00", "description": "Ball gripping and defensive bowling with wet ball under dew."},
                    {"code": "A21", "name": "Hostile Away Venues", "columns": "away_team_id, venue_id", "description": "Execution when away against local venue specialists."}
                ]
            },
            {
                "pillar_id": 7,
                "title": "Pillar 7: Opposition Threat Assessment",
                "description": "Overcoming elite strike attacks and defending against set batters.",
                "aspects": [
                    {"code": "A22", "name": "Set Batter Dismissal", "columns": "is_set_batter (balls >= 20)", "description": "Bowler breakthrough against established, set opposition batters."},
                    {"code": "A23", "name": "Off-Side Boundary Denial", "columns": "on_or_off == 'off', overid >= 16", "description": "Tactical wide yorker and off-side defensive field execution."}
                ]
            },
            {
                "pillar_id": 8,
                "title": "Pillar 8: Cognitive & Mental Composure",
                "description": "Anti-panic control, run-out avoidance, role-load handling, and match finishing.",
                "aspects": [
                    {"code": "A24", "name": "Anti-Panic Control", "columns": "false_shot, is_runout", "description": "Minimizing false shots and high-pressure run-out errors."},
                    {"code": "A25", "name": "Unbeaten Chase Finish Rate", "columns": "finish_rate", "description": "Guiding team across the line unbeaten in tight chases."},
                    {"code": "A26", "name": "Captaincy & Impact Load", "columns": "is_captain, is_impact_off", "description": "Shouldering leadership and strategic tactical role duties."}
                ]
            }
        ]
    }
    with open(out_dir / "analytics_meta.json", "w", encoding="utf-8") as f:
        json.dump(analytics_meta, f, indent=2)
    print(f"[✓] Exported {out_dir / 'analytics_meta.json'}")

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 75)
    print(f"PIPELINE COMPLETED SUCCESSFULLY IN {elapsed}s")
    print("=" * 75)

    print("\n🏏 TOP 10 BATSMEN (PGAI_100):")
    for b in final_batters[:10]:
        print(f"  #{b['rank']:2d} | {b['player_name']:<24} | PGAI: {b['pgai_100']:5.2f} | SR: {b['strike_rate']:5.1f} | PCE: {b['z_pce']:+4.2f} | PRR: {b['z_prr']:+4.2f} | GIQ: {b['z_giq']:+4.2f} | {b['archetype']}")

    print("\n🎯 TOP 10 BOWLERS (B-PGAI_100):")
    for bw in final_bowlers[:10]:
        print(f"  #{bw['rank']:2d} | {bw['player_name']:<24} | B-PGAI: {bw['b_pgai_100']:5.2f} | Econ: {bw['economy']:4.2f} | BCE: {bw['z_bce']:+4.2f} | BCR: {bw['z_bcr']:+4.2f} | BGI: {bw['z_bgi']:+4.2f} | {bw['archetype']}")

    return batters_json, bowlers_json, dataset_overview_json, analytics_meta


if __name__ == "__main__":
    run_pipeline()
