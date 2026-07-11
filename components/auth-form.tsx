"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { Card, ErrorBanner } from "@/components/ui";

type Mode = "signin" | "signup";

export function AuthForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
                : undefined,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Autoconfirm is on — straight in.
          router.push(redirectTo);
          router.refresh();
        } else {
          setNotice(
            "Account created. Check your email for a confirmation link, then sign in.",
          );
          setMode("signin");
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

  return (
    <Card className="mx-auto w-full max-w-sm p-6">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand)] text-lg font-semibold text-white">
          £
        </div>
        <h1 className="text-lg font-semibold">
          {mode === "signin" ? "Sign in to my-fin-app" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === "signin"
            ? "Management reporting & forecasting."
            : "You'll get a confirmation email to verify your address."}
        </p>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            autoComplete="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-[var(--muted)]">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              className="font-medium text-indigo-600 hover:underline"
              onClick={() => {
                setMode("signup");
                setError(null);
                setNotice(null);
              }}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              className="font-medium text-indigo-600 hover:underline"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
