import fs from 'node:fs';
import path from 'node:path';
import { captureTurn } from './capture-turn.mjs';
import { snapshot } from '../../scripts/harness/lib.mjs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
let payload = {};
try {
  payload = JSON.parse(input || '{}');
  const root = process.env.COMMANDCODE_PROJECT_DIR || payload.cwd || process.cwd();
  await captureTurn(payload, root);
  const tracker = JSON.parse(fs.readFileSync(path.join(root, 'docs/tasks.json'), 'utf8'));
  const active = tracker.tasks.find((task) => task.id === tracker.activeTask);
  if (active) {
    console.log(JSON.stringify({ systemMessage: `Task ${active.id} is ${active.status}. Report executed checks and remaining work; use the harness evidence gate before claiming verified completion.` }));
  } else {
    const latest = tracker.tasks.filter((task) => task.evidence).at(-1);
    if (latest) {
      const report = JSON.parse(fs.readFileSync(path.join(root, latest.evidence), 'utf8'));
      if (report.sourceFingerprint !== snapshot(root)) console.log(JSON.stringify({ systemMessage: 'The source has changed since the last verification. Historical evidence remains valid for its recorded source only; start a task and verify the current changes.' }));
    }
  }
} catch {
  console.log(JSON.stringify(payload.stop_hook_active
    ? { systemMessage: 'Capture or harness status could not be verified on retry. Report this limitation; do not rewrite logs.' }
    : { decision: 'block', reason: 'Capture or harness status verification failed. Diagnose the hook using synthetic fixtures and report the failure; never rewrite existing logs. Do not run paid work to repair the harness.' }));
}
