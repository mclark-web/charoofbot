"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/paste", label: "Paste bench" },
  { href: "/methodology", label: "Methodology" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function canScrollFurtherRight(nav: HTMLElement): boolean {
  return nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 1;
}

export function SiteNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncScrollCue = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    setCanScrollRight(canScrollFurtherRight(nav));
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
      setCanScrollRight(canScrollFurtherRight(nav));
    });
  }

  return (
    <nav
      ref={navRef}
      className={canScrollRight ? "site-nav can-scroll-right" : "site-nav"}
      aria-label="Primary"
    >
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link.href);
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
