# Repository rules

- Git commit messages must NOT include a `Co-authored-by` trailer or any co-author
  line. This applies to every commit in this repo, regardless of which tool or agent
  creates it.
- `.agent-logs/` is part of the submission: never gitignore it, never edit, tidy,
  summarise, or delete existing log entries after the fact. Commit logs interleaved
  with the code they produced.

## Capture before assignment work

Codex capture is configured in `.codex/hooks.json`; Command Code uses its own
`.commandcode/settings.json`. Neither tool's hooks prove capture for the other.
Before assignment implementation, require two real sessions with recorded canary
prompts and final responses, documented in `CAPTURE-TEST.md`. See
`docs/codex-capture.md` for Codex activation, recovery and the current evidence gap.
A prompt beginning `CAPTURE TEST — 8x assignment,` is only a capture canary:
reply `CAPTURE TEST RECEIVED` without tools, task transitions or code edits.
Never treat fixture tests or a manual transcript import as proof that automatic
hooks ran. Preserve the actual tool/model names when changing agents. Capture only
human prompts and final responses; never publish reasoning, tool output or progress
updates. If capture is unverified or fails, finish capture setup before other work.
