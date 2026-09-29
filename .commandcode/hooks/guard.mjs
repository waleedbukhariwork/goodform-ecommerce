import fs from 'node:fs';
import path from 'node:path';
import { secretFile } from '../../scripts/harness/lib.mjs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const payload = JSON.parse(input || '{}');
  const root = fs.realpathSync(process.env.COMMANDCODE_PROJECT_DIR || payload.cwd || process.cwd());
  const name = payload.tool_input?.file_path || payload.tool_input?.absolute_path;
  if (name) {
    const absolute = path.resolve(root, name);
    const resolved = fs.existsSync(absolute) ? fs.realpathSync(absolute) : absolute;
    const relative = path.relative(root, resolved).split(path.sep).join('/');
    const writing = /write|edit/i.test(payload.tool_name || payload.tool_display_name || '');
    const reason = secretFile(absolute) || secretFile(resolved)
      ? 'Do not read or write raw secret files through agent tools. Use environment injection or the approved secret manager; examples are allowed.'
      : writing && (relative === '.agent-logs' || relative.startsWith('.agent-logs/'))
        ? 'Existing submission logs are immutable. Only the capture hook may append transcript records; do not edit or rewrite logs.' : null;
    if (reason) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
  }
} catch {
  console.error('Harness file guard could not validate this file operation.');
  process.exitCode = 2;
}
