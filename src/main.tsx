import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import { App } from "@/app/App";
import { NarrowScreenGate } from "@/app/NarrowScreenGate";
import "@/app/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider locale={ruRU}>
        <NarrowScreenGate>
          <App />
        </NarrowScreenGate>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
