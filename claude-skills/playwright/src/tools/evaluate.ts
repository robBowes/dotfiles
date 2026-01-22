import { z } from "zod";
import { defineTool } from "../lib/tool.js";

export const evaluate = defineTool({
  name: "evaluate",
  description: "Run JavaScript in page context",
  schema: z.object({
    script: z.string().describe("JavaScript to evaluate"),
  }),
  timeout: 10000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const result = await page.evaluate(params.script);
    return { result };
  },
});
