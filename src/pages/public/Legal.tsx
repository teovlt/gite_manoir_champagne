import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { mainNav } from "@/components/site/site-header";
import { usePageText } from "@/providers/site-data-provider";
import { usePageMeta } from "@/lib/use-page-meta";
import { LANGS, langLabels, localize, useLang, useLocalePath } from "@/lib/locale";

/** Renders owner-edited text: blank line = new paragraph, "## " = subheading. */
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
                <p key={j}>{line}</p>
              ))}
            </div>
          );
        }
        return (
          <p key={i}>
            {block.split("\n").map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
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

export function SitemapPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const l = useLocalePath();
  usePageMeta();

  const pages = [
    ...mainNav.map((n) => ({ to: n.to, label: t(`navbar.${n.key}`) })),
    { to: "/mentions-legales", label: t("legal.mentions") },
    { to: "/confidentialite", label: t("legal.privacy") },
  ];

  return (
    <>
      <PageHero eyebrow={t("legal.eyebrow")} title={t("legal.sitemap")} minHeight={300} />
      <section className="px-gutter py-16">
        <div className="mx-auto grid max-w-[760px] gap-12 sm:grid-cols-2">
          <div>
            <h2 className="mb-4 font-serif text-xl font-medium">{t("legal.sitemapPages")}</h2>
            <ul className="flex flex-col gap-2.5 text-[15px]">
              {pages.map((p) => (
                <li key={p.to}>
                  <Link to={l(p.to)} className="text-clay hover:underline">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 font-serif text-xl font-medium">{t("legal.sitemapLanguages")}</h2>
            <ul className="flex flex-col gap-2.5 text-[15px]">
              {LANGS.filter((x) => x !== lang).map((x) => (
                <li key={x}>
                  <Link to={localize("/", x)} hrefLang={x} lang={x} className="text-clay hover:underline">
                    {langLabels[x]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
