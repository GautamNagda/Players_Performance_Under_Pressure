#!/usr/bin/env python3
"""B-PGAI-100 bowler pressure and game-awareness scoring prototype.

Run:
  pip install pandas numpy scikit-learn
  # Optional preferred estimators:
  pip install xgboost lightgbm
  python b_pgai100.py --balls ball_by_ball.csv --matches matches.csv --outdir b_pgai_output

Required balls columns:
match_id, innings, overid, striker_id, bowler_id, bowling_team_id,
batting_team_id, runs_batter, total_runs, extras_type, is_wicket

Required matches columns:
match_id, home_team_id, away_team_id, win_team_id, knock_out, match_date, venue_id

The user's 240-legal-ball gate and 40/30/30 BCE/BCR/BGI weights are retained.
Missing advanced fields are reported; synthetic testing checks execution, not
whether the cricket metric is scientifically validated.
"""
from __future__ import annotations
import argparse, json, logging, sys
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import Pipeline

LOG = logging.getLogger("b_pgai100")
MIN_LEGAL = 400
K_PRESSURE = 50.0
XR_COLS = ["overid", "venue_code", "pace_or_spin_code", "bowl_speed",
           "delivery_style_code", "on_or_off_code", "over_or_around_code",
           "innings", "wickets_left", "rrr", "batter_pre_match_rating"]
XW_COLS = XR_COLS + ["batter_balls_faced", "batting_type_code"]
WP_COLS = ["current_runs", "runs_left", "balls_left", "wickets_left",
           "rrr", "venue_code", "innings", "knock_out"]


def numeric(df, cols):
    for c in cols:
        if c not in df:
            df[c] = np.nan
        df[c] = pd.to_numeric(df[c], errors="coerce")


def flag(s):
    if pd.api.types.is_bool_dtype(s):
        return s.fillna(False)
    if pd.api.types.is_numeric_dtype(s):
        return s.fillna(0).ne(0)
    return s.astype("string").str.strip().str.lower().isin({"1", "true", "yes", "y", "t"})


def encode(df, cols):
    for c in cols:
        if c not in df:
            df[c] = "unknown"
        df[c + "_code"] = pd.factorize(df[c].astype("string").fillna("unknown"), sort=True)[0].astype(float)


def scale100(s, higher=True):
    x = pd.to_numeric(s, errors="coerce").replace([np.inf, -np.inf], np.nan)
    if not higher:
        x = -x
    if x.notna().sum() < 2:
        return pd.Series(50.0, index=s.index)
    lo, hi = x.quantile([.05, .95])
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        return pd.Series(50.0, index=s.index)
    return ((x.clip(lo, hi) - lo) / (hi - lo) * 100).fillna(50.0)


def winsor_z(s, limit=3):
    x = pd.to_numeric(s, errors="coerce").replace([np.inf, -np.inf], np.nan)
    if x.notna().sum() < 2:
        return pd.Series(0.0, index=s.index)
    lo, hi = x.quantile([.01, .99])
    x = x.clip(lo, hi)
    sd = x.std(ddof=0)
    if not np.isfinite(sd) or sd < 1e-12:
        return pd.Series(0.0, index=s.index)
    return ((x - x.mean()) / sd).clip(-limit, limit).fillna(0)


def estimator(kind):
    if kind == "reg":
        try:
            from lightgbm import LGBMRegressor
            model = LGBMRegressor(n_estimators=220, learning_rate=.04, num_leaves=15,
                                  reg_lambda=2, random_state=42, verbosity=-1)
            name = "LightGBM"
        except ImportError:
            model = HistGradientBoostingRegressor(max_iter=160, max_leaf_nodes=15,
                                                  l2_regularization=2, random_state=42)
            name = "HistGradientBoosting fallback"
    else:
        try:
            from xgboost import XGBClassifier
            model = XGBClassifier(n_estimators=220, max_depth=4, learning_rate=.04,
                                  subsample=.85, colsample_bytree=.85, reg_lambda=2,
                                  eval_metric="logloss", random_state=42, n_jobs=4)
            name = "XGBoost"
        except ImportError:
            model = HistGradientBoostingClassifier(max_iter=160, max_leaf_nodes=15,
                                                   l2_regularization=2, random_state=42)
            name = "HistGradientBoosting fallback"
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", model)]), name


