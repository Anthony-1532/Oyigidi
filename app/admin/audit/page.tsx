import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";

export default async function AdminAuditPage() {
  const person = (await getSession(await headers()))!;
  const entries = repo.auditLog.list();
  return (
    <WorkspaceShell person={person} activeHref="/admin/audit" sectionLabel="Admin console" breadcrumb="Admin · Audit log">
      <PageIntro eyebrow="Admin · Audit log" title="Every meaningful operation is reviewable." subtitle="Provisioning, role changes, curriculum updates, knowledge uploads, reviews, framework toggles, and privacy actions are captured as they happen." />
      <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
        {entries.length ? entries.map((entry) => (
          <div className="oy-plan-item" key={entry.id}>
            <div className="oy-file-icon">🧾</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="oy-plan-title">{entry.action.replaceAll("_", " ")}</div>
              <div className="oy-plan-detail">{entry.detail ?? "No additional detail captured."}</div>
              <div className="oy-activity-time">{new Date(entry.at).toLocaleString()}</div>
            </div>
          </div>
        )) : <p className="oy-card-copy">No audit events recorded yet.</p>}
      </article>
    </WorkspaceShell>
  );
}
