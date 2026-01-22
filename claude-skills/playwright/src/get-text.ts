#!/usr/bin/env tsx
/**
 * Get text content from element
 * Usage: get-text <selector> [--all] [--json]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const selector = positional[0];
if (!selector) {
  console.error("Usage: get-text <selector> [--all] [--json]");
  process.exit(1);
}

const all = flags.all === true;
const json = flags.json === true;

await runAction(async () => {
  const page = await getPage();

  if (all) {
    const elements = await page.$$(selector);
    const texts = await Promise.all(
      elements.map((el) => el.textContent())
    );
    const cleaned = texts.map((t) => t?.trim() || "").filter(Boolean);

    if (json) {
      console.log(JSON.stringify(cleaned, null, 2));
    } else {
      cleaned.forEach((t) => console.log(t));
    }
  } else {
    const element = await page.$(selector);
    if (!element) {
      console.error(`Element not found: ${selector}`);
      process.exit(1);
    }
    const text = await element.textContent();
    console.log(text?.trim() || "");
  }
});