def oof(model, X, y, groups, classification=False):
    X, y, groups = X.reset_index(drop=True), pd.Series(y).reset_index(drop=True), pd.Series(groups).reset_index(drop=True)
    valid = y.notna() & groups.notna()
    out = np.full(len(y), np.nan)
    if valid.sum() < 40 or groups[valid].nunique() < 2:
        out[:] = float(y[valid].mean()) if valid.any() else (0.5 if classification else 0.0)
        return out, "constant prior (small sample)"
    ix = np.flatnonzero(valid.to_numpy())
    try:
        cv = GroupKFold(n_splits=min(3, groups[valid].nunique()))
        pred = cross_val_predict(model, X.iloc[ix], y.iloc[ix], groups=groups.iloc[ix],
                                 cv=cv, method="predict_proba" if classification else "predict")
        if classification:
            pred = pred[:, 1] if pred.ndim == 2 and pred.shape[1] == 2 else pred[:, -1]
        out[ix] = np.asarray(pred).reshape(-1)
        out[~np.isfinite(out)] = float(y[valid].mean())
        return out, "grouped out-of-fold by match"
    except Exception as e:
        LOG.warning("Model OOF failed (%s); using mean baseline", e)
        out[:] = float(y[valid].mean())
        return out, "mean fallback"


