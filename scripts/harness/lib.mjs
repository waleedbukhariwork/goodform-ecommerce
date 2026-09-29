import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const statuses = ['planned', 'in progress', 'blocked', 'implemented but unverified', 'verified complete'];
export const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const json = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
export const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
};
export function git(root, args, options = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  return result;
}
export function files(root) {
  const result = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
  if (result.status !== 0) throw new Error('Cannot enumerate repository files.');
  return [...new Set(result.stdout.split('\0').filter(Boolean))].sort();
}
export function snapshot(root) {
  const excluded = /^(?:\.agent-logs\/|\.commandcode\/taste\/|\.harness\/runs\/|docs\/evidence\/|docs\/tasks\.json$|docs\/handoff\.md$)/;
  const entries = files(root).filter((file) => !excluded.test(file)).map((file) => {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) return [file, 'deleted'];
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) return [file, `symlink:${fs.readlinkSync(target)}`];
    if (!stat.isFile()) return [file, 'non-file'];
    return [file, stat.mode & 0o111, sha(fs.readFileSync(target))];
  });
  return sha(JSON.stringify(entries));
}
export function validateTasks(tracker) {
  const problems = [];
  if (!Array.isArray(tracker.tasks)) return ['Task tracker must contain tasks.'];
  const ids = new Set(tracker.tasks.map((task) => task.id));
  if (ids.size !== tracker.tasks.length) problems.push('Duplicate task IDs.');
  for (const task of tracker.tasks) {
    if (!/^[A-Z][A-Z0-9_-]{0,39}$/.test(task.id)) problems.push('Invalid task ID.');
    if (!statuses.includes(task.status)) problems.push(`${task.id}: invalid status.`);
    if (!['harness', 'application'].includes(task.phase)) problems.push(`${task.id}: invalid phase.`);
    if (!Array.isArray(task.dependsOn) || !Array.isArray(task.manualChecks)) problems.push(`${task.id}: missing dependency or review list.`);
    for (const dependency of task.dependsOn || []) if (!ids.has(dependency)) problems.push(`${task.id}: unknown dependency.`);
  }
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) { problems.push('Task dependency cycle.'); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of tracker.tasks.find((task) => task.id === id)?.dependsOn || []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  if (tracker.activeTask && !ids.has(tracker.activeTask)) problems.push('Unknown active task.');
  return problems;
}
export function commitMessageProblems(message) {
  return /^\s*(?:co[- ]?authored[- ]?by|co[- ]?authors?)\b/im.test(message)
    ? ['Commit messages must not contain co-author lines.'] : [];
}
export function secretFile(file) {
  const base = path.basename(file);
  return (/^\.env(?:\.|$)/.test(base) && !/\.example$/.test(base)) || /^(?:credentials|service-account(?:[-.].*)?\.json|id_rsa|id_ed25519)$/.test(base) || /\.(?:pem|p12|pfx)$/.test(base);
}
const tokenPatterns = [
  /(?:AKIA|ASIA)[A-Z0-9]{16}/,
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /AIza[A-Za-z0-9_-]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
export function hasSecret(text) { return tokenPatterns.some((pattern) => pattern.test(text)); }
export function logProblems(root, { staged = false, base = 'HEAD', target = null } = {}) {
  const problems = [];
  const oldFiles = git(root, ['ls-tree', '-r', '--name-only', '-z', base, '--', '.agent-logs']);
  if (oldFiles.status !== 0) throw new Error('Cannot read the log baseline revision.');
  const names = oldFiles.stdout.split('\0').filter(Boolean);
  for (const name of names) {
    const old = git(root, ['show', `${base}:${name}`], { encoding: null });
    let current;
    if (staged || target) {
      const revision = target ? `${target}:${name}` : `:${name}`;
      const result = git(root, ['show', revision], { encoding: null });
      if (result.status !== 0) { problems.push(`${name}: historical log deleted or renamed.`); continue; }
      const mode = target ? git(root, ['ls-tree', target, '--', name]).stdout : git(root, ['ls-files', '-s', '--', name]).stdout;
      if (!mode.startsWith('100644 ') && !mode.startsWith('100755 ')) { problems.push(`${name}: log must be a regular file.`); continue; }
      current = result.stdout;
    } else {
      const file = path.join(root, name);
      if (!fs.existsSync(file)) { problems.push(`${name}: historical log deleted or renamed.`); continue; }
      if (!fs.lstatSync(file).isFile()) { problems.push(`${name}: log must be a regular file.`); continue; }
      current = fs.readFileSync(file);
    }
    if (!current.subarray(0, old.stdout.length).equals(old.stdout)) problems.push(`${name}: existing bytes changed; only appends are permitted.`);
  }
  const ignored = git(root, ['check-ignore', '--no-index', '--stdin', '-z'], { input: [...names, '.agent-logs/__harness_probe__.md'].join('\0') + '\0' });
  if (ignored.status === 0) problems.push('.agent-logs entries must never be ignored.');
  else if (ignored.status !== 1) problems.push('Cannot verify log ignore rules.');
  return problems;
}
export function check(root, { staged = false, base = 'HEAD', target = null } = {}) {
  const problems = [];
  const config = json(root, '.harness/config.json');
  const tracker = json(root, 'docs/tasks.json');
  problems.push(...validateTasks(tracker));
  for (const doc of config.requiredDocuments) if (!fs.existsSync(path.join(root, doc))) problems.push(`Required document missing: ${doc}`);
  for (const task of tracker.tasks.filter((item) => item.status === 'verified complete')) {
    try {
      if (!task.evidence?.startsWith(`docs/evidence/${task.id}-`) || task.review !== `docs/reviews/${task.id}.json`) throw new Error();
      const evidence = fs.readFileSync(path.join(root, task.evidence));
      const report = JSON.parse(evidence);
      const reviewBytes = fs.readFileSync(path.join(root, task.review));
      const review = JSON.parse(reviewBytes);
      if (sha(evidence) !== task.evidenceHash || sha(reviewBytes) !== report.reviewHash || !report.passed || !report.sourceUnchanged || report.taskId !== task.id || report.phase !== task.phase || !report.checks?.length || report.checks.some((item) => item.exitCode !== 0 || item.errorCode)) throw new Error();
      if (task.manualChecks.some((criterion) => !review.checks?.some((item) => item.criterion === criterion && item.status === 'pass' && item.evidence?.trim()))) throw new Error();
    } catch { problems.push(`${task.id}: completed task lacks intact verification and review evidence.`); }
  }
  const known = files(root);
  const application = known.some((file) => /^apps\/(?:api|web)\//.test(file));
  if (application && tracker.tasks.some((task) => task.phase === 'application' && task.status === 'verified complete')) {
    let pkg;
    try { pkg = json(root, 'package.json'); } catch { problems.push('Verified application lacks a readable root package.json.'); }
    for (const name of config.applicationScripts) if (!pkg?.scripts?.[name]?.trim()) problems.push(`Required application script missing: ${name}`);
  }
  for (const file of known) {
    const read = staged ? git(root, ['show', `:${file}`]) : null;
    if (staged && read.status !== 0) continue;
    if (secretFile(file)) { problems.push(`Secret-bearing file cannot be tracked: ${file}`); continue; }
    if (!staged && (!fs.existsSync(path.join(root, file)) || !fs.lstatSync(path.join(root, file)).isFile())) continue;
    const bytes = staged ? read.stdout : fs.readFileSync(path.join(root, file), 'utf8');
    if (file.endsWith('package.json') && !file.startsWith('.agent-logs/')) {
      try {
        const pkg = JSON.parse(bytes);
        for (const name of ['prisma', '@prisma/client', 'zod', 'axios', '@nestjs/axios']) {
          if (pkg.dependencies?.[name] || pkg.devDependencies?.[name]) problems.push(`${file}: unapproved direct dependency ${name}.`);
        }
      } catch { problems.push(`${file}: invalid JSON.`); }
    }
    const old = git(root, ['show', `${base}:${file}`]);
    // Scan additions to logs, preserving the user's immutable historical records.
    const addition = file.startsWith('.agent-logs/') && old.status === 0 && bytes.startsWith(old.stdout) ? bytes.slice(old.stdout.length) : bytes;
    if (hasSecret(addition)) problems.push(`Possible credential detected in ${file}; value suppressed. Do not rewrite historical logs.`);
  }
  problems.push(...logProblems(root, { staged, base, target }));
  const whitespace = git(root, ['diff', '--check', ...(target ? [base, target] : staged ? ['--cached'] : [])]);
  if (whitespace.status !== 0) problems.push('Git whitespace/conflict-marker check failed.');
  return { problems: [...new Set(problems)], application };
}
export function startTask(root, id) {
  const tracker = json(root, 'docs/tasks.json');
  const task = tracker.tasks.find((item) => item.id === id);
  if (!task) throw new Error('Unknown task.');
  if (tracker.activeTask && tracker.activeTask !== id) {
    const active = tracker.tasks.find((item) => item.id === tracker.activeTask);
    if (active?.status === 'in progress') throw new Error('Finish or mark the active task blocked/unverified before switching.');
  }
  for (const dependency of task.dependsOn) if (tracker.tasks.find((item) => item.id === dependency)?.status !== 'verified complete') throw new Error(`Dependency is not verified: ${dependency}`);
  task.status = 'in progress';
  tracker.activeTask = id;
  writeJson(path.join(root, 'docs/tasks.json'), tracker);
}
export function verificationCommands(root, phase) {
  const config = json(root, '.harness/config.json');
  const commands = [...config.harnessChecks];
  if (phase === 'application') {
    if (!fs.existsSync(path.join(root, 'package.json'))) throw new Error('Application has not been scaffolded; application verification cannot pass.');
    commands.push(...config.applicationScripts.map((name) => ['pnpm', name]));
  }
  return commands;
}
export function verify(root, id) {
  const tracker = json(root, 'docs/tasks.json');
  const task = tracker.tasks.find((item) => item.id === id);
  if (!task) throw new Error('Unknown task.');
  const config = json(root, '.harness/config.json');
  const commands = verificationCommands(root, task.phase);
  const before = snapshot(root);
  const checks = [];
  for (const command of commands) {
    const started = Date.now();
    const result = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: config.commandTimeoutMs });
    checks.push({ command, exitCode: result.status, signal: result.signal, durationMs: Date.now() - started, errorCode: result.error?.code || null });
    if (result.status !== 0 || result.error) break;
  }
  const after = snapshot(root);
  const report = {
    version: 1, id: crypto.randomUUID(), taskId: id, phase: task.phase,
    createdAt: new Date().toISOString(), commit: git(root, ['rev-parse', 'HEAD']).stdout.trim(),
    sourceFingerprint: after, sourceUnchanged: before === after,
    passed: before === after && checks.length === commands.length && checks.every((item) => item.exitCode === 0 && !item.errorCode), checks,
  };
  const file = path.join(root, '.harness/runs', `${report.id}.json`);
  writeJson(file, report);
  return { report, file };
}
export function finishTask(root, id, evidence) {
  const tracker = json(root, 'docs/tasks.json');
  const task = tracker.tasks.find((item) => item.id === id);
  if (!task || tracker.activeTask !== id || task.status !== 'in progress') throw new Error('Start this task before marking it complete.');
  const evidencePath = path.resolve(root, evidence);
  if (path.dirname(evidencePath) !== path.join(root, '.harness/runs')) throw new Error('Use a verification report from .harness/runs.');
  const report = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const expected = verificationCommands(root, task.phase);
  if (!report.passed || !report.sourceUnchanged || report.taskId !== id || report.phase !== task.phase || report.sourceFingerprint !== snapshot(root)) throw new Error('Evidence is failing, for a different task, or stale. Run verification again.');
  if (JSON.stringify(report.checks.map((item) => item.command)) !== JSON.stringify(expected) || report.checks.some((item) => item.exitCode !== 0 || item.errorCode)) throw new Error('Required verification checks are absent or failed.');
  const review = json(root, `docs/reviews/${id}.json`);
  for (const criterion of task.manualChecks) {
    const item = review.checks?.find((entry) => entry.criterion === criterion);
    if (item?.status !== 'pass' || !item.evidence?.trim()) throw new Error(`Manual evidence is missing: ${criterion}`);
  }
  const committedEvidence = `docs/evidence/${id}-${report.id}.json`;
  report.reviewHash = sha(fs.readFileSync(path.join(root, `docs/reviews/${id}.json`)));
  writeJson(path.join(root, committedEvidence), report);
  task.evidenceHash = sha(fs.readFileSync(path.join(root, committedEvidence)));
  task.status = 'verified complete';
  task.evidence = committedEvidence;
  task.review = `docs/reviews/${id}.json`;
  tracker.activeTask = null;
  writeJson(path.join(root, 'docs/tasks.json'), tracker);
  return committedEvidence;
}
