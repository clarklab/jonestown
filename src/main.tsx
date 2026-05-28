import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ensureSeeded, getCurrentCoupleId, migrateLegacyData } from "./data/db";
import { startSync } from "./data/sync";
import "./styles.css";

void (async () => {
  await migrateLegacyData();
  const currentId = await getCurrentCoupleId();
  if (currentId) {
    await ensureSeeded(currentId);
  }
  startSync();
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
