"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

/** Changement de mot de passe dirigeant via Supabase Auth (session active). */
export function ParametresChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Impossible de mettre à jour le mot de passe.");
      return;
    }

    setPassword("");
    setConfirm("");
    setMessage("Mot de passe mis à jour.");
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <header>
        <h2 className="text-lg font-semibold">Mot de passe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifie le mot de passe de votre compte dirigeant (Supabase Auth).
        </p>
      </header>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label>Nouveau mot de passe</Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </div>
        <div>
          <Label>Confirmation</Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </section>
  );
}
