"use client";

import { useEffect } from "react";
import { LogoLink } from "@/components/logo-link";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" style={{ backgroundColor: "#0b0c0e", colorScheme: "dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#0b0c0e",
          color: "#f2f1ee",
          fontFamily: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
        }}
      >
        <header
          style={{
            borderBottom: "1px solid #2a2e38",
            backgroundColor: "#0b0c0e",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              boxSizing: "border-box",
              height: 56,
              maxWidth: "72rem",
              margin: "0 auto",
              padding: "0 8px",
            }}
          >
            <LogoLink />
          </div>
        </header>
        <main style={{ maxWidth: "72rem", margin: "0 auto", padding: "32px 20px" }}>
          <h1 style={{ margin: "24px 0 0", fontSize: 36, fontWeight: 500, lineHeight: 1.2 }}>
            This page failed to render.
          </h1>
          <p style={{ marginTop: 16, color: "#9a9aa3", fontSize: 16, lineHeight: 1.5 }}>
            The notebook hit an error while loading this view.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              minWidth: 44,
              minHeight: 44,
              marginTop: 24,
              padding: "0 14px",
              border: "none",
              borderRadius: 9,
              backgroundColor: "#eb6505",
              color: "#1a1005",
              fontSize: 14,
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
