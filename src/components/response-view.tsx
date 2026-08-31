"use client";

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Rendu markdown volontairement restreint : le modèle produit des listes de
 * points courts. On mappe explicitement les éléments plutôt que d'importer le
 * plugin typography, pour garder une seule échelle typographique.
 */
const components: Components = {
  p: ({ children }) => (
    <p className="text-[0.9375rem] leading-7">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="marker:text-muted-foreground/70 space-y-3 pl-5 [list-style-type:disc]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="marker:text-muted-foreground/70 space-y-3 pl-5 [list-style-type:decimal]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[0.9375rem] leading-7 [&>p]:inline">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h3 className="text-base font-semibold tracking-tight">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-base font-semibold tracking-tight">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold tracking-tight">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-muted-foreground/30 text-muted-foreground border-l-2 pl-4 italic">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-2" />,
};

export function ResponseView({ content }: { content: string }) {
  return (
    <div className="space-y-4">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
