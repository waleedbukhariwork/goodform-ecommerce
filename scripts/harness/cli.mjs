#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { check, commitMessageProblems, finishTask, git, json, startTask, verify, writeJson, statuses } from './lib.mjs';

const rootResult = git(process.cwd(), ['rev-parse', '--show-toplevel']);
const root = rootResult.stdout?.trim();
const [command, ...args] = process.argv.slice(2);
try {
  if (!root || rootResult.status !== 0) throw new Error('Run inside the repository.');
  if (command === 'check' || command === 'ci') {
    let options = { staged: args.includes('--staged') };
    if (command === 'ci') {
      let base = process.env.HARNESS_BASE;
      if (!base || /^0+$/.test(base)) base = git(root, ['rev-parse', 'HEAD^']).stdout.trim();
      if (!/^[0-9a-f]{40}$/.test(base || '') || git(root, ['cat-file', '-e', `${base}^{commit}`]).status !== 0) throw new Error('CI requires an available baseline commit and full checkout history.');
      options = { base, target: 'HEAD' };
      const messages = git(root, ['log', '--format=%B%x00', `${base}..HEAD`]);
      if (messages.status !== 0 || messages.stdout.split('\0').some((message) => commitMessageProblems(message).length)) throw new Error('Commit message policy failed.');
    }
    const result = check(root, options);
    if (result.problems.length) throw new Error(result.problems.join('\n'));
    console.log(`Repository checks passed. Application checks: ${result.application ? 'required by application verification' : 'not available: application not scaffolded'}.`);
  } else if (command === 'verify') {
    const id = args[0] || json(root, 'docs/tasks.json').activeTask;
    const { report, file } = verify(root, id);
    for (const item of report.checks) console.log(`${item.exitCode === 0 ? 'PASS' : 'FAIL'} ${item.command.join(' ')} (${item.durationMs}ms)`);
    console.log(`Evidence: ${path.relative(root, file)}`);
    console.log(`Source unchanged during checks: ${report.sourceUnchanged}`);
    process.exitCode = report.passed ? 0 : 1;
  } else if (command === 'task') {
    const [action, id, value] = args;
    if (action === 'start') startTask(root, id);
    else if (action === 'finish') console.log(`Evidence saved for commit: ${finishTask(root, id, value)}`);
    else if (action === 'status') {
      if (!['blocked', 'implemented but unverified', 'in progress'].includes(value)) throw new Error(`Use start/finish for lifecycle transitions. Statuses: ${statuses.join(', ')}`);
      const tracker = json(root, 'docs/tasks.json');
      const task = tracker.tasks.find((item) => item.id === id);
      if (!task) throw new Error('Unknown task.');
      if (value === 'in progress') startTask(root, id);
      else { task.status = value; writeJson(path.join(root, 'docs/tasks.json'), tracker); }
    } else throw new Error('Use task start ID, task status ID STATUS, or task finish ID REPORT.');
    console.log(`Task ${id}: ${json(root, 'docs/tasks.json').tasks.find((item) => item.id === id)?.status}`);
  } else if (command === 'commit-msg') {
    const problems = commitMessageProblems(fs.readFileSync(args[0], 'utf8'));
    if (problems.length) throw new Error(problems.join('\n'));
  } else if (command === 'install') {
    const existing = git(root, ['config', '--local', '--get', 'core.hooksPath']).stdout.trim();
    if (existing && existing !== '.githooks') throw new Error('Existing Git hooks path detected; compose it explicitly instead of overwriting.');
    const result = git(root, ['config', '--local', 'core.hooksPath', '.githooks']);
    if (result.status !== 0) throw new Error('Cannot install local Git hook configuration.');
    console.log('Local Git hooks installed. Restart Command Code to load project session hooks.');
  } else if (command === 'doctor') {
    const tracker = json(root, 'docs/tasks.json');
    const config = json(root, '.harness/config.json');
    console.log(JSON.stringify({ node: process.version, node24OrNewer: Number(process.versions.node.split('.')[0]) >= 24,
      gitHooksInstalled: git(root, ['config', '--get', 'core.hooksPath']).stdout.trim() === '.githooks',
      activeTask: tracker.activeTask, tasks: tracker.tasks.map(({ id, status }) => ({ id, status })),
      applicationScaffolded: fs.existsSync(path.join(root, 'apps/api/package.json')),
      requiredApplicationChecks: config.applicationScripts,
      remoteCI: 'not verified by doctor', remoteDeployment: 'not verified by doctor',
    }, null, 2));
  } else throw new Error('Commands: doctor, install, check [--staged], verify [TASK], task start/status/finish, commit-msg FILE, ci.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
