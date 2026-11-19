import json
import urllib.parse
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any, Dict, Optional

# Path resolution for local development and Vercel serverless environment
def get_data_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "public" / "data",
        Path.cwd() / "public" / "data",
        Path.cwd() / "dist" / "data",
        Path(__file__).resolve().parent / "data",
    ]
    for p in candidates:
        if p.exists() and (p / "batters_pgai.json").exists():
            return p
    return candidates[0]

DATA_DIR = get_data_dir()

# Cache loaded datasets in memory across warm serverless invocations
_CACHE: Dict[str, Any] = {}

def load_json(filename: str) -> Optional[Dict[str, Any]]:
    if filename in _CACHE:
        return _CACHE[filename]
    filepath = DATA_DIR / filename
    if filepath.exists():
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                _CACHE[filename] = data
                return data
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return None
    return None


class handler(BaseHTTPRequestHandler):
    """Vercel Python Serverless Function Handler."""

    def _set_headers(self, status_code: int = 200, content_type: str = "application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
        self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self._set_headers(200)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = urllib.parse.parse_qs(parsed.query)

        # 1. Health / Root Endpoint
        if path in ("", "/api", "/api/health"):
            res = {
                "status": "healthy",
                "service": "PLAYERS UNDER PRESSURE - Rajasthan Royals Decision-Intelligence API",
                "version": "1.0.0",
                "models": ["xR (LightGBM)", "WPA (XGBoost)", "Empirical Bayes (k=50)"],
                "endpoints": [
                    "/api/health",
                    "/api/top10",
                    "/api/batters",
                    "/api/bowlers",
                    "/api/search?q={name}",
                    "/api/meta",
                    "/api/overview"
                ]
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
            return

        # 2. Top 10 Combined Leaderboard
        if path == "/api/top10":
            batters_data = load_json("batters_pgai.json") or {}
            bowlers_data = load_json("bowlers_pgai.json") or {}
            res = {
                "top_10_batters": batters_data.get("top_10", []),
                "top_10_bowlers": bowlers_data.get("top_10", []),
                "batters_formula": batters_data.get("formula", ""),
                "bowlers_formula": bowlers_data.get("formula", ""),
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
            return

        # 3. Batters Endpoint
        if path == "/api/batters":
            batters_data = load_json("batters_pgai.json") or {}
            all_b = batters_data.get("all_batters", batters_data.get("top_10", []))
            
            # Optional search query filter
            q = query.get("q", [None])[0]
            if q:
                all_b = [b for b in all_b if q.lower() in b.get("player_name", "").lower()]

            res = {
                "total": len(all_b),
                "formula": batters_data.get("formula", ""),
                "cutoff_balls": batters_data.get("cutoff_balls", 300),
                "batters": all_b
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 4. Bowlers Endpoint
        if path == "/api/bowlers":
            bowlers_data = load_json("bowlers_pgai.json") or {}
            all_bw = bowlers_data.get("all_bowlers", bowlers_data.get("top_10", []))

            # Optional search query filter
            q = query.get("q", [None])[0]
            if q:
                all_bw = [b for b in all_bw if q.lower() in b.get("player_name", "").lower()]

            res = {
                "total": len(all_bw),
                "formula": bowlers_data.get("formula", ""),
                "cutoff_balls": bowlers_data.get("cutoff_balls", 240),
                "bowlers": all_bw
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 5. Unified Player Search
        if path == "/api/search":
            q = query.get("q", [""])[0].strip().lower()
            batters_data = load_json("batters_pgai.json") or {}
            bowlers_data = load_json("bowlers_pgai.json") or {}

            matched_batters = [
                b for b in batters_data.get("all_batters", [])
                if q in b.get("player_name", "").lower()
            ] if q else batters_data.get("top_10", [])

            matched_bowlers = [
                b for b in bowlers_data.get("all_bowlers", [])
                if q in b.get("player_name", "").lower()
            ] if q else bowlers_data.get("top_10", [])

            res = {
                "query": q,
                "matches": {
                    "batters_count": len(matched_batters),
                    "bowlers_count": len(matched_bowlers),
                    "batters": matched_batters[:20],
                    "bowlers": matched_bowlers[:20]
                }
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 6. Master Framework Metadata (8 Pillars & 36 Aspects)
        if path == "/api/meta":
            meta = load_json("analytics_meta.json") or {}
            self._set_headers(200)
            self.wfile.write(json.dumps(meta, indent=2).encode("utf-8"))
            return

        # 7. Dataset Hygiene & Overview
        if path == "/api/overview":
            overview = load_json("dataset_overview.json") or {}
            self._set_headers(200)
            self.wfile.write(json.dumps(overview).encode("utf-8"))
            return

        # 8. Interactive Table Data Query Endpoint (Streams/Pages Any CSV)
        if path == "/api/table_data":
            tbl_param = query.get("table", ["ball_by_ball.csv"])[0].strip()
            if not tbl_param.endswith(".csv"):
                tbl_param += ".csv"

            try:
                page_idx = max(0, int(query.get("page", [0])[0]))
            except ValueError:
                page_idx = 0
            try:
                limit_val = min(500, max(1, int(query.get("limit", [50])[0])))
            except ValueError:
                limit_val = 50
            search_str = query.get("search", [""])[0].strip().lower()

            # First check if pre-exported table json exists
            json_fname = "tables/" + tbl_param.replace(".csv", ".json")
            cached_tbl = load_json(json_fname)

            if cached_tbl and (search_str or (page_idx + 1) * limit_val <= cached_tbl.get("returned_rows", 0)):
                rows = cached_tbl.get("data", [])
                cols = cached_tbl.get("columns", [])
                if search_str:
                    rows = [
                        r for r in rows
                        if any(search_str in str(v).lower() for v in r.values() if v is not None)
                    ]
                total_matching = len(rows)
                start_i = page_idx * limit_val
                paged_rows = rows[start_i : start_i + limit_val]
                res = {
                    "file_name": tbl_param,
                    "total_rows": cached_tbl.get("total_rows", len(rows)),
                    "filtered_rows": total_matching,
                    "page": page_idx,
                    "limit": limit_val,
                    "columns": cols,
                    "data": paged_rows
                }
                self._set_headers(200)
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return

            # If beyond cached range or direct CSV fallback
            csv_path = None
            for p in [Path(__file__).resolve().parent.parent / "Data Pack", Path("Data Pack"), Path("data pack")]:
                cand = p / tbl_param
                if cand.exists():
                    csv_path = cand
                    break

            if csv_path and csv_path.exists():
                import csv
                all_matching = []
                cols = []
                with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                    reader = csv.DictReader(f)
                    cols = reader.fieldnames or []
                    for r in reader:
                        if search_str:
                            if any(search_str in str(v).lower() for v in r.values() if v is not None):
                                all_matching.append(r)
                        else:
                            all_matching.append(r)
                            if len(all_matching) >= (page_idx + 1) * limit_val:
                                break
                total_cnt = len(all_matching)
                start_i = page_idx * limit_val
                paged_rows = all_matching[start_i : start_i + limit_val]
                res = {
                    "file_name": tbl_param,
                    "total_rows": total_cnt,
                    "filtered_rows": total_cnt,
                    "page": page_idx,
                    "limit": limit_val,
                    "columns": cols,
                    "data": paged_rows
                }
                self._set_headers(200)
                self.wfile.write(json.dumps(res).encode("utf-8"))
                return

            res = {
                "file_name": tbl_param,
                "total_rows": 0,
                "filtered_rows": 0,
                "page": page_idx,
                "limit": limit_val,
                "columns": [],
                "data": []
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 404 Fallback
        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found", "path": path}).encode("utf-8"))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/simulate":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                payload = json.loads(body.decode("utf-8")) if body else {}

                role = payload.get("role", "batters")
                w1 = float(payload.get("w1", 0.38 if role == "batters" else 0.40))
                w2 = float(payload.get("w2", 0.32 if role == "batters" else 0.30))
                w3 = float(payload.get("w3", 0.30))

                tot = w1 + w2 + w3 or 1.0
                nw1, nw2, nw3 = w1 / tot, w2 / tot, w3 / tot

                if role == "batters":
                    data = load_json("batters_pgai.json") or {}
                    players = data.get("all_batters", data.get("top_10", []))
                    results = []
                    for p in players:
                        sim_score = max(0.0, min(100.0, 50.0 + 15.0 * (nw1 * p["z_pce"] + nw2 * p["z_prr"] + nw3 * p["z_giq"])))
                        results.append({
                            "player_id": p["player_id"],
                            "player_name": p["player_name"],
                            "original_pgai": p["pgai_100"],
                            "sim_pgai": round(sim_score, 2),
                            "archetype": p["archetype"]
                        })
                    results.sort(key=lambda x: x["sim_pgai"], reverse=True)
                    for idx, r in enumerate(results, 1):
                        r["sim_rank"] = idx

                    res = {
                        "role": "batters",
                        "weights": {"w_pce": nw1, "w_prr": nw2, "w_giq": nw3},
                        "top_10_simulated": results[:10]
                    }
                else:
                    data = load_json("bowlers_pgai.json") or {}
                    players = data.get("all_bowlers", data.get("top_10", []))
                    results = []
                    for p in players:
                        sim_score = max(0.0, min(100.0, 50.0 + 15.0 * (nw1 * p["z_bce"] + nw2 * p["z_bcr"] + nw3 * p["z_bgi"])))
                        results.append({
                            "player_id": p["player_id"],
                            "player_name": p["player_name"],
                            "original_bpga": p["b_pgai_100"],
                            "sim_bpga": round(sim_score, 2),
                            "archetype": p["archetype"]
                        })
                    results.sort(key=lambda x: x["sim_bpga"], reverse=True)
                    for idx, r in enumerate(results, 1):
                        r["sim_rank"] = idx

                    res = {
                        "role": "bowlers",
                        "weights": {"w_bce": nw1, "w_bcr": nw2, "w_bgi": nw3},
                        "top_10_simulated": results[:10]
                    }

                self._set_headers(200)
                self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
                return
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))
