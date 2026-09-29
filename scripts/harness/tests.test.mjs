import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { captureTurn } from '../../.commandcode/hooks/capture-turn.mjs';
import { check, commitMessageProblems, finishTask, git, hasSecret, json, logProblems, secretFile, snapshot, startTask, validateTasks, verificationCommands, verify, writeJson } from './lib.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const at = (root, name) => path.join(root, name);
function put(root, name, text) { fs.mkdirSync(path.dirname(at(root, name)), { recursive: true }); fs.writeFileSync(at(root, name), text); }
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'goodform-harness-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '-q']); git(root, ['config', 'user.name', 'Harness fixture']); git(root, ['config', 'user.email', 'fixture@example.invalid']);
  put(root, 'AGENTS.md', 'Fixture instructions\n');
  put(root, '.gitignore', '.harness/runs/\n');
  put(root, '.agent-logs/historical.md', 'Historical bytes must survive.\n');
  writeJson(at(root, '.harness/config.json'), { requiredDocuments: ['AGENTS.md', 'docs/tasks.json'], harnessChecks: [['node', '-e', 'process.exit(0)']], applicationScripts: ['test', 'build'], commandTimeoutMs: 5000 });
  writeJson(at(root, 'docs/tasks.json'), { activeTask: null, tasks: [{ id: 'TASK', phase: 'harness', status: 'planned', dependsOn: [], manualChecks: ['diff-review'] }, { id: 'APP', phase: 'application', status: 'planned', dependsOn: ['TASK'], manualChecks: [] }] });
  writeJson(at(root, 'docs/reviews/TASK.json'), { checks: [{ criterion: 'diff-review', status: 'pass', evidence: 'Fixture review performed by the regression test.' }] });
  git(root, ['add', '.']);
  const commit = git(root, ['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Initialize isolated fixture']);
  assert.equal(commit.status, 0, commit.stderr);
  return root;
}
function transcript(root, { session = 'session-test-001', turns = 1 } = {}) {
  const entries = [{ type: 'session', id: 'root', timestamp: '2026-09-29T10:00:00.000Z' }];
  let parentId = 'root';
  for (let i = 1; i <= turns; i++) {
    entries.push({ type: 'message', id: `u${i}`, parentId, timestamp: `2026-09-29T10:00:0${i}.000Z`, message: { role: 'user', content: [{ type: 'text', text: `Prompt ${i}\nUnicode: café` }] } });
    entries.push({ type: 'message', id: `a${i}`, parentId: `u${i}`, timestamp: `2026-09-29T10:00:0${i}.500Z`, model: 'test-model', message: { role: 'assistant', content: [{ type: 'text', text: `Response ${i}` }] } });
    parentId = `a${i}`;
  }
  const file = at(root, 'transcript.jsonl');
  fs.writeFileSync(file, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
  return { session_id: session, transcript_path: file, cwd: root };
}
function hook(name, payload) {
  return spawnSync(process.execPath, [at(repo, `.commandcode/hooks/${name}.mjs`)], { cwd: payload.cwd, input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, COMMANDCODE_PROJECT_DIR: payload.cwd }, timeout: 10000 });
}

