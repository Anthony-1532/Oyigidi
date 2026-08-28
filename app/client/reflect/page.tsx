import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { JournalEditor } from "@/components/client/forms";
import { JournalList } from "@/components/client/journal-list";

export default async function ReflectPage() {
  const person = (await getSession(await headers()))!;
  const journals = repo.journals.listByClient(person.id);
  return (
    <WorkspaceShell person={person} activeHref="/client/reflect" sectionLabel="Coachee workspace" breadcrumb="Your development · Reflect">
      <PageIntro
        eyebrow="Reflect"
        title="Notice what is changing."
        subtitle="A private journal for observations, questions, and moments worth returning to."
        action={<JournalEditor />}
      />
      <JournalList journals={journals} />
    </WorkspaceShell>
  );
}
