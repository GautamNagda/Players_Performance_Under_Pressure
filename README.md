# 🏏 Rajasthan Royals Cricket Decision-Intelligence Command Center
### *Pressure & Game-Awareness Indices (`PGAI_100` & `B-PGAI_100`)*
**SupeRR Selector Season 2 • Official Rajasthan Royals Analytics Framework**

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![LightGBM](https://img.shields.io/badge/LightGBM-4.5-green)](https://lightgbm.readthedocs.io/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1-red)](https://xgboost.readthedocs.io/)

---

## 📌 Executive Summary

Traditional T20 metrics such as **batting average**, **raw strike rate**, and **overall bowling economy** obscure situational value. A batter striking at 135 across easy group-stage matches is often prized over a finisher striking at 155 in a high-leverage chase against top-tier pace bowling.

This project delivers a **full-stack Cricket Decision-Intelligence War Room** engineered for Rajasthan Royals data scientists and scouting strategists. It implements the **Master Cricket Analytics Framework (8 Pillars & 36 Aspects)**, replaces ad-hoc probability estimates with out-of-fold cross-validated Machine Learning models (`LightGBM` + `XGBoost`), enforces Empirical Bayes shrinkage ($k=50$), and calculates the **PGAI_100** (batsmen) and **B-PGAI_100** (bowlers) indices across 199,067 deliveries.

It is architected for **instant unified deployment on Vercel** — serving the React 18 high-performance frontend and the Python Serverless API in a single repository.

---

## ☁️ Deploy to Vercel (Frontend + Backend in One Go)

This repository is pre-configured with [`vercel.json`](./vercel.json) and [`api/index.py`](./api/index.py) to deploy both the **Vite React Frontend** and the **Python Serverless Backend** simultaneously with **zero manual configuration**.

### Option A: 1-Click Deployment via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com/) and click **"Add New..." > "Project"**.
2. Select your imported GitHub repository: `GautamNagda/Players_Performance_Under_Pressure`.
3. Vercel automatically detects the configuration from `vercel.json`:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. *(Optional)* Add any custom environment variables (defaults from `.env.example` are pre-set).
5. Click **"Deploy"**. Vercel will build the frontend assets and deploy the Python Serverless API in under 45 seconds!

### Option B: Deploy using Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy directly from terminal
vercel --prod
```

### 🔌 Live Python Serverless API Endpoints on Vercel
When deployed on Vercel, the Python backend in [`api/index.py`](./api/index.py) automatically handles the following routes:

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `GET` | `/api/health` | Health check, service status, and loaded models metadata |
| `GET` | `/api/top10` | Top 10 Batsmen & Top 10 Bowlers combined payload |
| `GET` | `/api/batters` | All 171 eligible batters (supports `?q={name}`) |
| `GET` | `/api/bowlers` | All 203 eligible bowlers (supports `?q={name}`) |
| `GET` | `/api/search?q={query}` | Real-time search across batters and bowlers |
| `GET` | `/api/meta` | Master Framework metadata: 8 Pillars & 36 Aspects |
| `GET` | `/api/overview` | CSV schemas, row counts, memory footprint, and hygiene audit |
| `POST`| `/api/simulate` | Dynamic simulation with custom weights (`w1`, `w2`, `w3`) |

---

## 🏆 Official Top 10 Calibrated Results

### 🏏 Top 10 Pressure Batsmen (`PGAI_100`)
> **Hard Eligibility Gate:** $\ge 300$ balls faced (excluding wides). Total evaluated: **171 batters**.

| Rank | Batsman | Balls | Runs | Strike Rate | Pressure Balls | $Z_{\text{PCE}}$ | $Z_{\text{PRR}}$ | $Z_{\text{GIQ}}$ | **$\text{PGAI}_{100}$** | Tactical Archetype |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 🥇 **#1** | **Vaibhav Sooryavanshi** | 358 | 659 | **184.08** | 126 | +3.00 | +1.38 | +2.05 | **84.92** | Explosive Power Surge |
| 🥈 **#2** | **Phil Salt** | 457 | 788 | **172.43** | 196 | +2.82 | +1.58 | +1.73 | **82.62** | Explosive Power Surge |
| 🥉 **#3** | **Abhishek Sharma** | 569 | 1001 | **175.92** | 224 | +2.54 | +1.43 | +2.11 | **81.58** | Explosive Power Surge |
| **#4** | **Tim David** | 433 | 689 | 159.12 | 227 | +1.91 | +1.64 | +1.69 | **76.53** | Death-Over Finisher |
| **#5** | **Finn Allen** | 449 | 740 | 164.81 | 185 | +2.23 | +1.11 | +1.67 | **75.75** | Powerplay Enforcer |
| **#6** | **Priyansh Arya** | 393 | 632 | 160.81 | 148 | +2.34 | +0.89 | +1.71 | **75.41** | Middle-Overs Pivot |
| **#7** | **Suryakumar Yadav** | 682 | 1032 | 151.32 | 290 | +1.87 | +1.28 | +1.46 | **73.77** | 360° Game Tactician |
| **#8** | **Jos Buttler** | 689 | 988 | 143.40 | 309 | +1.38 | +1.28 | +1.76 | **71.48** | Complete Match Winner |
| **#9** | **Rajat Patidar** | 525 | 805 | 153.33 | 240 | +1.67 | +1.11 | +1.44 | **71.42** | Spin Demolisher |
| **#10** | **Yashasvi Jaiswal** | 599 | 903 | 150.75 | 248 | +1.53 | +0.97 | +1.58 | **70.10** | High-Impact Anchor |

---

### 🎯 Top 10 Pressure Bowlers (`B-PGAI_100`)
> **Hard Eligibility Gate:** $\ge 240$ legal balls (40 Overs). Total evaluated: **203 bowlers**.

| Rank | Bowler | Legal Balls | Wickets | Runs Conc. | Economy | Pressure Balls | $Z_{\text{BCE}}$ | $Z_{\text{BCR}}$ | $Z_{\text{BGI}}$ | **$\text{B-PGAI}_{100}$** | Tactical Archetype |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 🥇 **#1** | **Jasprit Bumrah** | 1,722 | **94** | 2,123 | **7.40** | 715 | +2.94 | +3.00 | +2.93 | **94.32** | Clutch Strike Weapon |
| 🥈 **#2** | **Sunil Narine** | 1,223 | **51** | 1,363 | **6.69** | 468 | +1.76 | +2.70 | +2.02 | **82.40** | Chokehold Spin Maestro |
| 🥉 **#3** | **Sufiyan Muqeem** | 258 | 19 | 290 | **6.74** | 98 | +1.95 | +2.34 | +1.86 | **80.86** | Deceptive Mystery Weapon |
| **#4** | **Nathan Ellis** | 718 | 44 | 1,003 | 8.38 | 321 | +1.98 | +2.07 | +2.10 | **80.80** | Death-Overs Specialist |
| **#5** | **Abrar Ahmed** | 536 | 28 | 638 | 7.14 | 199 | +1.52 | +2.05 | +1.83 | **76.69** | Chokehold Spin Maestro |
| **#6** | **Abbas Afridi** | 463 | 33 | 703 | 9.11 | 206 | +1.99 | +1.44 | +1.51 | **74.54** | High-Pace Impact Striker |
| **#7** | **Mitchell Santner** | 425 | 18 | 463 | 6.54 | 149 | +0.94 | +2.53 | +1.65 | **74.43** | Chokehold Spin Maestro |
| **#8** | **Krunal Pandya** | 694 | 26 | 823 | 7.12 | 239 | +1.09 | +2.18 | +1.82 | **73.12** | Chokehold Spin Maestro |
| **#9** | **Corbin Bosch** | 240 | 15 | 322 | 8.05 | 100 | +1.43 | +1.78 | +1.43 | **72.64** | Pressure Phase Enforcer |
| **#10** | **Shaheen Afridi** | 1,257 | 68 | 1,770 | 8.45 | 549 | +1.72 | +1.28 | +1.38 | **71.22** | Powerplay Strike Ace |

---

## 📐 Mathematical Formulation

### 1. Delivery Pressure Multiplier ($M_t$)
Every delivery receives a situational context weight $M_t \ge 1.0$:
$$M_t = \max(1.0, \, K_t \cdot A_t \cdot T_t \cdot N_t)$$
- **Knockout Stage ($K_t$):** $1.75\times$ for Playoff/Knockout matches; $1.0\times$ for League matches.
- **Away Match Context ($A_t$):** $1.40\times$ when playing at opponent's home venue.
- **Top Bowler Threat ($T_t$):** $1.50\times$ when openers face top 20% economy bowlers in Over 1.
- **Historical Nemesis / Bunny Multiplier ($N_t$):** $1.35\times$ for repeated head-to-head match-up edges. Computed strictly chronologically (`cumsum() - current_match`) to avoid data leakage.

### 2. Machine Learning Expected Baselines
- **Expected Runs ($xR$):** Trained via out-of-fold `GroupKFold(3)` `LightGBMRegressor` on delivery attributes (`overid`, `bowl_speed`, `venue_id`, `delivery_style`, `pace_or_spin`, etc.).
- **In-Game Win Probability ($WP_t$):** Trained via out-of-fold `GroupKFold(3)` `XGBClassifier` predicting match outcome from state variables (`innings`, `runs_left`, `balls_left`, `wkts_left`, `rrr`, `knock_out`).
- **Win Probability Added ($WPA_t$):**
  $$WPA_t = WP_t - WP_{t-1}$$

### 3. Empirical Bayes Shrinkage
To prevent small-sample distortions, raw metrics are regularized toward the cohort mean $\mu$ using $k = 50$:
$$\theta_{\text{shrunk}} = \frac{n}{n + 50} \cdot \bar{x} + \frac{50}{n + 50} \cdot \mu$$

### 4. Final Winsorized Indices
Raw scores across the three core pillars are standardized as Z-scores, winsorized to $[-3.0, +3.0]$, and scaled to $[0, 100]$:
- **Batsmen:**
  $$\text{PGAI}_{100} = \text{clip}\Big(50 + 15 \cdot \big(0.38 \cdot Z_{\text{PCE}} + 0.32 \cdot Z_{\text{PRR}} + 0.30 \cdot Z_{\text{GIQ}}\big), \, 0, \, 100\Big)$$
- **Bowlers:**
  $$\text{B-PGAI}_{100} = \text{clip}\Big(50 + 15 \cdot \big(0.40 \cdot Z_{\text{BCE}} + 0.30 \cdot Z_{\text{BCR}} + 0.30 \cdot Z_{\text{BGI}}\big), \, 0, \, 100\Big)$$

---

## 🏛️ Master Cricket Analytics Framework (8 Pillars & 36 Aspects)

1. **Pillar 1: Match Context & Tournament Stakes (Aspects 1–5)**
   - Knockout multiplier ($1.75\times$), home/away penalty ($1.40\times$), DLS revised target scaling, playoff qualification margin, and hostile crowd leverage.
2. **Pillar 2: In-Game Situation & Match Equation (Aspects 6–10)**
   - Required Run Rate (RRR) inflation, wicket clusters (post-wicket shock), death overs (16–20), super overs, and low-defense scenarios.
3. **Pillar 3: Match-Up & Individual Head-to-Head (Aspects 11–15)**
   - Bowler nemesis lookup, batter bunny edge, express pace ($140+\text{ km/h}$) resilience, mystery spin deception, and left-arm angle threat.
4. **Pillar 4: Dynamic Batter Strategy & Game Awareness (Aspects 16–20)**
   - Boundary-to-strike rotation ratio, 6th-ball single retention (farming strike), rebuild mode after early collapses, risk mitigation, and target pacing.
5. **Pillar 5: Tactical Execution Under Pressure (Aspects 21–25)**
   - 3-dot pressure chokehold resilience, death yorker execution, boundary bounce-back, defensive phase containment, and field manipulation.
6. **Pillar 6: Physical & Environmental Conditions (Aspects 26–29)**
   - 2nd-innings dew factor, extreme heat fatigue, altitude/small boundary defense, and pitch deterioration.
7. **Pillar 7: Opposition Threat Assessment (Aspects 30–32)**
   - Top-tier bowler attack resistance, fielding pressure containment, and elite death partnership resilience.
8. **Pillar 8: Cognitive & Mental Composure (Aspects 33–36)**
   - Historical knockout uplift, comeback capability after high-cost overs, batting with the tail, and captaincy clutch performance.

---

## 💻 Tech Stack & Architecture

- **Backend & ML Pipeline:** Python 3.10+, Pandas, NumPy, Scikit-Learn, LightGBM, XGBoost.
- **Serverless API Engine:** Python 3.10 runtime on Vercel Edge (`api/index.py`).
- **Frontend Architecture:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Data Visualizations:** Recharts (5-axis Radar Charts, Stacked Pillar Bar Charts, Economy vs. Wickets Scatter Charts, Chronological WPA Trendlines).
- **Design System:** Rajasthan Royals Analytics Command Center (`#080D1A` dark background, Royal Pink `#EA1A85`, Royal Blue `#2563EB`, Amber Gold `#F59E0B`, Emerald `#10B981`).

---

## 🚀 Local Quickstart & Reproduction Guide

### 1. Clone the Repository
```bash
git clone https://github.com/GautamNagda/Players_Performance_Under_Pressure.git
cd Players_Performance_Under_Pressure
```

### 2. Set Up Python Analytics Engine (Optional for ML Retraining)
```bash
# Install local ML pipeline dependencies
pip install -r requirements-ml.txt

# Execute analytics pipeline (runs in ~18 seconds)
python main.py
# or
python scripts/build_rr_analytics.py
```
*Outputs 4 clean JSON artifacts to `public/data/` (`batters_pgai.json`, `bowlers_pgai.json`, `dataset_overview.json`, `analytics_meta.json`).*

### 3. Run the Frontend Dashboard
```bash
# Install Node dependencies
npm install

# Run Vite development server
npm run dev

# Or build and launch production preview on port 3000
npm run build
npm run preview -- --port 3000 --host
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ⚙️ Environment Configuration (`.env`)

```env
# Vercel & Production Host Configuration
VITE_APP_TITLE="Rajasthan Royals Pressure Intelligence War Room"
VITE_API_BASE_URL=""
PORT=3000

# Analytics Engine Configuration (Local ML Retraining)
DATA_PACK_DIR="./Data Pack"
OUTPUT_DATA_DIR="./public/data"
MATCH_FORMATS="T20,T20I"
BATTER_MIN_BALLS=300
BOWLER_MIN_BALLS=240
SHRINKAGE_K=50
CV_FOLDS=3
```

---

## 📂 Project Structure

```
├── vercel.json                                # Unified Vercel deployment configuration
├── api/
│   └── index.py                               # Python Serverless API for Vercel
├── requirements.txt                           # Lightweight dependencies for Vercel
├── requirements-ml.txt                        # Full ML training stack (local execution)
├── .env                                       # Environment configuration
├── .env.example                               # Example environment template
├── .gitignore                                 # Git ignore patterns
├── README.md                                  # Complete system documentation
├── package.json                               # Frontend dependencies and scripts
├── vite.config.ts                             # Vite configuration
├── tailwind.config.js                         # Tailwind CSS styling configuration
├── Data Pack/                                 # Raw cricket CSV datasets
│   ├── ball_by_ball.csv                       # 199,067 delivery-level events
│   ├── matches.csv                            # Match context, venues, dates
│   ├── competitions.csv                       # Formats, seasons, competitions
│   ├── playing_eleven.csv                     # Lineups and batting positions
│   ├── competition_team_player_mapping.csv    # Player metadata & roster mapping
│   └── teams.csv                              # Franchise and national teams
├── scripts/
│   ├── __init__.py                            # Package initialization
│   └── build_rr_analytics.py                  # Core analytics & ML computation engine
├── main.py                                    # Execution entrypoint
├── public/data/                               # Generated JSON analytics data
│   ├── batters_pgai.json                      # All batters & Top 10 rankings
│   ├── bowlers_pgai.json                      # All bowlers & Top 10 rankings
│   ├── dataset_overview.json                  # CSV schemas, null counts & hygiene audit
│   └── analytics_meta.json                    # 8 Pillars & 36 Aspects metadata
└── src/
    ├── App.tsx                                # Main application root & view router
    ├── types/analytics.ts                     # Strict TypeScript interfaces
    └── components/
        ├── Sidebar.tsx                        # Navigation command bar
        ├── BattersView.tsx                    # Top 10 Batsmen Leaderboard & Deep Dive
        ├── BowlersView.tsx                    # Top 10 Bowlers Leaderboard & Deep Dive
        ├── PlayerSearchView.tsx               # Dedicated Player Pressure Search & Radar Scout
        ├── MethodologyView.tsx                # Educational 8 Pillars & Math Explainer
        ├── DatasetExplorerView.tsx            # Relational Schema & Domain Hygiene
        └── SandboxView.tsx                    # Live Auction Selection Simulator
```

---

## 🛡️ License & Acknowledgements
- Developed for the **Rajasthan Royals Data Science & SupeRR Selector Season 2 Challenge**.
- Data source: Official ball-by-ball tournament telemetry dataset (`./Data Pack`).
