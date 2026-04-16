/** Совпадает с `courseModuleToModuleKey` на сервере ([server/lms.ts](server/lms.ts)). */
export function courseModuleToApiModuleKey(courseModule: string): string {
  const m = courseModule.toUpperCase();
  if (m === "A") {
    return "module_a";
  }
  if (m === "B") {
    return "module_b";
  }
  if (m === "C") {
    return "module_c";
  }
  if (m === "D") {
    return "module_d";
  }
  return `module_${String(courseModule).toLowerCase()}`;
}

export function courseModuleStudentLabel(courseModule: string): string {
  const map: Record<string, string> = {
    A: "Модуль A",
    B: "Модуль B",
    C: "Модуль C",
    D: "Модуль D"
  };
  return map[courseModule] ?? `Модуль ${courseModule}`;
}
