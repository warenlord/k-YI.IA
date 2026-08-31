import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques et les images.
     * `/api/challenge` est volontairement inclus : il doit exiger une session.
     * `manifest.webmanifest` et `sw.js` doivent rester publics, sinon le
     * navigateur reçoit la page de connexion à la place et l'app n'est plus
     * installable.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
