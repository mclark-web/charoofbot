"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent } from "react";
import { ANALYSTS_URL, FINTWIT_URL, SPORTS_URL } from "@/lib/site-urls";

type NavItem = { href: string; label: string; external?: boolean };

const LINKS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/paste", label: "Paste bench" },
  { href: "/methodology", label: "Methodology" },
  { href: SPORTS_URL, label: "Sports", external: true },
  { href: ANALYSTS_URL, label: "Analysts", external: true },
  { href: FINTWIT_URL, label: "FinTwit", external: true },
];

function isCurrent(pathname: string, link: NavItem): boolean {
  if (link.external) return false;
  if (link.href === "/") return pathname === "/";
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function canScrollFurtherRight(nav: HTMLElement): boolean {
  return nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 1;
}

export function SiteNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [atScrollEnd, setAtScrollEnd] = useState(false);

  const syncScrollCue = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    setAtScrollEnd(!canScrollFurtherRight(nav));
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    syncScrollCue();
    nav.addEventListener("scroll", syncScrollCue, { passive: true });
    const observer = new ResizeObserver(syncScrollCue);
    observer.observe(nav);
    return () => {
      nav.removeEventListener("scroll", syncScrollCue);
      observer.disconnect();
    };
  }, [syncScrollCue]);

  function revealFocusedLink(event: FocusEvent<HTMLAnchorElement>) {
    const nav = navRef.current;
    const link = event.currentTarget;
    if (!nav) return;
    requestAnimationFrame(() => {
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const fadeStart = navRect.left + navRect.width * 0.85;
      if (linkRect.right > fadeStart) {
        nav.scrollLeft += linkRect.right - fadeStart + 8;
      }
      setAtScrollEnd(!canScrollFurtherRight(nav));
    });
  }

  return (
    <nav
      ref={navRef}
      className={atScrollEnd ? "site-nav at-scroll-end" : "site-nav"}
      aria-label="Primary"
    >
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link);
        if (link.external) {
          return (
            <a key={link.href} href={link.href} className="nav-link" onFocus={revealFocusedLink}>
              {link.label}
            </a>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className="nav-link"
            onFocus={revealFocusedLink}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
