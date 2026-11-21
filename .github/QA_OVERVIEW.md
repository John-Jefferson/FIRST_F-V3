# Quality Assurance & Regression Testing Overview

## Repository QA Artifacts
- **`HOPE_ERP_All_Tester_QA/`** — Consolidated multi-tester execution results and verification logs.
- **`HOPE_ERP_EXECUTABLE_FIX_AND_QA/`** — Validation records for the one-click launcher (`launch_hope_erp.js` / `Hope_ERP_OneClick.exe`).
- **`S1-TST-01` through `S1-TST-06`** — Sprint 1 functional test cases covering authentication, role-based access control, and core ERP modules.
- **`Playwright Automated Testing Guide.txt`** — Setup and execution guide for automated end-to-end test suites.

## Testing Guidelines
1. Always run automated smoke and role suites using dedicated test accounts rather than production user records.
2. Read-only role verification suites must block REST write operations (`POST`, `PATCH`, `DELETE`) at both UI and Supabase RLS levels.
3. Ensure the local Vite development server (`http://localhost:5173`) is active before executing Playwright scripts.
