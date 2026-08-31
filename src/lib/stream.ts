/**
 * Protocole de streaming vers le navigateur : une ligne = un objet JSON.
 * Assez simple à produire et à lire, et il permet de faire passer autre chose
 * que du texte (l'identifiant de session, le compteur de messages restants).
 */
export type StreamEvent =
  | { type: "meta"; id: string }
  | { type: "delta"; text: string }
  | { type: "done"; remaining: number }
  | { type: "error"; message: string };

export type Send = (event: StreamEvent) => void;

/**
 * `run` reçoit `send` et prend en charge sa propre persistance et son propre
 * try/catch : ce qui diffère entre les routes leur reste, seule la plomberie
 * du flux est partagée ici.
 */
export function ndjsonResponse(run: (send: Send) => Promise<void>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const send: Send = (event) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await run(send);
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
