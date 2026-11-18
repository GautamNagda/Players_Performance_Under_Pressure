"""
Rajasthan Royals Cricket Decision-Intelligence Command Center Entrypoint.
Executes the deterministic ML pipeline to generate data artifacts in public/data/.
"""

import os
import sys
from pathlib import Path

# Ensure project root and scripts directory are in sys.path
BASE_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = BASE_DIR / "scripts"
for p in (BASE_DIR, SCRIPTS_DIR):
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

# Import the pipeline from the scripts package
from scripts.build_rr_analytics import run_pipeline


def main():
    """Main execution entrypoint."""
    print(f"[*] Initializing Rajasthan Royals Decision-Intelligence Engine from: {BASE_DIR}")
    run_pipeline()


if __name__ == "__main__":
    main()
