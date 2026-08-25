import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { AssignmentControls, EnrollmentControls } from "@/components/coach/forms";

export default async function CoachClientsPage() {
  const person = (await getSession(await headers()))!;
  const assignments = repo.assignments.activeForCoach(person.id);
  const assignedIds = assignments.map((a) => a.clientId);
  const available = repo.people.byRole("client").filter((c) => c.accountStatus === "active" && !assignedIds.includes(c.id));
  const program = repo.programs.listByCoach(person.id)[0] ?? null;

  return (
    <WorkspaceShell person={person} activeHref="/coach/clients" sectionLabel="Coach workspace" breadcrumb="Coach · Clients">
      <PageIntro eyebrow="Coach · Clients" title="Assign, enroll, and steward." subtitle="Assignment controls which journeys you can see; enrollment attaches a curriculum to their coaching context." />
      <div className="oy-today-grid">
        <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
          <div className="oy-card-label">Assign a client</div>
          <AssignmentControls availableClients={available.map((c) => ({ id: c.id, name: c.name, email: c.email }))} />
        </article>
        <aside style={{ display: "grid", gap: 18 }}>
          {assignedIds.map((id) => {
            const client = repo.people.get(id);
            const enrollments = repo.enrollments.forClients([id]).filter((e) => e.status === "active");
            return (
              <article className="oy-card oy-plan-card" key={id} style={{ padding: 20 }}>
                <div className="oy-card-label">{client.name}</div>
                <p className="oy-card-copy">{enrollments.length ? `Enrolled (${enrollments.length} active)` : "Not enrolled yet"}</p>
                <EnrollmentControls clientId={id} programId={program?.id ?? null} programTitle={program?.title} enrolled={enrollments.length > 0} />
              </article>
            );
          })}
          {!assignedIds.length && <article className="oy-card oy-plan-card" style={{ padding: 20 }}><p className="oy-card-copy">Assign a client on the left to begin.</p></article>}
        </aside>
      </div>
    </WorkspaceShell>
  );
}
