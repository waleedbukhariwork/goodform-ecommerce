#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDirectory = fileURLToPath(new URL('../../', import.meta.url));
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const utc = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('INVALID_UTC_TIMESTAMP');
  return value;
};

export function extract(text, root) {
  const lines = text.split('\n');
  if (lines.at(-1)) lines.pop(); // An active transcript may end in a partially flushed JSON record.
  const entries = lines.filter(Boolean).map((line) => JSON.parse(line));
  const metadata = entries.find((entry) => entry.type === 'session_meta')?.payload;
  if (!metadata || !validId(metadata.id || metadata.session_id)) throw new Error('INVALID_SESSION_METADATA');
  if (path.resolve(metadata.cwd) !== path.resolve(root)) throw new Error('OTHER_WORKSPACE');
  if (typeof metadata.source === 'object' || metadata.thread_source === 'subagent') throw new Error('SUBAGENT_TRANSCRIPT');
  const session = { id: metadata.id || metadata.session_id, timestamp: utc(metadata.timestamp), tool: metadata.source === 'vscode' ? 'codex-vscode' : 'codex-cli' };
  const records = [];
  let turnId;
  let model;
  let promptNumber = 0;
  const ordinals = new Map();
  for (const entry of entries) {
    const item = entry.payload;
    if (entry.type === 'turn_context') {
      turnId = item.turn_id || turnId;
      model = item.model;
    }
    if (entry.type !== 'event_msg') continue;
    if (item.type === 'task_started') { turnId = item.turn_id; model = undefined; }
    const cliItem = session.tool === 'codex-cli' && item.type === 'item_completed' ? item.item : null;
    const kind = cliItem?.type === 'UserMessage' || item.type === 'user_message' ? 'PROMPT'
      : cliItem?.type === 'AgentMessage' && cliItem.phase === 'final_answer'
        || item.type === 'agent_message' && item.phase === 'final_answer' && item.delivery !== 'async' ? 'RESPONSE' : null;
    if (!kind) continue;
    const message = cliItem ? cliItem.content?.filter((part) => ['text', 'Text'].includes(part.type)).map((part) => part.text).join('\n') : item.message;
    if (!validId(turnId) || typeof model !== 'string' || !model || typeof message !== 'string') throw new Error('UNSUPPORTED_MESSAGE_METADATA');
    if (kind === 'PROMPT') promptNumber++;
    if (!promptNumber) throw new Error('RESPONSE_WITHOUT_PROMPT');
    const ordinalKey = `${turnId}:${kind}`;
    const ordinal = (ordinals.get(ordinalKey) || 0) + 1;
    ordinals.set(ordinalKey, ordinal);
    records.push({ key: `${ordinalKey}:${ordinal}`, kind, number: promptNumber, timestamp: utc(entry.timestamp), model, text: message, turnId });
  }
  return { session, records, turnId, model };
}

export function withHookRecord(parsed, payload, now = new Date().toISOString()) {
  const kind = payload.hook_event_name === 'UserPromptSubmit' ? 'PROMPT' : payload.hook_event_name === 'Stop' ? 'RESPONSE' : null;
  if (!kind) return parsed;
  const text = kind === 'PROMPT' ? payload.prompt : payload.last_assistant_message;
  if (typeof text !== 'string') {
    if (kind === 'RESPONSE' && parsed.records.some((item) => item.turnId === payload.turn_id && item.kind === 'RESPONSE')) return parsed;
    throw new Error('HOOK_MESSAGE_UNAVAILABLE');
  }
  if (!validId(payload.turn_id) || typeof payload.model !== 'string' || !payload.model) throw new Error('INVALID_HOOK_METADATA');
  const matching = parsed.records.filter((item) => item.turnId === payload.turn_id && item.kind === kind);
  if (matching.at(-1)?.text === text) return parsed;
  if (payload.stop_hook_active) return parsed; // A hook continuation is not a new human request.
  const promptNumber = parsed.records.filter((item) => item.kind === 'PROMPT').length + (kind === 'PROMPT' ? 1 : 0);
  if (!promptNumber) throw new Error('RESPONSE_WITHOUT_PROMPT');
  parsed.records.push({ key: `${payload.turn_id}:${kind}:${matching.length + 1}`, kind, number: promptNumber,
    timestamp: utc(now), timestampSource: 'hook-observed', model: payload.model, text, turnId: payload.turn_id });
  return parsed;
}