test('rejects co-author variants without rejecting normal commit subjects', () => {
  for (const line of ['Co-authored-by: Someone', 'CO-AUTHOR: Someone', 'Co authored by: Someone', 'Co-author Someone']) assert.equal(commitMessageProblems(`Fix capture\n\n${line}`).length, 1);
  assert.deepEqual(commitMessageProblems('Enforce repository commit rules'), []);
});
test('allows placeholder env examples and detects common credential shapes', () => {
  assert.equal(secretFile('.env.staging'), true);
  assert.equal(secretFile('.env.staging.example'), false);
  assert.equal(secretFile('service-account.json'), true);
  assert.equal(hasSecret('sk_' + 'test_' + 'A'.repeat(25)), true);
  assert.equal(hasSecret('replace-with-your-key'), false);
});
test('task schema rejects cycles and invalid states', () => {
  const tasks = { tasks: [{ id: 'A', phase: 'harness', status: 'done', dependsOn: ['B'], manualChecks: [] }, { id: 'B', phase: 'harness', status: 'planned', dependsOn: ['A'], manualChecks: [] }] };
  assert.ok(validateTasks(tasks).some((item) => item.includes('cycle')));
  assert.ok(validateTasks(tasks).some((item) => item.includes('status')));
});
test('historical log appends pass; overwrites and deletion fail', (t) => {
  const root = fixture(t);
  fs.appendFileSync(at(root, '.agent-logs/historical.md'), 'New entry\n');
  assert.deepEqual(logProblems(root), []);
  put(root, '.agent-logs/historical.md', 'Rewritten\n');
  assert.ok(logProblems(root).some((item) => item.includes('existing bytes')));
  fs.unlinkSync(at(root, '.agent-logs/historical.md'));
  assert.ok(logProblems(root).some((item) => item.includes('deleted')));
});
test('staged log policy checks the index rather than unrelated working changes', (t) => {
  const root = fixture(t);
  fs.appendFileSync(at(root, '.agent-logs/historical.md'), 'Safe append\n');
  git(root, ['add', '.agent-logs/historical.md']);
  put(root, '.agent-logs/historical.md', 'Unsafe working change\n');
  assert.deepEqual(logProblems(root, { staged: true }), []);
  assert.notDeepEqual(logProblems(root), []);
});
test('ignored submission logs are rejected', (t) => {
  const root = fixture(t); fs.appendFileSync(at(root, '.gitignore'), '.agent-logs/\n');
  assert.ok(logProblems(root).some((item) => item.includes('ignored')));
});
test('direct banned dependencies fail in partial application work', (t) => {
  const root = fixture(t);
  put(root, 'apps/api/src/main.ts', 'export {};\n');
  writeJson(at(root, 'package.json'), { dependencies: { axios: '1.0.0' } });
  const result = check(root);
  assert.ok(result.problems.some((item) => item.includes('axios')));
  assert.equal(result.problems.some((item) => item.includes('script missing')), false);
});
test('policy reports possible secrets without echoing the value', (t) => {
  const root = fixture(t); const secret = 'sk_' + 'test_' + 'Z'.repeat(24);
  put(root, 'accidental.txt', secret);
  const result = check(root);
  assert.ok(result.problems.some((item) => item.includes('Possible credential')));
  assert.equal(JSON.stringify(result).includes(secret), false);
});
test('snapshots include source changes and exclude generated evidence', (t) => {
  const root = fixture(t); const initial = snapshot(root);
  put(root, '.harness/runs/result.json', '{}\n'); put(root, 'docs/evidence/result.json', '{}\n'); put(root, '.commandcode/taste/taste/taste.md', 'Preference change\n');
  assert.equal(snapshot(root), initial);
  put(root, 'source.mjs', 'export const n = 1;\n');
  assert.notEqual(snapshot(root), initial);
});
test('dependency gates require verified predecessors', (t) => {
  const root = fixture(t);
  assert.throws(() => startTask(root, 'APP'), /Dependency/);
  startTask(root, 'TASK');
  assert.equal(json(root, 'docs/tasks.json').activeTask, 'TASK');
});
test('application verification cannot pass before scaffolding', (t) => {
  assert.throws(() => verificationCommands(fixture(t), 'application'), /not been scaffolded/);
});
test('fresh evidence and manual review complete a task', (t) => {
  const root = fixture(t); startTask(root, 'TASK');
  const { report, file } = verify(root, 'TASK');
  assert.equal(report.passed, true);
  const saved = finishTask(root, 'TASK', file);
  assert.ok(fs.existsSync(at(root, saved)));
  assert.equal(json(root, 'docs/tasks.json').tasks[0].status, 'verified complete');
});
test('source edits after verification invalidate completion', (t) => {
  const root = fixture(t); startTask(root, 'TASK'); const { file } = verify(root, 'TASK');
  put(root, 'changed.mjs', 'export const value = 2;\n');
  assert.throws(() => finishTask(root, 'TASK', file), /stale/);
});
test('failed checks and absent manual evidence cannot complete tasks', (t) => {
  const root = fixture(t); startTask(root, 'TASK');
  const config = json(root, '.harness/config.json'); config.harnessChecks = [['node', '-e', 'process.exit(3)']]; writeJson(at(root, '.harness/config.json'), config);
  const failed = verify(root, 'TASK'); assert.equal(failed.report.passed, false);
  assert.throws(() => finishTask(root, 'TASK', failed.file), /failing/);
  config.harnessChecks = [['node', '-e', 'process.exit(0)']]; writeJson(at(root, '.harness/config.json'), config);
  writeJson(at(root, 'docs/reviews/TASK.json'), { checks: [] });
  const passed = verify(root, 'TASK');
  assert.throws(() => finishTask(root, 'TASK', passed.file), /Manual evidence/);
});
test('capture is byte-preserving, verbatim and duplicate-safe across repeated stops', async (t) => {
  const root = fixture(t); const payload = transcript(root);
  const first = await captureTurn(payload, root); const bytes = fs.readFileSync(first.logFile);
  assert.equal(first.appended, 1); assert.ok(bytes.toString().includes('Prompt 1\nUnicode: café'));
  const second = await captureTurn(payload, root); assert.equal(second.appended, 0); assert.deepEqual(fs.readFileSync(first.logFile), bytes);
  transcript(root, { turns: 2 }); const third = await captureTurn(payload, root);
  assert.equal(third.appended, 1); assert.ok(fs.readFileSync(first.logFile).subarray(0, bytes.length).equals(bytes));
});
test('capture recovers deduplication after loss of mutable state', async (t) => {
  const root = fixture(t); const payload = transcript(root); const first = await captureTurn(payload, root);
  fs.rmSync(at(root, '.commandcode/.capture-state'), { recursive: true });
  const bytes = fs.readFileSync(first.logFile); await captureTurn(payload, root);
  assert.deepEqual(fs.readFileSync(first.logFile), bytes);
});
test('capture preserves distinct branch/revised responses', async (t) => {
  const root = fixture(t); const payload = transcript(root); const first = await captureTurn(payload, root);
  fs.appendFileSync(payload.transcript_path, JSON.stringify({ type: 'message', id: 'revised', parentId: 'u1', timestamp: '2026-09-29T10:00:09.000Z', model: 'second-model', message: { role: 'assistant', content: 'Revised response' } }) + '\n');
  const result = await captureTurn(payload, root); assert.equal(result.appended, 1);
  const content = fs.readFileSync(first.logFile, 'utf8'); assert.ok(content.includes('Response 1')); assert.ok(content.includes('Revised response'));
});
test('legacy migration appends metadata without refreshing historical headers', async (t) => {
  const root = fixture(t); const payload = transcript(root, { turns: 2 });
  const old = '---\ntotal_exchanges: 1\n---\nHistorical transcript body\n';
  const name = `.agent-logs/2026-09-29_10-00-00_${payload.session_id}.md`; put(root, name, old);
  const result = await captureTurn(payload, root);
  assert.equal(result.appended, 1); const content = fs.readFileSync(at(root, name), 'utf8');
  assert.ok(content.startsWith(old)); assert.ok(content.includes('[CAPTURE_MIGRATION'));
  assert.equal((await captureTurn(payload, root)).appended, 0);
});
test('concurrent capture processes do not duplicate a turn', async (t) => {
  const root = fixture(t); const payload = transcript(root);
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [at(repo, '.commandcode/hooks/capture-turn.mjs')], { cwd: root, env: { ...process.env, COMMANDCODE_PROJECT_DIR: root }, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', (chunk) => output += chunk); child.on('error', reject);
    child.on('close', (code) => code === 0 && !output ? resolve() : reject(new Error('Concurrent capture failed.')));
    child.stdin.end(JSON.stringify(payload));
  });
  await Promise.all([run(), run()]);
  const name = fs.readdirSync(at(root, '.agent-logs')).find((file) => file.endsWith(`_${payload.session_id}.md`));
  const content = fs.readFileSync(at(root, `.agent-logs/${name}`), 'utf8');
  assert.equal([...content.matchAll(/^\[CAPTURE_RECORD /gm)].length, 1);
});
test('malformed transcript fails without altering logs', async (t) => {
  const root = fixture(t); const payload = transcript(root); put(root, 'transcript.jsonl', '{broken');
  const old = fs.readFileSync(at(root, '.agent-logs/historical.md'));
  await assert.rejects(() => captureTurn(payload, root));
  assert.deepEqual(fs.readFileSync(at(root, '.agent-logs/historical.md')), old);
});
test('direct file guard denies log writes and secret reads but allows examples', (t) => {
  const root = fixture(t);
  const denied = hook('guard', { cwd: root, tool_name: 'edit_file', tool_input: { file_path: '.agent-logs/historical.md' } });
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const secret = hook('guard', { cwd: root, tool_name: 'read_file', tool_input: { absolute_path: at(root, '.env') } });
  assert.equal(JSON.parse(secret.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allowed = hook('guard', { cwd: root, tool_name: 'read_file', tool_input: { absolute_path: at(root, '.env.example') } });
  assert.equal(allowed.stdout, ''); assert.equal(allowed.status, 0);
});
test('file guard resolves symlink aliases to protected files', (t) => {
  const root = fixture(t); put(root, '.env', 'PRIVATE_VALUE=fixture-only\n'); fs.symlinkSync(at(root, '.env'), at(root, 'alias.txt'));
  const result = hook('guard', { cwd: root, tool_name: 'read_file', tool_input: { absolute_path: at(root, 'alias.txt') } });
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
});
test('session hook injects task context using the actual protocol', (t) => {
  const result = hook('session-start', { cwd: fixture(t), hook_event_name: 'SessionStart' });
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.ok(output.hookSpecificOutput.additionalContext.includes('TASK'));
});
test('Stop hook captures first and permits honest in-progress reports', (t) => {
  const root = fixture(t); startTask(root, 'TASK'); const payload = transcript(root);
  const result = hook('stop', { ...payload, hook_event_name: 'Stop' });
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, undefined); assert.ok(output.systemMessage.includes('in progress'));
  assert.ok(fs.readdirSync(at(root, '.agent-logs')).some((name) => name.endsWith(`_${payload.session_id}.md`)));
});
test('Stop hook does not force endless revision loops after capture failures', (t) => {
  const root = fixture(t);
  const first = JSON.parse(hook('stop', { cwd: root }).stdout); assert.equal(first.decision, 'block');
  const second = JSON.parse(hook('stop', { cwd: root, stop_hook_active: true }).stdout); assert.equal(second.decision, undefined);
});
test('actual Git hooks reject a co-author commit and an edited historical log', (t) => {
  const root = fixture(t);
  for (const file of ['scripts/harness/lib.mjs', 'scripts/harness/cli.mjs', '.githooks/pre-commit', '.githooks/commit-msg']) { put(root, file, fs.readFileSync(at(repo, file), 'utf8')); }
  fs.chmodSync(at(root, '.githooks/pre-commit'), 0o755); fs.chmodSync(at(root, '.githooks/commit-msg'), 0o755);
  git(root, ['config', 'core.hooksPath', '.githooks']); put(root, 'change.txt', 'New work\n'); git(root, ['add', '.']);
  const coauthor = git(root, ['commit', '-m', 'Fixture change\n\nCo-authored-by: Example']);
  assert.notEqual(coauthor.status, 0); assert.ok(coauthor.stderr.includes('co-author'));
  put(root, '.agent-logs/historical.md', 'Rewritten\n'); git(root, ['add', '.agent-logs/historical.md']);
  const altered = git(root, ['commit', '-m', 'Fixture change']);
  assert.notEqual(altered.status, 0); assert.ok(altered.stderr.includes('existing bytes'));
});

test('completed status without verification evidence is rejected', (t) => {
  const root = fixture(t); const tracker = json(root, 'docs/tasks.json');
  tracker.tasks[0].status = 'verified complete'; writeJson(at(root, 'docs/tasks.json'), tracker);
  assert.ok(check(root).problems.some((item) => item.includes('intact verification')));
});
test('completed evidence and review modifications are detected', (t) => {
  const root = fixture(t); startTask(root, 'TASK'); const { file } = verify(root, 'TASK');
  const saved = finishTask(root, 'TASK', file);
  assert.deepEqual(check(root).problems, []);
  const original = fs.readFileSync(at(root, saved));
  fs.appendFileSync(at(root, saved), ' ');
  assert.ok(check(root).problems.some((item) => item.includes('intact verification')));
  fs.writeFileSync(at(root, saved), original);
  fs.appendFileSync(at(root, 'docs/reviews/TASK.json'), ' ');
  assert.ok(check(root).problems.some((item) => item.includes('intact verification')));
});
test('incomplete capture tails fail visibly without rewriting bytes', async (t) => {
  const root = fixture(t); const payload = transcript(root); const first = await captureTurn(payload, root);
  fs.appendFileSync(first.logFile, '\n[LOG_ENTRY type=PROMPT num=2');
  const bytes = fs.readFileSync(first.logFile);
  await assert.rejects(captureTurn(payload, root), /INCOMPLETE_CAPTURE_TAIL/);
  assert.deepEqual(fs.readFileSync(first.logFile), bytes);
});

test('unfinished app checkpoints can commit, but completed app tasks require all scripts', (t) => {
  const root = fixture(t);
  put(root, 'apps/api/src/main.ts', 'export {};\n');
  writeJson(at(root, 'package.json'), { scripts: { test: 'node --test' } });
  assert.deepEqual(check(root).problems, []);
  const tracker = json(root, 'docs/tasks.json');
  tracker.tasks[1].status = 'verified complete'; writeJson(at(root, 'docs/tasks.json'), tracker);
  const problems = check(root).problems;
  assert.ok(problems.some((item) => item.includes('Required application script missing: build')));
  assert.ok(problems.some((item) => item.includes('intact verification')));
});
