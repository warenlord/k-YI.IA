/**
 * Génère un lien de connexion sans passer par l'email.
 *
 *   npm run invite -- alice@exemple.com bob@exemple.com
 *
 * Utile quand l'envoi d'emails est indisponible ou limité : le lien est produit
 * ici et transmis par le canal de ton choix (WhatsApp, Slack, SMS).
 *
 * Chaque lien est à usage unique, valable une heure, et vaut une connexion :
 * ne le diffuse qu'à la personne concernée.
 *
 * Requiert SUPABASE_SERVICE_ROLE_KEY dans .env.local — Supabase → Project
 * Settings → API Keys → service_role. Cette clé contourne les politiques RLS :
 * elle ne doit jamais quitter ta machine ni entrer dans le code.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const siteUrl = process.env.INVITE_SITE_URL?.trim() ?? "https://kaeyiia.vercel.app";

if (!url) {
  console.error("NEXT_PUBLIC_SUPABASE_URL est absent de .env.local.");
  process.exit(1);
}

if (!serviceKey) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY est absent de .env.local.\n" +
      "Supabase → Project Settings → API Keys → service_role.\n" +
      "Ajoute la ligne SUPABASE_SERVICE_ROLE_KEY=... puis relance.",
  );
  process.exit(1);
}

const emails = process.argv.slice(2).filter((value) => value.includes("@"));

if (emails.length === 0) {
  console.error("Usage : npm run invite -- alice@exemple.com [bob@exemple.com ...]");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;

for (const email of emails) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/challenge` },
  });

  if (error || !data?.properties?.action_link) {
    console.error(`\n${email}\n  échec : ${error?.message ?? "lien non renvoyé"}`);
    failures += 1;
    continue;
  }

  console.log(`\n${email}\n${data.properties.action_link}`);
}

console.log(
  `\n\x1b[2m── ${emails.length - failures}/${emails.length} lien(s) généré(s), valables 1 h, à usage unique ──\x1b[0m\n`,
);

if (failures > 0) process.exit(1);