export async function appendCapture(root, parsed) {
  const { session, records } = parsed;
  if (!records.length) return { appended: 0 };
  const logDir = path.join(root, '.agent-logs');
  const stateDir = path.join(root, '.commandcode/.capture-state');
  for (const directory of [logDir, stateDir]) {
    fs.mkdirSync(directory, { recursive: true });
    if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) throw new Error('UNSAFE_CAPTURE_DIRECTORY');
  }
  const lock = path.join(stateDir, `codex-${session.id}.lock`);
  let acquired = false;
  for (let i = 0; i < 100; i++) {
    try { fs.mkdirSync(lock); acquired = true; break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; await new Promise((resolve) => setTimeout(resolve, 20)); }
  }
  if (!acquired) throw new Error('CAPTURE_LOCK_BUSY');
  try {
    const stamp = session.timestamp.slice(0, 19).replace('T', '_').replaceAll(':', '-');
    const logFile = path.join(logDir, `${stamp}_${session.id}.md`);
    if (fs.existsSync(logFile) && (!fs.lstatSync(logFile).isFile() || fs.lstatSync(logFile).isSymbolicLink())) throw new Error('UNSAFE_LOG_FILE');
    const existing = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    if (existing && !existing.includes('capture_format: codex-append-only-v1')) throw new Error('EXISTING_LOG_FORMAT_MISMATCH');
    if (existing && !/^\[CAPTURE_METADATA total_exchanges=\d+ last_prompt_time=\S+\]\n$/.test(existing.slice(existing.lastIndexOf('[CAPTURE_METADATA ')))) throw new Error('INCOMPLETE_CAPTURE_TAIL');
    const seen = new Map([...existing.matchAll(/^\[CODEX_CAPTURE id=([a-f0-9]{64}) content=([a-f0-9]{64})\]$/gm)].map((match) => [match[1], match[2]]));
    let suffix = '';
    let appended = 0;
    const prompts = records.filter((record) => record.kind === 'PROMPT');
    if (!existing) {
      const config = JSON.parse(fs.readFileSync(path.join(root, '.commandcode/hooks/capture-config.json'), 'utf8'));
      suffix = `---\nsession_id: ${session.id}\ndate: ${session.timestamp.slice(0, 10)}\nauthor: ${JSON.stringify(config.author)}\nmodel: ${JSON.stringify(records[0].model)}\ntool: ${session.tool}\nproject: ${JSON.stringify(config.project)}\ntotal_exchanges: ${prompts.length}\nfirst_prompt_time: ${prompts[0]?.timestamp || session.timestamp}\nlast_prompt_time: ${prompts.at(-1)?.timestamp || session.timestamp}\ncapture_format: codex-append-only-v1\ncaptured_at: ${new Date().toISOString()}\n---\n\n# Session Log - ${session.timestamp.slice(0, 10)}\n\nSession: \`${session.id.slice(0, 8)}\` | Project: \`${config.project}\` | Author: \`${config.author}\`\n\n---\n`;
    }
    for (const record of records) {
      let id = digest(`${session.id}:${record.key}`);
      const content = digest(JSON.stringify([record.kind, record.model, record.text]));
      if (seen.has(id)) {
        if (seen.get(id) === content) continue;
        const emptyCliResponse = digest(JSON.stringify(['RESPONSE', record.model, '']));
        if (record.kind !== 'RESPONSE' || seen.get(id) !== emptyCliResponse) throw new Error('CAPTURE_SOURCE_CHANGED');
        if ([...seen.values()].includes(content)) continue;
        const originalId = id;
        id = digest(`${session.id}:${record.key}:correct-empty-cli-response`);
        if (seen.has(id)) {
          if (seen.get(id) !== content) throw new Error('CAPTURE_SOURCE_CHANGED');
          continue;
        }
        suffix += `\n[CAPTURE_CORRECTION prior_record_id=${originalId} reason=empty-cli-content]\n`;
      }
      suffix += `\n[LOG_ENTRY type=${record.kind} num=${record.number} session=${session.id.slice(0, 8)}]\ntimestamp: ${record.timestamp}\nmodel: ${record.model}\n${record.timestampSource ? `timestamp_source: ${record.timestampSource}\n` : ''}\n${record.text}\n\n[CODEX_CAPTURE id=${id} content=${content}]\n`;
      seen.set(id, content); appended++;
    }
    if (!appended) return { appended: 0, logFile };
    suffix += `\n[CAPTURE_METADATA total_exchanges=${prompts.length} last_prompt_time=${prompts.at(-1)?.timestamp || session.timestamp}]\n`;
    const descriptor = fs.openSync(logFile, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(descriptor, suffix); fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
    return { appended, logFile };
  } finally { fs.rmdirSync(lock); }
}

export async function capture(root, transcriptPath, payload) {
  const stat = fs.statSync(transcriptPath);
  if (!stat.isFile() || stat.size > 256 * 1024 * 1024) throw new Error('INVALID_TRANSCRIPT');
  const parsed = extract(fs.readFileSync(transcriptPath, 'utf8'), root);
  if (payload && payload.session_id !== parsed.session.id) throw new Error('SESSION_MISMATCH');
  if (payload) withHookRecord(parsed, payload);
  return appendCapture(root, parsed);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const command = process.argv[2];
  try {
    if (command === 'recover') console.log(JSON.stringify(await capture(rootDirectory, process.argv[3])));
    else if (command === 'hook') {
      let input = '';
      for await (const chunk of process.stdin) input += chunk;
      const payload = JSON.parse(input);
      if (path.resolve(payload.cwd) !== path.resolve(rootDirectory)) throw new Error('OTHER_WORKSPACE');
      await capture(rootDirectory, payload.transcript_path, payload);
      console.log(JSON.stringify({}));
    } else throw new Error('Use hook or recover TRANSCRIPT_PATH.');
  } catch (error) {
    const code = /^[A-Z_]+$/.test(error.message) ? error.message : 'CAPTURE_IO_OR_FORMAT_ERROR';
    console.error(`Codex capture failed: ${code}. Stop assignment work and diagnose; never rewrite existing logs.`);
    process.exitCode = 2;
  }
}
