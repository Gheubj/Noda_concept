import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import ruRU from "antd/locale/ru_RU";
import { App } from "@/app/App";
import { NarrowScreenGate } from "@/app/NarrowScreenGate";
import "@/app/styles.css";

function useSystemDarkMode() {
  const [isDark, setIsDark] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setIsDark(event.matches);
    setIsDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDark;
}

function ThemedProviders({ children }: { children: React.ReactNode }) {
  const isDark = useSystemDarkMode();
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorBgBase: isDark ? "#0f172a" : "#ffffff",
          colorBgContainer: isDark ? "#111827" : "#ffffff",
          colorText: isDark ? "#e5e7eb" : "#1f2937",
          colorBorder: isDark ? "#334155" : "#d9d9d9"
        }
      }}
    >
      {children}
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemedProviders>
        <NarrowScreenGate>
          <App />
        </NarrowScreenGate>
      </ThemedProviders>
    </BrowserRouter>
  </React.StrictMode>
);
