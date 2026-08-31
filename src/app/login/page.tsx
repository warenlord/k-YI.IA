import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNext } from "@/lib/redirect";

export const metadata = {
  title: "Connexion — kÆYI",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const rawNext = searchParams.next;
  const next = safeNext(typeof rawNext === "string" ? rawNext : null);
  const hasLinkError = searchParams.error === "lien";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground block text-center text-sm tracking-[0.02em] transition-colors"
        >
          kÆYI
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Se connecter</CardTitle>
            <CardDescription>
              Ton historique te suit d&apos;un appareil à l&apos;autre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasLinkError ? (
              <p
                className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-md border px-3 py-2 text-sm"
                role="alert"
              >
                Ce lien a expiré ou a déjà servi. Demandes-en un nouveau.
              </p>
            ) : null}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
