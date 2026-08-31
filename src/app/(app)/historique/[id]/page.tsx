import Link from "next/link";
import { notFound } from "next/navigation";

import { ResponseView } from "@/components/response-view";
import { Badge } from "@/components/ui/badge";
import type { ChallengeMessage } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { MODES, isModeId } from "@/lib/modes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChallengeDetailPage(
  props: PageProps<"/historique/[id]">,
) {
  const { id } = await props.params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("id, mode, input, output, messages, status, error_message, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const mode = isModeId(data.mode) ? MODES[data.mode] : null;

  // Repli pour les sessions antérieures au multi-tours qui n'auraient pas été
  // reprises par la migration.
  const messages: ChallengeMessage[] =
    Array.isArray(data.messages) && data.messages.length > 0
      ? data.messages
      : [
          { role: "user", content: data.input },
          ...(data.output
            ? [{ role: "assistant" as const, content: data.output }]
            : []),
        ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href="/historique"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm transition-colors"
      >
        ← Historique
      </Link>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {mode?.short ?? data.mode}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {formatDate(data.created_at)}
        </span>
        <span className="text-muted-foreground text-xs">
          · {messages.length} message{messages.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-6">
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="border-foreground/20 border-l-2 pl-4">
              <p className="text-muted-foreground mb-1 text-xs">Toi</p>
              <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          ) : (
            <div key={index} className="rounded-lg border p-5 sm:p-6">
              <ResponseView content={message.content} />
            </div>
          ),
        )}
      </div>

      {data.status === "error" && data.error_message ? (
        <p className="border-destructive/30 bg-destructive/5 text-destructive mt-6 rounded-md border px-3 py-2 text-sm">
          {data.error_message}
        </p>
      ) : null}
    </main>
  );
}
