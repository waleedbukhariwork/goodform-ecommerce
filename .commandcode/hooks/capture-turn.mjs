#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const textOf = (message) => typeof message?.content === 'string' ? message.content : (message?.content || []).filter((item) => item?.type === 'text').map((item) => item.text).join('\n');
const stamp = (iso) => iso.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2}).*$/, '$1_$2-$3-$4');
const failure = (code) => { throw new Error(code); };

export function completedTurns(entries, sessionId) {
  const byId = new Map(entries.filter((item) => item.id).map((item) => [item.id, item]));
  const active = [];
  const seen = new Set();
  let current = entries.at(-1);
  while (current) {
    if (seen.has(current)) failure('TRANSCRIPT_CYCLE');
    seen.add(current); active.push(current);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  active.reverse();
  const turns = [];
  let turn;
  let model = '';
  for (const entry of active) {
    if (entry.model) model = entry.model;
    if (entry.type !== 'message') continue;
    const text = textOf(entry.message);
    if (entry.message?.role === 'user' && text) {
      turn = { prompt: text, promptTs: entry.timestamp, promptId: entry.id, promptModel: model };
      turns.push(turn);
    } else if (entry.message?.role === 'assistant' && turn && text) {
      Object.assign(turn, { response: text, responseTs: entry.timestamp, responseId: entry.id, responseModel: entry.model || entry.message.model || model });
    }
  }
  return turns.filter((item) => item.response !== undefined).map((item) => ({ ...item,
    recordId: hash(JSON.stringify([sessionId, item.promptId || [item.promptTs, item.prompt], item.responseId || [item.responseTs, item.response]])),
  }));
}

export async function captureTurn(payload, root = process.env.COMMANDCODE_PROJECT_DIR || payload.cwd || process.cwd()) {
  const sessionId = payload.session_id || process.env.COMMANDCODE_SESSION_ID || '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId) || !payload.transcript_path) failure('INVALID_CAPTURE_PAYLOAD');
  const transcript = fs.statSync(payload.transcript_path);
  if (!transcript.isFile() || transcript.size > 128 * 1024 * 1024) failure('INVALID_TRANSCRIPT_FILE');
  const entries = fs.readFileSync(payload.transcript_path, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
  const turns = completedTurns(entries, sessionId);
  if (!turns.length) return { appended: 0 };
  const started = entries.find((entry) => entry.type === 'session')?.timestamp || turns[0].promptTs;
  if (typeof started !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(started)) failure('MISSING_SESSION_TIMESTAMP');
  for (const turn of turns) if (!turn.promptTs || !turn.responseTs) failure('MISSING_TURN_TIMESTAMP');
  const logDir = path.join(root, '.agent-logs');
  const stateDir = path.join(root, '.commandcode/.capture-state');
  for (const dir of [logDir, stateDir]) {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.lstatSync(dir).isSymbolicLink()) failure('SYMLINK_CAPTURE_DIRECTORY');
  }
  const lock = path.join(stateDir, `${sessionId}.lock`);
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { fs.mkdirSync(lock); acquired = true; break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; await new Promise((resolve) => setTimeout(resolve, 20)); }
  }
  if (!acquired) failure('CAPTURE_LOCK_BUSY');
  try {
    const matches = fs.readdirSync(logDir).filter((name) => name.endsWith(`_${sessionId}.md`));
    if (matches.length > 1) failure('AMBIGUOUS_SESSION_LOG');
    const logFile = path.join(logDir, matches[0] || `${stamp(started)}_${sessionId}.md`);
    if (fs.existsSync(logFile) && !fs.lstatSync(logFile).isFile()) failure('INVALID_LOG_FILE');
    const existing = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    if (existing && (existing.includes('capture_format: append-only-v2') || /^\[CAPTURE_MIGRATION /m.test(existing)) && !/\[CAPTURE_(?:RECORD id=[a-f0-9]{64}|MIGRATION ids=[a-f0-9,]* count=\d+)\]\n$/.test(existing)) failure('INCOMPLETE_CAPTURE_TAIL');
    const records = [...existing.matchAll(/^\[CAPTURE_RECORD id=([a-f0-9]{64})\]$/gm)].map((match) => match[1]);
    const seen = new Set(records);
    let suffix = '';
    const migration = existing.match(/^\[CAPTURE_MIGRATION ids=([a-f0-9,]*) count=(\d+)\]$/m);
    let legacyCount = 0;
    if (migration) {
      legacyCount = Number(migration[2]);
      migration[1].split(',').filter(Boolean).forEach((id) => seen.add(id));
    } else if (existing && !existing.includes('capture_format: append-only-v2')) {
      const frontmatter = existing.match(/^---\n([\s\S]*?)\n---\n/);
      const count = frontmatter?.[1].match(/^total_exchanges: (\d+)$/m);
      if (!count) failure('LEGACY_COUNT_UNAVAILABLE');
      legacyCount = Number(count[1]);
      if (turns.length < legacyCount) failure('LEGACY_BRANCH_AMBIGUOUS');
      const ids = turns.slice(0, legacyCount).map((turn) => turn.recordId);
      ids.forEach((id) => seen.add(id));
      suffix += `\n[CAPTURE_MIGRATION ids=${ids.join(',')} count=${legacyCount}]\n`;
    }
    if (!existing) {
      const configFile = path.join(root, '.commandcode/hooks/capture-config.json');
      const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
      suffix += `---\nsession_id: ${JSON.stringify(sessionId)}\ndate: ${started.slice(0, 10)}\nauthor: ${JSON.stringify(config.author || 'unknown')}\ntool: ${JSON.stringify(config.tool || 'command-code')}\nproject: ${JSON.stringify(config.project || path.basename(root))}\ncapture_format: append-only-v2\n---\n\n# Session Log - ${started.slice(0, 10)}\n`;
    }
    let appended = 0;
    for (const turn of turns) {
      if (seen.has(turn.recordId)) continue;
      const num = legacyCount + records.length + appended + 1;
      const short = sessionId.slice(0, 8);
      suffix += `\n[LOG_ENTRY type=PROMPT num=${num} session=${short}]\ntimestamp: ${turn.promptTs}\nmodel: ${turn.promptModel || turn.responseModel || 'unknown'}\n\n${turn.prompt}\n\n\n`;
      suffix += `[LOG_ENTRY type=RESPONSE num=${num} session=${short}]\ntimestamp: ${turn.responseTs}\nmodel: ${turn.responseModel || turn.promptModel || 'unknown'}\n\n${turn.response}\n\n[CAPTURE_RECORD id=${turn.recordId}]\n`;
      seen.add(turn.recordId); appended++;
    }
    if (suffix) {
      const fd = fs.openSync(logFile, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
      try { fs.writeFileSync(fd, suffix); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    }
    return { appended, logFile };
  } finally { fs.rmdirSync(lock); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  try { await captureTurn(JSON.parse(input || '{}')); }
  catch { console.log(JSON.stringify({ systemMessage: 'Transcript capture failed. Inspect the capture hook with a synthetic fixture; do not alter existing logs.' })); }
}
