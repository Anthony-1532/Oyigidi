// Shared workspace shell — server component. The sidebar reflects the
// server-verified role; navigation is real routing (App Router pages).

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bot, BookOpen, CalendarDays, ClipboardList, FolderUp, Goal, GraduationCap,
  LayoutDashboard, ListChecks, Settings2, UsersRound,
} from "lucide-react";
import type { Person } from "@/lib/shared/types";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = [label: string, href: string, Icon: LucideIcon];

export const NAV: Record<Person["role"], NavItem[]> = {
  client: [
    ["Today", "/client", LayoutDashboard],
    ["My journey", "/client/journey", Goal],
    ["Coach", "/client/coach", GraduationCap],
    ["Learn", "/client/learn", ClipboardList],
    ["Reflect", "/client/reflect", BookOpen],
  ],
  coach: [
    ["Overview", "/coach", LayoutDashboard],
    ["Clients", "/coach/clients", UsersRound],
    ["Programs", "/coach/programs", BookOpen],
    ["Knowledge", "/coach/knowledge", FolderUp],
    ["Group sessions", "/coach/sessions", CalendarDays],
    ["AI review", "/coach/review", Bot],
  ],
  admin: [
    ["Overview", "/admin", LayoutDashboard],
    ["People", "/admin/people", UsersRound],
    ["Audit log", "/admin/audit", ListChecks],
    ["Frameworks", "/admin/frameworks", Settings2],
  ],
};

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "OM";

export function WorkspaceShell({
  person,
  activeHref,
  sectionLabel,
  breadcrumb,
  children,
}: {
  person: Person;
  activeHref: string;
  sectionLabel: string;
  breadcrumb: string;
  children: React.ReactNode;
}) {
  const nav = NAV[person.role];
  const displayName = person.preferredName ?? person.name;
  return (
    <div className="oy-app">
      <div className="oy-shell">
        <aside className="oy-sidebar">
          <div className="oy-brand"><span className="oy-brand-mark">o</span><span>oyigidi</span></div>
          <div className="oy-role-label">{person.role} workspace</div>
          <nav className="oy-nav" aria-label={`${person.role} navigation`}>
            {nav.map(([label, href, Icon]) => (
              <Link key={href} href={href} className={`oy-nav-button ${activeHref === href ? "is-active" : ""}`} aria-current={activeHref === href ? "page" : undefined}>
                <Icon /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="oy-sidebar-footer">
            <div className="oy-person">
              <div className="oy-avatar">{initials(displayName)}</div>
              <div>
                <div className="oy-person-name">{displayName}</div>
                <div className="oy-person-detail">{sectionLabel}</div>
              </div>
            </div>
            <SignOutButton style={{ color: "#cfc5bb", marginTop: 10 }} />
          </div>
        </aside>
        <main className="oy-main">
          <header className="oy-topbar">
            <div className="oy-topbar-left">
              <div className="oy-mobile-brand"><span className="oy-brand-mark">o</span><span>oyigidi</span><span className="oy-mobile-context">{sectionLabel}</span></div>
              <div className="oy-breadcrumb"><span>Oyigidi</span><span> / </span><strong>{breadcrumb}</strong></div>
            </div>
          </header>
          <nav className="oy-mobile-nav" aria-label={`${person.role} navigation`}>
            {nav.map(([label, href, Icon]) => (
              <Link key={href} href={href} className={`oy-mobile-nav-button ${activeHref === href ? "is-active" : ""}`} aria-current={activeHref === href ? "page" : undefined}>
                <Icon /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="oy-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PageIntro({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="oy-page-intro">
      <div>
        <div className="oy-eyebrow">{eyebrow}</div>
        <h1 className="oy-page-title">{title}</h1>
        <p className="oy-page-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function SafetyNote({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="oy-safety-note" style={style}>
      <ShieldGlyph />
      <span>{children}</span>
    </div>
  );
}

function ShieldGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>;
}
