/**
 * Boucle de réglage des system prompts, sans passer par l'interface.
 *
 *   npm run prompt -- decision "Je pense quitter mon poste dans deux mois…"
 *   npm run prompt -- email --file brouillon.txt
 *
 * Édite `src/lib/modes.ts`, relance, compare. C'est le seul endroit à toucher
 * pour affiner le comportement du contradicteur.
 */
import { readFileSync } from "node:fs";

import OpenAI from "openai";

import { MODE_IDS, MODES, isModeId } from "../src/lib/modes.ts";

/** Doit rester aligné sur src/app/api/challenge/route.ts. */
const MODEL = "gpt-5.5";

const [, , modeArg, ...rest] = process.argv;

if (!isModeId(modeArg)) {
  console.error(`Usage : npm run prompt -- <${MODE_IDS.join("|")}> "<texte>"`);
  console.error(`        npm run prompt -- <mode> --file <chemin>`);
  process.exit(1);
}

let input: string;
if (rest[0] === "--file") {
  if (!rest[1]) {
    console.error("--file attend un chemin.");
    process.exit(1);
  }
  input = readFileSync(rest[1], "utf8");
} else {
  input = rest.join(" ");
}

if (input.trim().length < 20) {
  console.error("Texte trop court pour être challengé sérieusement.");
  process.exit(1);
}

const mode = MODES[modeArg];
const client = new OpenAI();

console.log(`\n\x1b[2m── mode : ${mode.label} ──\x1b[0m\n`);

try {
  const events = await client.responses.create({
    model: MODEL,
    instructions: mode.systemPrompt,
    input,
    max_output_tokens: 16000,
    reasoning: { effort: "medium" },
    text: { verbosity: "low" },
    store: false,
    stream: true,
  });

  let usage = "";

  for await (const event of events) {
    if (event.type === "response.output_text.delta") {
      process.stdout.write(event.delta);
    } else if (event.type === "response.completed" && event.response.usage) {
      const { input_tokens, output_tokens } = event.response.usage;
      usage = `${input_tokens} tokens d'entrée, ${output_tokens} de sortie`;
    } else if (event.type === "response.failed") {
      console.error(
        `\n\n[échec] ${event.response.error?.message ?? "raison inconnue"}`,
      );
    } else if (event.type === "response.incomplete") {
      console.error(
        `\n\n[incomplet] ${event.response.incomplete_details?.reason ?? "raison inconnue"}`,
      );
    }
  }

  console.log(usage ? `\n\n\x1b[2m── ${usage} ──\x1b[0m\n` : "\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (/api.?key|authentication|credential/i.test(message)) {
    console.error(
      "\nClé OpenAI introuvable ou invalide.\n" +
        "Renseigne OPENAI_API_KEY dans .env.local (modèle dans .env.example),\n" +
        "puis relance. La clé se crée sur platform.openai.com.\n",
    );
  } else {
    console.error(`\n${message}\n`);
  }

  process.exit(1);
}
