import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { excerpt, formatDate } from "@/lib/format";
import { MODES, type ModeId } from "@/lib/modes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Historique — kÆYI",
};

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("id, mode, input, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[historique] select failed", error);
  }

  const challenges = data ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8 space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Historique</h1>
        <p className="text-muted-foreground text-sm">
          Tes 50 derniers échanges.
        </p>
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Rien pour l&apos;instant.
          </p>
          <Link
            href="/challenge"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            Faire une première soumission
          </Link>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <Link
                href={`/historique/${challenge.id}`}
                className="hover:bg-muted/40 block px-4 py-4 transition-colors sm:px-5"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {MODES[challenge.mode as ModeId]?.short ?? challenge.mode}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(challenge.created_at)}
                  </span>
                  {challenge.status === "error" ? (
                    <span className="text-destructive text-xs">échec</span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed">
                  {excerpt(challenge.input)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
