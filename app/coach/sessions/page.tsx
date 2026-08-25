import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { SessionControls } from "@/components/coach/forms";

export default async function CoachSessionsPage() {
  const person = (await getSession(await headers()))!;
  const sessions = repo.groupSessions.list();
  const clientIds = repo.assignments.activeForCoach(person.id).map((a) => a.clientId);
  const clients = clientIds.map((id) => ({ id, name: repo.people.get(id).name }));

  return (
    <WorkspaceShell person={person} activeHref="/coach/sessions" sectionLabel="Coach workspace" breadcrumb="Coach · Group sessions">
      <PageIntro eyebrow="Coach · Group sessions" title="Learning that travels together." subtitle="Schedule cohort sessions, capture summaries, and hand each participant a personal follow-up." />
      <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
        <div className="oy-card-label">Scheduled & past sessions</div>
        {sessions.length ? (
          <SessionControls sessions={sessions.map((s) => ({ id: s.id, title: s.title, status: s.status, summary: s.summary }))} clients={clients} />
        ) : <p className="oy-card-copy">No sessions yet — create one via the API or seed data.</p>}
      </article>
    </WorkspaceShell>
  );
}
