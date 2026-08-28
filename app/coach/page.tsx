// Coach command center — server-rendered roster with real progress data.

import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro } from "@/components/shell";
import { WorkspaceShell } from "@/components/shell";

export default async function CoachOverviewPage() {
  const person = (await getSession(await headers()))!;
  const assignments = repo.assignments.activeForCoach(person.id);
  const clientIds = assignments.map((a) => a.clientId);
  const latestByClient = repo.progressEvents.latestPerClient(clientIds);
  const programs = repo.programs.listByCoach(person.id);
  const knowledge = repo.knowledge.list();
  const pendingReviews = repo.aiSessions.openForCoach(person.id);

  const metrics = [
    [String(clientIds.length), "Assigned coachees", "Active coach-coachee relationships"],
    [String(programs.length), "Programs", `${programs.filter((p) => p.status === "active").length} active`],
    [String(pendingReviews.length), "Awaiting AI review", pendingReviews.length ? "Sessions need your oversight" : "Queue is clear"],
    [String(knowledge.filter((k) => k.status === "ready").length), "AI-ready sources", "Coach-approved retrieval material"],
  ];

  return (
    <WorkspaceShell person={person} activeHref="/coach" sectionLabel="Coach workspace" breadcrumb="Coach command center · Overview">
      <PageIntro
        eyebrow="Human intelligence layer"
        title="Coach command center."
        subtitle="Shape what the AI teaches, observe development in context, and keep every journey anchored to your intent."
      />
      <div className="oy-metrics-grid">
        {metrics.map(([value, label, change]) => (
          <article className="oy-card oy-metric" key={label}>
            <div className="oy-card-label">{label}</div>
            <div className="oy-metric-value">{value}</div>
            <div className="oy-metric-change">{change}</div>
          </article>
        ))}
      </div>
      <section className="oy-section">
        <h2 className="oy-section-title">Coachee development</h2>
        <article className="oy-card oy-table-card" style={{ padding: 20 }}>
          {clientIds.length ? (
            <table className="oy-client-list">
              <thead><tr><th>Coachee</th><th>Goal progress</th><th>Latest activity</th><th /></tr></thead>
              <tbody>
                {clientIds.map((id) => {
                  const client = repo.people.get(id);
                  const progress = repo.goals.averageFor(id);
                  const latest = latestByClient.get(id);
                  return (
                    <tr key={id}>
                      <td><div className="oy-client-name"><span className="oy-mini-avatar">{client.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>{client.name}</div></td>
                      <td>
                        <span className="oy-client-muted">{progress}% avg</span>
                        <div className="oy-progress-track" style={{ marginTop: 4 }}><div className="oy-progress-value" style={{ "--value": `${progress}%` } as React.CSSProperties} /></div>
                      </td>
                      <td><span className="oy-status">{latest?.title ?? "No activity yet"}</span></td>
                      <td className="oy-client-muted">{repo.enrollments.forClients([id]).some((e) => e.status === "active") ? "Enrolled" : "Not enrolled"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="oy-card-copy">No clients assigned yet. Assign one under Clients.</p>
          )}
        </article>
      </section>
      <nav style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        <a className="oy-button is-muted" href="/coach/clients">Assign & enroll</a>
        <a className="oy-button is-muted" href="/coach/programs">Author curriculum</a>
        <a className="oy-button is-muted" href="/coach/knowledge">Knowledge library</a>
        <a className="oy-button is-muted" href="/coach/review">Review queue{pendingReviews.length ? ` (${pendingReviews.length})` : ""}</a>
      </nav>
    </WorkspaceShell>
  );
}