def load_data(ball_path, match_path):
    b, m = pd.read_csv(ball_path, low_memory=False), pd.read_csv(match_path, low_memory=False)
    
    # Handle CSV column aliases gracefully
    if "runs_batter" not in b.columns and "runs" in b.columns:
        b["runs_batter"] = b["runs"]
    if "total_runs" not in b.columns:
        e1 = pd.to_numeric(b.get("extras1_runs", 0), errors="coerce").fillna(0)
        e2 = pd.to_numeric(b.get("extras_2_runs", 0), errors="coerce").fillna(0)
        b["total_runs"] = b["runs_batter"] + e1 + e2
    
    # Check for playing_eleven.csv to supply is_captain, is_impact_off, is_played
    p11_candidates = [
        Path(ball_path).parent / "playing_eleven.csv",
        Path("data pack/playing_eleven.csv")
    ]
    for p11_file in p11_candidates:
        if p11_file.exists():
            try:
                p11 = pd.read_csv(p11_file, low_memory=False)
                cols_to_use = [c for c in ["match_id", "player_id", "is_captain", "is_impact_off", "is_played"] if c in p11.columns]
                p11_sub = p11[cols_to_use].drop_duplicates().rename(columns={"player_id": "bowler_id"})
                b["match_id"] = b["match_id"].astype("string")
                p11_sub["match_id"] = p11_sub["match_id"].astype("string")
                b["bowler_id"] = b["bowler_id"].astype("string")
                p11_sub["bowler_id"] = p11_sub["bowler_id"].astype("string")
                b = b.merge(p11_sub, on=["match_id", "bowler_id"], how="left")
                break
            except Exception as e:
                LOG.warning("Could not merge playing_eleven: %s", e)

    rb = ["match_id","innings","overid","striker_id","bowler_id","bowling_team_id",
          "batting_team_id","runs_batter","total_runs","extras_type","is_wicket"]
    rm = ["match_id","home_team_id","away_team_id","win_team_id","knock_out","match_date","venue_id"]
    mb, mm = [c for c in rb if c not in b], [c for c in rm if c not in m]
    if mb: raise ValueError(f"ball_by_ball.csv missing required columns: {mb}")
    if mm: raise ValueError(f"matches.csv missing required columns: {mm}")
    if m.match_id.duplicated().any(): raise ValueError("matches.csv must have one row per match_id")
    b["match_id"], m["match_id"] = b.match_id.astype("string"), m.match_id.astype("string")
    if "match_date" in b: b = b.drop(columns="match_date")
    m["match_date"] = pd.to_datetime(m.match_date, errors="coerce", utc=True)
    # Match table wins on overlapping metadata columns.
    b = b.drop(columns=[c for c in m.columns if c in b.columns and c != "match_id"], errors="ignore")
    d = b.merge(m, on="match_id", how="left", validate="many_to_one")
    numeric(d, ["innings","overid","runs_batter","total_runs","is_wicket","knock_out",
                "bowl_speed","rrr","target_runs","runs_left","balls_remaining","wickets_left",
                "batter_balls_faced","over_ball_num","stroke","is_four","is_six","is_dot",
                "is_single","is_two","is_three","is_captain","is_impact_off","is_played",
                "is_free_hit","result_margin_runs","result_margin_wickets","batter_pre_match_rating"])
    d["is_wicket"], d["knock_out"] = flag(d.is_wicket).astype(int), flag(d.knock_out).astype(int)
    d["extras_type"] = d.extras_type.astype("string").str.lower().fillna("")
    d["dismissal_type"] = (d["dismissal_type"].astype("string").str.lower()
                           if "dismissal_type" in d else pd.Series("",index=d.index,dtype="string"))
    d["is_wide"] = d.extras_type.str.contains("wide", regex=False)
    d["is_noball"] = d.extras_type.str.contains("no.?ball", regex=True)
    d["is_legal_ball"] = ~(d.is_wide | d.is_noball)
    d["is_bye"] = d.extras_type.str.contains(r"^byes?$", regex=True)
    d["is_legbye"] = d.extras_type.str.contains(r"^legbyes?$", regex=True)
    # Bowler is charged batter runs + wides/no-balls/penalty extras, not byes/leg-byes.
    d["BowlRuns"] = np.where(d.is_bye | d.is_legbye,
                              d.total_runs - d.runs_batter, d.total_runs)
    d["BowlRuns"] = d["BowlRuns"].clip(lower=0).fillna(0)
    excluded = {"run out","retired hurt","retired out","obstructing the field","timed out"}
    d["IsBowlWkt"] = (d.is_wicket.eq(1) & ~d.dismissal_type.isin(excluded)).astype(int)
    d["innings"] = d.innings.fillna(1).astype(int)
    d["overid"] = d.overid.fillna(0).astype(int)
    d["runs_batter"] = d.runs_batter.fillna(0)
    d["total_runs"] = d.total_runs.fillna(d.runs_batter)
    sort = ["match_id","innings","overid"] + (["ball"] if "ball" in d else ["ball_number"] if "ball_number" in d else [])
    d = d.sort_values(sort, kind="mergesort").reset_index(drop=True)
    encode(d, ["venue_id","pace_or_spin","delivery_style","on_or_off","over_or_around","batting_type","bowling_type"])
    d["venue_code"] = d.venue_id_code
    return d


def add_state(d):
    d = d.copy()
    g = ["match_id","innings"]
    d["current_runs"] = d.groupby(g).total_runs.cumsum() - d.total_runs
    d["wickets_before"] = d.groupby(g).is_wicket.cumsum() - d.is_wicket
    totals = d.groupby(g).total_runs.sum().rename("innings_total")
    d = d.join(totals, on=g)
    target = d.loc[d.innings.eq(1)].groupby("match_id").innings_total.first().add(1).rename("inferred_target")
    d = d.join(target, on="match_id")
    if "target_runs" not in d: d["target_runs"] = np.nan
    d["target_runs"] = d.target_runs.fillna(d.inferred_target)
    if "balls_remaining" not in d: d["balls_remaining"] = np.nan
    d["balls_left"] = d.balls_remaining
    if "runs_left" not in d: d["runs_left"] = np.nan
    chase = d.innings.gt(1)
    d.loc[chase,"runs_left"] = d.loc[chase,"runs_left"].fillna(
        (d.loc[chase,"target_runs"] - d.loc[chase,"current_runs"]).clip(lower=0))
    d.loc[~chase,"runs_left"] = np.nan
    if "wickets_left" not in d: d["wickets_left"] = np.nan
    d["wickets_left"] = d.wickets_left.fillna((10-d.wickets_before).clip(0,10))
    if "rrr" not in d: d["rrr"] = np.nan
    d["rrr"] = d.rrr.fillna(6*d.runs_left/d.balls_left.replace(0,np.nan))
    d["current_runs_after"] = d.current_runs + d.total_runs
    d["runs_left_after"] = (d.runs_left-d.total_runs).clip(lower=0)
    d["balls_left_after"] = (d.balls_left-d.is_legal_ball.astype(int)).clip(lower=0)
    d["wickets_left_after"] = (d.wickets_left-d.is_wicket).clip(0,10)
    d["rrr_after"] = 6*d.runs_left_after/d.balls_left_after.replace(0,np.nan)
    return d


