import { Suspense, lazy } from "react";
import { cn } from "@/lib/utils";

// Leaflet is only downloaded on pages that show the map.
const ManorMapImpl = lazy(() => import("./manor-map").then((m) => ({ default: m.ManorMap })));
const DirectionsImpl = lazy(() => import("./manor-map").then((m) => ({ default: m.DirectionsPanel })));

export const ManorMap = ({ className }: { className?: string }) => (
  <Suspense fallback={<div className={cn("bg-wheat", className)} />}>
    <ManorMapImpl className={className} />
  </Suspense>
);

export const DirectionsPanel = (props: { compact?: boolean }) => (
  <Suspense fallback={null}>
    <DirectionsImpl {...props} />
  </Suspense>
);
