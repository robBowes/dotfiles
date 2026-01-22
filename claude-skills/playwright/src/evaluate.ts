#!/usr/bin/env tsx
/**
 * Run JavaScript in page context
 * Usage: evaluate <script> [--json]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const script = positional.join(" ");
if (!script) {
  console.error("Usage: evaluate <script> [--json]");
  process.exit(1);
}

const json = flags.json === true;

await runAction(
  async () => {
    const page = await getPage();
    const result = await page.evaluate(script);

    if (json || typeof result === "object") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  },
  {
    onError: (e) => {
      console.error(`Evaluation error: ${e.message}`);
      return true;
    },
  }
);
