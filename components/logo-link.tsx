import styles from "./logo-link.module.css";

export const HUB_HREF = "https://charoof.vercel.app";

// Pre-sized transparent PNGs. The image optimizer at width 32 re-encodes a WebP
// whose perimeter pixels pick up stray alpha (about 2/255) and a faint edge.
const MARK_1X = "/gradedcalls-mark-44.png";
const MARK_2X = "/gradedcalls-mark-88.png";

export function LogoLink({ embedded = false }: { embedded?: boolean }) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MARK_1X}
      srcSet={`${MARK_1X} 1x, ${MARK_2X} 2x`}
      alt="GradedCalls"
      width={44}
      height={44}
      className={embedded ? undefined : styles.mark}
      decoding="async"
      style={
        embedded
          ? {
              width: 44,
              height: 44,
              display: "block",
              flex: "none",
              objectFit: "contain",
              backgroundColor: "transparent",
            }
          : undefined
      }
    />
  );

  return (
    <a
      href={HUB_HREF}
      className={embedded ? undefined : styles.link}
      style={
        embedded
          ? {
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxSizing: "border-box",
              minWidth: 44,
              minHeight: 44,
              color: "#f2f1ee",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 650,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }
          : undefined
      }
      aria-label="GradedCalls"
    >
      {mark}
      <span
        className={embedded ? undefined : styles.name}
        style={embedded ? { whiteSpace: "nowrap" } : undefined}
      >
        Graded<span style={embedded ? { color: "#eb6505" } : undefined}>Calls</span>
      </span>
    </a>
  );
}
