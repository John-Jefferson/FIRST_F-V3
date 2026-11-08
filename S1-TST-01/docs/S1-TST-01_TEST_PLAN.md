# S1-TST-01 — Sprint 1 test plan
Owner: Tester Vince | Scope: staging environment; approval by team lead.

## Acceptance criteria
- S1-TST-01: Test plan covers accounts, roles, security, and defect handling.
- S1-TST-02: Registration, login, logout, password set/reset, expired and reused tokens are verified.
- S1-TST-03: User management creation, updates, statuses, role assignment, visibility and last-Superadmin protection are verified.
- S1-TST-04: Each right is checked for Superadmin, Admin and approved User at menu, button and API/RLS levels.
- S1-TST-05: Automated smoke test can run against a configured environment.
- S1-TST-06: Defects have steps, severity, expected/actual behavior, fix commits and retest results.

## Execution rules
Use approved test accounts, isolated staging Supabase data and test-only emails. Do not test destructive actions against production. A skipped automated test is NOT a pass. Record build SHA, environment, tester, timestamps and screenshots without secrets. Report each task separately.

## Exit criteria
All critical/high defects resolved, required functional cases passed with evidence, no user with insufficient permissions can bypass API/RLS. This package alone does not meet these criteria.
