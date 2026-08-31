import { NextResponse } from "next/server";

import { resolveOrigin } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${resolveOrigin(request)}/login`, {
    status: 303,
  });
}
