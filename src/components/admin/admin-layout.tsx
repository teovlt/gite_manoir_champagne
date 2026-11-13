import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/ornaments";
import { useAuth } from "@/providers/auth-provider";
import { initials } from "@/lib/format";
import { api } from "@/lib/api";
import { isAdmin, isDeveloper, roleLabels } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Icon, type AdminIcon } from "./admin-ui";

export const adminNav: { to: string; label: string; icon: keyof typeof AdminIcon; adminOnly?: boolean; devOnly?: boolean; hidden?: boolean }[] = [
  { to: "/admin", label: "Tableau de bord", icon: "dashboard" },
  { to: "/admin/demandes", label: "Demandes", icon: "inbox" },
  { to: "/admin/calendrier", label: "Calendrier", icon: "calendar" },
  { to: "/admin/contenu", label: "Contenu des pages", icon: "content" },
  { to: "/admin/photos", label: "Photos & médias", icon: "photos" },
  { to: "/admin/banniere", label: "Bannière & événements", icon: "banner" },
  { to: "/admin/tarifs", label: "Tarifs", icon: "pricing" },
  { to: "/admin/parametres", label: "Coordonnées & carte", icon: "settings" },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: "users", adminOnly: true },
  { to: "/admin/emails", label: "Modèles d'e-mails", icon: "mail", adminOnly: true },
  { to: "/admin/compte", label: "Mon compte", icon: "user" },
  { to: "/admin/dev", label: "Espace développeur", icon: "code", devOnly: true },
];

/** Fired by the developer space after a change of maintenance or access, so the banner follows. */
export const SYSTEM_STATUS_EVENT = "admin:system-status";

interface SystemStatus {
  maintenance: { enabled: boolean; until: string | null };
  adminAccess: "normal" | "readonly" | "devOnly";
}

/** Strip above every admin page while the public site is in maintenance or the admin is restricted. */
function SystemBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  useEffect(() => {
    const load = () =>
      api
        .get<SystemStatus>("/api/admin/system-status")
        .then(setStatus)
        .catch(() => {});
    load();
    window.addEventListener(SYSTEM_STATUS_EVENT, load);
    return () => window.removeEventListener(SYSTEM_STATUS_EVENT, load);
  }, [pathname]);
  if (!status) return null;
  const notes: string[] = [];
  if (status.maintenance.enabled)
    notes.push(
      `Le site public est en maintenance : les visiteurs voient une page d'attente${status.maintenance.until ? ` (retour prévu ${new Date(status.maintenance.until).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })})` : ""}. Connecté, vous voyez toujours le site.`,
    );
  if (status.adminAccess === "readonly") notes.push("L'administration est en lecture seule pendant une maintenance technique : les modifications sont bloquées.");
  if (status.adminAccess === "devOnly") notes.push("L'administration est réservée aux développeurs : les autres comptes ne peuvent pas se connecter.");
  if (!notes.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#E7C9A8] bg-wheat px-[clamp(16px,3vw,32px)] py-2.5 text-[13px] text-rust">
      <Icon name="alert" size={16} strokeWidth={2} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {notes.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      {isDeveloper(user) && pathname !== "/admin/dev" && (
        <Link to="/admin/dev" className="font-semibold text-clay">
          Espace développeur →
        </Link>
      )}
    </div>
  );
}

const itemClass = "flex items-center gap-3 border-l-[3px] px-[18px] py-[11px] text-[13.5px] font-medium transition-colors";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/admin/connexion");
  };

  return (
    <div className="flex min-h-full flex-col bg-ink">
      <div className="flex items-center gap-2.5 border-b border-[#3F3E35] px-[18px] py-[22px]">
        <Logo size={34} />
        <span className="flex flex-col leading-tight">
          <span className="font-serif text-[14.5px] font-semibold text-cream">Manoir de la Champagne</span>
          <span className="text-[11px] uppercase tracking-[1px] text-[#A8A08A]">Administration</span>
        </span>
      </div>
      <nav aria-label="Administration" className="flex flex-1 flex-col gap-0.5 py-3.5">
        {adminNav.filter((item) => !item.hidden && (!item.adminOnly || isAdmin(user)) && (!item.devOnly || isDeveloper(user))).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(itemClass, isActive ? "border-sage bg-charcoal text-cream" : "border-transparent text-[#B7AE93] hover:bg-charcoal/60 hover:text-cream")
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex flex-col gap-0.5 border-t border-[#3F3E35] py-3.5">
        <Link to="/" target="_blank" className={cn(itemClass, "border-transparent text-[#B7AE93] hover:text-cream")}>
          <Icon name="home" />
          Voir le site public
        </Link>
        <button type="button" onClick={signOut} className={cn(itemClass, "border-transparent text-left text-[#B7AE93] hover:text-cream")}>
          <Icon name="logout" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const current = adminNav.find((n) => n.to === pathname) ?? adminNav[0];
  useEffect(() => {
    document.title = `${current.label} — Administration`;
    document.documentElement.lang = "fr";
  }, [current.label]);

  return (
    <div className="flex min-h-screen w-full items-start bg-parchment text-ink">
      <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 overflow-y-auto lg:block">
        <SidebarContent />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line-strong bg-cream px-[clamp(16px,3vw,32px)] py-5">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button type="button" className="flex size-11 items-center justify-center rounded-full text-ink lg:hidden" aria-label="Ouvrir le menu">
                  <Menu className="size-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[260px] border-0 bg-ink p-0">
                <SheetTitle className="sr-only">Menu d'administration</SheetTitle>
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div>
              <span className="text-[12px] uppercase tracking-[1px] text-stone">Administration</span>
              <h1 className="mt-1 font-serif text-2xl font-medium">{current.label}</h1>
            </div>
          </div>
          {user && (
            <Link to="/admin/compte" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-ink hover:bg-wheat hover:text-ink" title="Mon compte">
              <span className="flex size-9 items-center justify-center rounded-full bg-clay text-[13px] font-semibold text-cream">{initials(user.name)}</span>
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold">{user.name}</span>
                <span className="text-[12px] text-stone">{roleLabels[user.role]}</span>
              </span>
            </Link>
          )}
        </header>
        <SystemBanner />
        <div className="max-w-[1280px] p-[clamp(16px,3vw,32px)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
