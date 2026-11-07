# HOPE Inc. ERP — Tester QA Package (24/24 tasks mapped)

**Scope:** Separate QA-only folder, no ERP source modifications. Official task IDs and detailed manual acceptance criteria in `docs/TEST_CASES_ALL_24.md` and `docs/Tester_Coverage_Status.csv`. Tests cover public UI and read-only authenticated navigation. **They do not certify 24/24 functional completion.**

### Running on Windows (from project's root)

1. In a separate PowerShell, run the ERP: `cd Client; npm.cmd install; npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
2. In another PowerShell, from this folder: `npm.cmd install; npx.cmd playwright install chromium`.
3. Set `$env:ERP_BASE_URL="http://127.0.0.1:5174"` and the 6 credentials via local environment variables (`QA_USER_EMAIL`, `QA_USER_PASSWORD`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_SUPERADMIN_EMAIL`, `QA_SUPERADMIN_PASSWORD`). Do not share passwords in chat or commit them.
4. Run `npx.cmd playwright test`, inspect report `npx.cmd playwright show-report`.
5. `python scripts/validate_coverage.py` validates the 24-task checklist; it is not an ERP test.

### Status

Source reviewed: GitHub `John-Jefferson/FIRST_F-V3` `main` branch as of 2026-11-07. Live local Vite server is **not reachable from this hosted container**. No live database writes performed. No spreadsheet statuses changed. Historical 5 smoke + 9 role checks passed **across separate runs**, not a new 14/14 run with this package. 23 tasks remain without full passing evidence.

The source inspection identified potential specification gaps in per-action write permissions (admin-only UI/SQL) and must be investigated on an approved test environment. Do not mark everything Working without execution logs.

### Preflight and PR

Run `node scripts/check_readiness.cjs` (requires this QA folder alongside `Client/` or `HOPE_CLIENT_PATH`) and `python scripts/validate_coverage.py` before the Playwright suite. `OK` means a local file/preflight condition is satisfied; `REVIEW` does **not** mean business logic passed. See `PR_DESCRIPTION.md` for a ready-to-paste PR description.

For a QA-only PR, copy the complete `HOPE_ERP_All_Tester_QA` folder into the **root** of your repository on `feature/Test`. Stage this folder alone. Inspect the staged filename list before committing. Do not upload previous generated report folders or secret configuration files.
