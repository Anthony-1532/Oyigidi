import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { ReviewControls } from "@/components/coach/forms";

export default async function CoachReviewPage() {
  const person = (await getSession(await headers()))!;
  const sessions = repo.aiSessions.forCoach(person.id);
  return (
    <WorkspaceShell person={person} activeHref="/coach/review" sectionLabel="Coach workspace" breadcrumb="Coach · AI review">
      <PageIntro eyebrow="Coach · AI review" title="Keep the human close to the moment." subtitle="Every AI coaching session is saved and reviewable. Your oversight notes become part of the audit trail." />
      <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
        <ReviewControls sessions={sessions.map((s) => ({ id: s.id, summary: s.summary ?? s.coachingOutcome, createdAt: s.createdAt, status: s.status, safetyFlag: s.safetyFlag }))} />
      </article>
    </WorkspaceShell>
  );
}
