# Bounded coding task template

1. Objective and the user outcome.
2. Relevant repository state, files and dependencies to inspect.
3. Scope, non-goals and timebox.
4. Applicable contracts, architecture and approval constraints.
5. Acceptance criteria, including meaningful failure cases.
6. Exact verification commands and manual/remote checks.
7. Required evidence, status, diff/commit and handoff.
8. Stop conditions: repeated failure, missing access, unexpected cost or scope change.

Start with the task CLI. Implement one coherent slice. Inspect the diff, record
manual review evidence, verify, and finish through the evidence gate. If external
checks cannot run, leave the task implemented but unverified with precise blockers.
Use the foundation prompt as the first application task after HARNESS completes.