def add_context(d):
    d = d.copy()
    d["match_date"] = pd.to_datetime(d.match_date, errors="coerce", utc=True)
    d["is_away"] = (d.bowling_team_id.astype("string") == d.away_team_id.astype("string")).astype(int)
    # Count batter balls before this delivery; wide does not count, no-ball does.
    d["batter_balls_faced"] = d.groupby(["match_id","innings","striker_id"]).is_wide.transform(
        lambda s: (~s).cumsum()-(~s).astype(int))
    if "batter_balls_faced_source" in d:
        d["batter_balls_faced"] = d.batter_balls_faced.fillna(d.batter_balls_faced_source)
    # Time of day is assumed to be IST as supplied.
    if "delivery_ist_time" in d:
        tm = pd.to_datetime(d.delivery_ist_time.astype("string"), errors="coerce")
        d["delivery_minutes"] = tm.dt.hour*60 + tm.dt.minute
    else: d["delivery_minutes"] = np.nan
    d["inn2_dew"] = (d.innings.eq(2) & d.delivery_minutes.ge(19*60)).astype(int)
    # Historical bowler-vs-batter bunny: only prior match dates.
    d["bunny"] = 0
    hist = d.loc[d.match_date.notna()].sort_values(["match_date","match_id"])
    dis, rr, bb = {}, {}, {}
    for _, day in hist.groupby("match_date", sort=True):
        for ix, r in day.iterrows():
            k = (r.bowler_id,r.striker_id); n=dis.get(k,0); runs=rr.get(k,0); balls=bb.get(k,0)
            avg = runs/n if n else np.inf
            d.at[ix,"bunny"] = int(n>=3 or (n>=2 and avg<15))
        for _, r in day.iterrows():
            k=(r.bowler_id,r.striker_id)
            rr[k]=rr.get(k,0)+float(r.runs_batter)
            if not r.is_wide: bb[k]=bb.get(k,0)+1
            out = str(r.get("dismissed_player_id","")) == str(r.striker_id)
            if r.IsBowlWkt and out: dis[k]=dis.get(k,0)+1
    d["set_bat"] = d.batter_balls_faced.ge(20).astype(int)
    if "dls_toss" in d:
        d["dls_toss"] = flag(d.dls_toss).astype(int)
    else:
        d["dls_toss"] = d.get("revised_target",pd.Series(np.nan,index=d.index)).notna().astype(int)
        if "toss_lost_harder_innings" in d:
            d["dls_toss"] = np.maximum(d.dls_toss, flag(d.toss_lost_harder_innings).astype(int))
    d["M_bowl"] = ((1+.75*d.knock_out)*(1+.40*d.is_away)*(1+.30*d.inn2_dew)*
                   (1+.35*d.bunny)*(1+.30*d.set_bat)*(1+.25*d.dls_toss))
    # Spell over ordinal. This is a proxy; interrupted spells should be checked.
    ov = d.loc[d.is_legal_ball].groupby(["match_id","innings","bowler_id","overid"]).size().reset_index(name="n")
    ov = ov.sort_values(["match_id","innings","bowler_id","overid"])
    ov["bowler_spell_over"] = ov.groupby(["match_id","innings","bowler_id"]).cumcount()+1
    d = d.merge(ov[["match_id","innings","bowler_id","overid","bowler_spell_over"]],
                on=["match_id","innings","bowler_id","overid"],how="left",validate="many_to_one")
    d["bowler_spell_over"] = d.bowler_spell_over.fillna(0)
    return d


