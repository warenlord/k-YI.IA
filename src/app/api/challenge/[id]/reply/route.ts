import { NextResponse } from "next/server";

import { MAX_INPUT_LENGTH, MAX_MESSAGES } from "@/lib/constants";
import type { ChallengeMessage } from "@/lib/database.types";
import { openaiApiKey } from "@/lib/env";
import { CONVERSATION_RULES, LAST_MESSAGE_NOTE, MODES, isModeId } from "@/lib/modes";
import { describeError, streamTurn } from "@/lib/openai";
import { ndjsonResponse } from "@/lib/stream";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Poursuit une session existante. Tout l'historique est renvoyé au modèle, et
 * le plafond est appliqué ici — un garde-fou de coût côté client ne garde rien.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/challenge/[id]/reply">,
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Session expirée. Reconnecte-toi." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const reply =
    typeof (payload as { reply?: unknown })?.reply === "string"
      ? (payload as { reply: string }).reply.trim()
      : "";

  if (!reply) {
    return NextResponse.json({ error: "Réponse vide." }, { status: 400 });
  }
  if (reply.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `Réponse trop longue (max ${MAX_INPUT_LENGTH} caractères).` },
      { status: 400 },
    );
  }

  try {
    openaiApiKey();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Configuration incomplète.";
    console.error("[reply] configuration", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // La RLS restreint déjà la lecture au propriétaire : pas de filtre user_id
  // supplémentaire à écrire, une session d'un autre compte renvoie simplement
  // aucune ligne.
  const { data: challenge, error: loadError } = await supabase
    .from("challenges")
    .select("id, mode, messages")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !challenge) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  if (!isModeId(challenge.mode)) {
    return NextResponse.json({ error: "Mode inconnu." }, { status: 400 });
  }

  const history: ChallengeMessage[] = Array.isArray(challenge.messages)
    ? challenge.messages
    : [];

  // Il faut de la place pour la relance ET pour la réponse du modèle.
  if (history.length + 2 > MAX_MESSAGES) {
    return NextResponse.json(
      {
        error: `Cette session a atteint sa limite de ${MAX_MESSAGES} messages. Démarre une nouvelle session.`,
      },
      { status: 409 },
    );
  }

  const withReply: ChallengeMessage[] = [
    ...history,
    { role: "user", content: reply },
  ];

  // Le modèle ne peut pas deviner qu'il n'aura plus la parole : on le lui dit.
  const isLastTurn = withReply.length + 1 >= MAX_MESSAGES;

  const instructions = [
    MODES[challenge.mode].systemPrompt,
    CONVERSATION_RULES,
    isLastTurn ? LAST_MESSAGE_NOTE : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return ndjsonResponse(async (send) => {
    send({ type: "meta", id });

    let messages = withReply;
    let status: "complete" | "error" = "complete";
    let errorMessage: string | null = null;

    try {
      const { text, errorMessage: turnError } = await streamTurn({
        instructions,
        input: withReply,
        signal: request.signal,
        onDelta: (delta) => send({ type: "delta", text: delta }),
      });

      if (text) {
        messages = [...withReply, { role: "assistant", content: text }];
      }

      if (turnError) {
        status = "error";
        errorMessage = turnError;
        send({ type: "error", message: turnError });
      } else {
        send({ type: "done", remaining: MAX_MESSAGES - messages.length });
      }
    } catch (error) {
      status = "error";
      errorMessage = describeError(error);
      console.error("[reply] stream failed", error);
      send({ type: "error", message: errorMessage });
    } finally {
      await supabase
        .from("challenges")
        .update({ messages, status, error_message: errorMessage })
        .eq("id", id);
    }
  });
}
