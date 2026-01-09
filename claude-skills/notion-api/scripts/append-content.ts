#!/usr/bin/env npx tsx
import { Client } from "@notionhq/client";
import { parseArgs } from "util";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const { values } = parseArgs({
  options: {
    page: { type: "string", short: "p" },
    text: { type: "string", short: "t" },
    heading: { type: "string", short: "h" },
    bullet: { type: "string", short: "b", multiple: true },
    divider: { type: "boolean", short: "d" },
  },
});

if (
  !values.page ||
  (!values.text && !values.heading && !values.bullet && !values.divider)
) {
  console.error(`Usage: npx tsx append-content.ts --page <PAGE_ID> [options]

Options:
  --text, -t      Add a paragraph
  --heading, -h   Add a heading (h2)
  --bullet, -b    Add bullet point (can use multiple times)
  --divider, -d   Add a horizontal divider

Examples:
  npx tsx append-content.ts --page abc123 --text "This is a paragraph"
  npx tsx append-content.ts --page abc123 --heading "Section Title" --text "Content below"
  npx tsx append-content.ts --page abc123 --bullet "Item 1" --bullet "Item 2" --bullet "Item 3"
`);
  process.exit(1);
}

async function main() {
  const blocks: any[] = [];

  if (values.divider) {
    blocks.push({ object: "block", type: "divider", divider: {} });
  }

  if (values.heading) {
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: values.heading } }],
      },
    });
  }

  if (values.text) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: values.text } }],
      },
    });
  }

  if (values.bullet && values.bullet.length > 0) {
    for (const item of values.bullet) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: item } }],
        },
      });
    }
  }

  if (blocks.length === 0) {
    console.error("No content to add");
    process.exit(1);
  }

  try {
    await notion.blocks.children.append({
      block_id: values.page!,
      children: blocks,
    });

    console.log(`✓ Added ${blocks.length} block(s) to page`);
  } catch (error: any) {
    console.error("Error:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
