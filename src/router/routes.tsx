import { Suspense, lazy } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/providers/auth-provider";
import { LayoutWrapper } from "./layout-wrapper";
import { Home } from "@/pages/public/Home";
import { Gite } from "@/pages/public/Gite";
import { Jardins } from "@/pages/public/Jardins";
import { Tarifs } from "@/pages/public/Tarifs";
import { Region } from "@/pages/public/Region";
import { Avis } from "@/pages/public/Avis";
import { Contact } from "@/pages/public/Contact";
import { LegalPage, NotFound, SitemapPage } from "@/pages/public/Legal";

// The admin area is loaded on demand: visitors never download it.
const AdminLayout = lazy(() => import("@/components/admin/admin-layout").then((m) => ({ default: m.AdminLayout })));
const AdminLogin = lazy(() => import("@/pages/admin/Login").then((m) => ({ default: m.AdminLogin })));
const AdminReset = lazy(() => import("@/pages/admin/Reset").then((m) => ({ default: m.AdminReset })));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminRequests = lazy(() => import("@/pages/admin/Requests").then((m) => ({ default: m.AdminRequests })));
const AdminCalendar = lazy(() => import("@/pages/admin/Calendar").then((m) => ({ default: m.AdminCalendar })));
const AdminContent = lazy(() => import("@/pages/admin/Content").then((m) => ({ default: m.AdminContent })));
const AdminPhotos = lazy(() => import("@/pages/admin/Photos").then((m) => ({ default: m.AdminPhotos })));
const AdminBanner = lazy(() => import("@/pages/admin/Banner").then((m) => ({ default: m.AdminBanner })));
const AdminPricing = lazy(() => import("@/pages/admin/Pricing").then((m) => ({ default: m.AdminPricing })));
const AdminSettings = lazy(() => import("@/pages/admin/Settings").then((m) => ({ default: m.AdminSettings })));
const AdminUsers = lazy(() => import("@/pages/admin/Users").then((m) => ({ default: m.AdminUsers })));
const AdminAccount = lazy(() => import("@/pages/admin/Account").then((m) => ({ default: m.AdminAccount })));

const AdminRoot = () => (
  <AuthProvider>
    <Suspense fallback={<div className="min-h-screen bg-parchment" />}>
      <Outlet />
    </Suspense>
  </AuthProvider>
);

const publicPages = (
  <>
    <Route index element={<Home />} />
    <Route path="le-gite" element={<Gite />} />
    <Route path="jardins-spa" element={<Jardins />} />
    <Route path="tarifs" element={<Tarifs />} />
    <Route path="region" element={<Region />} />
    <Route path="avis" element={<Avis />} />
    <Route path="contact" element={<Contact />} />
    <Route path="mentions-legales" element={<LegalPage page="mentions" />} />
    <Route path="confidentialite" element={<LegalPage page="confidentialite" />} />
    <Route path="plan-du-site" element={<SitemapPage />} />
    <Route path="*" element={<NotFound />} />
  </>
);

export const Router = () => (
  <Routes>
    <Route path="/admin" element={<AdminRoot />}>
      <Route path="connexion" element={<AdminLogin />} />
      <Route path="reinitialiser" element={<AdminReset />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="demandes" element={<AdminRequests />} />
        <Route path="calendrier" element={<AdminCalendar />} />
        <Route path="contenu" element={<AdminContent />} />
        <Route path="photos" element={<AdminPhotos />} />
        <Route path="banniere" element={<AdminBanner />} />
        <Route path="tarifs" element={<AdminPricing />} />
        <Route path="parametres" element={<AdminSettings />} />
        <Route path="utilisateurs" element={<AdminUsers />} />
        <Route path="compte" element={<AdminAccount />} />
      </Route>
    </Route>

    {/* French at the root, English and German under /en and /de */}
    <Route path="/en" element={<LayoutWrapper />}>
      {publicPages}
    </Route>
    <Route path="/de" element={<LayoutWrapper />}>
      {publicPages}
    </Route>
    <Route path="/" element={<LayoutWrapper />}>
      {publicPages}
    </Route>
  </Routes>
);
