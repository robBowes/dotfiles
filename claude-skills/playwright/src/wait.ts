#!/usr/bin/env tsx
/**
 * Wait for element
 * Usage: wait <selector> [--state visible|hidden|attached|detached] [--timeout 30000]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const selector = positional[0];
if (!selector) {
  console.error("Usage: wait <selector> [--state visible|hidden|attached|detached] [--timeout ms]");
  process.exit(1);
}

const state = (flags.state as "visible" | "hidden" | "attached" | "detached") || "visible";
const timeout = flags.timeout ? parseInt(flags.timeout as string, 10) : 30000;

await runAction(
  async () => {
    const page = await getPage();
    await page.waitForSelector(selector, { state, timeout });
    console.log(`Element ${state}: ${selector}`);
  },
  {
    onError: (e) => {
      if (e.message?.includes("Timeout")) {
        console.error(`Timeout waiting for: ${selector}`);
        console.error(`State: ${state}, Timeout: ${timeout}ms`);
        return true;
      }
      return false;
    },
  }
);
