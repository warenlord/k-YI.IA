"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "sending" | "sent" | "error";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");

    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo.toString() },
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Lien envoyé.</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Ouvre le mail envoyé à{" "}
          <span className="text-foreground font-medium">{email}</span> et clique
          sur le lien. Il est valable une heure et ne fonctionne qu&apos;une
          fois.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => {
            setState("idle");
            setMessage("");
          }}
        >
          Utiliser une autre adresse
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="toi@exemple.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={state === "sending"}
        />
      </div>

      {message ? (
        <p className="text-destructive text-sm" role="alert">
          {message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Envoi…" : "Recevoir mon lien de connexion"}
      </Button>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Pas de mot de passe. On t&apos;envoie un lien à usage unique.
      </p>
    </form>
  );
}
