"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; name: string; email: string; role: string; accountStatus: string };

/** People management + audited privacy governance tools. */
export function AdminPeoplePanel({ people }: { people: Person[] }) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"client" | "coach" | "admin">("client");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const post = async (payload: Record<string, unknown>) => {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/admin/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) return setFeedback(body?.error?.message ?? `Request failed (${res.status})`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const provision = async () => {
    if (!inviteEmail.trim()) return;
    await post({ action: "provision", email: inviteEmail.trim(), role: inviteRole, accountStatus: "active" });
    setInviteEmail("");
  };

  const update = async (person: Person, patch: Partial<Pick<Person, "role" | "accountStatus">>) => {
    await post({ action: "set-access", userId: person.id, role: patch.role ?? person.role, accountStatus: patch.accountStatus ?? person.accountStatus });
  };

  return <>
    <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
      <div className="oy-card-label">Pre-provision a membership</div>
      <p className="oy-card-copy">Creates an active membership for an email before their first sign-in.</p>
      <form onSubmit={(event) => { event.preventDefault(); void provision(); }} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginTop: 10 }}>
        <input type="email" required placeholder="person@example.com" aria-label="Provision email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} style={{ minWidth: 0, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
        <select aria-label="Role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)} style={{ padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }}>
          <option value="client">Client</option><option value="coach">Coach</option><option value="admin">Admin</option>
        </select>
        <button type="submit" className="oy-button" disabled={pending}>{pending ? "Working…" : "Provision"}</button>
      </form>
      {feedback && <p className="oy-card-copy" style={{ color: "#a33b2e", marginTop: 10 }}>{feedback}</p>}
    </article>

    <article className="oy-card oy-plan-card" style={{ padding: 22, marginTop: 18 }}>
      <div className="oy-card-label">Accounts ({people.length})</div>
      <div style={{ marginTop: 8 }}>
        {people.map((person) => (
          <div className="oy-plan-item" key={person.id} style={{ alignItems: "center" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="oy-plan-title">{person.name} {person.accountStatus !== "active" && <span className="oy-escalation-tag">suspended</span>}</div>
              <div className="oy-plan-detail">{person.email}</div>
            </div>
            <select
              aria-label={`Role for ${person.name}`}
              defaultValue={person.role}
              onChange={(event) => void update(person, { role: event.target.value })}
              style={{ padding: 7, borderRadius: 7, border: "1px solid #e4d9cc", background: "#fffdf8" }}
            >
              <option value="client">Client</option><option value="coach">Coach</option><option value="admin">Admin</option>
            </select>
            <button type="button" className="oy-status" onClick={() => void update(person, { accountStatus: person.accountStatus === "active" ? "suspended" : "active" })}>
              {person.accountStatus}
            </button>
          </div>
        ))}
      </div>
    </article>

    <GovernancePanel clients={people.filter((p) => p.role === "client")} />
  </>;
}

function GovernancePanel({ clients }: { clients: Person[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selected = clients.find((c) => c.id === userId);

  const erase = async () => {
    if (!userId) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/people", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, confirmEmail }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) return setMessage(body?.error?.message ?? "Erasure failed");
      setMessage("Coaching data erased and membership suspended. Recorded in the audit trail.");
      setConfirmEmail("");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const exportData = async () => {
    if (!userId) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/people", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) return setMessage(payload?.error?.message ?? "Export failed");
      const blob = new Blob([JSON.stringify(payload.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `oyigidi-client-${selected?.email ?? userId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="oy-section">
      <div className="oy-section-header">
        <h2 className="oy-section-title">Privacy & data governance</h2>
        <span className="oy-preview-tag">Audited actions</span>
      </div>
      <div className="oy-today-grid">
        <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
          <div className="oy-card-label">Export a client&apos;s data</div>
          <h3 className="oy-card-heading">Portable JSON copy</h3>
          <p className="oy-card-copy">Profile, goals, reflections, assessments, conversations — downloaded as one file. Audited.</p>
          <label className="oy-question-domain" htmlFor="g-export" style={{ display: "block", marginTop: 12 }}>Client</label>
          <select id="g-export" value={userId} onChange={(event) => setUserId(event.target.value)} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }}>
            <option value="">Select a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" className="oy-button is-muted" style={{ width: "100%", marginTop: 12 }} disabled={!userId || pending} onClick={() => void exportData()}>Download export</button>
        </article>
        <article className="oy-card oy-plan-card" style={{ padding: 20 }}>
          <div className="oy-card-label">Erase a client&apos;s coaching data</div>
          <h3 className="oy-card-heading">Deletion on request</h3>
          <p className="oy-card-copy">Removes all coaching records and suspends the membership. Requires typing the client&apos;s exact email.</p>
          <label className="oy-question-domain" htmlFor="g-confirm" style={{ display: "block", marginTop: 12 }}>Type the client&apos;s email to confirm</label>
          <input id="g-confirm" autoComplete="off" placeholder={selected?.email ?? "client@example.com"} value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} style={{ width: "100%", marginTop: 6, padding: "10px 11px", borderRadius: 8, border: "1px solid #e4d9cc", background: "#fffdf8" }} />
          <button type="button" className="oy-button" style={{ width: "100%", marginTop: 12, background: "#7a2733" }} disabled={!userId || !confirmEmail || pending} onClick={() => void erase()}>{pending ? "Erasing…" : "Erase coaching data"}</button>
        </article>
      </div>
      {message && <p className="oy-card-copy" style={{ marginTop: 10 }}>{message}</p>}
    </section>
  );
}

export function FrameworkToggles({ frameworks }: { frameworks: Array<{ id: string; label: string; description?: string; enabled: boolean }> }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggle = async (framework: { id: string; enabled: boolean }) => {
    setPendingId(framework.id);
    try {
      await fetch("/api/v1/admin/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "toggle-framework", frameworkId: framework.id, enabled: !framework.enabled }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <article className="oy-card oy-plan-card" style={{ padding: 22 }}>
      {frameworks.map((framework) => (
        <div className="oy-plan-item" key={framework.id}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="oy-plan-title">{framework.label}</div>
            <div className="oy-plan-detail">{framework.description ?? "No description available."}</div>
          </div>
          <button type="button" className={`oy-status ${framework.enabled ? "" : "is-off"}`} disabled={pendingId === framework.id} onClick={() => void toggle(framework)}>
            {framework.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      ))}
    </article>
  );
}
