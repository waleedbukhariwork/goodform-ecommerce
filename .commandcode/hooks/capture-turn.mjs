#!/usr/bin/env node
// Stop-hook capture for the 8x assignment.
// Reads the hook payload on stdin, extracts prompt/final-response pairs from the
// session transcript, and appends them (append-only, verbatim) to .agent-logs/.
// Never prints to stdout and always exits 0 so it cannot interfere with the session.

import fs from "node:fs";
import path from "node:path";

const readStdin = () =>
  new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 10000).unref();
  });

const textOf = (msg) =>
  (msg?.content || [])
    .filter((c) => c?.type === "text" && typeof c.text === "string" && c.text.length > 0)
    .map((c) => c.text)
    .join("\n");

function fileStamp(iso) {
  return iso.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2}).*$/, "$1_$2-$3-$4");
}

async function main() {
  const raw = await readStdin();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {}

  const sessionId = payload.session_id || process.env.COMMANDCODE_SESSION_ID || "";
  const transcriptPath = payload.transcript_path || "";
  const projectDir =
    process.env.COMMANDCODE_PROJECT_DIR || payload.cwd || process.cwd();
  if (!sessionId || !transcriptPath || !fs.existsSync(transcriptPath)) return;

  let config = {};
  try {
    config = JSON.parse(
      fs.readFileSync(
        path.join(projectDir, ".commandcode/hooks/capture-config.json"),
        "utf8"
      )
    );
  } catch {}
  const author = config.author || "unknown";
  const tool = config.tool || "command-code";
  const project = config.project || path.basename(projectDir);

  // Parse transcript JSONL (skip corrupt lines).
  const entries = [];
  for (const line of fs.readFileSync(transcriptPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {}
  }
  if (!entries.length) return;

  const sessionHeader = entries.find((e) => e.type === "session");

  // Rebuild the active branch: walk parentId chain back from the newest entry.
  const byId = new Map();
  for (const e of entries) if (e.id) byId.set(e.id, e);
  const active = [];
  let cur = entries[entries.length - 1];
  const seen = new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    active.push(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  active.reverse();

  // Build turns: a real user prompt is a user message containing text content
  // (tool_result-only user messages are not prompts). The final response is the
  // last assistant text in that turn.
  const turns = [];
  let current = null;
  let currentModel = "";
  for (const e of active) {
    if (e.type === "model_change" && e.model) currentModel = e.model;
    if (e.type !== "message") continue;
    if (e.model) currentModel = e.model;
    const role = e.message?.role;
    const text = textOf(e.message);
    if (role === "user" && text) {
      current = {
        prompt: text,
        promptTs: e.timestamp,
        promptModel: e.model || currentModel,
        response: null,
        responseTs: null,
        responseModel: "",
      };
      turns.push(current);
    } else if (role === "assistant" && current && text) {
      current.response = text;
      current.responseTs = e.timestamp;
      current.responseModel = e.model || current.promptModel;
    }
  }
  const completed = turns.filter((t) => t.response !== null);
  if (!completed.length) return;

  const logDir = path.join(projectDir, ".agent-logs");
  fs.mkdirSync(logDir, { recursive: true });
  const startIso = sessionHeader?.timestamp || completed[0].promptTs;
  const logFile = path.join(
    logDir,
    `${fileStamp(startIso)}_${sessionId}.md`
  );

  const shortId = sessionId.slice(0, 8);
  const stateDir = path.join(projectDir, ".commandcode", ".capture-state");
  const stateFile = path.join(stateDir, `${sessionId}.json`);
  let body = "";
  let logged = 0;
  if (fs.existsSync(stateFile)) {
    try {
      logged = JSON.parse(fs.readFileSync(stateFile, "utf8")).turnsCaptured || 0;
    } catch {}
  }
  if (fs.existsSync(logFile)) {
    const existing = fs.readFileSync(logFile, "utf8");
    // Strip old frontmatter; keep the body verbatim.
    const m = existing.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    body = m ? m[1] : existing;
    if (!fs.existsSync(stateFile)) {
      const re = new RegExp(
        `^\\[LOG_ENTRY type=PROMPT num=(\\d+) session=${shortId}\\]`,
        "gm"
      );
      for (const n of existing.matchAll(re)) {
        logged = Math.max(logged, parseInt(n[1], 10));
      }
    }
  }

  let appended = 0;
  for (let i = logged; i < completed.length; i++) {
    const t = completed[i];
    const num = i + 1;
    body += `\n[LOG_ENTRY type=PROMPT num=${num} session=${shortId}]\n`;
    body += `timestamp: ${t.promptTs}\n`;
    body += `model: ${t.promptModel || t.responseModel}\n\n`;
    body += `${t.prompt}\n\n\n`;
    body += `[LOG_ENTRY type=RESPONSE num=${num} session=${shortId}]\n`;
    body += `timestamp: ${t.responseTs}\n`;
    body += `model: ${t.responseModel}\n\n`;
    body += `${t.response}\n\n`;
    appended++;
  }
  if (!appended && logged >= completed.length && fs.existsSync(logFile)) {
    // Still refresh frontmatter counters below only when something changed.
    if (completed.length === logged) {
      const lastPrompt = completed[completed.length - 1]?.promptTs;
      if (fs.readFileSync(logFile, "utf8").includes(`last_prompt_time: ${lastPrompt}`))
        return;
    }
  }

  const firstPrompt = completed[0].promptTs;
  const lastPrompt = completed[completed.length - 1].promptTs;
  const lastModel =
    completed[completed.length - 1].responseModel ||
    completed[completed.length - 1].promptModel;
  const frontmatter = [
    "---",
    `session_id: ${sessionId}`,
    `date: ${startIso.slice(0, 10)}`,
    `author: ${author}`,
    `model: ${lastModel}`,
    `tool: ${tool}`,
    `project: ${project}`,
    `total_exchanges: ${completed.length}`,
    `first_prompt_time: ${firstPrompt}`,
    `last_prompt_time: ${lastPrompt}`,
    "---",
    "",
  ].join("\n");

  if (!fs.existsSync(logFile) || logged === 0) {
    const header = [
      `# Session Log - ${startIso.slice(0, 10)}`,
      "",
      `Session: \`${shortId}\` | Project: \`${project}\` | Author: \`${author}\``,
      "",
      "---",
      "",
    ].join("\n");
    fs.writeFileSync(logFile, frontmatter + "\n" + header + body);
  } else {
    fs.writeFileSync(logFile, frontmatter + body);
  }

  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    stateFile,
    JSON.stringify({ turnsCaptured: completed.length, logFile }, null, 2)
  );
}

main().catch(() => {});
process.on("uncaughtException", () => process.exit(0));
