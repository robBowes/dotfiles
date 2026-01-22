import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { waitForCompletion } from "../lib/timeout.js";
import { toPlaywrightSelector } from "../lib/selector.js";

export const select = defineTool({
  name: "select",
  description: "Select dropdown option. Supports role format like: combobox \"Country\"",
  schema: z.object({
    selector: z.string().describe("Selector: CSS or role format (e.g. combobox \"Country\")"),
    value: z.string().describe("Value to select"),
    by: z
      .enum(["value", "label", "index"])
      .default("value")
      .describe("How to match the option"),
  }),
  timeout: 5000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const selector = toPlaywrightSelector(params.selector);

    let selected: string[] = [];
    await waitForCompletion(page, async () => {
      switch (params.by) {
        case "label":
          selected = await page.selectOption(selector, { label: params.value });
          break;
        case "index":
          selected = await page.selectOption(selector, {
            index: parseInt(params.value, 10),
          });
          break;
        case "value":
        default:
          selected = await page.selectOption(selector, { value: params.value });
          break;
      }
    });

    return { selected: selector, value: params.value, by: params.by, values: selected };
  },
});
