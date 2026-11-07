# Hope ERP: read-only QA automation (PR-ready)

**Scope:** A separate Playwright suite under `qa/`. No application, migration, configuration secrets, or production database files are modified by this patch. It was prepared for a PR from `feature/Test` to `main`.

## Run on Windows

Open PowerShell in this `qa` directory, then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Run-All-Tests.ps1 -ClientPath "C:\path\to\FIRST_F-V3\Client"
```

The runner starts its own Vite server (port 5187 by default), prompts once for authorized User, Admin and Superadmin credentials, runs all tests, writes `playwright-report/index.html` and `qa-results.json`, and stops its test server.

Do not commit credentials, `.env.local`, `qa-results.json`, screenshots, or test artifacts. Test credentials are only entered locally and roles with no credentials are marked **skipped**. The runner's client path can be overridden with `-ClientPath`.

## Included code and evidence

- `tests/smoke.spec.cjs` — 5 public landing and auth form smoke checks (no submissions).
- `tests/roles.spec.cjs` — 9 role tests: login/identity, visible navigation, sign-out.
- `tests/guide-readonly.spec.cjs` — 6 additional module navigation and browser-exception checks. **New tests, not yet executed on user's PC.**
- `playwright.config.cjs` — Chromium, JSON and HTML results, no traces, baseURL `ERP_BASE_URL`.
- `Run-All-Tests.ps1` — isolated Vite runner and local credential entry.
- `docs/Tester_Task_Matrix.csv` — 24 plan items and evidence/limitations.
- `docs/Hope_ERP_QA_Change_and_Evidence_Report.pdf` — tester report and file attribution.

## Safety boundaries

- Browser route interceptions block Supabase REST mutations and the `manage-user` Edge Function. Authentication requests are allowed.
- The suite **does not prove** all server-side access controls, CRUD, price calculations, soft-deletion, registration, reset-password delivery, financial balances, or the seven reports. These require staging data, approved transactions, and independent assertions.
- User-provided logs show the existing 5 smoke tests passed and 9 role tests passed **across separate runs**, not in one full 14-test execution. The latest complete run had 8 pass / 6 skip. Do not label these new guide tests passed without execution.
- The reference sprint plan labels `S1-TST-05` Merged, but supplied file has no PR link. Verify merge status through GitHub.

## Review checklist

1. Inspect that `qa/` is the only new directory in your PR.
2. Run the suite against an authorized test environment.
3. Review the generated HTML/JSON results locally (do not publish private data).
4. Add a test run reference to the PR.
5. Open PR with base=`main`, compare=`feature/Test` after committing **only these files**.