def add_models(d):
    d = d.copy()
    for c in set(XR_COLS+XW_COLS+WP_COLS):
        if c not in d: d[c] = np.nan
    # Fill NAs in features to ensure imputer has numeric baseline
    d["rrr"] = d["rrr"].fillna(0.0)
    d["batter_pre_match_rating"] = d["batter_pre_match_rating"].fillna(50.0)
    
    reg, reg_name = estimator("reg")
    d["xR"], xr_method = oof(reg,d[XR_COLS],d.BowlRuns,d.match_id)
    d["xR"] = np.clip(d.xR,0,12)
    clf, clf_name = estimator("clf")
    d["xW"], xw_method = oof(clf,d[XW_COLS],d.IsBowlWkt,d.match_id,True)
    d["xW"] = np.clip(d.xW,0,1)
    
    wp, wp_name = estimator("clf")
    # Target: 1 if batting team won, 0 otherwise. Handle NAs safely.
    bat_team = d.batting_team_id.astype(str)
    win_team = d.win_team_id.astype(str)
    target = pd.Series(np.where(d.win_team_id.notna() & (bat_team == win_team), 1, 0), index=d.index)
    
    before = d[WP_COLS].copy()
    after = before.copy()
    after["current_runs"] = d.current_runs_after
    after["runs_left"] = d.runs_left_after
    after["balls_left"] = d.balls_left_after
    after["wickets_left"] = d.wickets_left_after
    after["rrr"] = d.rrr_after
    d["BatWP_before"], wp_method = oof(wp,before,target,d.match_id,True)
    d["BatWP_after"], _ = oof(wp,after,target,d.match_id,True)
    d["BatWP_before"] = d.BatWP_before.clip(0,1)
    d["BatWP_after"] = d.BatWP_after.clip(0,1)
    d["BowlerWPA"] = d.BatWP_before-d.BatWP_after
    dismissal = d.dismissal_type.astype("string").str.lower() if "dismissal_type" in d else pd.Series("",index=d.index)
    d["W_val"] = np.where(d.set_bat.eq(1)|dismissal.isin(["bowled","lbw"]),1.4,1.0)
    report = {"xR":reg_name,"xR_method":xr_method,"xW":clf_name,"xW_method":xw_method,
              "WP":wp_name,"WP_method":wp_method}
    return d,report


def add_pressure(d):
    d=d.copy()
    competitive=d.BatWP_before.between(.25,.75)&d.overid.between(15,20)
    close=(d.innings.eq(2)&d.rrr.between(8.5,13)&d.overid.between(15,20))
    dls=d.get("revised_target",pd.Series(np.nan,index=d.index)).notna()
    close_result=(d.get("result_margin_runs",pd.Series(np.nan,index=d.index)).lt(10)|
                  d.get("result_margin_wickets",pd.Series(np.nan,index=d.index)).lt(2))
    if "super_over" in d: close_result=close_result|flag(d.super_over)
    d["is_pressure"]=competitive|close|d.knock_out.eq(1)|dls|close_result
    # Proxy for state leverage: uncertainty is greatest around WP=50%.
    # This is not a full outcome-distribution Leverage Index.
    wp=d.BatWP_before.clip(0,1)
    d["Leverage_Index_Proxy"]=4*wp*(1-wp)
    return d


