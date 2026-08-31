import { NextResponse } from "next/server";

import { resolveOrigin, safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Cible du template d'email Supabase par défaut (flow PKCE : `?code=...`).
 * Le template personnalisé, lui, pointe sur /auth/confirm.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const origin = resolveOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchange failed", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=lien`);
}
