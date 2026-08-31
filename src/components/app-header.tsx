"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/challenge", label: "Nouveau" },
  { href: "/historique", label: "Historique" },
] as const;

export function AppHeader({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-4 sm:gap-2">
        <Link
          href="/challenge"
          className="mr-1 shrink-0 text-sm font-semibold tracking-[0.02em] sm:mr-2"
        >
          kÆYI
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2 py-2.5 text-sm transition-colors sm:px-2.5 sm:py-2",
                  active
                    ? "text-foreground bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <span
            className="text-muted-foreground hidden max-w-[12rem] truncate text-xs md:block"
            title={email}
          >
            {email}
          </span>
          <form action="/auth/signout" method="post" className="shrink-0">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              aria-label="Se déconnecter"
              className="max-sm:size-9 max-sm:px-0"
            >
              <LogOut className="sm:hidden" aria-hidden="true" />
              <span className="max-sm:hidden">Déconnexion</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
