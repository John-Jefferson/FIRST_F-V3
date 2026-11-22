# QA evidence labels

Use these labels consistently when recording test evidence:

- **PASS**: The live run and required assertion completed successfully.
- **FAIL**: The live run completed, but a required assertion failed.
- **SKIPPED**: A test did not execute because an authorized account or required environment was unavailable.
- **BLOCKED**: Execution could not proceed because of an environment or configuration dependency.
- **REVIEW**: Source or configuration inspection found an item that requires manual approval.

Do not convert `SKIPPED`, `BLOCKED`, or `REVIEW` into pass evidence.
