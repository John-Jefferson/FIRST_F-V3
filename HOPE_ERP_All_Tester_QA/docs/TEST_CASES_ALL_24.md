# HOPE ERP — Complete Tester Acceptance Checklist (24 official tasks)

The following are **test cases to execute**, not claims that they passed. Use staging-only QA accounts and test data. Capture test run, timestamp, expected/actual outcome and evidence. Never place passwords in the report. Do not run write/destructive tests on production.

## Sprint 1

**S1-TST-01 — Test plan and acceptance criteria.** Confirm requirements, roles, fixture accounts, pass/fail rules, test environment, rollback plan; review 36-right guide requirement against actual rights catalogue. Record approved acceptance criteria and traceability.

**S1-TST-02 — Authentication.** Register new User and verify Pending, deny login before approval; sign in as active User/Admin/Superadmin; logout and session removal; set initial password via one-time link; reset password by email; verify expired and reused reset tokens are rejected; blocked account cannot authenticate. Avoid reusing test tokens.

**S1-TST-03 — User Management.** Superadmin creates/edits User, approves/disapproves, blocks/unblocks, designates Admin; Admin edits Users only; Admin does not see/edit other Admin/Superadmin rows; last active Superadmin cannot be disabled/deleted; audit changes and session invalidation.

**S1-TST-04 — Permission matrix.** For each of 36 guide rights, test User with and without the right: module link, action button, direct URL/API read/write. Verify denied requests fail server-side; Admin/Superadmin restrictions and blocked users. Existing UI source uses admin-only write controls; this is a potential acceptance gap, not an executed test.

**S1-TST-05 — Automated smoke.** Run public landing, sign-in modal, required fields, registration form, landing feature text, plus role login/navigation/logout. Preserve original pass evidence and repeat from clean checkout.

**S1-TST-06 — Bugs & retests.** File issues with screenshot/redacted logs, reproduction, impact, expected/actual, commit SHA. Retest each fix against a clean build and record outcome.

## Sprint 2

**S2-TST-01 — Customers.** Create/edit and search/filter Customers. Reject required-field blanks and invalid terms. User sees active only and lacks hidden status/stamp. Admin sees inactive/restore and audit stamp changes. Confirm persistence after reload.

**S2-TST-02 — Products/price.** Product create/edit/search, price-history insert/edit/delete by effective date, current price as of date. Validate no duplicate key/date and no future-effective price chosen for past sales.

**S2-TST-03 — Soft delete/restore.** Soft-delete Customer and Product with no active children; verify hidden for User, visible/restorable for Admin, audit stamp updated. Block deletion when linked to active Sale/Sale Detail; ensure data remains consistent.

**S2-TST-04 — Per-action rights.** With each Customers Add/Edit/Delete and Products Add/Edit/Delete/price Add/Edit/Delete right off/on, verify controls and direct write API. Distinguish view from write; log policy responses.

**S2-TST-05 — Regression Sprint 1.** Re-run all authentication, user controls, permissions and smoke checks after Sprint 2 changes.

**S2-TST-06 — Bugs & retests.** Log and retest every Sprint 2 defect and regressions.

## Sprint 3

**S3-TST-01 — Department/Job.** Add/edit/delete/restore, search, required fields, duplicate keys, FK blocking and role permissions.

**S3-TST-02 — Employee.** Add/edit/search, date fields, separation date distinct from soft-deletion, inactive filtering, FK references, stamping, persistence.

**S3-TST-03 — Job History.** Create promotion/transfer with effective date, salary; reject duplicate composite keys/effective dates; verify timeline ordering and current-job derivation.

**S3-TST-04 — Salary/privacy.** User without HR Job History View cannot see salaries or access them through direct APIs; granted User sees only permitted data. Exercise all HR action rights; Admin/Superadmin controls.

**S3-TST-05 — Regression Sprints 1–2.** Re-run all previously passing automated and staged functional tests.

**S3-TST-06 — Bugs & retests.** File and retest HR defects with scrubbed evidence.

## Sprint 4

**S4-TST-01 — Sales.** Create sale header with unique transno, customer/employee FKs and details; quantity*unit price totals; historical unit price at sale date (not today's price); edit/delete details; invoice balance after refresh.

**S4-TST-02 — Payments/balance.** Add payment linked to sale; balance = sales total - summed valid payments. Test partial/full/overpayment, duplicate receipt number, invalid references, soft-delete changes.

**S4-TST-03 — Seven reports.** Verify Top Customers, Product Master List, Top Products, Active Employees, All Employees, Employee Job History, Top Sales with fixture queries. Test date range, Top N, role-specific rights, print/PDF. Reconcile sample total $884.50 across report categories where applicable.

**S4-TST-04 — End-to-end.** Register User => approval => assign rights => login => create Customer/Product => sale with as-of price => payment => reports. Validate audit trail and denied actions in a staging environment.

**S4-TST-05 — Full regression.** Run all 24 task acceptance cases (excluding report-only administrative items), with no open critical defects, review test artifacts.

**S4-TST-06 — Final sign-off.** Compile test run links, environment and commit SHA, pass/fail/blocked counts, open defects with severity, residual risks, formal approval or explicit withheld sign-off.

## Evidence standard

A task can be marked **Working** only with recorded successful execution of every stated acceptance criterion and approved fixes. Code existence, menu navigation or a drafted test case alone do not justify Working. If the feature is absent, use **Blocked / Not Implemented**, not Passed.
