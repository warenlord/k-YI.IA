"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ModePicker } from "@/components/mode-picker";
import { ResponseView } from "@/components/response-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_INPUT_LENGTH,
  MAX_MESSAGES,
  MIN_INPUT_LENGTH,
} from "@/lib/constants";
import type { ChallengeMessage } from "@/lib/database.types";
import { MODES, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";

type Phase = "compose" | "running" | "idle";

interface StreamHandlers {
  onMeta?: (id: string) => void;
  onDelta: (text: string) => void;
  onError: (message: string) => void;
}

/** Lit le flux NDJSON de l'API ligne par ligne. */
async function readStream(body: ReadableStream<Uint8Array>, handlers: StreamHandlers) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let event: { type: string; text?: string; message?: string; id?: string };
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.type === "delta" && event.text) {
        handlers.onDelta(event.text);
      } else if (event.type === "meta" && event.id) {
        handlers.onMeta?.(event.id);
      } else if (event.type === "error") {
        handlers.onError(event.message ?? "Une erreur est survenue.");
      }
    }
  }
}

export function ChallengeWorkbench() {
  const router = useRouter();

  const [mode, setMode] = useState<ModeId | null>(null);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");

  const [messages, setMessages] = useState<ChallengeMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [phase, setPhase] = useState<Phase>("compose");
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const lastTurnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (phase === "running") {
      lastTurnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase, messages.length]);

  const trimmed = input.trim();
  const canSubmit =
    mode !== null &&
    trimmed.length >= MIN_INPUT_LENGTH &&
    trimmed.length <= MAX_INPUT_LENGTH;

  // Il faut de la place pour la relance ET pour la réponse : même règle que le
  // serveur, qui reste seul juge.
  const sessionFull = messages.length + 2 > MAX_MESSAGES;
  const remaining = Math.max(0, MAX_MESSAGES - messages.length);

  /** Consomme un flux et bascule le texte accumulé dans l'historique. */
  async function pump(request: () => Promise<Response>) {
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming("");
    setError(null);
    setPhase("running");

    let accumulated = "";
    let failed = false;

    try {
      const response = await request();

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        setError(
          (body as { error?: string } | null)?.error ??
            "La requête a échoué. Réessaie.",
        );
        setPhase("idle");
        return;
      }

      await readStream(response.body, {
        onMeta: (id) => setChallengeId(id),
        onDelta: (text) => {
          accumulated += text;
          setStreaming(accumulated);
        },
        onError: (message) => {
          failed = true;
          setError(message);
        },
      });
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError("Connexion interrompue. Réessaie.");
      }
    } finally {
      abortRef.current = null;
      if (accumulated) {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: accumulated },
        ]);
      }
      setStreaming("");
      setPhase("idle");
      if (!failed) router.refresh();
    }
  }

  async function start() {
    if (!canSubmit || !mode) return;
    setMessages([{ role: "user", content: trimmed }]);
    await pump(() =>
      fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input: trimmed }),
      }),
    );
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !challengeId || sessionFull) return;
    setReply("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    await pump(() =>
      fetch(`/api/challenge/${challengeId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: text }),
      }),
    );
  }

  function reset() {
    abortRef.current?.abort();
    setPhase("compose");
    setMessages([]);
    setStreaming("");
    setError(null);
    setInput("");
    setReply("");
    setMode(null);
    setChallengeId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeMode = mode ? MODES[mode] : null;

  if (phase === "compose") {
    return (
      <div className="space-y-10">
        <section className="space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              Qu&apos;est-ce que tu t&apos;apprêtes à faire&nbsp;?
            </h1>
            <p className="text-muted-foreground text-sm">
              Choisis un cadre. La réponse ne sera pas un encouragement.
            </p>
          </div>
          <ModePicker value={mode} onChange={setMode} />
        </section>

        {activeMode ? (
          <section className="space-y-3">
            <Label htmlFor="input" className="text-sm font-medium">
              {activeMode.inputLabel}
            </Label>
            <Textarea
              id="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void start();
                }
              }}
              placeholder={activeMode.placeholder}
              autoFocus
              // 16 px sous `sm` : en dessous, Safari iOS zoome à la mise au
              // point du champ et l'utilisateur doit dézoomer à la main.
              className="min-h-60 resize-y text-base leading-relaxed sm:text-[0.9375rem]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={cn(
                  "text-xs",
                  trimmed.length > MAX_INPUT_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {trimmed.length.toLocaleString("fr-FR")} /{" "}
                {MAX_INPUT_LENGTH.toLocaleString("fr-FR")} caractères
              </span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  ⌘ + Entrée
                </span>
                <Button onClick={() => void start()} disabled={!canSubmit}>
                  Challenger
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={conversationRef}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {activeMode?.label}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {remaining} message{remaining > 1 ? "s" : ""} restant
          {remaining > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-6">
        {messages.map((message, index) =>
          message.role === "user" ? (
            <UserTurn
              key={index}
              content={message.content}
              collapsible={index === 0}
            />
          ) : (
            <AssistantTurn key={index} content={message.content} />
          ),
        )}

        {phase === "running" ? (
          <div ref={lastTurnRef}>
            <AssistantTurn content={streaming} streaming />
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {phase === "running" ? (
        <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
          Arrêter
        </Button>
      ) : sessionFull ? (
        <div className="bg-muted/40 space-y-3 rounded-lg border p-5">
          <p className="text-sm font-medium">Session terminée.</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {MAX_MESSAGES} messages, c&apos;est la limite. Au-delà, l&apos;échange
            tourne à la négociation avec l&apos;outil plutôt qu&apos;avec le
            problème. Repars d&apos;un texte neuf si le sujet a bougé.
          </p>
          <Button onClick={reset}>Nouvelle session</Button>
        </div>
      ) : (
        <section className="space-y-3">
          <Label htmlFor="reply" className="text-sm font-medium">
            Réponds, justifie-toi, ou conteste
          </Label>
          <Textarea
            id="reply"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void sendReply();
              }
            }}
            placeholder="Ce que tu as déjà pris en compte, ou ce sur quoi tu n'es pas d'accord…"
            className="min-h-28 resize-y text-base leading-relaxed sm:text-[0.9375rem]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={reset}>
              Nouvelle session
            </Button>
            <Button onClick={() => void sendReply()} disabled={!reply.trim()}>
              Envoyer
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function UserTurn({
  content,
  collapsible,
}: {
  content: string;
  collapsible: boolean;
}) {
  if (!collapsible) {
    return (
      <div className="border-foreground/20 border-l-2 pl-4">
        <p className="text-muted-foreground mb-1 text-xs">Toi</p>
        <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    );
  }

  return (
    <details className="bg-muted/40 group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm">
        <span className="text-muted-foreground min-w-0 flex-1 truncate">
          {content}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs group-open:hidden">
          voir
        </span>
        <span className="text-muted-foreground hidden shrink-0 text-xs group-open:inline">
          masquer
        </span>
      </summary>
      <p className="text-muted-foreground border-t px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </details>
  );
}

function AssistantTurn({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  return (
    <div className="rounded-lg border p-5 sm:p-6">
      {content ? (
        <ResponseView content={content} />
      ) : streaming ? (
        <ThinkingIndicator />
      ) : null}
      {streaming && content ? (
        <span className="bg-foreground/70 ml-0.5 inline-block h-4 w-[2px] animate-pulse align-text-bottom" />
      ) : null}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5" aria-live="polite">
      <span className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
            style={{ animationDelay: `${index * 140}ms` }}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-sm">Il lit ton texte…</span>
    </div>
  );
}
