/** Aligné sur la contrainte `check` de la table `challenges`. */
export const MAX_INPUT_LENGTH = 20000;

/** Longueur minimale acceptée côté client et côté serveur. */
export const MIN_INPUT_LENGTH = 20;

/**
 * Plafond d'une session, tous rôles confondus : le verdict initial plus trois
 * allers-retours. Garde-fou de coût — chaque relance renvoie toute la
 * conversation au modèle, donc le coût d'une session croît quadratiquement.
 *
 * Appliqué côté serveur (les deux routes), jamais seulement côté client.
 */
export const MAX_MESSAGES = 8;

/** Une relance est plus courte qu'une soumission initiale. */
export const MIN_REPLY_LENGTH = 2;
