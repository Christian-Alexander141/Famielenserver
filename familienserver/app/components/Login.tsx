"use client";

import { useState, type FormEvent } from "react";
import { apiPost, errorMessage } from "../lib/api";

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/login", { password });
      onLoggedIn();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ios-card mx-auto mt-10 max-w-sm">
      <h2 className="mb-1 text-lg font-medium">🔒 Anmelden</h2>
      <p className="mb-4 text-sm text-gray-400">Bitte das Familien-Passwort eingeben.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="ios-input mb-3"
        placeholder="Passwort"
        autoComplete="current-password"
        aria-label="Passwort"
        autoFocus
      />
      {error && <p className="mb-3 text-sm text-red-400">❌ {error}</p>}
      <button type="submit" className="ios-button w-full" disabled={busy || !password}>
        {busy ? "…" : "Anmelden"}
      </button>
    </form>
  );
}
