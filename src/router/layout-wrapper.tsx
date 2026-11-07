import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** Scrolls to the top on navigation, or to the #anchor when the URL carries one. */
const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

export const LayoutWrapper = () => (
  <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
    <ScrollManager />
    <SiteHeader />
    <main>
      <Outlet />
    </main>
    <SiteFooter />
  </div>
);
