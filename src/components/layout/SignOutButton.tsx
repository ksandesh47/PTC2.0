"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setLoading(false);
      return;
    }
    window.location.replace("/auth/login");
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      className="text-sm font-semibold text-(--color-clay-400) hover:text-(--color-clay-200) transition-colors disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
