"""
Forwarding proxy module for build_rr_analytics.
Allows direct imports via `import build_rr_analytics` or `from build_rr_analytics import run_pipeline`
without encountering IDE module-not-found errors.
"""

from scripts.build_rr_analytics import *

if __name__ == "__main__":
    run_pipeline()
