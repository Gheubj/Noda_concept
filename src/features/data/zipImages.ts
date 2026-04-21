import JSZip from "jszip";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

const MAX_ZIP_BYTES = 80 * 1024 * 1024;

export async function extractImageFilesFromZip(zipFile: File): Promise<File[]> {
  if (zipFile.size > MAX_ZIP_BYTES) {
    throw new Error("ZIP слишком большой (максимум 80 МБ).");
  }
  const zip = await JSZip.loadAsync(zipFile);
  const out: File[] = [];
  const paths = Object.keys(zip.files).sort();
  for (const path of paths) {
    const entry = zip.files[path];
    if (entry.dir) {
      continue;
    }
    if (!IMAGE_EXT.test(path)) {
      continue;
    }
    const blob = await entry.async("blob");
    const name = path.split("/").pop() || "image";
    const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    out.push(new File([blob], name, { type }));
  }
  return out;
}

export type LabeledZipImages = Array<{ className: string; files: File[] }>;

/**
 * Импорт размеченного ZIP: структура вида
 * - class_name/img1.jpg
 * - class_name/img2.png
 * (допустим верхний общий каталог: dataset/class_name/img1.jpg)
 */
export async function extractLabeledImageFilesFromZip(zipFile: File): Promise<LabeledZipImages> {
  if (zipFile.size > MAX_ZIP_BYTES) {
    throw new Error("ZIP слишком большой (максимум 80 МБ).");
  }
  const zip = await JSZip.loadAsync(zipFile);
  const byClass = new Map<string, File[]>();
  const paths = Object.keys(zip.files).sort();
  for (const path of paths) {
    const entry = zip.files[path];
    if (entry.dir || !IMAGE_EXT.test(path)) {
      continue;
    }
    const parts = path.split("/").filter(Boolean);
    if (parts.length < 2) {
      continue;
    }
    const className = (parts.length === 2 ? parts[0] : parts[parts.length - 2])?.trim();
    if (!className) {
      continue;
    }
    const blob = await entry.async("blob");
    const name = parts[parts.length - 1] || "image";
    const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    const list = byClass.get(className) ?? [];
    list.push(new File([blob], name, { type }));
    byClass.set(className, list);
  }
  return [...byClass.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "en", { sensitivity: "base" }))
    .map(([className, files]) => ({ className, files }));
}
