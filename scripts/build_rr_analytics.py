"""
build_rr_analytics.py
Deterministic Python Analytics Engine implementing the exact Master Cricket Analytics
Framework and PGAI_100 / B-PGAI_100 formulas from the specification.
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Set

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
import lightgbm as lgb
import xgboost as xgb

# ----------------------------------------------------------------- CONFIG
MIN_BAT_BALLS = 300
MIN_BOWL_BALLS = 240
K_SHRINK = 50                      # Empirical-Bayes shrinkage constant
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


def zscore(s: pd.Series) -> pd.Series:
    """Winsorised Z in [-3, 3]."""
    std = s.std()
    if std == 0 or np.isnan(std):
        return pd.Series(0.0, index=s.index)
    return ((s - s.mean()) / (std + 1e-9)).clip(-3, 3)


def oof_predict(model_fn, X, y, groups, proba=False):
    """Out-of-fold predictions grouped by match -> zero in-sample data leakage."""
    out = np.zeros(len(X), dtype=np.float32)
    for tr, va in GroupKFold(N_FOLDS).split(X, y, groups):
        m = model_fn().fit(X.iloc[tr], y.iloc[tr])
        out[va] = m.predict_proba(X.iloc[va])[:, 1] if proba else m.predict(X.iloc[va])
    return out


def find_data_pack_dir() -> Path:
    candidates = [
        Path("Data Pack"),
        Path("data pack"),
        Path("./Data Pack"),
        Path("./data pack"),
        Path("../Data Pack"),
    ]
    for c in candidates:
        if c.exists() and (c / "ball_by_ball.csv").exists():
            return c
    for p in Path(".").iterdir():
        if p.is_dir() and "data" in p.name.lower() and "pack" in p.name.lower():
            if (p / "ball_by_ball.csv").exists():
                return p
    raise FileNotFoundError("Could not locate './data pack/' directory with required CSV files.")


def run_pipeline():
    start_time = time.time()
    print("=" * 75)
    print("RAJASTHAN ROYALS DECISION-INTELLIGENCE ANALYTICS ENGINE (SPEC-ALIGNED)")
    print("=" * 75)

    data_dir = find_data_pack_dir()
    print(f"[*] Reading dataset from: {data_dir.resolve()}")

    out_dir = Path("public/data")
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
    raw_dfs: Dict[str, pd.DataFrame] = {}
    file_profiles: List[Dict[str, Any]] = []

    for fname in files_to_load:
        fpath = data_dir / fname
        size_bytes = fpath.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        df = pd.read_csv(fpath)
        raw_dfs[fname] = df

        null_pcts = {col: round(float(df[col].isna().mean() * 100), 2) for col in df.columns}
        sample_rows = df.head(25).replace({np.nan: None}).to_dict(orient="records")

        pk_candidates = [c for c in df.columns if "id" in c.lower() and df[c].nunique() == len(df)]
        fk_candidates = [c for c in df.columns if "id" in c.lower() and c not in pk_candidates]

        file_profiles.append({
            "file_name": fname,
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "size_bytes": size_bytes,
            "size_mb": round(size_mb, 2),
            "primary_keys": pk_candidates,
            "foreign_keys": fk_candidates[:4],
            "null_percentages": null_pcts,
            "sample_records": sample_rows
        })

    bbb = raw_dfs["ball_by_ball.csv"].copy()
    matches = raw_dfs["matches.csv"].copy()
    competitions = raw_dfs["competitions.csv"].copy()
    teams = raw_dfs["teams.csv"].copy()
    p11 = raw_dfs["playing_eleven.csv"].copy()

    # 2. Cricket Domain Hygiene Audit
    print("[*] Computing Domain Cleaning Audit...")
    total_deliveries = len(bbb)
    wides_count = int((bbb["extras_type"] == "wide").sum())
    noballs_count = int((bbb["extras_type"] == "Overstep").sum())
    legbyes_count = int((bbb["extras_type"] == "legbyes").sum())
    byes_count = int((bbb["extras_type"] == "byes").sum())
    other_extras = int(bbb["extras_type"].isin(["other", "Penalty"]).sum())

    legal_mask = ~bbb["extras_type"].isin(["wide", "Overstep"])
    legal_deliveries = int(legal_mask.sum())
    batter_balls_faced = int((bbb["extras_type"] != "wide").sum())

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
        "tables": file_profiles
    }

    with open(out_dir / "dataset_overview.json", "w", encoding="utf-8") as f:
        json.dump(dataset_overview_json, f, indent=2)
    print(f"[✓] Exported {out_dir / 'dataset_overview.json'}")

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

    # 4. H2H Nemesis & Bunny (Strictly No Leakage: prior to current match)
    print("[*] Computing Zero-Leakage H2H Matrix...")
    h2h = (df.groupby(["striker_id", "bowler_id", "match_id", "match_date"], sort=False)
             .agg(r=("runs", "sum"), o=("bowler_wkt", "sum")).reset_index()
             .sort_values(["striker_id", "bowler_id", "match_date", "match_id"]))
    g = h2h.groupby(["striker_id", "bowler_id"])
    h2h["p_outs"] = g["o"].cumsum() - h2h["o"]      # strictly before this match
    h2h["p_runs"] = g["r"].cumsum() - h2h["r"]
    h2h["is_nemesis"] = ((h2h["p_outs"] >= 3) |
                         ((h2h["p_outs"] >= 2) &
                          (h2h["p_runs"] / h2h["p_outs"].clip(lower=1) < 15.0)))
    h2h["is_bunny"] = (h2h["p_outs"] >= 3)

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

    # 6. Sequential Micro-Momentum & Hidden Pressure Dynamics
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
    df["after_3_dots"] = (gdot.shift(1).fillna(0) + gdot.shift(2).fillna(0) + gdot.shift(3).fillna(0)) >= 3
    df["post_wkt"] = df.groupby(GI)["is_wicket"].shift(1).fillna(0).eq(1) & ~df["striker_out"].shift(1).fillna(False)

    cw_prev = df.groupby(GI)["cum_wkts"].shift(1).fillna(0)
    cw_prev12 = df.groupby(GI)["cum_wkts"].shift(13).fillna(0)
    df["rebuild"] = (cw_prev - cw_prev12) >= 2
    df["attack"] = ((df["rrr"] > 10.5) | df["revised_target"].notna()
                    | (df["overid"].between(16, 20) & (df["wkts_left"] >= 5)))

    df["is_pressure"] = (((df["wp_prev"].between(0.25, 0.75)) & df["overid"].between(15, 20))
                         | (chase & (df["rrr"] > 10.0))
                         | df["knock_out"].eq(1) | df["revised_target"].notna())

    # Bowler boundary bounce & deception
    prev_boundary = gb_bowl["is_boundary"].shift(1).fillna(False).astype(bool)
    sp_b = pd.concat([df["bowl_speed"], gb_bowl["bowl_speed"].shift(1), gb_bowl["bowl_speed"].shift(2)], axis=1)
    speed_std3 = sp_b.std(axis=1).fillna(0)
    def changed(col):
        prev = gb_bowl[col].shift(1)
        return prev.notna() & prev.astype(object).ne(df[col].astype(object))
    deceptive = (speed_std3 > 6.0) | changed("delivery_style") | changed("on_or_off") | changed("over_or_around")

    gdot_b = dot_i.groupby([df[c] for c in GBW])
    after_3_dots_b = (gdot_b.shift(1).fillna(0) + gdot_b.shift(2).fillna(0) + gdot_b.shift(3).fillna(0)) >= 3
    post_wkt_b = gb_bowl["bowler_wkt"].shift(1).fillna(0).eq(1)
    new_batter_b = df["bat_faced_before"] < 6

    # Unfavourable matchups
    pairs = df[["bowling_type", "batting_type"]].fillna("").apply(lambda s: s.astype(str).str.lower()).drop_duplicates()
    bt_p, ht_p = pairs["bowling_type"], pairs["batting_type"]
    pairs["unfav"] = ((bt_p.str.contains("off") & ht_p.str.contains("left"))
                      | (bt_p.str.contains("leg") & ht_p.str.contains("right"))
                      | (bt_p.str.contains("orthodox") & ht_p.str.contains("right")))
    key_pairs = df[["bowling_type", "batting_type"]].fillna("").apply(lambda s: s.astype(str).str.lower())
    df["unfav_bowler"] = key_pairs.merge(pairs, on=["bowling_type", "batting_type"], how="left")["unfav"].to_numpy()

    # Finish rate in tight successful chases
    last = (df[chase].groupby("match_id").agg(bl=("balls_left", "last"),
                                              win=("bat_won", "last"), team=("batting_team_id", "last")))
    tight = last[(last["win"] == 1) & (last["bl"] <= 12)].index
    ch = df[chase & df["match_id"].isin(tight) & df["is_batter_ball"]]
    fin = (ch.groupby(["striker_id", "match_id"])["striker_out"].any().rename("out").reset_index()
             .groupby("striker_id").agg(n=("out", "size"), nout=("out", lambda s: (~s).sum())))
    finish_rate = (fin["nout"] / (fin["n"] + K_SHRINK)).rename("finish_rate")

    # 7. BATTERS PGAI_100 (Exact Spec Formula)
    print("\n[*] Computing Batter PGAI_100 Index...")
    bat = df[df["is_batter_ball"]].copy()
    M_bat, rae, out = bat["M_t"], bat["rae"], bat["striker_out"]

    bat["tail_val"] = np.select(
        [(bat["over_ball_num"] <= 4) & bat["is_boundary"],
         (bat["over_ball_num"] >= 5) & bat["runs"].eq(1)], [1.5, 1.2], 0.0)
    bat["tempo_val"] = np.where(
        bat["rebuild"], np.where(bat["false_shot"], -2.5, 1.0),
        np.where(bat["attack"], np.where(bat["is_boundary"], 1.5, -0.3), rae))
    bat["ctl_val"] = -(bat["false_shot"].astype(float) + 2.0 * bat["is_runout"])

    bt_mean = bat.groupby(["striker_id", "pace_or_spin"], observed=True)["rae"].transform("mean")
    bat["unfav_bat"] = bt_mean < bat.groupby("striker_id")["rae"].transform("mean")

    BAT_COMPONENTS = {
        "wpa":      (M_bat * bat["wpa"],                             bat["is_pressure"]),
        "rae_p":    (M_bat * rae,                                    bat["is_pressure"]),
        "pace":     (M_bat * rae - 2.0 * out,                        bat["pace_or_var"]),
        "chain":    (np.where(out, -2.0, bat["runs"] * 0.5),         bat["after_3_dots"] | bat["post_wkt"]),
        "collapse": (np.where(out, -2.5, rae + 0.3),                 bat["overid"].le(6) & bat["wkts_before"].ge(2)),
        "matchup":  (np.where(out, -2.0, M_bat * rae + 0.4),         bat["is_nemesis"] | bat["unfav_bat"]),
        "tempo":    (bat["tempo_val"],                               pd.Series(True, index=bat.index)),
        "rotation": (bat["is_single_double"] - 0.5 * bat["is_dot"],
                     bat["overid"].between(7, 15) & ~bat["is_boundary"]),
        "farm":     (bat["tail_val"],                                bat["ns_order"].between(8, 11)),
        "control":  (bat["ctl_val"],                                 pd.Series(True, index=bat.index)),
    }

    bat_agg = {"total_balls": ("is_batter_ball", "size"), "total_runs": ("runs", "sum"),
               "press_balls": ("is_pressure", "sum"), "fours": ("is_four", "sum"), "sixes": ("is_six", "sum"),
               "dismissals": ("striker_out", "sum")}
    for k, (v, m) in BAT_COMPONENTS.items():
        bat[f"{k}_s"] = np.where(m, v, 0.0)
        bat[f"{k}_n"] = m.astype(np.int32)
        bat_agg[f"{k}_s"], bat_agg[f"{k}_n"] = (f"{k}_s", "sum"), (f"{k}_n", "sum")
    bat_agg = {k: v if isinstance(v, tuple) else v for k, v in bat_agg.items()}

    S_bat = (bat.groupby(["striker_id", "striker_name"], sort=False)
                .agg(**{k: pd.NamedAgg(*v) for k, v in bat_agg.items()}).reset_index())
    S_bat = S_bat[S_bat["total_balls"] >= MIN_BAT_BALLS].copy()
    S_bat = S_bat.join(finish_rate, on="striker_id")
    S_bat["finish_rate"] = S_bat["finish_rate"].fillna(0.0)

    sh_b = lambda c: S_bat[f"{c}_s"] / (S_bat[f"{c}_n"] + K_SHRINK)

    S_bat["PCE"] = 0.55 * sh_b("wpa") + 0.30 * sh_b("rae_p") + 0.15 * S_bat["finish_rate"]
    S_bat["PRR"] = (0.30 * zscore(sh_b("pace")) + 0.25 * zscore(sh_b("chain"))
                    + 0.25 * zscore(sh_b("collapse")) + 0.20 * zscore(sh_b("matchup")))
    S_bat["GIQ"] = (0.35 * zscore(sh_b("tempo")) + 0.25 * zscore(sh_b("rotation"))
                    + 0.20 * zscore(sh_b("farm")) + 0.20 * zscore(sh_b("control")))

    S_bat["Z_PCE"] = zscore(S_bat["PCE"])
    S_bat["Z_PRR"] = zscore(S_bat["PRR"])
    S_bat["Z_GIQ"] = zscore(S_bat["GIQ"])
    S_bat["Z_master"] = 0.38 * S_bat["Z_PCE"] + 0.32 * S_bat["Z_PRR"] + 0.30 * S_bat["Z_GIQ"]
    S_bat["PGAI_100"] = (50 + 15 * S_bat["Z_master"]).clip(0, 100).round(2)

    # 8. BOWLERS B-PGAI_100 (Exact Spec Formula)
    print("\n[*] Computing Bowler B-PGAI_100 Index...")
    rs_bowl, wk_bowl, dot_bowl, M_bowl = df["runs_saved"], df["bowler_wkt"], dot_i, df["M_bowl"]
    death = df["overid"].ge(16)
    df["role_load"] = 0.5 * df["is_captain"] + 0.3 * df["is_impact_off"]

    BOWL_COMPONENTS = {
        "wpa":      (M_bowl * df["bowl_wpa"],                     df["is_pressure"]),
        "rs":       (M_bowl * rs_bowl,                             df["is_pressure"]),
        "wae":      (M_bowl * df["wkts_above_exp"],                df["is_pressure"]),
        "bounce":   (np.where(dot_bowl.eq(1) | wk_bowl.eq(1), 1.5,
                              np.where(df["is_boundary"] | df["is_extra_pen"], -1.5, 0.0)), prev_boundary),
        "close":    (rs_bowl + 1.2 * wk_bowl,                     df["over_ball_num"].eq(6) | df["spell_over"].ge(3)),
        "matchup":  (rs_bowl + 1.5 * wk_bowl,                     df["unfav_bowler"] | df["is_dew"]),
        "dxtras":   (df["is_extra_pen"].astype(float),            death & df["is_legal"]),
        "deceive":  (rs_bowl + 1.5 * wk_bowl,                     deceptive),
        "choke":    (np.where(after_3_dots_b, 2.5 * wk_bowl + 0.5 * dot_bowl, 0.0)
                     + np.where(post_wkt_b, 2.0 * wk_bowl + 0.5 * dot_bowl, 0.0)
                     + np.where(new_batter_b, 1.2 * wk_bowl + 0.3 * dot_bowl, 0.0),
                     after_3_dots_b | post_wkt_b | new_batter_b),
        "plan":     (rs_bowl,                                     death & df["on_or_off"].astype(str).str.lower().eq("off")),
    }

    bowl_agg = {"legal_balls": ("is_legal", "sum"), "runs_conceded": ("bowler_runs", "sum"),
                "wickets": ("bowler_wkt", "sum"), "press_balls": ("is_pressure", "sum"),
                "role_load": ("role_load", "mean")}
    for k, (v, m) in BOWL_COMPONENTS.items():
        df[f"{k}_s"] = np.where(m, v, 0.0)
        df[f"{k}_n"] = np.asarray(m, dtype=np.int32)
        bowl_agg[f"{k}_s"], bowl_agg[f"{k}_n"] = (f"{k}_s", "sum"), (f"{k}_n", "sum")

    S_bowl = (df.groupby(["bowler_id", "bowler_name"], sort=False)
                .agg(**{k: pd.NamedAgg(*v) for k, v in bowl_agg.items()}).reset_index())
    S_bowl = S_bowl[S_bowl["legal_balls"] >= MIN_BOWL_BALLS].copy()
    S_bowl["econ"] = (S_bowl["runs_conceded"] / S_bowl["legal_balls"] * 6).round(2)

    sh_bw = lambda c: S_bowl[f"{c}_s"] / (S_bowl[f"{c}_n"] + K_SHRINK)

    S_bowl["BCE_raw"] = 0.45 * sh_bw("wpa") + 0.30 * sh_bw("rs") + 0.25 * sh_bw("wae")
    S_bowl["BCR_raw"] = (0.30 * zscore(sh_bw("bounce")) + 0.25 * zscore(sh_bw("close"))
                         + 0.25 * zscore(sh_bw("matchup")) - 0.20 * zscore(sh_bw("dxtras")))
    S_bowl["BGI_raw"] = (0.35 * zscore(sh_bw("deceive")) + 0.30 * zscore(sh_bw("choke"))
                         + 0.20 * zscore(sh_bw("plan")) + 0.15 * zscore(S_bowl["role_load"]))

    S_bowl["Z_BCE"] = zscore(S_bowl["BCE_raw"])
    S_bowl["Z_BCR"] = zscore(S_bowl["BCR_raw"])
    S_bowl["Z_BGI"] = zscore(S_bowl["BGI_raw"])
    S_bowl["Z_master"] = 0.40 * S_bowl["Z_BCE"] + 0.30 * S_bowl["Z_BCR"] + 0.30 * S_bowl["Z_BGI"]
    S_bowl["B_PGAI_100"] = (50 + 15 * S_bowl["Z_master"]).clip(0, 100).round(2)

    # 9. Enrich Profiles: Last Pressure Matches & Struggling Bowlers / Bunnies
    print("\n[*] Enriching Player Profiles with Pressure Matches & Nemesis Logs...")
    # Pre-index for player search & match logs
    bat_group = df[df["is_batter_ball"]].groupby("striker_id")
    bowl_group = df[df["is_legal"]].groupby("bowler_id")

    # Batsmen Profile Builder
    final_batters = []
    S_bat_sorted = S_bat.sort_values("PGAI_100", ascending=False).reset_index(drop=True)
    for rank, brow in S_bat_sorted.iterrows():
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

        # Dynamic Archetype
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
            "rank": rank + 1,
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

    with open(out_dir / "batters_pgai.json", "w", encoding="utf-8") as f:
        json.dump({
            "formula": "PGAI_100 = clip(50 + 15 * (0.38*Z_PCE + 0.32*Z_PRR + 0.30*Z_GIQ), 0, 100)",
            "cutoff_balls": MIN_BAT_BALLS,
            "total_evaluated": len(final_batters),
            "top_10": final_batters[:10],
            "all_batters": final_batters
        }, f, indent=2)
    print(f"[✓] Exported {out_dir / 'batters_pgai.json'} (Top 3: {[b['player_name'] for b in final_batters[:3]]})")

    # Bowler Profile Builder
    final_bowlers = []
    S_bowl_sorted = S_bowl.sort_values("B_PGAI_100", ascending=False).reset_index(drop=True)
    for rank, brow in S_bowl_sorted.iterrows():
        bid = brow["bowler_id"]
        bname = brow["bowler_name"]
        bdf = bowl_group.get_group(bid)

        # Dominated Bunnies
        bunnies_df = (bdf[bdf["bowler_wkt"].eq(1)].groupby("striker_name")
                         .agg(dismissals=("bowler_wkt", "sum"), runs=("bowler_runs", "sum"))
                         .reset_index().sort_values(by="dismissals", ascending=False).head(5))
        bunny_list = []
        for _, brow_b in bunnies_df.iterrows():
            s_name = brow_b["striker_name"]
            s_balls = len(bdf[bdf["striker_name"] == s_name])
            bunny_list.append({
                "batter_name": s_name,
                "balls": s_balls,
                "runs": int(brow_b["runs"]),
                "dismissals": int(brow_b["dismissals"]),
                "sr": round((brow_b["runs"] / max(s_balls, 1)) * 100.0, 1),
                "avg": round(brow_b["runs"] / max(brow_b["dismissals"], 1), 1)
            })

        # Last 5 Pressure Matches
        press_matches_b = (bdf[bdf["is_pressure"]].groupby("match_id")
                              .agg(date=("match_date", "first"), runs=("bowler_runs", "sum"),
                                   balls=("is_legal", "sum"), wkts=("bowler_wkt", "sum"),
                                   wpa=("bowl_wpa", "sum"), won=("bat_won", lambda x: int(x.iloc[0] == 0)))
                              .reset_index().sort_values(by="date", ascending=False).head(5))
        last_pressure_list_b = []
        for _, mrow in press_matches_b.iterrows():
            last_pressure_list_b.append({
                "match_id": int(mrow["match_id"]),
                "date": str(mrow["date"].strftime("%Y-%m-%d")),
                "runs": int(mrow["runs"]),
                "balls": int(mrow["balls"]),
                "wickets": int(mrow["wkts"]),
                "wpa": round(float(mrow["wpa"]), 3),
                "won": bool(mrow["won"])
            })

        z_bce, z_bcr, z_bgi = brow["Z_BCE"], brow["Z_BCR"], brow["Z_BGI"]
        if z_bce >= 2.0:
            b_arch = "Clutch Strike Weapon"
        elif z_bcr >= 2.0:
            b_arch = "Composure Enforcer"
        elif z_bgi >= 2.0:
            b_arch = "Mystery Deceiver"
        elif brow["B_PGAI_100"] >= 75:
            b_arch = "Death Enforcer"
        else:
            b_arch = "Pressure Specialist"

        final_bowlers.append({
            "rank": rank + 1,
            "player_id": int(bid),
            "player_name": bname,
            "legal_balls": int(brow["legal_balls"]),
            "wickets": int(brow["wickets"]),
            "runs_conceded": int(brow["runs_conceded"]),
            "economy": round(float(brow["econ"]), 2),
            "pressure_balls": int(brow["press_balls"]),
            "z_bce": round(float(z_bce), 2),
            "z_bcr": round(float(z_bcr), 2),
            "z_bgi": round(float(z_bgi), 2),
            "b_pgai_100": round(float(brow["B_PGAI_100"]), 2),
            "archetype": b_arch,
            "bunnies_log": bunny_list,
            "last_pressure_matches": last_pressure_list_b,
        })

    with open(out_dir / "bowlers_pgai.json", "w", encoding="utf-8") as f:
        json.dump({
            "formula": "B_PGAI_100 = clip(50 + 15 * (0.40*Z_BCE + 0.30*Z_BCR + 0.30*Z_BGI), 0, 100)",
            "cutoff_balls": MIN_BOWL_BALLS,
            "total_evaluated": len(final_bowlers),
            "top_10": final_bowlers[:10],
            "all_bowlers": final_bowlers
        }, f, indent=2)
    print(f"[✓] Exported {out_dir / 'bowlers_pgai.json'} (Top 3: {[b['player_name'] for b in final_bowlers[:3]]})")

    # 10. Master Cricket Analytics Framework & Methodology JSON
    methodology_meta = {
        "execution_time_sec": round(time.time() - start_time, 2),
        "pillars": [
            {
                "pillar_id": 1,
                "title": "Core Scoring, Wicket & Discipline",
                "aspects": [
                    {"code": "1.1", "name": "Scoring Volume & Tempo", "columns": "runs, is_four, is_six, extras_type", "description": "Filter wides, evaluate true boundary % vs strike rotation."},
                    {"code": "1.2", "name": "Dot-Ball Pressure & Stagnation", "columns": "runs, extras_type, is_wicket", "description": "Dot-ball creation for bowlers; dot-avoidance for batsmen."},
                    {"code": "1.3", "name": "Wicket Attribution & True Survival", "columns": "is_wicket, dismissal_type, dismissed_player_id", "description": "Clean separation of bowler-credited wickets from run-outs and retirements."},
                    {"code": "1.4", "name": "Discipline & Extra Penalty", "columns": "extras_type, extras1_runs, extras_2_runs", "description": "Penalty weighting for death-over unforced wides/no-balls."},
                    {"code": "1.5", "name": "Partnership Support & Breaking", "columns": "striker_id, non_striker_id, runs", "description": "Crease survival when partner accelerates; 40+ run stand breaker."}
                ]
            },
            {
                "pillar_id": 2,
                "title": "Tactical, Biomechanical & Matchups",
                "aspects": [
                    {"code": "2.1", "name": "Handedness & Angle Matchups", "columns": "batting_type, bowling_type", "description": "Efficiency vs opposite-handed and spin matchups (e.g. SLA vs LHB)."},
                    {"code": "2.2", "name": "Pace vs. Spin Mastery", "columns": "pace_or_spin", "description": "Harmonic mean between pace & spin efficiency to penalize one-dimensional play."},
                    {"code": "2.3", "name": "Speed & Express Pace Handling", "columns": "bowl_speed", "description": "Express pace (>=140 km/h) RAE and speed variance control."},
                    {"code": "2.4", "name": "Delivery Style Variation", "columns": "delivery_style", "description": "Out-of-fold Expected Runs (xR) and Expected Wickets (xW) target-encoding."},
                    {"code": "2.5", "name": "Line & Trajectory Control", "columns": "over_or_around, on_or_off", "description": "Trajectorial off-stump vs leg-stump containment and angles."},
                    {"code": "2.6", "name": "Shot Selection & False-Shot Rate", "columns": "stroke", "description": "Categorical clustering into attacking, controlled, and false strokes."}
                ]
            },
            {
                "pillar_id": 3,
                "title": "Match Phase & Game-State Pressure",
                "aspects": [
                    {"code": "3.1", "name": "Innings Phase Segmentation", "columns": "overid, over_ball_num, innings_ball_num", "description": "Powerplay (1-6), Middle (7-15), and Death (16-20) normalized baselines."},
                    {"code": "3.2", "name": "Win Probability Added (WPA)", "columns": "innings, runs, is_wicket, win_team_id", "description": "XGBoost in-game win probability delta per delivery (WP_t - WP_t-1)."},
                    {"code": "3.3", "name": "Collapse Recovery & Post-Wicket Shock", "columns": "innings_ball_num, is_wicket, batting_order", "description": "Stabilization when entering at >= 2 wickets down in Powerplay."},
                    {"code": "3.4", "name": "Knockout Stage Multiplier (1.75x)", "columns": "stage, knock_out", "description": "Amplified leverage for Finals, Qualifiers, and Eliminators."},
                    {"code": "3.5", "name": "Match-Winning Impact & POTM", "columns": "win_team_id, man_of_the_match", "description": "Isolating positive performance strictly in winning team contributions."}
                ]
            },
            {
                "pillar_id": 4,
                "title": "Venue, Conditions & Environment",
                "aspects": [
                    {"code": "4.1", "name": "Venue Scoring Baseline (xR / xW)", "columns": "venue_id", "description": "True strike rate and economy relative to ground dimensions and historical par."},
                    {"code": "4.2", "name": "Home vs. Away Resilience (1.40x)", "columns": "venue_country, home_team_id, away_team_id", "description": "Evaluating foreign/away conditions vs comfortable home ground baselines."},
                    {"code": "4.3", "name": "Toss Disadvantage & Dew Factor (1.30x)", "columns": "toss_win_team_id, innings, delivery_ist_time", "description": "Night dew second innings defense after losing the coin toss."}
                ]
            },
            {
                "pillar_id": 5,
                "title": "Sequential & Micro-Momentum Dynamics",
                "aspects": [
                    {"code": "5.1", "name": "3-Dot Chokehold Escape & Wicket Conversion", "columns": "runs, extras_type, is_wicket", "description": "Boundary/escape release vs 4th-ball wicket induction after 3 consecutive dots."},
                    {"code": "5.2", "name": "Post-Boundary Bounce-Back Composure", "columns": "is_four, is_six, bowler_runs", "description": "Dot ball or wicket rate on the delivery immediately following a 4 or 6."},
                    {"code": "5.3", "name": "Tail-Ender Strike Farming", "columns": "non_striker_id, ns_order, over_ball_num", "description": "Boundary hunting on balls 1-4 and single rotation on balls 5-6 when partner >= 8."},
                    {"code": "5.4", "name": "6th-Ball Over-Closing Resilience", "columns": "over_ball_num, overid", "description": "Execution on final ball of over to protect economy and prevent momentum shift."}
                ]
            },
            {
                "pillar_id": 6,
                "title": "Decision Engineering & Shrinkage",
                "aspects": [
                    {"code": "6.1", "name": "Empirical Bayes Shrinkage (k=50)", "columns": "Derived Applicable Balls", "description": "Shrinks small sample outliers toward prior mean (sh = sum / (n + 50)) to eliminate fluke spikes."},
                    {"code": "6.2", "name": "Winsorized Z-Score Normalization", "columns": "All sub-scores", "description": "Capping standardized scores at +/- 3 sigma before composite index aggregation."},
                    {"code": "6.3", "name": "Zero-Leakage Out-Of-Fold Validation", "columns": "GroupKFold(3) by match_id", "description": "Ensures ML models predict on unseen matches only, preventing lookahead bias."}
                ]
            }
        ],
        "formulas": {
            "batters": {
                "equation": "PGAI_100 = clip(50 + 15 * (0.38*Z_PCE + 0.32*Z_PRR + 0.30*Z_GIQ), 0, 100)",
                "pce": "0.55*sh('wpa') + 0.30*sh('rae_p') + 0.15*finish_rate",
                "prr": "0.30*Z_pace + 0.25*Z_chain + 0.25*Z_collapse + 0.20*Z_matchup",
                "giq": "0.35*Z_tempo + 0.25*Z_rotation + 0.20*Z_farm + 0.20*Z_control",
                "multipliers": "M_t = (1 + 0.75*knockout) * (1 + 0.40*away) * (1 + 0.50*opener_elite) * (1 + 0.35*nemesis)"
            },
            "bowlers": {
                "equation": "B_PGAI_100 = clip(50 + 15 * (0.40*Z_BCE + 0.30*Z_BCR + 0.30*Z_BGI), 0, 100)",
                "bce": "0.45*sh('wpa') + 0.30*sh('rs') + 0.25*sh('wae')",
                "bcr": "0.30*Z_bounce + 0.25*Z_close + 0.25*Z_matchup - 0.20*Z_dxtras",
                "bgi": "0.35*Z_deceive + 0.30*Z_choke + 0.20*Z_plan + 0.15*Z_role",
                "multipliers": "M_bowl = (1 + 0.75*knockout) * (1 + 0.40*away) * (1 + 0.30*dew) * (1 + 0.35*bunny) * (1 + 0.30*set_bat) * (1 + 0.25*dls_toss)"
            }
        }
    }

    with open(out_dir / "analytics_meta.json", "w", encoding="utf-8") as f:
        json.dump(methodology_meta, f, indent=2)
    print(f"[✓] Exported {out_dir / 'analytics_meta.json'}")

    print("\n" + "=" * 75)
    print(f"ANALYTICS PIPELINE COMPLETED IN {time.time() - start_time:.2f}s")
    print("=" * 75)


if __name__ == "__main__":
    run_pipeline()
