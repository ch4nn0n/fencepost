import type { AuditEntry, FencepostConfig } from "../types.js";

export interface FrequencyRow {
  tool: string;
  allow: number;
  ask: number;
  deny: number;
  total: number;
}

export interface PromotionCandidate {
  tool: string;
  isBash: boolean;
  askCount: number;
  sessionCount: number;
  suggestion: string;
}

export interface BashCommandRow {
  command: string;
  allow: number;
  ask: number;
  deny: number;
}

export interface DeadRule {
  path: string;
  rule: string;
}

export interface AnalysisResult {
  totalEntries: number;
  frequency: FrequencyRow[];
  promotionCandidates: PromotionCandidate[];
  bashCommands: BashCommandRow[];
  deadRules: DeadRule[];
}

const PROMOTION_THRESHOLD = 5;

export function analyseAudit(entries: AuditEntry[], config: FencepostConfig): AnalysisResult {
  if (entries.length === 0) {
    return { totalEntries: 0, frequency: [], promotionCandidates: [], bashCommands: [], deadRules: [] };
  }

  // ---- Frequency table ----
  const freqMap = new Map<string, FrequencyRow>();
  for (const e of entries) {
    let row = freqMap.get(e.tool);
    if (!row) {
      row = { tool: e.tool, allow: 0, ask: 0, deny: 0, total: 0 };
      freqMap.set(e.tool, row);
    }
    row[e.decision]++;
    row.total++;
  }
  const frequency = [...freqMap.values()].sort((a, b) => b.total - a.total);

  // ---- Promotion candidates (ask entries) ----
  const askMap = new Map<string, { sessions: Set<string>; count: number; isBash: boolean; rule: string | null }>();
  for (const e of entries) {
    if (e.decision !== "ask") continue;
    const key = e.tool === "Bash" ? `bash:${e.input}` : `tool:${e.tool}`;
    let rec = askMap.get(key);
    if (!rec) {
      rec = { sessions: new Set(), count: 0, isBash: e.tool === "Bash", rule: e.rule };
      askMap.set(key, rec);
    }
    rec.sessions.add(e.sid);
    rec.count++;
  }

  const promotionCandidates: PromotionCandidate[] = [];
  for (const [key, rec] of askMap) {
    if (rec.count < PROMOTION_THRESHOLD) continue;
    const name = key.startsWith("bash:") ? key.slice(5) : key.slice(5);
    const isBash = rec.isBash;
    const section = isBash ? "bash.allow" : "tools.allow";
    promotionCandidates.push({
      tool: name,
      isBash,
      askCount: rec.count,
      sessionCount: rec.sessions.size,
      suggestion: `Add \`${name}\` to ${section}`,
    });
  }
  promotionCandidates.sort((a, b) => b.askCount - a.askCount);

  // ---- Bash command breakdown ----
  const bashMap = new Map<string, BashCommandRow>();
  for (const e of entries) {
    if (e.tool !== "Bash") continue;
    const cmd = e.normalised ?? e.input;
    let row = bashMap.get(cmd);
    if (!row) {
      row = { command: cmd, allow: 0, ask: 0, deny: 0 };
      bashMap.set(cmd, row);
    }
    row[e.decision]++;
  }
  const bashCommands = [...bashMap.values()]
    .sort((a, b) => (b.allow + b.ask + b.deny) - (a.allow + a.ask + a.deny))
    .slice(0, 20);

  // ---- Dead rules ----
  const allMatchedRules = new Set(entries.map((e) => e.rule).filter(Boolean));

  const deadRules: DeadRule[] = [];

  for (const rule of config.tools.deny) {
    const path = `tools.deny: ${rule.tool}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "tools.deny", rule: rule.tool });
  }
  for (const pattern of config.tools.ask) {
    const path = `tools.ask: ${pattern}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "tools.ask", rule: pattern });
  }
  for (const pattern of config.tools.allow) {
    const path = `tools.allow: ${pattern}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "tools.allow", rule: pattern });
  }
  for (const rule of config.tools.bash.deny) {
    const path = `bash.deny: ${rule}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "bash.deny", rule });
  }
  for (const check of config.tools.bash.checks) {
    const path = `bash.checks: ${check.test}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "bash.checks", rule: check.test });
  }
  for (const rule of config.tools.bash.ask) {
    const path = `bash.ask: ${rule}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "bash.ask", rule });
  }
  for (const rule of config.tools.bash.allow) {
    const path = `bash.allow: ${rule}`;
    if (!allMatchedRules.has(path)) deadRules.push({ path: "bash.allow", rule });
  }

  return { totalEntries: entries.length, frequency, promotionCandidates, bashCommands, deadRules };
}
