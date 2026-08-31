import type { MetadataRoute } from "next";

/**
 * Servi sur /manifest.webmanifest et lié automatiquement par Next.
 * C'est ce fichier qui fait passer « Ajouter à l'écran d'accueil » d'un simple
 * marque-page à une vraie fenêtre d'app (sans barre d'URL).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kÆYI",
    short_name: "kÆYI",
    description:
      "Un coach IA qui challenge tes décisions avant que tu agisses, au lieu de les valider.",
    lang: "fr",
    start_url: "/challenge",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Fond de l'écran de démarrage Android : celui de l'app, pas celui de l'icône.
    background_color: "#fdfcfa",
    theme_color: "#fdfcfa",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        // Android recadre l'icône selon la forme du lanceur : le mark tient
        // dans la zone sûre centrale.
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
