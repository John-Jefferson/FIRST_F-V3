# HOPE ERP — reproducible bug fixes and QA (November 7, 2026)

This deliverable contains **patch code and automated checks**, not a completed live system certification. It is scoped to the user's Tester contribution and includes no secrets. The source audit of the GitHub `main` branch identified permission and security gaps. Do not upload this entire folder as a single PR without reviewing the patch effects.

## How to apply against a clean checkout (feature/Test)

1. Extract into the repository root as `HOPE_ERP_EXECUTABLE_FIX_AND_QA`.
2. Make sure `git status` is clean, and check out `feature/Test`.
3. Run `node HOPE_ERP_EXECUTABLE_FIX_AND_QA/fixes/apply-permission-guards.cjs .` (it makes a `.before-qa-fixes` backup). The script fails safely if source patterns change. Review `git diff -- Client/src/App.jsx`.
4. The SQL migrations under `fixes/` are **proposed** and must be manually reviewed/tested on staging with rollbacks and administrator approval. Do not deploy them to production without staging tests. They can be copied into `Client/supabase/migrations/` after review.
5. Run `bash HOPE_ERP_EXECUTABLE_FIX_AND_QA/run-local-checks.sh` (Linux/macOS). On Windows run `node --check ...` and `node .../qa/scripts/test-fix-fixture.cjs` etc.
6. After patching, run `node HOPE_ERP_EXECUTABLE_FIX_AND_QA/qa/scripts/audit-checked-out-source.cjs .`; the last item intentionally fails while the original admin-only write migration remains present; this is a history/source heuristic, not proof the staging DB applied the new correction.
7. Run Playwright in a separate terminal after starting Vite and setting QA credentials locally (refer to `qa/README.md`). Do **not** run write tests against production.

## Confirmed limitations

- The assistant container cannot reach your Windows `127.0.0.1:5174` server and does not have your staging DB access.
- Historical evidence: five frontend checks and nine role checks passed **in separate runs**. None of the 24 complete acceptance-task flows have been fully verified.
- `S1-TST-05` was labeled Merged in the supplied task plan. This package does not establish a GitHub PR merge independently.
- Nothing is marked Working or Passed without actual executed functional results.
- The generic User-role test was corrected: Users with granted action rights may properly see write controls.
- The Product Master report fix filters out future-dated prices from its current-price display.
- Existing SQL restricts all ERP writes to admins; an **unapplied** corrective migration is provided.

See `docs/Execution_Evidence_and_Open_Gaps.pdf` for detailed findings and outcomes.
