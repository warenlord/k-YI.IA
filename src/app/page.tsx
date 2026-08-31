import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { MODE_LIST } from "@/lib/modes";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-16">
      <p className="text-muted-foreground mb-3 text-sm font-medium tracking-[0.02em]">
        kÆYI
      </p>

      <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
        Un coach qui ne te donne pas raison.
      </h1>

      <p className="text-muted-foreground mt-4 leading-relaxed">
        Colle ce que tu t&apos;apprêtes à envoyer, décider ou négocier. Il ne te
        rassure pas : il cherche les angles morts, les risques et ce que tu
        évites de regarder — avant que ce soit irréversible.
      </p>

      <ul className="mt-10 space-y-3 border-t pt-8">
        {MODE_LIST.map((mode) => (
          <li key={mode.id} className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{mode.label}</span>
            <span className="text-muted-foreground text-sm">
              {mode.tagline}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center gap-4">
        <Link href="/login" className={cn(buttonVariants(), "px-5")}>
          Commencer
        </Link>
        <span className="text-muted-foreground text-xs">
          Connexion par lien email, sans mot de passe.
        </span>
      </div>
    </main>
  );
}
