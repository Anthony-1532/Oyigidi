import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";

/** Pure-ish helper: last 7 ISO day keys + short labels for the activity chart. */
function lastSevenDays(sessionDays: Map<string, number>) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.now() - (6 - index) * 86_400_000);
    const key = day.toISOString().slice(0, 10);
    return {
      key,
      label: ["S", "M", "T", "W", "T", "F", "S"][day.getDay()]!,
      total: sessionDays.get(key) ?? 0,
    };
  });
}

export default async function AdminOverviewPage() {
  const person = (await getSession(await headers()))!;
  const people = repo.people.list();
  const programs = repo.programs.listByCoach("usr_coach");
  const sessions = repo.aiSessions.forCoach("usr_coach");
  const knowledge = repo.knowledge.list();

  const sessionDays = new Map<string, number>();
  for (const session of sessions) {
    const key = session.createdAt.slice(0, 10);
    sessionDays.set(key, (sessionDays.get(key) ?? 0) + 1);
  }
  const days = lastSevenDays(sessionDays);
  const peak = Math.max(...days.map((d) => d.total), 0);

  return (
    <WorkspaceShell person={person} activeHref="/admin" sectionLabel="Admin console" breadcrumb="Platform operations · Overview">
      <PageIntro eyebrow="Platform oversight" title="Clear control, without the noise." subtitle="Operational visibility across people, programs, AI activity, and the controls that hold the platform accountable." />
      <article className="oy-card oy-admin-hero"><div><div className="oy-card-label">Platform signal</div><h2>Operational data is ready for review.</h2><p>All figures come from the live platform state.</p></div><div className="oy-health"><strong>READY</strong><span>in-process store</span></div></article>
      <div className="oy-metrics-grid" style={{ marginTop: 18 }}>
        {[["Active people", String(people.filter((p) => p.accountStatus === "active").length), `${people.filter((p) => p.role === "client").length} clients · ${people.filter((p) => p.role === "coach").length} coaches`],
          ["Programs", String(programs.length), `${programs.filter((p) => p.status === "active").length} active`],
          ["AI coaching sessions", String(sessions.length), `${sessions.filter((s) => s.safetyFlag === "escalation").length} safety flags`],
          ["Knowledge documents", String(knowledge.length), `${knowledge.filter((k) => k.status === "ready").length} retrieval-ready`]].map(([label, value, note]) => (
          <article className="oy-card oy-metric" key={label}><div className="oy-card-label">{label}</div><div className="oy-metric-value">{value}</div><div className="oy-metric-change">{note}</div></article>
        ))}
      </div>
      <div className="oy-admin-grid">
        <article className="oy-card oy-usage-card">
          <div className="oy-card-label">AI activity</div>
          <h3 className="oy-card-heading">Coaching sessions · last 7 days</h3>
          {peak ? (
            <div className="oy-chart">
              {days.map((day, index) => (
                <div className={`oy-bar ${index === days.length - 1 ? "is-strong" : ""}`} key={day.key} style={{ height: `${Math.max(8, Math.round((day.total / peak) * 100))}%` }}><span>{day.label}</span></div>
              ))}
            </div>
          ) : <p className="oy-card-copy">No sessions recorded in the last seven days.</p>}
        </article>
        <aside className="oy-card oy-activity-card">
          <div className="oy-card-label">Audit trail</div>
          <h3 className="oy-card-heading">Meaningful activity</h3>
          {repo.auditLog.list().slice(0, 5).map((entry) => (
            <div className="oy-activity-row" key={entry.id}>
              <div className="oy-activity-dot" />
              <div>
                <div className="oy-activity-copy"><strong>{entry.action.replaceAll("_", " ")}</strong> · {entry.detail ?? ""}</div>
                <div className="oy-activity-time">{new Date(entry.at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          <a className="oy-link" href="/admin/audit" style={{ marginTop: 12 }}>View full audit trail →</a>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
