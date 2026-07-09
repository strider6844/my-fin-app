// Trial-balance parser. Accepts CSV or XLSX and returns normalised rows:
//   { account_code, account_name, amount }
// where `amount` is the natural (positive-magnitude) trial-balance value.
// The variance engine later applies each account's sign_convention.
//
// The parser is deliberately forgiving about column names because real TB
// exports vary. It looks for a code column, a name column, and an amount column
// (or a debit/credit pair, which it nets to a single signed amount).

import * as XLSX from "xlsx";

export interface ParsedRow {
  account_code: string;
  account_name: string;
  amount: number;
}

export interface ParseResult {
  rows: ParsedRow[];
  error?: string;
}

const CODE_KEYS = ["account_code", "code", "account", "account code", "gl", "gl_code", "nominal"];
const NAME_KEYS = ["account_name", "name", "account name", "description", "narrative"];
const AMOUNT_KEYS = ["amount", "balance", "value", "net", "total"];
const DEBIT_KEYS = ["debit", "dr", "debit amount"];
const CREDIT_KEYS = ["credit", "cr", "credit amount"];

function pickKey(headers: string[], candidates: string[]): string | undefined {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

function toNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return raw;
  // strip currency symbols, thousands separators, spaces; handle (1,234) negatives
  let s = String(raw).trim();
  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[()£$,\s]/g, "");
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

// Extension is authoritative for how we read the bytes.
export function isSupportedFilename(filename: string): boolean {
  return /\.(csv|xlsx|xls)$/i.test(filename);
}

function rowsFromRecords(records: Record<string, unknown>[]): ParseResult {
  if (records.length === 0) {
    return { rows: [], error: "File contains no data rows." };
  }
  const headers = Object.keys(records[0]);
  const codeKey = pickKey(headers, CODE_KEYS);
  const nameKey = pickKey(headers, NAME_KEYS);
  const amountKey = pickKey(headers, AMOUNT_KEYS);
  const debitKey = pickKey(headers, DEBIT_KEYS);
  const creditKey = pickKey(headers, CREDIT_KEYS);

  if (!codeKey) {
    return {
      rows: [],
      error: `Could not find an account code column. Expected one of: ${CODE_KEYS.join(", ")}. Found: ${headers.join(", ")}.`,
    };
  }
  if (!amountKey && !(debitKey || creditKey)) {
    return {
      rows: [],
      error: `Could not find an amount column. Expected one of: ${AMOUNT_KEYS.join(", ")} (or debit/credit). Found: ${headers.join(", ")}.`,
    };
  }

  const rows: ParsedRow[] = [];
  for (const rec of records) {
    const code = String(rec[codeKey] ?? "").trim();
    if (!code) continue; // skip blank / total rows without a code
    const name = nameKey ? String(rec[nameKey] ?? "").trim() : "";
    let amount: number;
    if (amountKey) {
      amount = toNumber(rec[amountKey]);
    } else {
      const dr = debitKey ? toNumber(rec[debitKey]) : 0;
      const cr = creditKey ? toNumber(rec[creditKey]) : 0;
      amount = dr - cr;
    }
    rows.push({ account_code: code, account_name: name, amount });
  }

  if (rows.length === 0) {
    return { rows: [], error: "No rows with an account code were found." };
  }
  return { rows };
}

function parseCSV(text: string): ParseResult {
  // Minimal RFC-4180-ish CSV parser (handles quoted fields + commas in quotes).
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], error: "CSV has no data rows." };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const records: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const rec: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      rec[h] = cells[idx] ?? "";
    });
    records.push(rec);
  }
  return rowsFromRecords(records);
}

function parseXLSX(buffer: ArrayBuffer): ParseResult {
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return rowsFromRecords(records);
  } catch (e) {
    return { rows: [], error: `Could not read spreadsheet: ${(e as Error).message}` };
  }
}

export async function parseTrialBalance(file: {
  filename: string;
  buffer: ArrayBuffer;
}): Promise<ParseResult> {
  if (!isSupportedFilename(file.filename)) {
    return {
      rows: [],
      error: "Unsupported file type. Please upload a CSV or XLSX file.",
    };
  }
  if (/\.csv$/i.test(file.filename)) {
    const text = new TextDecoder("utf-8").decode(file.buffer);
    return parseCSV(text);
  }
  return parseXLSX(file.buffer);
}
