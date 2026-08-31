import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { resolveOrigin, safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Cible du template d'email personnalisé :
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const origin = resolveOrigin(request);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/confirm] verifyOtp failed", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=lien`);
}
