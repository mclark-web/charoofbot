import type { AgeVolume } from "@/lib/types";

export function AgeCallout({ age, scope }: { age: AgeVolume; scope: string }) {
  const hot = age.freshAccountsDominate;
  const warm = !hot && age.newAccountsDominate;
  const tone = hot
    ? "border-fresh bg-fresh-soft text-fresh"
    : warm
      ? "border-yearling bg-yearling-soft text-yearling"
      : "border-rule bg-paper-raised text-ink-soft";
  return (
    <p className={`border px-4 py-3 text-sm leading-relaxed ${tone}`}>
      {age.freshAccountsDominate
        ? `Accounts under 30 days dominate this ${scope}. `
        : age.newAccountsDominate
          ? `Accounts under 1 year dominate this ${scope}. `
          : null}
      {age.freshVolumePct}% of {scope} volume is from accounts under 30 days ({age.freshPostCount} posts).{" "}
      {age.underYearVolumePct}% is from accounts under 1 year ({age.underYearPostCount} posts).
      {age.unknownAgePostCount > 0
        ? ` ${age.unknownAgePostCount} post${age.unknownAgePostCount === 1 ? "" : "s"} have an unknown account age, counted in the denominator only.`
        : null}
    </p>
  );
}
