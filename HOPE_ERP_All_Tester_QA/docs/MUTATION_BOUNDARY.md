# Read-only QA mutation boundary

The read-only Playwright suites must not create, update, approve, delete, or restore ERP records.

Before a live run:

1. Confirm the test environment is staging or another explicitly authorized environment.
2. Confirm mutation interception is active for the suite being executed.
3. Never run write operations against a production database.
4. Treat login and read-only navigation as the only guaranteed behaviors unless staging write evidence exists.

Server-side RLS and database policies still require separate authorized staging validation.
