/**
 * The visitor-editable code that the CI station runs FOR REAL.
 * Two tracks (JavaScript in a Web Worker, Python via Pyodide). Both are small,
 * cloud-flavoured, and have a hidden test suite that genuinely passes or fails.
 * Break the code → red liquid, pipeline halts. Fix it → green, it flows on.
 */

export type ChallengeLang = "javascript" | "python";

export interface TestCase {
  /** Positional args passed to the function. */
  args: number[];
  /** Expected numeric return. */
  expected: number;
  desc: string;
}

export interface Challenge {
  id: string;
  lang: ChallengeLang;
  /** Name of the function the visitor must keep defined. */
  fnName: string;
  title: string;
  prompt: string;
  starter: string;
  tests: TestCase[];
  /** Float comparison tolerance. */
  tolerance: number;
}

export const CHALLENGES: Record<ChallengeLang, Challenge> = {
  javascript: {
    id: "s3-cost",
    lang: "javascript",
    fnName: "estimateS3Cost",
    title: "S3 monthly cost estimator",
    prompt:
      "AWS S3 Standard (eu-north-1, approx): $0.023 per GB-month of storage and $0.0004 per 1,000 GET requests. Return the monthly cost in USD. Edit the code and hit Run — the CI gate runs your function for real.",
    tolerance: 1e-4,
    starter: `// Return the monthly S3 cost in USD.
//   storage:  $0.023 per GB-month
//   requests: $0.0004 per 1,000 GET requests
function estimateS3Cost(gb, getRequests) {
  const storage = gb * 0.023;
  const requests = (getRequests / 1000) * 0.0004;
  return Number((storage + requests).toFixed(4));
}
`,
    tests: [
      { args: [0, 0], expected: 0, desc: "empty bucket costs nothing" },
      { args: [100, 0], expected: 2.3, desc: "100 GB stored = $2.30" },
      { args: [0, 1_000_000], expected: 0.4, desc: "1M GETs = $0.40" },
      { args: [50, 2_000_000], expected: 1.95, desc: "50 GB + 2M GETs = $1.95" },
    ],
  },

  python: {
    id: "backoff",
    lang: "python",
    fnName: "backoff",
    title: "Exponential backoff with cap",
    prompt:
      "A resilient client retries with exponential backoff, capped so it never waits forever. Return the delay in seconds for retry `attempt` (0-indexed): min(base * 2**attempt, cap). This runs real CPython (Pyodide) in your browser.",
    tolerance: 1e-6,
    starter: `# Exponential backoff with a ceiling (reliability pattern).
def backoff(attempt, base=0.5, cap=8.0):
    return min(base * (2 ** attempt), cap)
`,
    tests: [
      { args: [0], expected: 0.5, desc: "first retry waits base (0.5s)" },
      { args: [1], expected: 1.0, desc: "doubles to 1.0s" },
      { args: [2], expected: 2.0, desc: "doubles to 2.0s" },
      { args: [10], expected: 8.0, desc: "capped at 8.0s" },
    ],
  },
};
