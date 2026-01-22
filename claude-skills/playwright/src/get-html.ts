#!/usr/bin/env tsx
/**
 * Get HTML from element
 * Usage: get-html <selector> [--outer]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const selector = positional[0];
if (!selector) {
  console.error("Usage: get-html <selector> [--outer]");
  process.exit(1);
}

const outer = flags.outer === true;

await runAction(async () => {
  const page = await getPage();
  const element = await page.$(selector);

  if (!element) {
    console.error(`Element not found: ${selector}`);
    process.exit(1);
  }

  const html = outer
    ? await element.evaluate((el) => el.outerHTML)
    : await element.innerHTML();

  console.log(html);
});
