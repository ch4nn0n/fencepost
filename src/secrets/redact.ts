import type { SecretFinding } from "./scanner.js";

/**
 * Pure span/line redaction over scanner findings. Secret-bearing findings are
 * located by searching for the secret text itself (never by column offsets),
 * so decorated views of the content — Read's `N→` line numbering, Grep's
 * `path:line:` prefixes — can't skew the spans.
 */

export interface RedactionSummary {
  scanner: string;
  ruleId: string;
  count: number;
}

export interface RedactResult {
  text: string;
  redactions: RedactionSummary[];
}

export function placeholderFor(finding: Pick<SecretFinding, "scanner" | "ruleId">): string {
  return `[FENCEPOST:REDACTED ${finding.scanner}:${finding.ruleId}]`;
}

interface Span {
  start: number;
  end: number;
  label: string; // "<scanner>:<ruleId>" (comma-joined when spans merge)
}

/** Every [start, end) occurrence of each finding's secret text. */
function collectSpans(text: string, findings: SecretFinding[]): Span[] {
  const spans: Span[] = [];
  for (const f of findings) {
    if (!f.secret) continue;
    let from = 0;
    for (;;) {
      const idx = text.indexOf(f.secret, from);
      if (idx === -1) break;
      spans.push({ start: idx, end: idx + f.secret.length, label: `${f.scanner}:${f.ruleId}` });
      from = idx + f.secret.length;
    }
  }
  return spans;
}

/** Sort spans and merge overlaps, combining labels. */
function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Span[] = [];
  for (const span of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && span.start < prev.end) {
      prev.end = Math.max(prev.end, span.end);
      if (!prev.label.split(",").includes(span.label)) prev.label += `,${span.label}`;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

// Decorated-line prefixes to preserve when redacting a whole line:
// Claude Code Read output (`   12→...`) and Grep -n output (`path/file.ts:12:...`).
const LINE_PREFIX_RE = /^(\s*\d+→|[^\s:][^:\n]*:\d+:)/;

/**
 * Replace the content of 1-based line `lineNo` with the placeholder, keeping
 * any Read/Grep line-number prefix so numbering stays coherent for the model.
 */
function redactLine(text: string, lineNo: number, placeholder: string): string | null {
  const lines = text.split("\n");
  if (lineNo < 1 || lineNo > lines.length) return null;
  const original = lines[lineNo - 1]!;
  const prefix = original.match(LINE_PREFIX_RE)?.[0] ?? "";
  lines[lineNo - 1] = `${prefix}${placeholder} (full line)`;
  return lines.join("\n");
}

/**
 * Redact all findings from `text`. Findings with raw secret text are replaced
 * span-by-span (every occurrence); line-only findings (detect-secrets) replace
 * the whole flagged line. Returns the redacted text and a per-rule summary.
 */
export function redactFindings(text: string, findings: SecretFinding[]): RedactResult {
  const summaries = new Map<string, RedactionSummary>();
  const bump = (scanner: string, ruleId: string, by: number): void => {
    const key = `${scanner}:${ruleId}`;
    const existing = summaries.get(key);
    if (existing) existing.count += by;
    else summaries.set(key, { scanner, ruleId, count: by });
  };

  // Pass 1: exact spans.
  const spans = mergeSpans(collectSpans(text, findings));
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += text.slice(cursor, span.start) + `[FENCEPOST:REDACTED ${span.label}]`;
    cursor = span.end;
    for (const label of span.label.split(",")) {
      const sep = label.indexOf(":");
      bump(label.slice(0, sep), label.slice(sep + 1), 1);
    }
  }
  out += text.slice(cursor);

  // Pass 2: line-only findings (no raw secret to search for).
  for (const f of findings) {
    if (f.secret) continue;
    const redacted = redactLine(out, f.line, placeholderFor(f));
    if (redacted !== null) {
      out = redacted;
      bump(f.scanner, f.ruleId, 1);
    }
  }

  return { text: out, redactions: [...summaries.values()] };
}
