# S1-TST-06 — Defect records and fix verification
| Bug ID | Priority | Area | Steps to reproduce | Expected | Actual | Fix commit | Retest result | Evidence |
|---|---|---|---|---|---|---|---|---|
| S1-BUG-01 | High | Customer action rights | Sign in as User granted customers.add, open Customers | Add button/action permitted | Source has admin-only UI guard; requires staging reproduction | Proposed script only | Not verified | Source audit |
| S1-BUG-02 | Critical | Last Superadmin | In staging, attempt to demote final active Superadmin | Reject at DB | Protection not established in current migrated DB | Proposed SQL only | Not verified | Source audit |
| S1-BUG-03 | High | User write permissions | User with granted customer Add right attempts insert in staging | RLS permits, others reject | Admin-only migration may block it | Proposed SQL only | Not verified | Source audit |

Mark **Pass** only after the fix is applied to the tested build and test executed. Unit/static checks do not replace RLS/browser tests.
