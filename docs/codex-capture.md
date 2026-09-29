# Codex assignment capture

Status: script tests and source recovery pass; native hook trust and two-session
live verification are pending. Assignment implementation remains paused at this
gate. The client explicitly requires this check before building.

## Actual setup

This conversation runs in the Codex VS Code extension, backed by
`codex-cli 0.155.0-alpha.16.3`. Its turn metadata identifies `gpt-6-astra` for planning
and execution. The earlier Command Code model was `qwen/qwen3.8-max-0902`.
Each captured record uses the model recorded for that turn, not a fixed label.

Native events in `.codex/hooks.json` call `scripts/capture/codex.mjs`:
SessionStart recovers available records; UserPromptSubmit records the prompt;
Stop records the final response. The script validates workspace and session IDs,
rejects subagent transcripts, and appends under a per-session lock. It never edits
existing records. Commands contain no network requests and make no model calls.

Official protocol and trust requirements:
https://learn.chatgpt.com/docs/hooks

## Activate once, then prove it

1. Open a terminal in this repository and run `codex`. Enter `/hooks`. Review and
   trust the three project hooks from `.codex/hooks.json`. Do not use a hook-trust
   bypass flag. Restart/reload the VS Code Codex session so it loads the config.
2. Send `CAPTURE TEST — 8x assignment, Waleed Bukhari` in one new Codex session.
   The expected response is `CAPTURE TEST RECEIVED`.
3. Start a second, separate Codex session in this same repository and send the
   same canary. Confirm two distinct session log filenames with both entries.
4. Append the actual log paths and both raw prompt/response pairs to
   `CAPTURE-TEST.md`. Mark automatic capture verified only after inspecting them.
5. Resume implementation. Commit new logs alongside the changes they record.

Hook trust is stored by Codex for the exact definitions. New/changed definitions
need review again. A repository file alone does not establish that a hook ran.
The current already-running session may need a reload before its final response
is captured; SessionStart recovery handles existing raw records when resumed.

## Scope and fidelity

Only `event_msg.user_message` and non-async
`event_msg.agent_message` with `phase: final_answer` are recovered. Reasoning,
function calls/results, developer/system instructions, commentary, compaction
summaries and async intermediary questions are excluded. A completion event's
`last_agent_message` is not assumed to be a final: interrupted sessions can put
commentary there. An unanswered prompt remains without a fabricated response.

Prompt text is preserved exactly as recorded by Codex, including IDE context and
attachment references in that prompt. The logger does not read referenced files
or copy uploaded media, secrets or the complete session store. This is a text
prompt/final record, not an export of every model input.

If a hook fires before its transcript record is flushed, its provided prompt/final
text is appended with `timestamp_source: hook-observed` and current UTC time. Later
transcript recovery deduplicates it. Source model/text disagreement fails visibly
instead of rewriting history. Transcript format is version-dependent; retest
capture after Codex upgrades or history-storage changes.

Frontmatter contains the counters at file creation. Later counters are appended
in `CAPTURE_METADATA` records to preserve all original bytes. Each entry includes
UTC time/model; hash markers provide duplicate suppression. Markers and file locks
are integrity safeguards, not a tamperproof audit system. A killed writer can leave
a stale lock; verify no writer is active before removing only the lock under
`.commandcode/.capture-state/`. Never repair a failure by editing a log.

## Tests and recovery

```sh
node --test scripts/capture/codex.test.mjs
node scripts/capture/codex.mjs recover /absolute/path/to/this-project-rollout.jsonl
```

Recovery is explicit maintenance, not the automatic operating mechanism. The
2026-09-29 recovery of session `01a0eab5-0cd5-7d33-a8f9-b0dec051cd27` captured 10
prompts and 7 available finals. It cannot retroactively establish that capture was
installed before earlier work or that logs were committed at that time. Existing
Command Code logs were left untouched. Live canary proof is still required.
