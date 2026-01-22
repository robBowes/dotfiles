#!/usr/bin/env tsx
/**
 * Click element by selector
 * Usage: click <selector> [--force] [--double] [--timeout 5000]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const selector = positional[0];
if (!selector) {
  console.error("Usage: click <selector> [--force] [--double] [--timeout ms]");
  process.exit(1);
}

const force = flags.force === true;
const double = flags.double === true;
const timeout = flags.timeout ? parseInt(flags.timeout as string, 10) : 5000;

await runAction(
  async () => {
    const page = await getPage();

    if (double) {
      await page.dblclick(selector, { force, timeout });
      console.log(`Double-clicked: ${selector}`);
    } else {
      await page.click(selector, { force, timeout });
      console.log(`Clicked: ${selector}`);
    }
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
