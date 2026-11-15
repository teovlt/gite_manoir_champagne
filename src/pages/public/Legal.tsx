import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Flag } from "@/components/site/flags";
import { Eyebrow } from "@/components/site/ornaments";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { mainNav } from "@/components/site/site-header";
import { usePageText } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { LANGS, langLabels, localize, useLang, useLocalePath } from "@/lib/locale";

/** "[label](https://…)" → link; everything else stays plain text. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\((?:https?:\/\/|\/|mailto:)[^)\s]+\))/);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (!m) return part;
        const external = /^https?:/.test(m[2]);
        return (
          <a
            key={i}
            href={m[2]}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="font-semibold text-clay hover:text-rust"
          >
            {m[1]}
          </a>
        );
      })}
    </>
  );
}

/** Renders owner-edited text: blank line = new paragraph, "## " = subheading, [label](url) = link. */
function RichBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-5 text-[15px] leading-[1.8] text-ink-soft">
      {blocks.map((block, i) => {
        const [first, ...rest] = block.split("\n");
        if (first.startsWith("## ")) {
          return (
            <div key={i}>
              <h2 className="mb-2 font-serif text-xl font-medium text-ink">{first.slice(3)}</h2>
              {rest.map((line, j) => (
                <p key={j}>
                  <Inline text={line} />
                </p>
              ))}
            </div>
          );
        }
        return (
          <p key={i}>
            {block.split("\n").map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Inline text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function LegalPage({ page }: { page: "mentions" | "confidentialite" }) {
  const { t } = useTranslation();
  const text = usePageText(page);
  const title = page === "mentions" ? t("legal.mentions") : t("legal.privacy");
  usePageMeta();

  return (
    <>
      <PageHero eyebrow={t("legal.eyebrow")} title={title} minHeight={300} />
      <section className="px-gutter py-16">
        <Reveal className="mx-auto max-w-[760px]">
          <RichBody text={text("body")} />
        </Reveal>
      </section>
    </>
  );
}

const sitemapGroups = [
  { key: "discover", pages: ["/", "/le-gite", "/jardins-spa", "/region"] },
  { key: "stay", pages: ["/tarifs", "/avis", "/contact"] },
  { key: "info", pages: ["/mentions-legales", "/confidentialite"] },
] as const;

const pageKeys: Record<string, string> = {
  "/": "home",
  "/le-gite": "gite",
  "/jardins-spa": "jardins",
  "/region": "region",
  "/tarifs": "tarifs",
  "/avis": "avis",
  "/contact": "contact",
  "/mentions-legales": "mentions",
  "/confidentialite": "privacy",
};

export function SitemapPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const l = useLocalePath();
  usePageMeta();

  const label = (to: string) => {
    const key = pageKeys[to];
    return mainNav.some((n) => n.key === key) ? t(`navbar.${key}`) : t(`legal.${key}`);
  };

  return (
    <>
      <PageHero eyebrow={t("legal.eyebrow")} title={t("legal.sitemap")} subtitle={t("legal.sitemapIntro")} minHeight={300} />
      <section className="px-gutter py-16">
        <div className="mx-auto flex max-w-[960px] flex-col gap-14">
          {sitemapGroups.map((group, gi) => (
            <Reveal key={group.key} delay={gi * 70}>
              <Eyebrow>{t(`legal.groups.${group.key}`)}</Eyebrow>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.pages.map((to) => (
                  <li key={to}>
                    <Link
                      to={l(to)}
                      className="group flex h-full flex-col gap-1.5 rounded-[14px] border border-line bg-cream px-5 py-4 transition-[border-color,background-color,box-shadow] hover:border-khaki hover:bg-sand hover:shadow-[0_6px_18px_rgba(43,42,37,0.08)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sage/50"
                    >
                      <span className="flex items-center justify-between gap-3 font-serif text-lg font-medium text-ink">
                        {label(to)}
                        <ArrowRight
                          className="size-4 shrink-0 text-clay transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="text-[14px] leading-relaxed text-taupe">{t(`legal.pageDesc.${pageKeys[to]}`)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}

          <Reveal className="rounded-[18px] bg-sand px-[clamp(20px,4vw,32px)] py-6">
            <h2 className="font-serif text-xl font-medium text-ink">{t("legal.sitemapLanguages")}</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {LANGS.filter((x) => x !== lang).map((x) => (
                <li key={x}>
                  <Link
                    to={localize("/", x)}
                    hrefLang={x}
                    lang={x}
                    className="flex items-center gap-2.5 rounded-full border border-line-strong bg-cream py-1.5 pl-1.5 pr-4 text-[14px] text-ink transition-colors hover:border-khaki hover:bg-wheat focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sage/50"
                  >
                    <Flag lang={x} className="size-6" />
                    {langLabels[x]}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  const { t } = useTranslation();
  const l = useLocalePath();
  usePageMeta({ title: t("notFound.title") });
  return (
    <>
      <PageHero eyebrow="404" title={t("notFound.title")} subtitle={t("notFound.text")} minHeight={380}>
        <Link to={l("/")} className="mt-6 inline-block text-[13px] font-semibold uppercase tracking-[1px] text-clay">
          {t("notFound.back")} →
        </Link>
      </PageHero>
    </>
  );
}
