"use client";

// Landing / sign-in. Demo boundary: choosing a role sets the httpOnly session
// cookie via the API (server-side verified everywhere thereafter).

import { useState } from "react";

const ROLES = [
  { role: "client", name: "Aisha Mohammed", detail: "Coachee workspace — goals, reflections, coaching conversations" },
  { role: "coach", name: "Samira Okonkwo", detail: "Coach workspace — coachees, programs, knowledge, AI oversight" },
  { role: "admin", name: "Tony Anthony", detail: "Admin console — people, audit trail, frameworks, privacy tools" },
] as const;

export function SignInSection() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (role: string) => {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/v1/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        setError("Sign-in failed. Please try again.");
        setPending(false);
        return;
      }
      // Full document navigation for the same reason as sign-out: the workspace
      // renders from the session cookie, and a client-side push can replay a
      // cached payload from a previous role. No setPending on success — the
      // page is on its way out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate: a client-side push preserves the cache we need to discard.
      window.location.assign(`/${role}`);
    } catch {
      setError("Sign-in failed. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="oy-app oy-signin-page">
      <article className="oy-card oy-plan-card oy-signin-card">
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
        <div className="oy-role-choices">
          {ROLES.map(({ role, name, detail }) => (
            <button key={role} type="button" className="oy-button is-muted oy-role-choice" disabled={pending} onClick={() => void signIn(role)}>
              <strong>{role}</strong>
              <span>{name} · {detail}</span>
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
