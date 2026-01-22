#!/usr/bin/env tsx
/**
 * Fill form field
 * Usage: fill <selector> <value> [--timeout 5000]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const selector = positional[0];
const value = positional.slice(1).join(" ");

if (!selector) {
  console.error("Usage: fill <selector> <value> [--timeout ms]");
  process.exit(1);
}

const timeout = flags.timeout ? parseInt(flags.timeout as string, 10) : 5000;

await runAction(
  async () => {
    const page = await getPage();
    await page.fill(selector, value, { timeout });

    const displayValue = value.length > 50 ? value.slice(0, 47) + "..." : value;
    console.log(`Filled: ${selector} = "${displayValue}"`);
  },
  {
    onError: (e) => {
      if (e.message?.includes("Timeout")) {
        console.error(`Element not found: ${selector}`);
        console.error(`Timeout: ${timeout}ms`);
        return true;
      }
      return false;
    },
  }
);
