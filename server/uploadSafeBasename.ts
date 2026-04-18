import path from "node:path";

/**
 * Проверка имени файла в каталоге uploads: без path traversal, допускаем текущий формат (uuid.ext)
 * и простые legacy-имена (буквы/цифры/ _ -), чтобы старые загрузки открывались и у ученика.
 */
export function isSafeUploadBasename(name: string, allowedLowerExtensions: string[]): boolean {
  const n = String(name ?? "");
  if (!n || n.length > 240 || n !== path.basename(n)) {
    return false;
  }
  const lower = n.toLowerCase();
  const ext = allowedLowerExtensions.find((e) => lower.endsWith(e));
  if (!ext) {
    return false;
  }
  const stem = n.slice(0, -ext.length);
  if (stem.length === 0 || stem.length > 200) {
    return false;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stem)) {
    return true;
  }
  return /^[a-zA-Z0-9_-]+$/.test(stem);
}
