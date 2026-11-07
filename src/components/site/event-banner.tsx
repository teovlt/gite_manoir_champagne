import { Link } from "react-router-dom";
import { formatPeriod } from "@/lib/format";
import type { SiteEvent } from "@/lib/types";

/** Presentational banner — reused by the admin preview. */
export function EventBannerView({ event }: { event: Pick<SiteEvent, "title" | "text" | "link" | "startDate" | "endDate"> }) {
  const period = event.startDate && event.endDate ? `, ${formatPeriod(event.startDate, event.endDate)}` : "";
  return (
    <div className="px-gutter flex flex-wrap items-center justify-center gap-2.5 bg-ink py-2.5 text-center text-[13px] text-cream">
      <span className="shrink-0 rounded-full bg-clay px-[9px] py-[3px] text-[10px] font-semibold uppercase tracking-[1px] text-cream">
        Événement
      </span>
      <span>
        {event.title}
        {event.text && (
          <>
            {" — "}
            <strong>{event.text}</strong>
          </>
        )}
        {period}.
      </span>
      {event.link && (
        <Link to={event.link} className="shrink-0 font-semibold text-wheat-light underline hover:text-cream">
          En profiter →
        </Link>
      )}
    </div>
  );
}
