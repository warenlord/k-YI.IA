import type { ModeId } from "@/lib/modes";

export type ChallengeStatus = "streaming" | "complete" | "error";

export type MessageRole = "user" | "assistant";

export type ChallengeMessage = {
  role: MessageRole;
  content: string;
};

/**
 * Alias de type et non `interface` : PostgREST contraint `Row`/`Insert`/`Update`
 * à `Record<string, unknown>`, et seules les object types anonymes reçoivent une
 * index signature implicite. Une `interface` ferait résoudre toutes les lignes
 * en `never`.
 */
export type ChallengeRow = {
  id: string;
  user_id: string;
  mode: ModeId;
  /** Premier message de l'utilisateur, dénormalisé pour la liste d'historique. */
  input: string;
  /** Premier verdict, conservé pour les sessions créées avant le multi-tours. */
  output: string;
  /** Source de vérité : la conversation entière, plafonnée à MAX_MESSAGES. */
  messages: ChallengeMessage[];
  status: ChallengeStatus;
  error_message: string | null;
  created_at: string;
};

export type ChallengeInsert = Pick<ChallengeRow, "user_id" | "mode" | "input"> &
  Partial<Omit<ChallengeRow, "user_id" | "mode" | "input">>;

/**
 * Types écrits à la main : le MVP n'a qu'une table.
 * Pour régénérer depuis le projet Supabase :
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */
export type Database = {
  public: {
    Tables: {
      challenges: {
        Row: ChallengeRow;
        Insert: ChallengeInsert;
        Update: Partial<ChallengeRow>;
        Relationships: [];
      };
    };
    // `Record<never, never>` et non `Record<string, never>` : ce dernier porte une
    // index signature qui capterait n'importe quel nom passé à `.from()`.
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
