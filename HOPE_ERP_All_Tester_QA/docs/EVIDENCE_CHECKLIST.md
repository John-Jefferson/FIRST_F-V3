# Evidence checklist

Before submitting QA evidence:

- [ ] The ERP environment was authorized for testing.
- [ ] The exact Playwright suite and command were recorded.
- [ ] Each pass has a corresponding live assertion result.
- [ ] Skipped roles and unavailable environments remain skipped.
- [ ] No credentials, private reports, screenshots, or database data are attached.
- [ ] Any server-side RLS or write behavior has separate staging evidence.

Do not use source inspection or skipped tests as pass evidence.
