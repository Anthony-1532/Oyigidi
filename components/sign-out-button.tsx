"use client";

// Sign-out goes through DELETE /api/v1/session, never a GET link. The session
// cookie is sameSite: "lax", so a top-level GET is reachable cross-site — a
// prefetcher or an <img> pointing at a GET sign-out route would end the
// session uninvited. A fetch with a non-idempotent method is not.

import { useState } from "react";

export function SignOutButton({ style }: { style?: React.CSSProperties }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/v1/session", { method: "DELETE" });
      if (!res.ok) {
        setFailed(true);
        setPending(false);
        return;
      }
      // A full document navigation, not router.push(). Every page here renders
      // from the session cookie, and the App Router keeps a client-side cache
      // of payloads already rendered for the previous role — pushing can replay
      // one and land the user back in the workspace they just left. Reloading
      // the document drops that cache entirely. No setPending: the page is
      // being torn down and the button should stay disabled until it goes.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate: a client-side push preserves the cache we need to discard.
      window.location.assign("/");
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <button type="button" className="oy-link" style={style} disabled={pending} onClick={() => void signOut()}>
      {pending ? "Signing out…" : failed ? "Sign out failed — retry" : "Sign out"}
    </button>
  );
}
