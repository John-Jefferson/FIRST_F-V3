# Run readiness

Before a live QA run:

1. Start an authorized staging ERP instance.
2. Set `ERP_BASE_URL` and only the role credential pairs needed for the run.
3. Run `node scripts/check_credentials.cjs`.
4. Run `node scripts/check_readiness.cjs`.
5. Run `python scripts/validate_coverage.py`.
6. Run the focused Playwright suite.

Do not treat missing credentials or source-only review findings as passed tests.
