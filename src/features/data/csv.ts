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

function bestSplitCsvLine(line: string): string[] {
  const delims = ["\t", ";", ","] as const;
  let best = splitDelimitedLine(line, ",");
  for (const d of delims) {
    const parts = splitDelimitedLine(line, d);
    if (parts.length > best.length) {
      best = parts;
    }
  }
  return best;
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
  if (lines.length > 10000) {
    throw new Error("Слишком много строк (макс 10,000).");
  }

  const headers = bestSplitCsvLine(lines[0]);
  const rowsRaw = lines.slice(1).map((line) => bestSplitCsvLine(line));
  const rows = stripLeadingDuplicateHeaderRows(headers, rowsRaw);
  if (rows.length < 1) {
    throw new Error("После заголовка не осталось строк данных (возможно, все строки совпадали с заголовком).");
  }
  const targetColumnIndex = Math.max(0, headers.length - 1);

  return { headers, rows, targetColumnIndex };
}
