import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Routes accessibles sans être connecté. */
const PUBLIC_PATHS = ["/", "/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
}

/**
 * Rafraîchit le token Supabase et protège les routes privées.
 *
 * Important : on renvoie toujours `supabaseResponse` tel quel (ou une redirection
 * à laquelle on recopie les cookies), sinon la session se désynchronise.
 */
export async function updateSession(request: NextRequest) {
  // Une variable absente ferait échouer le proxy sur chaque requête, donc une
  // 500 opaque sur tout le site — y compris les pages publiques. On préfère
  // nommer la variable fautive : le message ne contient aucun secret, et sans
  // ça le diagnostic exige l'accès aux logs de l'hébergeur.
  let url: string;
  let anonKey: string;
  try {
    url = supabaseUrl();
    anonKey = supabaseAnonKey();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Configuration incomplète.";
    console.error("[proxy] configuration", message);
    return new NextResponse(`Configuration incomplète.\n\n${message}\n`, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Ne pas insérer de logique entre createServerClient et getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Session expirée. Reconnecte-toi." },
      { status: 401 },
    );
  }

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (user && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/challenge";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return supabaseResponse;
}
