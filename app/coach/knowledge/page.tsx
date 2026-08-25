import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { PageIntro, WorkspaceShell } from "@/components/shell";
import { KnowledgeUploader } from "@/components/coach/forms";

export default async function CoachKnowledgePage() {
  const person = (await getSession(await headers()))!;
  const documents = repo.knowledge.list();
  return (
    <WorkspaceShell person={person} activeHref="/coach/knowledge" sectionLabel="Coach workspace" breadcrumb="Coach · Knowledge">
      <PageIntro eyebrow="Coach · Knowledge" title="Approve what the AI may draw on." subtitle="Uploaded text is chunked and retrieved only inside your assigned clients' coaching conversations." />
      <div className="oy-coach-grid">
        <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
          <div className="oy-card-label">Approved sources</div>
          <h3 className="oy-card-heading">{documents.length ? `${documents.length} documents · ${documents.reduce((s, d) => s + d.chunkCount, 0)} chunks` : "No sources yet"}</h3>
          {documents.map((document) => (
            <div className="oy-knowledge-row" key={document.id}>
              <div className="oy-file-icon">📄</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="oy-file-name">{document.title}</div>
                <div className="oy-file-meta">{document.scope} scope · {document.chunkCount} chunks · {new Date(document.createdAt).toLocaleDateString()}</div>
              </div>
              <span className="oy-ready">{document.status}</span>
            </div>
          ))}
        </article>
        <aside><KnowledgeUploader /></aside>
      </div>
    </WorkspaceShell>
  );
}
