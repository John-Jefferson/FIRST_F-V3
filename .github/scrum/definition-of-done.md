# Definition of Done

Use this checklist for a change when it applies. It is a proposed shared
quality bar; it does not assert that previous work met every item.

## Change checklist

- [ ] The change addresses the agreed issue or user need, and its scope is
      described in the pull request.
- [ ] Applicable acceptance criteria have been checked. Any unmet or untested
      criteria are clearly identified.
- [ ] Relevant tests or checks were run; the pull request reports the actual
      commands and outcomes. If no test was appropriate or possible, the reason
      is stated.
- [ ] A reviewer has reviewed the change when review is available, and
      conversations that affect correctness or safety are resolved.
- [ ] User-facing or operational documentation is updated when the change
      affects setup, behavior, permissions, or deployment.
- [ ] No credentials, service-role keys, passwords, or real sensitive records
      were added.

## Additional checks when applicable

- [ ] UI behavior is checked for the relevant roles and permissions.
- [ ] Database changes include a migration and explain access-control,
      compatibility, and rollback considerations.
- [ ] Destructive or write behavior is tested only with approved test data in a
      non-production environment.
- [ ] The application build or relevant automated checks pass, and the result
      is recorded.
- [ ] Known limitations, deferred work, and unresolved risks are linked or
      described rather than represented as completed.

Mark a checklist item not applicable only when the pull request explains why.
“Done” means the change is reviewed and supported by evidence, not merely that
code was written or a task was moved on a board.
