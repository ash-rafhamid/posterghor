import { BULK_FIELDS, BULK_MAX_ROWS, type BulkField } from "@poster/shared";

/** Minimal RFC-4180 CSV/TSV reader: quotes, escaped quotes, CRLF, BOM, and comma / tab / semicolon delimiters. */
export function parseCsv(input: string): string[][] {
  // strip a UTF-8 byte-order mark (Excel adds one) without writing the invisible character in source
  const stripped = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const text = stripped.replace(/\r\n?/g, "\n");
  const firstLine = text.split("\n", 1)[0] ?? "";
  const delim = [",", "\t", ";"].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

const ALIASES: Record<string, BulkField> = {
  name: "name",
  fullname: "name",
  "full name": "name",
  নাম: "name",
  designation: "designation",
  পদবি: "designation",
  পদবী: "designation",
  পদ: "designation",
  party: "party",
  organisation: "party",
  organization: "party",
  org: "party",
  দল: "party",
  সংগঠন: "party",
  union: "union",
  ward: "union",
  ইউনিয়ন: "union",
  ওয়ার্ড: "union",
  thana: "thana",
  upazila: "thana",
  upazilla: "thana",
  থানা: "thana",
  উপজেলা: "thana",
  district: "district",
  জেলা: "district",
  headline: "headline",
  শিরোনাম: "headline",
  subheadline: "subheadline",
  "supporting line": "subheadline",
  সহায়ক: "subheadline",
  date: "dateText",
  datetext: "dateText",
  তারিখ: "dateText",
  credit: "creditLabel",
  creditlabel: "creditLabel",
  প্রচারে: "creditLabel",
};

export interface BulkRow {
  /** 1-based data-row number (for messages) */
  n: number;
  values: Partial<Record<BulkField, string>>;
  valid: boolean;
}

export interface BulkTable {
  rows: BulkRow[];
  /** header cells we didn't recognise (ignored) */
  ignored: string[];
  truncated: boolean;
  total: number;
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/[_-]+/g, " ");

/** Maps a parsed table onto the poster's per-person fields. A header row is optional (default column order below). */
export function toBulkTable(table: string[][]): BulkTable {
  if (!table.length) return { rows: [], ignored: [], truncated: false, total: 0 };
  const DEFAULT_ORDER: BulkField[] = ["name", "designation", "party", "union", "thana", "district"];

  const header = table[0]!.map((h) => ALIASES[normHeader(h)] ?? ALIASES[normHeader(h).replace(/ /g, "")]);
  const hasHeader = header.some(Boolean);
  const columns: Array<BulkField | undefined> = hasHeader ? header : DEFAULT_ORDER;
  const ignored = hasHeader ? table[0]!.filter((_, i) => !header[i]).filter(Boolean) : [];
  const body = hasHeader ? table.slice(1) : table;

  const all: BulkRow[] = body.map((cells, i) => {
    const values: Partial<Record<BulkField, string>> = {};
    columns.forEach((field, ci) => {
      const v = cells[ci]?.trim();
      if (field && v && (BULK_FIELDS as readonly string[]).includes(field)) values[field] = v;
    });
    return { n: i + 1, values, valid: (values.name?.length ?? 0) >= 2 };
  });
  return { rows: all.slice(0, BULK_MAX_ROWS), ignored, truncated: all.length > BULK_MAX_ROWS, total: all.length };
}

/** A ready-to-fill CSV (UTF-8 with BOM so Excel shows Bangla correctly). */
export function sampleCsv(): string {
  const bom = String.fromCharCode(0xfeff);
  return (
    bom +
    [
      "name,designation,party,union,thana,district",
      "মোঃ আবদুর রহমান,সভাপতি,গণকল্যাণ সংঘ,৫নং ইউনিয়ন,সদর থানা,ময়মনসিংহ জেলা",
      "সাবিনা ইয়াসমিন,সাধারণ সম্পাদক,গণকল্যাণ সংঘ,৫নং ইউনিয়ন,সদর থানা,ময়মনসিংহ জেলা",
      "মোঃ রফিকুল ইসলাম,সাংগঠনিক সম্পাদক,গণকল্যাণ সংঘ,৩নং ইউনিয়ন,সদর থানা,ময়মনসিংহ জেলা",
    ].join("\r\n") +
    "\r\n"
  );
}
