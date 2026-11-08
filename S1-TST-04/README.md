# S1-TST-04 — Permission matrix for all roles and rights

This folder is **fully independent**. It has its own Playwright test source, `package.json`, `playwright.config.cjs`, runner, and task-specific documents; it **does not import any files from the other five test folders**.

## How to run

1. Start the **separate HOPE ERP website** at `http://127.0.0.1:5174/main.html` (for browser tests).
2. Double-click `RUN_THIS_TEST.bat` in this folder; it installs its own dependencies if missing.
3. Set role credentials with PowerShell environment variables before executing the script if the test requires a role: `QA_USER_EMAIL`, `QA_USER_PASSWORD`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_SUPERADMIN_EMAIL`, `QA_SUPERADMIN_PASSWORD`. Do not commit passwords.
4. For source-only check S1-TST-06, set `HOPE_CLIENT_PATH` to the path containing `Client/src/App.jsx` **inside the ERP Client folder**.

Alternatively: `npm.cmd install; npx.cmd playwright install chromium; npm.cmd test` from **this folder**.

## Scope and evidence

- The only test file is `tests/S1-TST-04.spec.cjs`.
- Manual checks are in the `docs/` folder when applicable.
- Browser assertions and code-presence checks are **not** confirmation of all acceptance cases. Registration emails, expired/reused tokens, user management writes, last-superadmin protection, and full permission/RLS enforcement need a separate authorized staging environment.
- Tests that lack credentials or the ERP source may **skip**, which is not a pass.
- This ZIP contains **QA test code**, not a standalone ERP website.
