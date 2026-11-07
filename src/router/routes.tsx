import { Navigate, Route, Routes } from "react-router-dom";
import { LayoutWrapper } from "./layout-wrapper";
import { Home } from "@/pages/public/Home";
import { Gite } from "@/pages/public/Gite";
import { Jardins } from "@/pages/public/Jardins";
import { Tarifs } from "@/pages/public/Tarifs";
import { Region } from "@/pages/public/Region";
import { Avis } from "@/pages/public/Avis";
import { Contact } from "@/pages/public/Contact";

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
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
