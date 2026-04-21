import type { TabularDataset } from "@/shared/types/ai";

/** Удаляет из начала данных строки, совпадающие со строкой заголовков (частый дубликат заголовка в CSV). */
export function stripLeadingDuplicateHeaderRows(headers: string[], rows: string[][]): string[][] {
  if (!headers.length || !rows.length) {
    return rows;
  }
  const hdr = headers.map((h) => h.trim().toLowerCase());
  let rest = rows;
  while (rest.length > 0) {
    const row = rest[0];
    if (row.length < hdr.length) {
      break;
    }
    const same = hdr.every((h, i) => (row[i] ?? "").trim().toLowerCase() === h);
    if (!same) {
      break;
    }
    rest = rest.slice(1);
  }
  return rest;
}

/** Разбор строки с учётом кавычек и выбором разделителя, дающим больше всего колонок. */
function splitDelimitedLine(line: string, delimiter: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === delimiter) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  parts.push(cur.trim());
  return parts;
}

/** Выбираем один разделитель на весь файл, чтобы колонки не "плавали" между строками. */
function pickCsvDelimiter(lines: string[]): "\t" | ";" | "," {
  const delims = ["\t", ";", ","] as const;
  const sample = lines.slice(0, Math.min(lines.length, 300));
  let bestDelim: "\t" | ";" | "," = ",";
  let bestScore = -1;
  let bestHeaderCols = 1;
  for (const d of delims) {
    const counts = sample.map((line) => splitDelimitedLine(line, d).length);
    const headerCols = counts[0] ?? 1;
    const consistent = counts.reduce((n, c) => n + Number(c === headerCols), 0);
    // Приоритет: согласованность с заголовком, затем число колонок.
    const score = consistent * 1000 + headerCols;
    if (score > bestScore || (score === bestScore && headerCols > bestHeaderCols)) {
      bestScore = score;
      bestHeaderCols = headerCols;
      bestDelim = d;
    }
  }
  return bestDelim;
}

export async function parseCsvFile(file: File): Promise<TabularDataset> {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("CSV файл слишком большой (макс 50MB).");
  }
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV должен содержать заголовок и минимум одну строку данных.");
  }
  if (lines.length > 50000) {
    throw new Error("Слишком много строк (макс 50,000).");
  }

  const delimiter = pickCsvDelimiter(lines);
  const headers = splitDelimitedLine(lines[0], delimiter);
  const rowsRaw = lines.slice(1).map((line) => splitDelimitedLine(line, delimiter));
  const rows = stripLeadingDuplicateHeaderRows(headers, rowsRaw);
  if (rows.length < 1) {
    throw new Error("После заголовка не осталось строк данных (возможно, все строки совпадали с заголовком).");
  }
  const targetColumnIndex = Math.max(0, headers.length - 1);

  return { headers, rows, targetColumnIndex };
}
