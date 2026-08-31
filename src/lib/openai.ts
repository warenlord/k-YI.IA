import OpenAI from "openai";

/**
 * Réglages partagés par les deux routes de streaming et par les scripts de
 * réglage. Un seul endroit : sinon on finit par régler les prompts sur une
 * configuration différente de celle que voient les utilisateurs.
 *
 * Ce fichier n'utilise volontairement aucun alias `@/` : les scripts tournent
 * sous Node, qui ne résout pas les alias de tsconfig.
 */

/**
 * Dernier modèle numéroté avec un instantané daté (gpt-5.5-2026-04-23).
 * `-pro` est trop lent pour du streaming interactif, et les variantes
 * `gpt-5.6-*` n'ont pas d'instantané daté.
 */
export const MODEL = "gpt-5.5";

export const REQUEST_TUNING = {
  // Le raisonnement compte dans ce plafond : de la marge évite une réponse
  // tronquée en pleine phrase.
  max_output_tokens: 16000,
  // `medium` garde la qualité du contre-argument sans allonger exagérément le
  // délai avant le premier token.
  reasoning: { effort: "medium" as const },
  // Les prompts demandent des points courts : autant le dire au décodeur.
  text: { verbosity: "low" as const },
  // Mails, décisions, négociations : rien de tout ça n'a à être conservé côté
  // OpenAI.
  store: false,
};

export const openai = new OpenAI();

export type TurnInput = Array<{ role: "user" | "assistant"; content: string }>;

/**
 * Exécute un tour et pousse le texte au fil de l'eau.
 * Renvoie le texte accumulé et, le cas échéant, le message d'erreur à afficher.
 */
export async function streamTurn(options: {
  instructions: string;
  input: TurnInput;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
}): Promise<{ text: string; errorMessage: string | null }> {
  let text = "";

  const events = await openai.responses.create(
    {
      model: MODEL,
      instructions: options.instructions,
      input: options.input,
      stream: true,
      ...REQUEST_TUNING,
    },
    { signal: options.signal },
  );

  for await (const event of events) {
    if (event.type === "response.output_text.delta") {
      text += event.delta;
      options.onDelta(event.delta);
    } else if (event.type === "response.failed") {
      return {
        text,
        errorMessage:
          event.response.error?.message ??
          "Le modèle n'a pas pu traiter ce texte.",
      };
    } else if (event.type === "response.incomplete") {
      return {
        text,
        errorMessage:
          event.response.incomplete_details?.reason === "max_output_tokens"
            ? "Réponse interrompue : la limite de tokens a été atteinte."
            : "Réponse incomplète.",
      };
    }
  }

  return { text, errorMessage: null };
}

export function describeError(error: unknown): string {
  if (error instanceof OpenAI.RateLimitError) {
    return "Trop de demandes d'un coup, ou quota dépassé. Réessaie dans quelques secondes.";
  }
  if (error instanceof OpenAI.AuthenticationError) {
    return "Clé API OpenAI invalide ou révoquée.";
  }
  if (error instanceof OpenAI.PermissionDeniedError) {
    return `Ce compte n'a pas accès au modèle ${MODEL}.`;
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return "Connexion à l'API interrompue. Réessaie.";
  }
  if (error instanceof OpenAI.APIError) {
    return `L'API a renvoyé une erreur ${error.status ?? ""}.`.replace(
      /\s+/g,
      " ",
    );
  }
  // Classe de base : erreurs du client avant tout appel réseau (credentials
  // introuvables, paramètre invalide).
  if (error instanceof OpenAI.OpenAIError) {
    return error.message;
  }
  return "Une erreur inattendue est survenue.";
}
