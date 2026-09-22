"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/paste", label: "Paste bench" },
  { href: "/methodology", label: "Methodology" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-rule bg-paper/90">
      <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-5 px-5 py-6 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="kicker">Charoof Signal · Phase 0 · Fixture corpus</p>
            <Link href="/" className="mt-2 block font-serif text-4xl tracking-tight text-ink md:text-5xl">
              Charoof Bot
            </Link>
            <p className="mt-3 max-w-xl font-serif text-base italic leading-snug text-ink-soft">
              built for accountability in an age of market fomo, prediction craze, and loud anonymous voices.
            </p>
          </div>
          <nav aria-label="Primary" className="flex flex-wrap gap-2">
            {LINKS.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`border px-3 py-1.5 text-sm ${
                    current
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper-raised text-ink hover:border-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
