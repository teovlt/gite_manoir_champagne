import { StatusBadge } from "./admin-ui";
import type { BookingRequest, RequestStatus } from "@/lib/types";

export const statusLabels: Record<RequestStatus, string> = {
  nouvelle: "Nouvelle",
  repondue: "Répondue",
  confirmee: "Confirmée",
  refusee: "Refusée",
};

const tones: Record<RequestStatus, "wheat" | "sage" | "muted"> = { nouvelle: "wheat", repondue: "muted", confirmee: "sage", refusee: "muted" };

export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => <StatusBadge tone={tones[status]}>{statusLabels[status]}</StatusBadge>;

export function guestsLabel(r: BookingRequest) {
  const parts = [r.adults && `${r.adults} adulte${r.adults > 1 ? "s" : ""}`, r.children && `${r.children} enfant${r.children > 1 ? "s" : ""}`];
  return parts.filter(Boolean).join(", ") || "—";
}
