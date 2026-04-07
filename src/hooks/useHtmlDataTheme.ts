import { useEffect, useState } from "react";

export type HtmlDataTheme = "light" | "dark";

/** Синхронно с `data-theme` на `<html>` (как в ThemedProviders). */
export function useHtmlDataTheme(): HtmlDataTheme {
  const read = () =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

  const [theme, setTheme] = useState<HtmlDataTheme>(read);

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    setTheme(read());
    return () => obs.disconnect();
  }, []);

  return theme;
}
