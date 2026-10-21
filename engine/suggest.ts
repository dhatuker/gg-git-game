export const KNOWN_COMMANDS = ["init", "status", "add", "commit", "log", "diff", "restore", "branch", "switch", "checkout", "merge", "reset", "revert", "stash", "cherry-pick", "rebase", "clone", "fetch", "pull", "push", "remote"];

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Perintah dikenal yang paling mirip (jarak edit ≤ 2), atau null. */
export function suggestCommand(name: string): string | null {
  let best: string | null = null;
  let bestDist = 3;
  for (const known of KNOWN_COMMANDS) {
    const d = distance(name, known);
    if (d < bestDist) {
      best = known;
      bestDist = d;
    }
  }
  return best;
}
