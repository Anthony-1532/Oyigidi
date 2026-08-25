"use client";

// Landing / sign-in. Demo boundary: choosing a role sets the httpOnly session
// cookie via the API (server-side verified everywhere thereafter).

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const ROLES = [
  { role: "client", name: "Aisha Mohammed", detail: "Client workspace — goals, reflections, coaching conversations" },
  { role: "coach", name: "Samira Okonkwo", detail: "Coach workspace — clients, programs, knowledge, AI oversight" },
  { role: "admin", name: "Tony Anthony", detail: "Admin console — people, audit trail, frameworks, privacy tools" },
] as const;

export function SignInSection() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const signIn = async (role: string) => {
    setError(null);
    const res = await fetch("/api/v1/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      setError("Sign-in failed. Please try again.");
      return;
    }
    startTransition(() => router.push(role === "client" ? "/client" : `/${role}`));
    router.refresh();
  };

  return (
    <div className="oy-app" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <article className="oy-card oy-plan-card" style={{ maxWidth: 660, padding: 28 }}>
        <div className="oy-brand"><span className="oy-brand-mark">o</span><span>oyigidi</span></div>
        <div className="oy-card-label" style={{ marginTop: 24 }}>Oyigidi AI</div>
        <h1 className="oy-page-title" style={{ marginTop: 10 }}>Coaching intelligence with a human in the loop.</h1>
        <p className="oy-card-copy" style={{ marginTop: 12 }}>
          A private development workspace: clients reflect and grow, coaches author curriculum and approved
          knowledge, administrators keep every action accountable.
        </p>
        <div className="oy-section-header" style={{ marginTop: 22, marginBottom: 8 }}>
          <span className="oy-card-label">Choose a demo identity</span>
          <span className="oy-preview-tag">No passwords · sessions are mocked</span>
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          {ROLES.map(({ role, name, detail }) => (
            <button key={role} type="button" className="oy-button is-muted" style={{ justifyContent: "flex-start", padding: "13px 15px", minHeight: 0 }} disabled={pending} onClick={() => void signIn(role)}>
              <strong style={{ minWidth: 52, textAlign: "left", textTransform: "capitalize" }}>{role}</strong>
              <span style={{ fontWeight: 400, fontSize: 12 }}>{name} · {detail}</span>
            </button>
          ))}
        </div>
        {error && <p className="oy-card-copy" style={{ color: "#a33b2e", marginTop: 12 }}>{error}</p>}
        <div className="oy-safety-note" style={{ marginTop: 18 }}>
          Oyigidi supports coaching and self-development. It is not a crisis or clinical-care service — for urgent concerns contact qualified local support.
        </div>
      </article>
    </div>
  );
}
