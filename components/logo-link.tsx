import Image from "next/image";
import styles from "./logo-link.module.css";

export const HUB_HREF = "https://charoof.vercel.app";

export function LogoLink() {
  return (
    <a href={HUB_HREF} className={styles.link} aria-label="GradedCalls">
      <Image
        src="/gradedcalls-mark.png"
        alt="GradedCalls"
        width={32}
        height={32}
        sizes="36px"
        className={styles.mark}
        priority
      />
      <span className={styles.name}>
        Graded<span>Calls</span>
      </span>
    </a>
  );
}
