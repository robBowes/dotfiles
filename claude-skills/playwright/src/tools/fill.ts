import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { waitForCompletion } from "../lib/timeout.js";
import { toPlaywrightSelector } from "../lib/selector.js";

export const fill = defineTool({
  name: "fill",
  description: "Fill form field. Supports role format like: textbox \"Email\"",
  schema: z.object({
    selector: z.string().describe("Selector: CSS or role format (e.g. textbox \"Email\")"),
    value: z.string().describe("Value to fill"),
  }),
  timeout: 5000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const selector = toPlaywrightSelector(params.selector);

    await waitForCompletion(page, async () => {
      await page.fill(selector, params.value);
    });

    const displayValue =
      params.value.length > 50 ? params.value.slice(0, 47) + "..." : params.value;
    return { filled: selector, value: displayValue };
  },
});
