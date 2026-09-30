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
| D10 | INFERENCE probe targets Google GA `virtual-try-on-001`; account region remains undecided | 2026-09-29: Google model card and SDK confirm capability and supported regions; no project, credentials, credit proof or region were present. No billable call authorized. |
| D11 | Email verification and password reset delivered through Resend, production only, enforcement gated on `MAIL_ENABLED` | 2026-09-30: the user requested verification and reset, then explicitly approved Resend and full enforcement. Adds a fourth external service on a free allowance; no paid plan or domain purchase authorized. Enforcement is bound to successful sending, so disabling mail cannot strand unverifiable accounts. Known effect: enabling it makes production signup two-step. No address is stored or logged, and throttle rows hold a salted hash. |
| D12 | The live staging host may send Resend mail when `MAIL_ENABLED=true` | 2026-09-30: the user stored a Resend key and set `MAIL_FROM` to `Goodform <reply@contact.waleedbukhari.com>` on `goodform.waleedbukhari.com`, then asked for it to be used. Dev still cannot send. Signup on that host now requires the verification link. No message delivery has been observed yet. |

New decisions record the date, concrete reason, approving instruction, and effect
on time/scope. Do not relitigate approved choices without new evidence. A local
passing test is not proof of a remote service, deployment or account entitlement.
