/**
 * Lecture validée des variables d'environnement.
 *
 * Les `process.env.NEXT_PUBLIC_*` sont écrits littéralement : Next remplace ces
 * occurrences au build. Un accès dynamique (`process.env[nom]`) ne serait pas
 * remplacé et vaudrait `undefined` dans le navigateur.
 *
 * Ces fonctions sont appelées à l'usage, jamais au chargement du module : une
 * erreur ici ne doit pas faire échouer le build.
 */

const WHERE_URL =
  "Project Settings → Data API, ou https://<ref>.supabase.co où <ref> est le " +
  "segment de l'URL de ton dashboard (supabase.com/dashboard/project/<ref>).";

const WHERE_KEY =
  "Project Settings → API Keys. La clé « anon / public » (eyJ…) comme la " +
  "nouvelle « publishable » (sb_publishable_…) conviennent.";

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!value) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL est absent de .env.local.\n${WHERE_URL}`,
    );
  }

  if (value.includes("supabase.com/dashboard")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL contient l'URL du dashboard, pas celle de " +
        `l'API.\nAttendu : https://<ref>.supabase.co\n${WHERE_URL}`,
    );
  }

  if (!value.startsWith("http")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL doit être une URL complète.\n${WHERE_URL}`,
    );
  }

  // Le dashboard affiche aussi l'endpoint REST. supabase-js ajoute /rest/v1
  // lui-même : le garder ici produirait des URLs en /rest/v1/rest/v1.
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  if (/\/(rest|auth|storage|realtime)\/v\d+$/.test(withoutTrailingSlash)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL pointe sur un endpoint (/rest/v1, /auth/v1…) " +
        "et non sur la racine du projet.\n" +
        `Attendu : https://<ref>.supabase.co\n${WHERE_URL}`,
    );
  }

  return withoutTrailingSlash;
}

export function openaiApiKey(): string {
  const value = process.env.OPENAI_API_KEY?.trim();

  if (!value) {
    throw new Error(
      "OPENAI_API_KEY est absent de .env.local.\n" +
        "platform.openai.com → API keys → Create new secret key, " +
        "puis redémarre le serveur.",
    );
  }

  // Une clé d'un autre fournisseur produirait un 401 illisible.
  if (value.startsWith("sk-ant-")) {
    throw new Error(
      "OPENAI_API_KEY contient une clé Anthropic (sk-ant-…).\n" +
        "kÆYI appelle l'API OpenAI : il faut une clé sk-… " +
        "créée sur platform.openai.com.",
    );
  }

  if (!value.startsWith("sk-")) {
    throw new Error(
      "OPENAI_API_KEY ne ressemble pas à une clé OpenAI (attendu : sk-…).\n" +
        "Si c'est volontaire, le contrôle est dans src/lib/env.ts.",
    );
  }

  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!value) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY est absent de .env.local.\n${WHERE_KEY}`,
    );
  }

  // La clé secrète ne doit jamais arriver ici : elle serait exposée au
  // navigateur, et elle contourne les politiques RLS.
  if (value.startsWith("sb_secret_") || value.includes("service_role")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY contient une clé secrète / service_role. " +
        `Cette valeur est exposée au navigateur : utilise la clé publique.\n${WHERE_KEY}`,
    );
  }

  return value;
}
