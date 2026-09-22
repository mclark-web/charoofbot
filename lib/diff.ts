export type DiffOp = {
  type: "eq" | "del" | "ins";
  text: string;
};

/** Word-level diff of two normalized strings. Short posts only; LCS is fine. */
export function wordDiff(origin: string, copy: string): DiffOp[] {
  const a = origin.length > 0 ? origin.split(" ") : [];
  const b = copy.length > 0 ? copy.split(" ") : [];
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "eq", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "del", text: a[i] });
      i += 1;
    } else {
      ops.push({ type: "ins", text: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ type: "del", text: a[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ type: "ins", text: b[j] });
    j += 1;
  }
  return ops;
}
