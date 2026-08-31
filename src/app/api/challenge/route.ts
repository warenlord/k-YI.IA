import { NextResponse } from "next/server";

import {
  MAX_INPUT_LENGTH,
  MAX_MESSAGES,
  MIN_INPUT_LENGTH,
} from "@/lib/constants";
import type { ChallengeMessage } from "@/lib/database.types";
import { openaiApiKey } from "@/lib/env";
import { MODES, isModeId } from "@/lib/modes";
import { describeError, streamTurn } from "@/lib/openai";
import { ndjsonResponse } from "@/lib/stream";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel : laisse la place à une réponse complète (Hobby plafonne à 60 s). */
export const maxDuration = 60;

/** Ouvre une session : premier message de l'utilisateur, puis le verdict. */
export async function POST(request: Request) {
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

  const { mode, input } = (payload ?? {}) as {
    mode?: unknown;
    input?: unknown;
  };

  if (!isModeId(mode)) {
    return NextResponse.json({ error: "Mode inconnu." }, { status: 400 });
  }

  const text = typeof input === "string" ? input.trim() : "";
  if (text.length < MIN_INPUT_LENGTH) {
    return NextResponse.json(
      {
        error: `Donne-moi un peu plus de matière (${MIN_INPUT_LENGTH} caractères minimum).`,
      },
      { status: 400 },
    );
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `Texte trop long (max ${MAX_INPUT_LENGTH} caractères).` },
      { status: 400 },
    );
  }

  // Avant d'écrire quoi que ce soit en base : sans clé, la requête est perdue
  // d'avance et laisserait une session « streaming » orpheline.
  try {
    openaiApiKey();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Configuration incomplète.";
    console.error("[challenge] configuration", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const opening: ChallengeMessage[] = [{ role: "user", content: text }];

  const { data: challenge, error: insertError } = await supabase
    .from("challenges")
    .insert({ user_id: user.id, mode, input: text, messages: opening })
    .select("id")
    .single();

  if (insertError || !challenge) {
    console.error("[challenge] insert failed", insertError);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la demande." },
      { status: 500 },
    );
  }

  const challengeId = challenge.id;

  return ndjsonResponse(async (send) => {
    send({ type: "meta", id: challengeId });

    let messages = opening;
    let status: "complete" | "error" = "complete";
    let errorMessage: string | null = null;

    try {
      const { text: verdict, errorMessage: turnError } = await streamTurn({
        instructions: MODES[mode].systemPrompt,
        input: opening,
        signal: request.signal,
        onDelta: (delta) => send({ type: "delta", text: delta }),
      });

      if (verdict) {
        messages = [...opening, { role: "assistant", content: verdict }];
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
      console.error("[challenge] stream failed", error);
      send({ type: "error", message: errorMessage });
    } finally {
      // On enregistre ce qui a été produit, même en cas d'interruption.
      await supabase
        .from("challenges")
        .update({
          messages,
          output: messages[1]?.content ?? "",
          status,
          error_message: errorMessage,
        })
        .eq("id", challengeId);
    }
  });
}
