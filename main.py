"""
Rajasthan Royals Cricket Decision-Intelligence Command Center Entrypoint.
Executes the deterministic ML pipeline to generate data artifacts in public/data/.
"""

import os
import sys
from pathlib import Path

# Ensure project root is in sys.path for robust CLI and IDE imports
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import the pipeline from the scripts package (with fallback if run from within scripts)
try:
    from scripts.build_rr_analytics import run_pipeline
except (ModuleNotFoundError, ImportError):
    from build_rr_analytics import run_pipeline


def main():
    """Main execution entrypoint."""
    print(f"[*] Initializing Rajasthan Royals Decision-Intelligence Engine from: {BASE_DIR}")
    run_pipeline()


if __name__ == "__main__":
    main()
