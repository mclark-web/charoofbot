import Image from "next/image";
import styles from "./logo-link.module.css";

export const HUB_HREF = "https://charoof.vercel.app";

const MARK_SRC = "/gradedcalls-mark.png";

export function LogoLink({ embedded = false }: { embedded?: boolean }) {
  const mark = embedded ? (
    // Global error may not load the CSS module. Size the full 1024 source here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MARK_SRC}
      alt="GradedCalls"
      width={64}
      height={64}
      style={{ width: 32, height: 32, display: "block", objectFit: "contain" }}
    />
  ) : (
    <Image
      src={MARK_SRC}
      alt="GradedCalls"
      width={96}
      height={96}
      sizes="(min-width: 820px) 36px, 32px"
      quality={90}
      className={styles.mark}
      priority
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
        Graded<span style={embedded ? { color: "#ee9a44" } : undefined}>Calls</span>
      </span>
    </a>
  );
}
