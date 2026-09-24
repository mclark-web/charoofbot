import type { AccountLabel, AgeBand, PostRole } from "@/lib/types";

export function LabelBadge({ label }: { label: AccountLabel }) {
  return <span className="meta-badge">{label}</span>;
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
  return <span className="meta-badge">{AGE_LABEL[band]}</span>;
}

export function RoleBadge({ role }: { role: PostRole }) {
  return <span className="meta-badge">{ROLE_LABEL[role]}</span>;
}
