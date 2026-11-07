import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { LayoutWrapper } from "./layout-wrapper";
import { Home } from "@/pages/public/Home";
import { Gite } from "@/pages/public/Gite";
import { Jardins } from "@/pages/public/Jardins";
import { Tarifs } from "@/pages/public/Tarifs";
import { Region } from "@/pages/public/Region";
import { Avis } from "@/pages/public/Avis";
import { Contact } from "@/pages/public/Contact";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AuthProvider, RequireAuth } from "@/providers/auth-provider";
import { AdminLogin } from "@/pages/admin/Login";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AdminContent } from "@/pages/admin/Content";
import { AdminPhotos } from "@/pages/admin/Photos";
import { AdminBanner } from "@/pages/admin/Banner";
import { AdminPricing } from "@/pages/admin/Pricing";

const AdminRoot = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

export const Router = () => (
  <Routes>
    <Route element={<LayoutWrapper />}>
      <Route path="/" element={<Home />} />
      <Route path="/le-gite" element={<Gite />} />
      <Route path="/jardins-spa" element={<Jardins />} />
      <Route path="/tarifs" element={<Tarifs />} />
      <Route path="/region" element={<Region />} />
      <Route path="/avis" element={<Avis />} />
      <Route path="/contact" element={<Contact />} />
    </Route>

    <Route path="/admin" element={<AdminRoot />}>
      <Route path="connexion" element={<AdminLogin />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="contenu" element={<AdminContent />} />
        <Route path="photos" element={<AdminPhotos />} />
        <Route path="banniere" element={<AdminBanner />} />
        <Route path="tarifs" element={<AdminPricing />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
