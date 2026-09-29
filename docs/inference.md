# INFERENCE feasibility gate — 2026-09-29

## Verdict

**Fail for use in this environment; implementation remains unverified.** The current checkout has no Google project or region setting, credentials reference, local Application Default Credentials, `gcloud` CLI, evidence that the API is enabled, credit balance, or billing eligibility. No try-on request was sent. This is an access and evidence failure, not evidence that the model itself fails. FITTING_ROOM must not expose photo generation as working until the full gate below passes.

## Verified vendor contract

Google's [model card](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/vto/virtual-try-on-001) identifies `virtual-try-on-001` as GA, released 2026-01-20, with regional Standard PayGo availability including `us-central1`, `asia-northeast1`, and `asia-southeast1`. The account's usable region is **unknown**. The model accepts one person image and one clothing image, PNG or JPEG, at most 7 MB each, and can return up to four images per request. This does not establish this account's access. Google's [generation documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/generate-virtual-try-on-images) shows the regional `projects/{project}/locations/{region}/publishers/google/models/virtual-try-on-001:predict` endpoint and person/product image request body. The pinned official `@google/genai@2.24.0` SDK exposes `models.recontextImage` with the equivalent `personImage`, `productImages`, and `numberOfImages` parameters. The probe requests one output per call and uses API version `v1`, a 45-second timeout, an `AbortSignal`, and one SDK attempt. An abort may still be charged, according to the [SDK configuration reference](https://googleapis.github.io/js-genai/release_docs/interfaces/types.RecontextImageConfig.html).

## Cost and approval gate

Google's [pricing page](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) lists **$0.06 per output image** for Virtual Try-On. Six separate one-image calls would have a listed maximum of **$0.36** for the planned outputs. This is an estimate, not an observed charge, quota, discount, or credit coverage. The configured per-call ceiling must be at least 6 cents, the daily probe cap exactly six (enforced through an atomic PostgreSQL counter reserved before each attempt, including timeouts), and the CLI requires an explicit 36-cent operator argument. These checks do not replace proof of credit balance or the user's explicit approval. Before any billable call, a human must provide the project and a supported account region, enable the API, provide a private credential file with appropriate IAM access, confirm the remaining eligible credits and billing terms cover at least $0.36, supply permitted source images, and approve the stated $0.36 worst-case run. No such approval or account evidence was available here.

## Thresholds fixed before provider calls

- Latency: median of six attempt latencies at or under 30,000 ms; record the worst latency. The 45,000 ms client timeout bounds each attempt but does not prevent a provider charge.
- Reliability: at least five of six calls return a valid output without a provider error. No automatic retries.
- Quality: a human reviews all six output artifacts. Any anatomically implausible result fails the gate. Record product fidelity and other defects for each.
- Reuse: confirm at least two usable previews from the **same original** person photo and same garment image, without a fresh upload. The probe holds one original pair in memory and submits it for six separate calls, but this behavior has not been observed against Google.
- Retention: an account-specific disclosure must cover inputs and outputs, training use, and retention duration. An unknown period or unconfirmed zero-retention setting fails.
- Credits: the actual remaining eligible credit and charge coverage must be confirmed before the first call. Stop on an unexpected charge, quota exhaustion, or billing error.

## Retention disclosure status

Google's [zero data retention documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) says managed model customer data is not used to train or fine-tune without prior permission or instruction. It also says prompts may be logged for abuse monitoring under applicable terms, and zero data retention requires specific account actions or exceptions. It does **not** establish a single account-specific duration for these try-on inputs and outputs here. No account configuration or contract was inspected. FITTING_ROOM may say only that photos would be sent to Google for generation and that Google says training needs prior permission; it must **not** claim a fixed retention period or zero retention until the applicable terms and project settings are confirmed. No user photo or generated artifact was submitted or stored during this task.

## Six observations

| Run | Started / ended | Latency | Provider status | Human review | Defect notes | Estimated cost | Request ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pending | pending | not called | no | pending | $0.06 planned | pending |
| 2 | pending | pending | not called | no | pending | $0.06 planned | pending |
| 3 | pending | pending | not called | no | pending | $0.06 planned | pending |
| 4 | pending | pending | not called | no | pending | $0.06 planned | pending |
| 5 | pending | pending | not called | no | pending | $0.06 planned | pending |
| 6 | pending | pending | not called | no | pending | $0.06 planned | pending |

The probe reserves each attempt in PostgreSQL before contacting Google, so a repeated invocation on the same UTC day cannot exceed the configured project cap. The probe writes safe per-attempt metadata to stdout and generated images only to an explicitly supplied private directory outside the repository. It stops after a provider error and makes no retry. An output image is never treated as human-reviewed by the probe. Do not put source or generated images, paths, signed links, base64, prompts, or credentials in repository evidence or telemetry.

## Non-billable setup and next gate

`INFERENCE_ENABLED=false` keeps the API and probe disabled. When explicitly enabled, class-validator checks project, region, pinned GA model, credential file reference, per-call cost ceiling, and daily cap with implicit conversion disabled; API startup fails safely if any are invalid. The CLI is `pnpm --filter @goodform/api inference:probe --preflight` for non-billable configuration presence only. A future approved run supplies `--person`, `--product`, `--out-dir`, and `--approved-max-cents 36` after the human approval and credit checks above. The preflight and static checks cannot establish provider access, funding, latency, image quality, or retention. No automated tests or fixtures were added or run for this task.
