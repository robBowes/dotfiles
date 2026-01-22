import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { waitForCompletion } from "../lib/timeout.js";
import { toPlaywrightSelector } from "../lib/selector.js";

export const click = defineTool({
  name: "click",
  description: "Click element. Supports CSS, text=, xpath=, or role format like: button \"Submit\"",
  schema: z.object({
    selector: z.string().describe("Selector: CSS, text=, or role format (e.g. link \"Home\")"),
    force: z.boolean().default(false).describe("Bypass actionability checks"),
    double: z.boolean().default(false).describe("Double click"),
  }),
  timeout: 5000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const selector = toPlaywrightSelector(params.selector);

    const urlBefore = page.url();
    const pageCountBefore = page.context().pages().length;

    await waitForCompletion(page, async () => {
      if (params.double) {
        await page.dblclick(selector, { force: params.force });
      } else {
        await page.click(selector, { force: params.force });
      }
    });

    // Detect what happened
    const urlAfter = page.url();
    const pageCountAfter = page.context().pages().length;

    // Quick checks for UI changes (100ms max each)
    const quickCheck = (locator: ReturnType<typeof page.locator>) =>
      Promise.race([
        locator.first().isVisible(),
        new Promise<boolean>(r => setTimeout(() => r(false), 100))
      ]).catch(() => false);

    const [dialog, menu] = await Promise.all([
      quickCheck(page.locator('[role="dialog"], [role="alertdialog"]')),
      quickCheck(page.locator('[role="menu"], [role="listbox"]')),
    ]);

    let effect: string;
    if (pageCountAfter > pageCountBefore) {
      effect = "new tab opened";
    } else if (urlAfter !== urlBefore) {
      effect = `navigated to ${urlAfter}`;
    } else if (dialog) {
      effect = "dialog opened";
    } else if (menu) {
      effect = "menu opened";
    } else {
      effect = "clicked";
    }

    return { selector, effect };
  },
});
