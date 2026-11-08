import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Fonts are served by the site itself (no request to Google Fonts: GDPR).
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/inter";
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
