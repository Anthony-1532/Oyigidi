"use client";

// Sign-out goes through DELETE /api/v1/session, never a GET link. The session
// cookie is sameSite: "lax", so a top-level GET is reachable cross-site — a
// prefetcher or an <img src> pointing at a GET sign-out route would end the
// session uninvited. A fetch with a non-idempotent method is not.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SignOutButton({ style }: { style?: React.CSSProperties }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setFailed(false);
    const res = await fetch("/api/v1/session", { method: "DELETE" });
    if (!res.ok) {
      setFailed(true);
      return;
    }
    startTransition(() => router.push("/"));
    router.refresh();
  };

  return (
    <button type="button" className="oy-link" style={style} disabled={pending} onClick={() => void signOut()}>
      {pending ? "Signing out…" : failed ? "Sign out failed — retry" : "Sign out"}
    </button>
  );
}
