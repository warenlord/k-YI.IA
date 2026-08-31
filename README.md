# kÆYI

_Le A et le E sont une seule lettre : la ligature Æ. C'est aussi le mark de l'app._

Un coach IA qui challenge une décision **avant** qu'elle soit prise, au lieu de la valider.
Trois cadres : un mail à envoyer, une décision à prendre, une négociation à préparer.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + auth par lien magique) · OpenAI (streaming).

---

## 1. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → coller et exécuter le contenu de [supabase/schema.sql](supabase/schema.sql).
   Ça crée la table `challenges`, l'index, et les politiques RLS (chacun ne voit que ses propres échanges).
3. **Authentication → URL Configuration** :
   - _Site URL_ : `http://localhost:3000` en local, l'URL Vercel en production.
   - _Redirect URLs_ : ajouter `http://localhost:3000/**` et `https://<ton-domaine>.vercel.app/**`.
4. **Project Settings → API** : récupérer _Project URL_ et la clé _anon / public_.

### Template d'email (optionnel mais recommandé)

Le flux fonctionne tel quel avec le template Supabase par défaut, qui pointe sur `/auth/callback`.
Pour utiliser la vérification par `token_hash` (plus robuste quand le lien est ouvert dans un
autre navigateur), remplacer le corps du template **Magic Link** par :

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Se connecter</a>
```

Les deux routes sont implémentées, aucune autre modification n'est nécessaire.

## 2. Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

## 3. Lancer

```bash
npm install
npm run dev
```

## 4. Déployer sur Vercel

1. `git push` puis importer le dépôt sur Vercel.
2. Reporter les trois variables d'environnement dans **Settings → Environment Variables**.
3. Après le premier déploiement, ajouter l'URL de production dans _Site URL_ et _Redirect URLs_ côté Supabase.

`maxDuration` de la route de streaming est à 60 s, la limite du plan Hobby.

---

## Installation sur téléphone

L'app s'ajoute à l'écran d'accueil et s'ouvre en plein écran, sans barre d'URL.

- **Android / Chrome** : menu ⋮ → _Installer l'application_ (ou _Ajouter à l'écran d'accueil_).
- **iOS / Safari** : bouton Partager → _Sur l'écran d'accueil_. Safari uniquement — Chrome iOS ne sait pas installer.

Ce qui rend ça possible : [src/app/manifest.ts](src/app/manifest.ts) (`display: standalone`,
icônes 192/512 dont une _maskable_), les métadonnées `appleWebApp` dans
[src/app/layout.tsx](src/app/layout.tsx), et [public/sw.js](public/sw.js).

Le service worker est **volontairement minimal** : il existe pour satisfaire les critères
d'installation d'Android et ne met en cache que les icônes. Il ne touche ni au HTML, ni aux
appels API, ni à quoi que ce soit d'authentifié — donc pas de page périmée servie après un
déploiement, et pas d'usage hors ligne non plus. Il ne s'enregistre qu'en production.

Deux points à ne pas casser :

- `manifest.webmanifest` et `sw.js` sont exclus du matcher dans [src/proxy.ts](src/proxy.ts).
  S'ils repassent derrière l'auth, le navigateur reçoit la page de connexion et l'app cesse
  d'être installable.
- L'installation exige HTTPS. En local ça ne marche que sur `localhost` ; pour tester depuis un
  vrai téléphone, passer par le déploiement Vercel (ou un tunnel HTTPS).

Régénérer les icônes après avoir modifié le mark : `npm run icons`
([scripts/generate-icons.ts](scripts/generate-icons.ts)).

## Régler les prompts

**C'est la partie qui compte.** Tout est dans un seul fichier : [src/lib/modes.ts](src/lib/modes.ts).
Chaque mode a son propre system prompt écrit en entier — la base commune est volontairement
dupliquée pour qu'on puisse retoucher un mode sans toucher aux deux autres.

Boucle de test rapide, sans passer par l'interface :

```bash
npm run prompt -- decision "Je pense quitter mon poste dans deux mois pour lancer mon activité…"
npm run prompt -- email --file brouillon.txt
npm run prompt -- negociation "Je négocie mon augmentation lundi…"
```

La réponse s'affiche en streaming dans le terminal, suivie du décompte de tokens.
Édite `src/lib/modes.ts`, relance, compare.

> **Pour un texte multi-ligne, utilise `--file`.** Sous Windows, `npm run` découpe un
> argument contenant des retours à la ligne et seule la première ligne arrive au script.

Deux pièges de méthode, vérifiés à la dure pendant le réglage :

- **Un seul tirage ne prouve rien.** Le modèle est stochastique : relance deux fois la même
  version et tu obtiens deux réponses différentes. Compte 3-4 tirages par variante avant de
  conclure qu'un changement a produit un effet.
- **Vérifie ton témoin.** Pour tester « il ne doit rien signaler », il faut un texte réellement
  sans enjeu. Un mail qui délègue un dossier sans mettre le remplaçant en copie n'est pas neutre —
  et le modèle a raison de le dire.
- **Les règles interagissent.** Deux ajouts bons séparément ont fait chuter les questions de
  6,0 à 4,3 et tripler les formulations prudentes : le seuil de gravité pousse à *décrire* un
  risque, et la ligne de clôture a donné à la question un emplacement réservé, alors le corps
  est devenu déclaratif. Après chaque ajout de règle, remesure **le comportement fondateur**
  du prompt, pas seulement ce que la nouvelle règle visait. C'est à ça que sert le compteur de
  questions et de marqueurs de prudence de `npm run compare`.

### Ce qu'il faut surveiller en test

- Le premier point est-il vraiment le point de friction principal, ou une politesse déguisée ?
- Est-ce que le modèle pose des questions, ou est-ce qu'il fait la leçon ?
- Est-ce qu'il décide à la place de l'utilisateur (il ne doit pas) ?
- Sur un texte sans problème réel : est-ce qu'il le dit, ou est-ce qu'il invente une objection ?

## La conversation

Après le verdict initial, l'utilisateur peut répondre, se justifier ou contester.
Chaque tour renvoie **toute** la conversation au modèle, pas seulement le dernier message.

**Plafond : 8 messages par session**, tous rôles confondus — le verdict plus trois
allers-retours ([`MAX_MESSAGES`](src/lib/constants.ts)). C'est un garde-fou de coût :
puisque l'historique entier repart à chaque tour, le coût d'une session croît de façon
quadratique. Le plafond est appliqué **côté serveur** dans les deux routes ; un contrôle
uniquement côté client ne garderait rien. Au-delà, l'app propose une nouvelle session.

Deux prompts gouvernent les tours suivants, dans [src/lib/modes.ts](src/lib/modes.ts) :

- `CONVERSATION_RULES` — **le point le plus sensible du produit.** Quand un utilisateur
  conteste, le réflexe par défaut d'un modèle est de lui donner raison. Ces règles lui
  interdisent de céder par politesse, l'obligent à vérifier si la réponse lève réellement
  l'objection, et à ne pas répéter ce qu'il a déjà dit.
- `LAST_MESSAGE_NOTE` — ajouté au dernier tour autorisé. Le modèle ne peut pas deviner
  qu'il n'aura plus la parole : on le lui dit, pour qu'il conclue au lieu de laisser
  l'échange en suspens.

## Modèle et réglages

`gpt-5.5` via l'API **Responses** d'OpenAI, en streaming. Tout est dans
[src/app/api/challenge/route.ts](src/app/api/challenge/route.ts), et le harnais CLI
([scripts/test-prompt.ts](scripts/test-prompt.ts)) utilise volontairement les mêmes réglages —
si tu changes l'un, change l'autre, sinon tu règles tes prompts sur une configuration différente
de celle que voient tes utilisateurs.

| Réglage | Valeur | Pourquoi |
|---|---|---|
| `model` | `gpt-5.5` | Dernier modèle numéroté avec un instantané daté. `-pro` est trop lent pour du streaming interactif ; les variantes `gpt-5.6-*` n'ont pas d'instantané daté. |
| `reasoning.effort` | `medium` | Le raisonnement sert à trouver les angles morts, mais `high` allonge le silence avant le premier token. |
| `text.verbosity` | `low` | Les prompts demandent 3 à 5 points courts : autant le dire aussi au décodeur. |
| `max_output_tokens` | `16000` | Le raisonnement compte dans ce plafond ; de la marge évite une troncature en pleine phrase. |
| `store` | `false` | Mails, décisions et négociations ne sont pas conservés côté OpenAI. |

## Structure

```
src/
  app/
    page.tsx                    landing publique
    layout.tsx                  polices, métadonnées PWA, service worker
    manifest.ts                 → /manifest.webmanifest
    login/                      formulaire lien magique
    auth/callback|confirm|signout
    (app)/                      espace connecté (layout + header)
      challenge/                soumission + réponse en streaming
      historique/               liste + détail
    api/challenge/route.ts      ouvre une session (verdict initial)
    api/challenge/[id]/reply/   poursuit la session, historique complet
  components/                   ui/ = shadcn, le reste = produit
  lib/
    modes.ts                    ← les trois system prompts
    supabase/                   clients navigateur / serveur / proxy
  proxy.ts                      rafraîchit la session, protège les routes
public/
  sw.js                         service worker minimal (installabilité Android)
  icon-*.png, apple-touch-icon.png
scripts/
  test-prompt.ts                boucle de réglage des prompts en CLI
  generate-icons.ts             génère les icônes (npm run icons)
supabase/schema.sql             table + RLS
```

## Hors scope de cette version

Notifications, partage/export, personnalisation du ton, recherche dans l'historique.
