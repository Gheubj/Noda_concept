import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import ruRU from "antd/locale/ru_RU";
import { App } from "@/app/App";
import { NarrowScreenGate } from "@/app/NarrowScreenGate";
import { useThemeStore, type ThemeMode } from "@/store/useThemeStore";
import "@/app/styles.css";

function useEffectiveDark(themeMode: ThemeMode): boolean {
  const [systemDark, setSystemDark] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false
  );

  React.useEffect(() => {
    if (themeMode !== "system") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeMode]);

  if (themeMode === "light") {
    return false;
  }
  if (themeMode === "dark") {
    return true;
  }
  return systemDark;
}

function ThemedProviders({ children }: { children: React.ReactNode }) {
  const themeMode = useThemeStore((s) => s.themeMode);
  const isDark = useEffectiveDark(themeMode);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const lightTokens = {
    colorBgBase: "#f3f5f9",
    colorBgLayout: "#f3f5f9",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorText: "#0f172a",
    colorTextSecondary: "#526077",
    colorTextTertiary: "#64748b",
    colorBorder: "#dfe4ec",
    colorBorderSecondary: "#eef1f6",
    colorFillSecondary: "rgba(15, 23, 42, 0.05)",
    colorFillTertiary: "rgba(15, 23, 42, 0.03)",
    colorPrimary: "#2563eb",
    colorPrimaryHover: "#3b82f6",
    colorLink: "#1d4ed8",
    colorLinkHover: "#2563eb",
    colorSplit: "#eef1f6",
    borderRadius: 10,
    borderRadiusLG: 14,
    controlHeight: 38,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    boxShadowSecondary: "0 12px 28px rgba(15, 23, 42, 0.12)"
  };

  const darkTokens = {
    colorBgBase: "#0f172a",
    colorBgLayout: "#0f172a",
    colorBgContainer: "#111827",
    colorBgElevated: "#0f1b2f",
    colorText: "#e5e7eb",
    colorBorder: "#334155",
    colorTextSecondary: "#9fb0c8",
    colorFillSecondary: "rgba(148, 163, 184, 0.12)",
    colorFillTertiary: "rgba(148, 163, 184, 0.08)",
    colorPrimary: "#3b82f6",
    colorPrimaryHover: "#60a5fa",
    borderRadius: 10,
    borderRadiusLG: 14,
    controlHeight: 38,
    boxShadow: "0 10px 26px rgba(2, 6, 23, 0.4)",
    boxShadowSecondary: "0 16px 34px rgba(2, 6, 23, 0.52)"
  };

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens
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
