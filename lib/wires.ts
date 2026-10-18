/**
 * Verified major news outlets in the real corpus.
 * Handles are the X handles, matched case-sensitively.
 * Syndicated wire text among two or more of these accounts is one cluster
 * with an originator. The other outlets are not scored as clones of each other.
 */
export const WIRE_OUTLETS: readonly { handle: string; name: string }[] = [
  { handle: "Reuters", name: "Reuters" },
  { handle: "business", name: "Bloomberg" },
  { handle: "CNBC", name: "CNBC" },
  { handle: "CNBCPro", name: "CNBC Pro" },
  { handle: "qz", name: "Quartz" },
  { handle: "AlArabiya_Eng", name: "Al Arabiya English" },
  { handle: "ARYNEWSOFFICIAL", name: "ARY News" },
];

const WIRE_HANDLES = new Set(WIRE_OUTLETS.map((outlet) => outlet.handle));

export function isWireOutlet(handle: string): boolean {
  return WIRE_HANDLES.has(handle);
}
