/**
 * Compare le prompt courant d'un mode à une variante, sur le même texte,
 * avec plusieurs tirages de chaque côté.
 *
 *   npm run compare -- email brouillon.txt variante.txt 3
 *
 * Pourquoi plusieurs tirages : le modèle est stochastique. Une comparaison à un
 * seul échantillon par version fait conclure à tort — c'est arrivé deux fois
 * pendant le réglage initial. Trois tirages suffisent à distinguer un effet
 * systématique d'une variation de tirage.
 *
 * La variante est un fichier texte contenant un system prompt complet : on ne
 * touche pas à src/lib/modes.ts tant qu'on n'a pas tranché.
 */
import { readFileSync } from "node:fs";

import OpenAI from "openai";

import { MODE_IDS, MODES, isModeId } from "../src/lib/modes.ts";

/** Doit rester aligné sur src/app/api/challenge/route.ts. */
const MODEL = "gpt-5.5";

const [, , modeArg, inputPath, variantPath, drawsArg] = process.argv;

if (!isModeId(modeArg) || !inputPath || !variantPath) {
  console.error(
    `Usage : npm run compare -- <${MODE_IDS.join("|")}> <texte.txt> <variante.txt> [tirages]`,
  );
  process.exit(1);
}

const input = readFileSync(inputPath, "utf8");
const variant = readFileSync(variantPath, "utf8");
const draws = Number(drawsArg ?? 2);

const client = new OpenAI();

async function run(systemPrompt: string): Promise<string> {
  const response = await client.responses.create({
    model: MODEL,
    instructions: systemPrompt,
    input,
    max_output_tokens: 16000,
    reasoning: { effort: "medium" },
    text: { verbosity: "low" },
    store: false,
  });
  return response.output_text;
}

/** Marqueurs de prudence : c'est ce qu'on cherche à mesurer objectivement. */
const HEDGES = /\b(peut-être|éventuellement|possiblement|il se peut|même si tu as raison|cela dit|ceci dit)\b/gi;

function profile(text: string) {
  const bullets = (text.match(/^\s*[-*]\s|\*\*/gm) ?? []).length;
  const hedges = (text.match(HEDGES) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  return { hedges, questions, mots: text.split(/\s+/).length, bullets };
}

const versions: Array<{ nom: string; prompt: string }> = [
  { nom: "VARIANTE (fichier fourni)", prompt: variant },
  { nom: "COURANT (src/lib/modes.ts)", prompt: MODES[modeArg].systemPrompt },
];

for (const { nom, prompt } of versions) {
  console.log(`\n${"=".repeat(70)}\n${nom}\n${"=".repeat(70)}`);

  const stats: ReturnType<typeof profile>[] = [];

  for (let i = 1; i <= draws; i += 1) {
    const text = await run(prompt);
    const p = profile(text);
    stats.push(p);
    console.log(`\n\x1b[2m── tirage ${i}/${draws} ──\x1b[0m\n`);
    console.log(text);
  }

  const moyenne = (clef: keyof ReturnType<typeof profile>) =>
    (stats.reduce((sum, s) => sum + s[clef], 0) / stats.length).toFixed(1);

  console.log(
    `\n\x1b[2m→ moyenne sur ${draws} tirages : ${moyenne("hedges")} marqueurs de prudence, ` +
      `${moyenne("questions")} questions, ${moyenne("mots")} mots\x1b[0m`,
  );
}
