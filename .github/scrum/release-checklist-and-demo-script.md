# Release checklist and demo script

Use this checklist for a proposed release or classroom demonstration. Mark an
item complete only after someone has checked it and recorded evidence. Use
approved test accounts and non-production data for demonstrations.

## Release readiness checklist

### Scope and review

- [ ] Release scope and known limitations are written down.
- [ ] Changes included in the release have been reviewed and merged according
      to the repository's agreed process.
- [ ] No credentials, service-role keys, or sensitive customer/employee data
      are included in source, screenshots, logs, or presentation materials.

### Build and behavior

- [ ] Install dependencies from the project instructions.
- [ ] Run the client build using the command in the [project README](../../README.md)
      and record the result.
- [ ] Run applicable automated and manual checks; record which actually ran,
      their outcomes, and any blocked checks.
- [ ] Verify the demo account's role and permissions before showing role-specific
      behavior.
- [ ] Review open defects and identify any that affect the demo or release.

### Supabase and deployment

- [ ] Confirm the target environment is approved for the release.
- [ ] Verify required database migrations have been reviewed and applied in
      order; record evidence. Do not assume a migration is deployed because it
      exists in source.
- [ ] Verify required Edge Function configuration is present in the deployment
      environment without exposing secret values.
- [ ] Confirm a recovery or rollback approach with the project owner before
      production changes.
- [ ] Confirm the hosted client uses only browser-safe Supabase configuration;
      never expose a service-role key.

### Sign-off

- [ ] Presenter and reviewer have checked the environment and demo path.
- [ ] Remaining risks, untested paths, and deferred work are disclosed.
- [ ] Release/demo decision and date are recorded by the responsible team.

## Demo script

**Environment:** _Local or approved staging; never use production unless
explicitly authorized._
**Test account and role:** _Use a prepared test account; do not write its
password here._
**Presenter:** _Name_
**Date:** _Date_

1. **Introduce the application.** Explain the ERP's purpose and the scope being
   demonstrated.
2. **Show sign-in.** Sign in with the prepared test account. Avoid displaying
   credentials or personal data.
3. **Explain access.** Show only modules and actions available to that account's
   role. Do not imply that hiding a UI control alone proves server-side
   authorization.
4. **Demonstrate an agreed workflow.** Choose a safe, repeatable scenario with
   approved test data. State the expected outcome before the action.
5. **Show verification.** Refresh or navigate as appropriate to confirm the
   observed result. Report any behavior that was not tested.
6. **Close with status.** Summarize what was demonstrated, checks actually run,
   known limitations, and follow-up work. Distinguish the demo from full
   acceptance or production certification.
