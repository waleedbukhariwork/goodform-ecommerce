import fs from 'node:fs';
import path from 'node:path';
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const payload = JSON.parse(input || '{}');
  const root = process.env.COMMANDCODE_PROJECT_DIR || payload.cwd || process.cwd();
  const tasks = JSON.parse(fs.readFileSync(path.join(root, 'docs/tasks.json'), 'utf8'));
  const active = tasks.tasks.find((task) => task.id === tasks.activeTask);
  const next = tasks.tasks.find((task) => task.status !== 'verified complete');
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext:
    `Read AGENTS.md, docs/scope.md, docs/architecture.md and docs/handoff.md before editing. Active task: ${active?.id || 'none'} (${active?.status || 'none'}). Next unfinished task: ${next?.id || 'none'}. Use node scripts/harness/cli.mjs task start ID, verify ID, and task finish ID REPORT. Existing .agent-logs entries are immutable. Never print secrets or claim unexecuted checks passed. Session hooks do not constitute an OS sandbox.` } }));
} catch {
  console.log(JSON.stringify({ systemMessage: 'Harness context could not load. Read AGENTS.md and run node scripts/harness/cli.mjs doctor.' }));
}
