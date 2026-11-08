# Recommended branch protection

These are recommended GitHub settings for the `main` branch. This document does
not enable protection; a repository administrator must configure and save the
rules in the repository settings.

## Suggested rule for `main`

In **Settings → Branches** (or **Settings → Rules → Rulesets**, depending on
the repository interface), create a rule targeting the exact branch name
`main`, then consider enabling:

- **Require a pull request before merging**, with at least one approval.
- **Dismiss stale approvals when new commits are pushed**, so reviewers can
  re-check changes added after approval.
- **Require conversation resolution**, so review feedback is addressed before
  merging.
- **Block force pushes and branch deletion**, to protect the shared history.
- **Require status checks before merging** only after the project has reliable
  automated checks, such as a build or test workflow. Select the actual checks
  reported by GitHub; do not make up check names or enable this before checks
  exist.
- **Require approval of the most recent reviewable push**, if the team wants
  someone other than the latest pusher to approve the final update.

For a small student team, one approval is a practical starting point. The
repository owner should decide whether administrators can bypass the rule for
urgent maintenance and communicate that exception to the team.

## Team workflow

1. Make changes on a short-lived feature branch rather than directly on `main`.
2. Open a pull request with a clear summary and real test evidence.
3. Request a teammate's review and resolve relevant conversations.
4. Merge only after required approvals and any configured checks pass.
5. Delete the feature branch after merge if it is no longer needed.

## Notes

- Branch protection is configured in GitHub; adding this file alone does not
  change repository permissions or prevent a merge.
- The exact available settings can depend on repository permissions and the
  GitHub plan. The owner should verify the settings shown for this repository.
- Do not require a CI check until a corresponding workflow exists and passes
  consistently.
