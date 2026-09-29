import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { capture, extract } from './codex.mjs';

const time = '2026-09-29T03:00:00.000Z';
function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-capture-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.commandcode/hooks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.commandcode/hooks/capture-config.json'), JSON.stringify({ author: 'fixture', project: 'fixture' }));
  const row = (type, payload) => ({ timestamp: time, type, payload });
  const entries = [row('session_meta', { id: 'session-1', timestamp: time, cwd: root, source: 'vscode' }),
    row('event_msg', { type: 'task_started', turn_id: 'turn-1' }),
    row('turn_context', { turn_id: 'turn-1', model: 'model-one' }),
    row('event_msg', { type: 'user_message', message: 'CAPTURE TEST — 8x assignment, fixture\n\nExact spacing:  café  ' }),
    row('event_msg', { type: 'agent_message', phase: 'commentary', message: 'INTERMEDIATE_NOT_FOR_LOG' }),
    row('response_item', { type: 'reasoning', content: 'REASONING_NOT_FOR_LOG' }),
    row('response_item', { type: 'function_call_output', output: 'TOOL_NOT_FOR_LOG' }),
    row('event_msg', { type: 'agent_message', phase: 'final_answer', delivery: 'async', message: 'ASYNC_NOT_FOR_LOG' }),
    row('event_msg', { type: 'agent_message', phase: 'final_answer', message: 'A complete final.\nEven if incorrect.' }),
    row('event_msg', { type: 'task_complete', turn_id: 'turn-1', last_agent_message: 'NEVER_INFER_FINAL_FROM_THIS' })];
  const transcript = path.join(root, 'transcript.jsonl');
  const save = () => fs.writeFileSync(transcript, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
  save();
  return { root, entries, transcript, save, row };
}
test('extracts exact prompts and finals, excluding reasoning, tools, commentary and async delivery', (t) => {
  const { root, transcript } = setup(t);
  const parsed = extract(fs.readFileSync(transcript, 'utf8'), root);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].text, 'CAPTURE TEST — 8x assignment, fixture\n\nExact spacing:  café  ');
  assert.equal(parsed.records[1].text, 'A complete final.\nEven if incorrect.');
  assert.equal(parsed.session.tool, 'codex-vscode');
});
test('append-only recovery is idempotent and captures model switches without rewriting old bytes', async (t) => {
  const f = setup(t); const first = await capture(f.root, f.transcript);
  const before = fs.readFileSync(first.logFile);
  assert.equal((await capture(f.root, f.transcript)).appended, 0);
  f.entries.push(f.row('event_msg', { type: 'task_started', turn_id: 'turn-2' }), f.row('turn_context', { turn_id: 'turn-2', model: 'model-two' }),
    f.row('event_msg', { type: 'user_message', message: 'Second question' }), f.row('event_msg', { type: 'agent_message', phase: 'final_answer', message: 'Second answer' }));
  f.save(); assert.equal((await capture(f.root, f.transcript)).appended, 2);
  const after = fs.readFileSync(first.logFile); assert.ok(after.subarray(0, before.length).equals(before));
  assert.ok(after.toString().includes('model: model-two'));
});
test('unfinished turns keep prompts and never mislabel last commentary as a final', (t) => {
  const f = setup(t); f.entries.splice(8, 1); f.save();
  assert.deepEqual(extract(fs.readFileSync(f.transcript, 'utf8'), f.root).records.map((record) => record.kind), ['PROMPT']);
});
test('wrong workspace and subagent transcripts are rejected', (t) => {
  const f = setup(t);
  assert.throws(() => extract(fs.readFileSync(f.transcript, 'utf8'), '/another-project'), /OTHER_WORKSPACE/);
  f.entries[0].payload.source = { subagent: {} }; f.save();
  assert.throws(() => extract(fs.readFileSync(f.transcript, 'utf8'), f.root), /SUBAGENT/);
});
test('partial final JSON is deferred; malformed complete records fail without changing logs', async (t) => {
  const f = setup(t); const first = await capture(f.root, f.transcript); const before = fs.readFileSync(first.logFile);
  fs.appendFileSync(f.transcript, '{"partial":');
  assert.equal((await capture(f.root, f.transcript)).appended, 0);
  fs.appendFileSync(f.transcript, '\n');
  await assert.rejects(capture(f.root, f.transcript)); assert.deepEqual(fs.readFileSync(first.logFile), before);
});
test('hook fallback survives later transcript flush without duplicate records', async (t) => {
  const f = setup(t); const response = f.entries.splice(8, 1)[0]; f.save();
  const payload = { hook_event_name: 'Stop', session_id: 'session-1', turn_id: 'turn-1', model: 'model-one', last_assistant_message: response.payload.message };
  const first = await capture(f.root, f.transcript, payload);
  f.entries.push(response); f.save();
  assert.equal((await capture(f.root, f.transcript)).appended, 0);
  assert.equal((fs.readFileSync(first.logFile, 'utf8').match(/type=RESPONSE/g) || []).length, 1);
});
test('repeated identical text in distinct real turns is retained', (t) => {
  const f = setup(t); const prompt = f.entries[3];
  f.entries.push(f.row('event_msg', { type: 'task_started', turn_id: 'turn-2' }), f.row('turn_context', { turn_id: 'turn-2', model: 'model-one' }), prompt); f.save();
  const parsed = extract(fs.readFileSync(f.transcript, 'utf8'), f.root);
  assert.equal(parsed.records.filter((record) => record.kind === 'PROMPT').length, 2);
  assert.notEqual(parsed.records[0].key, parsed.records[2].key);
});
test('concurrent hook calls append each record once', async (t) => {
  const f = setup(t); const results = await Promise.all([capture(f.root, f.transcript), capture(f.root, f.transcript)]);
  assert.equal(results.reduce((total, result) => total + result.appended, 0), 2);
});
test('source mutation and incomplete log tails fail visibly without repairing history', async (t) => {
  const f = setup(t); const first = await capture(f.root, f.transcript); const before = fs.readFileSync(first.logFile);
  f.entries[3].payload.message = 'changed'; f.save();
  await assert.rejects(capture(f.root, f.transcript), /CAPTURE_SOURCE_CHANGED/);
  assert.deepEqual(fs.readFileSync(first.logFile), before);
  fs.appendFileSync(first.logFile, '\npartial');
  await assert.rejects(capture(f.root, f.transcript), /INCOMPLETE_CAPTURE_TAIL/);
});
test('new session uses a separate file and missing model metadata is rejected', async (t) => {
  const f = setup(t); const first = await capture(f.root, f.transcript);
  f.entries[0].payload.id = 'session-2'; f.save();
  const second = await capture(f.root, f.transcript); assert.notEqual(first.logFile, second.logFile);
  f.entries[2].payload.model = null; f.save();
  await assert.rejects(capture(f.root, f.transcript), /UNSUPPORTED_MESSAGE_METADATA/);
});
