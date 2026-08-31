/**
 * N'accepte qu'un chemin interne : évite qu'un `?next=` fabriqué renvoie
 * l'utilisateur fraîchement connecté vers un domaine externe.
 */
export function safeNext(value: string | null | undefined, fallback = "/challenge") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/**
 * Reconstruit l'origine réelle derrière le proxy Vercel.
 */
export function resolveOrigin(request: Request) {
  const { origin } = new URL(request.url);
  if (process.env.NODE_ENV === "development") return origin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) return `https://${forwardedHost}`;
  return origin;
}
