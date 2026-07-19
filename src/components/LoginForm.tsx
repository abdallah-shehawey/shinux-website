"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function withProvider(provider: "github" | "google") {
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
    // On success the browser is redirected away by Supabase — nothing more to do.
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="card text-center">
        <p className="font-medium text-fg">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <span className="text-fg">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => withProvider("github")}
        disabled={status === "loading"}
        className="btn-ghost w-full justify-center"
      >
        Continue with GitHub
      </button>
      <button
        type="button"
        onClick={() => withProvider("google")}
        disabled={status === "loading"}
        className="btn-ghost w-full justify-center"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary w-full justify-center"
        >
          Continue with email
        </button>
      </form>

      {status === "error" && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
