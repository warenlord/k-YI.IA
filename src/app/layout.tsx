import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ServiceWorker } from "@/components/service-worker";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kÆYI",
  description:
    "Un coach IA qui challenge tes décisions avant que tu agisses, au lieu de les valider.",
  applicationName: "kÆYI",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Fait s'ouvrir l'app en plein écran depuis l'écran d'accueil iOS.
  appleWebApp: {
    capable: true,
    title: "kÆYI",
    statusBarStyle: "default",
  },
  other: {
    // Next n'émet que `mobile-web-app-capable` ; iOS ne l'honore que depuis
    // 17.4. On passe par `other` plutôt que par une balise dans le JSX : un
    // <meta> entre <html> et <body> est du HTML invalide, le navigateur le
    // déplace dans <head> et l'hydratation échoue.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Couleur de la barre système en mode app sur Android.
  themeColor: "#fdfcfa",
  // Pas de `maximumScale` : le zoom reste accessible. Le zoom involontaire de
  // Safari est évité en gardant les champs à 16 px sur mobile.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
