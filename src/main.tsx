import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import "./lib/i18n";
import { App } from "./App";
import { Toaster } from "./components/ui/sonner";
import { SiteDataProvider } from "./providers/site-data-provider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteDataProvider>
        <App />
        <Toaster position="top-center" richColors />
      </SiteDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
