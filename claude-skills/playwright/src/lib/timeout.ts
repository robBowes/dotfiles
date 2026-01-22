import type { Page, Request } from "playwright";

export class TimeoutError extends Error {
  constructor(ms: number, operation?: string) {
    super(`Timeout after ${ms}ms${operation ? `: ${operation}` : ""}`);
    this.name = "TimeoutError";
  }
}

/**
 * Race a promise against a timeout. Rejects with TimeoutError if timeout wins.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  operation?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(ms, operation)), ms)
    ),
  ]);
}

/**
 * Wait for network requests to complete after an action, with hard timeout cap.
 * Pattern from MS Playwright MCP.
 */
export async function waitForCompletion<T>(
  page: Page,
  action: () => Promise<T>,
  timeout = 5000
): Promise<T> {
  const requests: Request[] = [];
  const listener = (r: Request) => requests.push(r);
  page.on("request", listener);

  let result: T;
  try {
    result = await action();
    // Brief settle time
    await page.waitForTimeout(500);
  } finally {
    page.off("request", listener);
  }

  // Wait for tracked requests to complete, with hard timeout
  const relevantTypes = ["document", "stylesheet", "script", "xhr", "fetch"];
  const pending = requests
    .filter((r) => relevantTypes.includes(r.resourceType()))
    .map((r) => r.response().then((res) => res?.finished()).catch(() => {}));

  if (pending.length > 0) {
    await Promise.race([
      Promise.all(pending),
      new Promise((r) => setTimeout(r, timeout)),
    ]);
    // Extra settle after network
    await page.waitForTimeout(500);
  }

  return result;
}
