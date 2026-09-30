import { Suspense } from "react";
import { LogoLink } from "@/components/logo-link";
import { SiteNav } from "@/components/site-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <LogoLink />
        <Suspense fallback={null}>
          <SiteNav />
        </Suspense>
      </div>
      <p className="fixture-label">Phase 0 · Fixture corpus</p>
    </header>
  );
}
