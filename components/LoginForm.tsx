"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/overview";

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Section 32 (AN2): 2FA - zweiter Schritt, falls requiresTwoFactor.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      if (res.status === 401) {
        setError("Login oder Passwort ist falsch.");
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Zu viele Versuche. Bitte später erneut versuchen.");
        return;
      }
      if (res.status === 502) {
        setError("PHÖNIX Backend ist momentan nicht erreichbar. Bitte später erneut versuchen.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.requiresTwoFactor && data?.pendingToken) {
        setPendingToken(data.pendingToken);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingToken || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Falscher Code.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingToken) {
    return (
      <form onSubmit={handleTwoFactorSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="two-factor-code" className="mb-1 block text-sm font-medium text-neutral-700">
            Code aus der Authenticator-App
          </label>
          <input
            id="two-factor-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting || !code.trim()} className="w-full">
          {submitting ? "Prüfe…" : "Bestätigen"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600"
          onClick={() => {
            setPendingToken(null);
            setCode("");
            setError(null);
          }}
        >
          Zurück zum Login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="login" className="mb-1 block text-sm font-medium text-neutral-700">
          Login
        </label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Anmelden…" : "Anmelden"}
      </Button>
    </form>
  );
}
