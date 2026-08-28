import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { ChatPanel } from "@/components/client/chat-panel";

export default async function CoachChatPage() {
  const person = (await getSession(await headers()))!;
  const conversation = repo.conversations.forClient(person.id);
  const messages = conversation ? repo.messages.forConversation(conversation.id) : [];
  return (
    <WorkspaceShell person={person} activeHref="/client/coach" sectionLabel="Coachee workspace" breadcrumb="Your development · Coach">
      <PageIntro eyebrow="Coach" title="A private space with your context in mind." subtitle="Conversations draw on your focus, goals, curriculum, and coach-approved knowledge — never anyone else's data." />
      <div style={{ maxWidth: 800 }}>
        <ChatPanel preferredName={person.preferredName ?? "there"} initialMessages={messages} />
      </div>
    </WorkspaceShell>
  );
}
