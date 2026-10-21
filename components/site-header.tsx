import { Suspense } from "react";
import { LogoLink } from "@/components/logo-link";
import { SiteNav } from "@/components/site-nav";
import { liveClock } from "@/lib/corpus";
import { formatWindowLabel } from "@/lib/format";

export function SiteHeader() {
  const clock = liveClock();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand-lockup">
          <LogoLink />
          <span className="product-tag">GCBOT</span>
        </div>
        <Suspense fallback={null}>
          <SiteNav />
        </Suspense>
      </div>
      <p className="corpus-stamp">Real X posts · {formatWindowLabel(clock.start, clock.end)}</p>
    </header>
  );
}
