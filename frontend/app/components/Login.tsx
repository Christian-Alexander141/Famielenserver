"use client";

import { useState, type FormEvent } from "react";
import Icon from "./ui/Icon";
import { ErrorText } from "./ui/feedback";
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
    <form onSubmit={submit} className="card mx-auto mt-8 w-full max-w-sm p-6 sm:mt-16 sm:p-8">
      <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent-text">
        <Icon name="lock" className="size-6" strokeWidth={1.75} />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">Anmelden</h1>
      <p className="mt-1 text-sm text-muted">Bitte das Familien-Passwort eingeben.</p>
      <label htmlFor="password" className="mt-6 block text-sm font-medium">
        Passwort
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input mt-1.5"
        autoComplete="current-password"
        aria-invalid={!!error}
        autoFocus
      />
      {error && <ErrorText className="mt-3">{error}</ErrorText>}
      <button type="submit" className="btn btn-primary mt-5 w-full" disabled={busy || !password}>
        {busy && <span className="spinner size-4" />}
        Anmelden
      </button>
    </form>
  );
}
