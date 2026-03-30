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
