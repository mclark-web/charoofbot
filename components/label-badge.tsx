import type { AccountLabel, AgeBand, PostRole } from "@/lib/types";

const ACCOUNT_STYLES: Record<AccountLabel, string> = {
  Originator: "border-origin/40 bg-origin-soft text-origin",
  Clone: "border-vermilion/40 bg-vermilion-soft text-vermilion",
  Amplifier: "border-rule bg-inset text-ink",
  "Clone+Amp": "border-rule bg-inset text-ink",
  Clean: "border-rule bg-inset text-ink-soft",
};

export function LabelBadge({ label }: { label: AccountLabel }) {
  return (
    <span className={`inline-block border px-2 py-1 text-xs tracking-wide ${ACCOUNT_STYLES[label]}`}>
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
  fresh: "border-fresh/40 bg-fresh-soft text-fresh",
  young: "border-rule bg-yearling-soft text-yearling",
  established: "border-rule bg-inset text-ink",
  unknown: "border-rule bg-inset text-ink-soft",
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
    <span className={`inline-block border px-2 py-1 text-xs tracking-wide ${AGE_STYLE[band]}`}>
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
    <span className={`inline-block border px-2 py-1 text-xs tracking-wide ${style}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}
