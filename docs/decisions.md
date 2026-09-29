# Decision record

These decisions summarize product/engineering approvals, not historical transcript
content. Historical .agent-logs entries remain untouched.

| ID | Decision | Basis/status |
| --- | --- | --- |
| D01 | Fashion + Private Fitting Room replaces desk accessories | User accepted the suggestion |
| D02 | Accounts + Stripe sandbox payments | User selected both and confirmed test-dashboard access |
| D03 | AWS EC2, existing domain, credit-funded hosting | User approved; concrete resource access/coverage still needs verification |
| D04 | Google-credit-funded photo try-on | User selected Google credits; API access and funding eligibility unverified |
| D05 | Next frontend + Nest backend, Drizzle, class-validator, native fetch, Observe | User's explicit stack revision |
| D06 | Dev/staging/production, efficient containers, CI/CD and consistent layering | User's explicit engineering requirements; see architecture.md |
| D07 | Routine implementation choices delegated within approved boundaries | User approved; no blanket authority for spending or scope changes |
| D08 | Executable harness before the foundation milestone | Current user request |
| D09 | No co-author lines; immutable submission logs | Existing AGENTS.md rules preserved |

New decisions record the date, concrete reason, approving instruction, and effect
on time/scope. Do not relitigate approved choices without new evidence. A local
passing test is not proof of a remote service, deployment or account entitlement.
