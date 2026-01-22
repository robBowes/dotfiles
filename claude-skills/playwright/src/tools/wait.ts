import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { toPlaywrightSelector } from "../lib/selector.js";

export const wait = defineTool({
  name: "wait",
  description: "Wait for element. Supports role format like: button \"Submit\"",
  schema: z.object({
    selector: z.string().describe("Selector: CSS or role format (e.g. button \"Submit\")"),
    state: z
      .enum(["visible", "hidden", "attached", "detached"])
      .default("visible")
      .describe("Element state to wait for"),
  }),
  timeout: 30000, // Waiting can take time
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const selector = toPlaywrightSelector(params.selector);
    await page.waitForSelector(selector, { state: params.state });
    return { selector, state: params.state };
  },
});
