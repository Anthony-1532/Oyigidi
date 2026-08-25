import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { FrameworkToggles } from "@/components/admin/panels";

export default async function AdminFrameworksPage() {
  const person = (await getSession(await headers()))!;
  const frameworks = repo.frameworks.list();
  return (
    <WorkspaceShell person={person} activeHref="/admin/frameworks" sectionLabel="Admin console" breadcrumb="Admin · Frameworks">
      <PageIntro eyebrow="Admin · Frameworks" title="Controls that hold the platform accountable." subtitle="Manage which educational frameworks and assessment experiences are available. Changes are captured in the audit trail." />
      <FrameworkToggles frameworks={frameworks.map((f) => ({ id: f.id, label: f.label, description: f.description, enabled: f.enabled }))} />
    </WorkspaceShell>
  );
}
