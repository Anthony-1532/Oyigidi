import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, roleHome } from "@/lib/auth/session";
import { WorkspaceShell } from "@/components/shell";
import { ClientWorkspace } from "@/components/client/workspace";

export default async function ClientTodayPage() {
  const person = await getSession(await headers());
  if (!person || person.role !== "client") redirect(person ? roleHome[person.role] : "/");
  return (
    <WorkspaceShell person={person} activeHref="/client" sectionLabel="Coachee workspace" breadcrumb="Your development · Today">
      <ClientWorkspace person={person} />
    </WorkspaceShell>
  );
}
