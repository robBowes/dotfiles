#!/usr/bin/env tsx
/**
 * Select dropdown option
 * Usage: select <selector> <value> [--by value|label|index]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const selector = positional[0];
const value = positional[1];

if (!selector || value === undefined) {
  console.error("Usage: select <selector> <value> [--by value|label|index]");
  process.exit(1);
}

const by = (flags.by as string) || "value";

await runAction(async () => {
  const page = await getPage();

  let selected: string[];
  switch (by) {
    case "label":
      selected = await page.selectOption(selector, { label: value });
      break;
    case "index":
      selected = await page.selectOption(selector, { index: parseInt(value, 10) });
      break;
    case "value":
    default:
      selected = await page.selectOption(selector, { value });
      break;
  }

  console.log(`Selected: ${selector} = ${value} (by ${by})`);
  if (selected.length > 0) {
    console.log(`Values: ${selected.join(", ")}`);
  }
});
