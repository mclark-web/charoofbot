import type { AccountLabel, AgeBand, PostRole } from "@/lib/types";

const ACCOUNT_STYLES: Record<AccountLabel, string> = {
  Originator: "bg-origin-soft text-origin",
  Clone: "bg-vermilion-soft text-vermilion",
  Amplifier: "bg-lab-soft text-lab",
  "Clone+Amp": "bg-clay-soft text-clay",
  Clean: "bg-paper text-ink-soft",
};

export function LabelBadge({ label }: { label: AccountLabel }) {
  return (
    <span className={`inline-block border border-current/15 px-2 py-0.5 text-xs tracking-wide ${ACCOUNT_STYLES[label]}`}>
      {label}
    </span>
  );
}

const ROLE_LABEL: Record<PostRole, string> = {
  originator: "Originator",
  exact: "Exact clone",
  near: "Near duplicate",
  template: "Template",
  solo: "Solo",
};

const AGE_LABEL: Record<AgeBand, string> = {
  fresh: "New <30d",
  young: "New <1y",
  established: "Established",
  unknown: "Age unknown",
};

const AGE_STYLE: Record<AgeBand, string> = {
  fresh: "bg-fresh-soft text-fresh",
  young: "bg-yearling-soft text-yearling",
  established: "bg-origin-soft text-origin",
  unknown: "bg-paper text-ink-soft",
};

export function AgeBadge({
  band,
  showEstablished = false,
  showUnknown = false,
}: {
  band: AgeBand;
  showEstablished?: boolean;
  showUnknown?: boolean;
}) {
  if (band === "established" && !showEstablished) return null;
  if (band === "unknown" && !showUnknown) return null;
  return (
    <span className={`inline-block border border-current/15 px-2 py-0.5 text-xs tracking-wide ${AGE_STYLE[band]}`}>
      {AGE_LABEL[band]}
    </span>
  );
}

export function RoleBadge({ role }: { role: PostRole }) {
  const style =
    role === "originator"
      ? ACCOUNT_STYLES.Originator
      : role === "solo"
        ? ACCOUNT_STYLES.Clean
        : ACCOUNT_STYLES.Clone;
  return (
    <span className={`inline-block border border-current/15 px-2 py-0.5 text-xs tracking-wide ${style}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}
