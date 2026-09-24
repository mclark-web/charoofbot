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
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="GradedCalls home">
          <span className="mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v3M12 18v3M5 12H2M22 12h-3" stroke="#eb6505" strokeWidth="1.6" strokeLinecap="round" />
              <path
                d="M7.5 8.5c1.8-2.2 7.2-2.2 9 0M7.5 15.5c1.8 2.2 7.2 2.2 9 0"
                stroke="#f2f1ee"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="2.2" fill="#eb6505" />
            </svg>
          </span>
          <span className="brand-name">
            Graded<span>Calls</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {LINKS.map((link) => {
            const current = isCurrent(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className="nav-link"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <p className="fixture-label">GC Scale · Phase 0 · Fixture corpus</p>
    </header>
  );
}
