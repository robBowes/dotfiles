import { BrowserNotRunningError } from "./browser.js";

/**
 * Wrapper for browser action scripts that ensures proper exit.
 * Handles errors and always calls process.exit() to prevent hanging.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (e: Error) => boolean; // Return true if error was handled
  }
): Promise<never> {
  try {
    await fn();
    process.exit(0);
  } catch (e) {
    if (e instanceof BrowserNotRunningError) {
      console.error(e.message);
      process.exit(1);
    }

    const err = e instanceof Error ? e : new Error(String(e));

    // Allow custom error handling
    if (options?.onError?.(err)) {
      process.exit(1);
    }

    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