def score_bowlers(d, min_legal=MIN_LEGAL):
    d=d.copy()
    d["is_four"]=d.is_four.fillna(d.runs_batter.eq(4)).astype(int)
    d["is_six"]=d.is_six.fillna(d.runs_batter.eq(6)).astype(int)
    d["is_dot"]=d.is_dot.fillna(d.BowlRuns.eq(0)).astype(int)
    d["is_boundary"]=(d.is_four.eq(1)|d.is_six.eq(1)).astype(int)
    d["bad_extra"]=(d.is_wide|d.is_noball).astype(int)
    d["prev_boundary"]=d.groupby(["match_id","innings","bowler_id"]).is_boundary.shift().fillna(0)
    d["prev_wicket"]=d.groupby(["match_id","innings","bowler_id"]).IsBowlWkt.shift().fillna(0)
    g=["match_id","innings","bowler_id"]
    d["dot3"]=d.groupby(g).is_dot.transform(lambda s:s.shift(1).rolling(3,min_periods=3).sum())
    d["speed_std3"]=d.groupby(g).bowl_speed.transform(lambda s:s.rolling(3,min_periods=2).std())
    d["speed_delta"]=d.groupby(g).bowl_speed.diff().abs()
    d["style_change"]=d.groupby(g).delivery_style_code.transform(lambda s:s.ne(s.shift()).astype(int))
    d["angle_change"]=((d.groupby(g).on_or_off_code.transform(lambda s:s.ne(s.shift()).astype(int)))|
                       (d.groupby(g).over_or_around_code.transform(lambda s:s.ne(s.shift()).astype(int))))
    d["deception"]=d.speed_std3.gt(6)|d.speed_delta.gt(6)|d.style_change.eq(1)|d.angle_change.eq(1)
    if "over_ball_num" in d and d.over_ball_num.notna().any():
        d["ball_in_over"]=d.over_ball_num
    else:
        d["ball_in_over"]=d.groupby(["match_id","innings","bowler_id","overid"]).is_legal_ball.cumsum()
    d["sixth_ball"]=d.is_legal_ball&d.ball_in_over.eq(6)
    d["new_batter"]=d.batter_balls_faced.le(6)
    d["high_leverage"]=d.is_pressure|d.overid.ge(16)

    legal=d.loc[d.is_legal_ball].groupby("bowler_id").size().rename("legal_balls")
    eligible=legal[legal>=min_legal].index
    d=d[d.bowler_id.isin(eligible)].copy()
    if d.empty: raise ValueError(f"No bowler reaches {min_legal} legal balls.")

    # BCE formula exactly: weighted negative batting WPA, runs saved, WAA, +50 balls.
    p=d[d.is_pressure].copy()
    p["w_wpa"]=p.M_bowl*p.BowlerWPA
    p["w_runs"]=p.M_bowl*(p.xR-p.BowlRuns)
    p["w_wkt"]=p.M_bowl*p.W_val*(p.IsBowlWkt-p.xW)
    bce=p.groupby("bowler_id").agg(npress=("is_legal_ball","sum"),
                                  wpa=("w_wpa","sum"),runs=("w_runs","sum"),wkt=("w_wkt","sum"))
    den=bce.npress+K_PRESSURE
    bce["BCE_raw"]=.45*bce.wpa/den+.30*bce.runs/den+.25*bce.wkt/den

    # BCR: bounce-back after boundary; sixth ball / longer spell; matchup & environment; discipline.
    post=d[d.prev_boundary.eq(1)]
    bounce=post.groupby("bowler_id").apply(
        lambda x:x.is_dot.mean()+x.IsBowlWkt.mean()-x.is_boundary.mean()-x.bad_extra.mean(),
        include_groups=False) if len(post) else pd.Series(dtype=float)
    spell=d[d.sixth_ball|d.bowler_spell_over.ge(3)]
    spell_score=spell.groupby("bowler_id").apply(
        lambda x:(x.xR-x.BowlRuns).mean()+x.is_dot.mean()+x.IsBowlWkt.mean(),
        include_groups=False) if len(spell) else pd.Series(dtype=float)
    # Generic matchup proxy only; supply competition-specific matchup flags for serious use.
    bat=d.batting_type.astype("string").str.lower() if "batting_type" in d else pd.Series("",index=d.index)
    bowl=d.bowling_type.astype("string").str.lower() if "bowling_type" in d else pd.Series("",index=d.index)
    unfav=((bat.str.contains("left|lh",na=False)&bowl.str.contains("off",na=False))|
           (bat.str.contains("right|rh",na=False)&bowl.str.contains("left arm orthodox",na=False)))
    env=d[unfav|d.is_away.eq(1)|d.inn2_dew.eq(1)]
    env_score=env.groupby("bowler_id").apply(
        lambda x:(x.xR-x.BowlRuns).mean()+x.IsBowlWkt.mean(),
        include_groups=False) if len(env) else pd.Series(dtype=float)
    disc=d[d.high_leverage|d.overid.between(16,20)]
    disc_score=1-disc.groupby("bowler_id").apply(
        lambda x:(x.bad_extra.mean()+x.get("is_free_hit",pd.Series(0,index=x.index)).fillna(0).sum()/
                  max(x.is_legal_ball.sum(),1)),include_groups=False).clip(0,1) if len(disc) else pd.Series(dtype=float)

    # BGI: deception; choke after 3 dots / wicket / new batter; line/angle plans; role load.
    dec=d[d.deception]
    dec_score=dec.groupby("bowler_id").apply(
        lambda x:(x.xR-x.BowlRuns).mean()+x.get("stroke",pd.Series(0,index=x.index)).fillna(0).gt(0).mean(),
        include_groups=False) if len(dec) else pd.Series(dtype=float)
    choke=d[d.dot3.ge(3)|d.prev_wicket.eq(1)|d.new_batter]
    choke_score=choke.groupby("bowler_id").apply(
        lambda x:x.is_dot.mean()+x.IsBowlWkt.mean(),include_groups=False) if len(choke) else pd.Series(dtype=float)
    plan=d[d.high_leverage&(d.on_or_off.astype("string").str.lower().eq("off")|
                            d.over_or_around.astype("string").str.lower().eq("around"))]
    plan_score=plan.groupby("bowler_id").apply(
        lambda x:1-x.is_boundary.mean()+x.get("stroke",pd.Series(0,index=x.index)).fillna(0).gt(0).mean(),
        include_groups=False) if len(plan) else pd.Series(dtype=float)

    role=d.groupby("bowler_id").agg(
        captain=("is_captain",lambda s:flag(s).mean()),
        impact=("is_impact_off",lambda s:flag(s).mean()))
    # A comeback proxy is only computed when match-level appearance flags exist.
    role["comeback"]=0.0
    if "is_played" in d:
        match_dates=d.groupby(["bowler_id","match_id"]).match_date.first().reset_index()
        mp=d.groupby(["bowler_id","match_id"]).is_played.first().reset_index().merge(
            match_dates,on=["bowler_id","match_id"],how="left")
        mp=mp.sort_values(["bowler_id","match_date","match_id"])
        mp["miss2"]=mp.groupby("bowler_id").is_played.transform(
            lambda s:(~flag(s)).shift().rolling(2,min_periods=2).sum())
        ids=mp.loc[flag(mp.is_played)&mp.miss2.ge(2),"bowler_id"].unique()
        role["comeback"]=role.index.isin(ids).astype(float)
    role["role_raw"]=.35*role.captain+.35*role.impact+.30*role.comeback

    out=pd.DataFrame(index=pd.Index(eligible,name="bowler_id")).join(legal)
    raw={"BCE_raw":bce.BCE_raw,"bounce_raw":bounce,"spell_raw":spell_score,
         "env_raw":env_score,"disc_raw":disc_score,"deception_raw":dec_score,
         "choke_raw":choke_score,"plan_raw":plan_score,"role_raw":role.role_raw}
    for c,s in raw.items(): out[c]=s
    # Shrink sparse component estimates toward eligible cohort mean.
    shrink=out.legal_balls/(out.legal_balls+120)
    for c in list(raw)[1:]:
        mu=out[c].mean()
        if not np.isfinite(mu): mu=0.0
        out[c]=out[c].fillna(mu)
        out[c]=shrink*out[c]+(1-shrink)*mu

    out["S_bounce"]=scale100(out.bounce_raw)
    out["S_spell_close"]=scale100(out.spell_raw)
    out["S_matchup_env"]=scale100(out.env_raw)
    out["S_disc"]=scale100(out.disc_raw)
    out["BCR"]=.30*out.S_bounce+.25*out.S_spell_close+.25*out.S_matchup_env+.20*out.S_disc
    out["I_deception"]=scale100(out.deception_raw)
    out["I_choke"]=scale100(out.choke_raw)
    out["I_plan"]=scale100(out.plan_raw)
    out["I_role_load"]=scale100(out.role_raw)
    out["BGI"]=.35*out.I_deception+.30*out.I_choke+.20*out.I_plan+.15*out.I_role_load
    out["BCE"]=out.BCE_raw.fillna(0)
    out["Z_BCE"],out["Z_BCR"],out["Z_BGI"]=winsor_z(out.BCE),winsor_z(out.BCR),winsor_z(out.BGI)
    out["Z_raw"]=.40*out.Z_BCE+.30*out.Z_BCR+.30*out.Z_BGI
    out["B_PGAI_100"]=(50+15*out.Z_raw).clip(0,100)
    out["rank"]=out.B_PGAI_100.rank(method="min",ascending=False).astype(int)
    out["rating_band"]=pd.cut(out.B_PGAI_100,[-.001,49.999,59.999,74.999,100.001],
                              labels=["Below average","Above average","Strong","Marquee"])

    # Additional scouting diagnostics (kept separate from the master formula).
    # These are not extra weights in B-PGAI and should not be added to it again.
    d["runs_saved"] = d.xR - d.BowlRuns
    d["wickets_above_expected"] = d.IsBowlWkt - d.xW
    d["pressure_legal"] = d.is_pressure & d.is_legal_ball
    diag = d.groupby("bowler_id").agg(
        balls=("is_legal_ball","sum"),
        total_bowler_runs=("BowlRuns","sum"),
        credited_wickets=("IsBowlWkt","sum"),
        total_legal=("is_legal_ball","sum"),
        runs_saved_per_ball=("runs_saved","mean"),
        waa_per_ball=("wickets_above_expected","mean"),
        wpa_per_ball=("BowlerWPA","mean"),
        pressure_balls=("pressure_legal","sum"),
        dot_rate=("is_dot","mean"),
        boundary_rate=("is_boundary","mean"),
        leverage_proxy=("Leverage_Index_Proxy","mean"),
    )
    diag["economy"] = 6*diag.total_bowler_runs/diag.total_legal.replace(0,np.nan)
    diag["strike_rate"] = diag.total_legal/diag.credited_wickets.replace(0,np.nan)
    # Match-to-match consistency: lower dispersion in runs saved per legal ball is better.
    match_perf=d.groupby(["bowler_id","match_id"]).agg(
        match_runs_saved=("runs_saved","sum"),
        match_legal=("is_legal_ball","sum")
    )
    match_perf["match_saved_per_ball"]=match_perf.match_runs_saved/match_perf.match_legal.replace(0,np.nan)
    consistency=match_perf.groupby("bowler_id").match_saved_per_ball.std().rename("match_impact_sd")
    diag=diag.join(consistency)
    out=out.join(diag,how="left")
    out["Leverage_Exposure"] = (out.pressure_balls/out.legal_balls.replace(0,np.nan)).fillna(0)
    out["Leverage_Index_Proxy"] = out.leverage_proxy
    out["Reliability_Exposure"] = (out.legal_balls/(out.legal_balls+240)*100).clip(0,100)
    out["Consistency_Score"] = scale100(out.match_impact_sd,higher=False)
    out["BCI"] = (
        scale100(out.wpa_per_ball) +
        scale100(out.runs_saved_per_ball) +
        scale100(out.waa_per_ball)
    )/3
    out["BPI"] = (
        scale100(out.economy,higher=False) +
        scale100(out.strike_rate,higher=False) +
        scale100(out.dot_rate) +
        scale100(out.boundary_rate,higher=False)
    )/4
    if "bowler_name" in d.columns:
        b_names = d.groupby("bowler_id")["bowler_name"].first()
        out["bowler_name"] = out.index.map(b_names)
    return out.reset_index().sort_values(["B_PGAI_100","legal_balls"],ascending=[False,False])
