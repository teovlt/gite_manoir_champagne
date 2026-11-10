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

export const isQuestion = (r: BookingRequest) => r.kind === "question";

export const KindBadge = ({ r }: { r: BookingRequest }) =>
  isQuestion(r) ? (
    <span className="rounded-full bg-wheat px-2 py-0.5 text-[11px] font-bold uppercase text-rust">Question</span>
  ) : null;

/** Dates column: a question has none. */
export const requestDatesLabel = (r: BookingRequest, period: (a: string, d: string) => string) =>
  isQuestion(r) ? "Question" : r.arrival && r.departure ? period(r.arrival, r.departure) : r.dates || "—";

export function guestsLabel(r: BookingRequest) {
  const parts = [r.adults && `${r.adults} adulte${r.adults > 1 ? "s" : ""}`, r.children && `${r.children} enfant${r.children > 1 ? "s" : ""}`];
  return parts.filter(Boolean).join(", ") || "—";
}
