import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { AdminPeoplePanel } from "@/components/admin/panels";

export default async function AdminPeoplePage() {
  const person = (await getSession(await headers()))!;
  return (
    <WorkspaceShell person={person} activeHref="/admin/people" sectionLabel="Admin console" breadcrumb="Admin · People">
      <PageIntro eyebrow="Admin · People" title="Access is granted deliberately." subtitle="Accounts start suspended unless provisioned — role and status changes are always captured in the audit trail." />
      <AdminPeoplePanel people={repo.people.list().map((p) => ({ id: p.id, name: p.name, email: p.email, role: p.role, accountStatus: p.accountStatus }))} />
    </WorkspaceShell>
  );
}
