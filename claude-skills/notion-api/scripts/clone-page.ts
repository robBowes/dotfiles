#!/usr/bin/env tsx
import { Client } from "@notionhq/client";
import { parseArgs } from "util";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

function extractId(input: string): string {
  if (input.includes("notion.so")) {
    const url = new URL(input);
    const pParam = url.searchParams.get("p");
    if (pParam) return pParam.replace(/-/g, "");
    const match =
      url.pathname.match(/([a-f0-9]{32})$/i) ||
      url.pathname.match(/([a-f0-9-]{36})$/i) ||
      url.pathname.match(/-([a-f0-9]{32})(?:\?|$)/i);
    if (match) return match[1].replace(/-/g, "");
  }
  return input.replace(/-/g, "");
}

const { values } = parseArgs({
  options: {
    page: { type: "string", short: "p" },
    "target-db": { type: "string", short: "t" },
    "target-page": { type: "string" },
    "property-map": { type: "string", multiple: true },
    json: { type: "boolean", default: false },
  },
});

if (!values.page || (!values["target-db"] && !values["target-page"])) {
  console.error(`Usage: clone-page.ts --page <PAGE_ID|URL> --target-db <DB_ID|URL>
       clone-page.ts --page <PAGE_ID|URL> --target-page <PAGE_ID|URL>

Deep clone a page (properties + content blocks) to another location.
Does NOT clone subpages.

Options:
  --page, -p        Source page ID or URL (required)
  --target-db, -t   Target database ID or URL
  --target-page     Target page ID or URL (clone as child page)
  --property-map    Map property names/values (can repeat)
  --json            Output full response as JSON

Property Mapping:
  Rename property:     --property-map 'OldName:NewName'
  Map status value:    --property-map 'Status.OldValue:Status.NewValue'
  Map select value:    --property-map 'Priority.High:Priority.Critical'

Examples:
  clone-page.ts --page abc123 --target-db def456
  clone-page.ts --page 'https://notion.so/...' --target-page xyz789
  clone-page.ts --page abc --target-db def \\
    --property-map 'Name:Task name' \\
    --property-map 'Status.Triage:Status.Not Started'
`);
  process.exit(1);
}

const sourceId = extractId(values.page);
const targetDbId = values["target-db"] ? extractId(values["target-db"]) : null;
const targetPageId = values["target-page"]
  ? extractId(values["target-page"])
  : null;

// Parse property mappings
interface PropertyMapping {
  fromProp: string;
  toProp: string;
  fromValue?: string;
  toValue?: string;
}

function parsePropertyMaps(maps: string[] | undefined): PropertyMapping[] {
  if (!maps) return [];
  return maps.map((m) => {
    const [from, to] = m.split(":");
    if (!from || !to) {
      throw new Error(`Invalid property-map format: ${m}`);
    }
    const fromParts = from.split(".");
    const toParts = to.split(".");
    if (fromParts.length === 1 && toParts.length === 1) {
      // Property rename: 'OldName:NewName'
      return { fromProp: from, toProp: to };
    } else if (fromParts.length === 2 && toParts.length === 2) {
      // Value mapping: 'Status.Triage:Status.Not Started'
      return {
        fromProp: fromParts[0],
        toProp: toParts[0],
        fromValue: fromParts[1],
        toValue: toParts[1],
      };
    } else {
      throw new Error(`Invalid property-map format: ${m}`);
    }
  });
}

function applyPropertyMappings(
  properties: Record<string, any>,
  mappings: PropertyMapping[],
): Record<string, any> {
  const result: Record<string, any> = {};
  const propRenames = new Map<string, string>();
  const valueMaps = new Map<string, { from: string; to: string }[]>();

  // Build lookup maps
  for (const m of mappings) {
    if (!m.fromValue) {
      propRenames.set(m.fromProp, m.toProp);
    } else {
      const key = m.fromProp;
      if (!valueMaps.has(key)) valueMaps.set(key, []);
      valueMaps.get(key)!.push({ from: m.fromValue!, to: m.toValue! });
    }
  }

  for (const [name, prop] of Object.entries(properties)) {
    const targetName = propRenames.get(name) || name;
    let targetProp = { ...prop };

    // Apply value mappings for status/select
    const valueMap = valueMaps.get(name);
    if (valueMap) {
      if (prop.type === "status" && prop.status?.name) {
        for (const { from, to } of valueMap) {
          if (prop.status.name === from) {
            targetProp = { type: "status", status: { name: to } };
            break;
          }
        }
      } else if (prop.type === "select" && prop.select?.name) {
        for (const { from, to } of valueMap) {
          if (prop.select.name === from) {
            targetProp = { type: "select", select: { name: to } };
            break;
          }
        }
      }
    }

    result[targetName] = targetProp;
  }

  return result;
}

const propertyMappings = parsePropertyMaps(values["property-map"]);

// Notion API limit for rich_text content
const MAX_TEXT_LENGTH = 2000;

// Sanitize user mentions in rich_text - API only accepts {id: string} for users
function sanitizeRichText(richText: any[]): any[] {
  if (!richText || !Array.isArray(richText)) return richText;
  return richText.map((item) => {
    if (item.type === "mention" && item.mention?.type === "user") {
      return {
        type: "mention",
        mention: { type: "user", user: { id: item.mention.user.id } },
        annotations: item.annotations,
        plain_text: item.plain_text,
        href: item.href,
      };
    }
    return item;
  });
}

// Chunk rich_text items that exceed 2000 char limit
function chunkRichText(richText: any[]): any[] {
  if (!richText || !Array.isArray(richText)) return richText;

  const result: any[] = [];
  for (const item of richText) {
    if (item.type === "text" && item.text?.content?.length > MAX_TEXT_LENGTH) {
      // Split long text into chunks
      const content = item.text.content;
      for (let i = 0; i < content.length; i += MAX_TEXT_LENGTH) {
        result.push({
          type: "text",
          text: {
            content: content.slice(i, i + MAX_TEXT_LENGTH),
            link: i === 0 ? item.text.link : null,
          },
          annotations: item.annotations,
        });
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

// Check if URL is internal Notion file (will expire, can't clone)
function isInternalNotionUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("secure.notion-static.com") ||
    url.includes("prod-files-secure.s3")
  );
}

// Block types that contain rich_text
const RICH_TEXT_BLOCK_TYPES = [
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
  "toggle",
  "to_do",
  "code",
];

// Block types with internal file URLs that can't be cloned
const FILE_BLOCK_TYPES = ["file", "image", "video", "pdf"];

async function cloneBlocks(
  sourceBlockId: string,
  targetBlockId: string,
): Promise<void> {
  const blocks = await notion.blocks.children.list({ block_id: sourceBlockId });

  for (const block of blocks.results as any[]) {
    // Skip child_page and child_database - we don't clone subpages
    if (block.type === "child_page" || block.type === "child_database") {
      continue;
    }

    // Skip file blocks with internal Notion URLs (they expire)
    if (FILE_BLOCK_TYPES.includes(block.type)) {
      const fileData = block[block.type];
      const url =
        fileData?.file?.url || fileData?.external?.url || fileData?.url;
      if (fileData?.type === "file" || isInternalNotionUrl(url)) {
        console.error(
          `  Skipped ${block.type}: internal Notion URL (cannot clone)`,
        );
        continue;
      }
    }

    // Create a copy of the block without system properties
    const blockData: any = {
      object: "block",
      type: block.type,
      [block.type]: { ...block[block.type] },
    };

    // Remove read-only properties
    if (blockData[block.type]) {
      delete blockData[block.type].id;
      delete blockData[block.type].created_time;
      delete blockData[block.type].last_edited_time;
    }

    // Sanitize and chunk rich_text
    if (
      RICH_TEXT_BLOCK_TYPES.includes(block.type) &&
      blockData[block.type]?.rich_text
    ) {
      blockData[block.type].rich_text = chunkRichText(
        sanitizeRichText(blockData[block.type].rich_text),
      );
    }

    try {
      const newBlock = await notion.blocks.children.append({
        block_id: targetBlockId,
        children: [blockData],
      });

      // Recursively clone children if block has them
      if (
        block.has_children &&
        block.type !== "child_page" &&
        block.type !== "child_database"
      ) {
        const newBlockId = (newBlock.results[0] as any).id;
        await cloneBlocks(block.id, newBlockId);
      }
    } catch (e: any) {
      // Some block types can't be created via API, skip them
      console.error(`  Skipped ${block.type}: ${e.message}`);
    }
  }
}

async function main() {
  try {
    // Get source page
    const sourcePage = (await notion.pages.retrieve({
      page_id: sourceId,
    })) as any;
    const title = getTitle(sourcePage.properties);

    console.error(`Cloning: ${title}`);

    // Prepare properties for new page
    const properties: any = {};

    for (const [name, prop] of Object.entries(sourcePage.properties) as [
      string,
      any,
    ][]) {
      // Skip computed properties
      if (
        [
          "formula",
          "rollup",
          "created_time",
          "created_by",
          "last_edited_time",
          "last_edited_by",
          "unique_id",
        ].includes(prop.type)
      ) {
        continue;
      }
      // Sanitize people properties - API only accepts {id: string}
      if (prop.type === "people" && prop.people) {
        properties[name] = {
          type: "people",
          people: prop.people.map((p: any) => ({ id: p.id })),
        };
      } else {
        properties[name] = prop;
      }
    }

    // Apply property mappings
    const mappedProperties =
      propertyMappings.length > 0
        ? applyPropertyMappings(properties, propertyMappings)
        : properties;

    // Create new page
    let newPage: any;

    if (targetDbId) {
      newPage = await notion.pages.create({
        parent: { database_id: targetDbId },
        properties: mappedProperties,
      });
    } else if (targetPageId) {
      // For page parent, we need title property
      const titleProp = Object.entries(mappedProperties).find(
        ([_, p]: any) => p.type === "title",
      );
      newPage = await notion.pages.create({
        parent: { page_id: targetPageId },
        properties: titleProp
          ? { [titleProp[0]]: titleProp[1] }
          : {
              title: { title: [{ text: { content: title } }] },
            },
      });
    }

    console.error(`Created: ${newPage.url}`);

    // Clone content blocks
    console.error("Cloning content...");
    await cloneBlocks(sourceId, newPage.id);

    if (values.json) {
      console.log(JSON.stringify(newPage, null, 2));
    } else {
      console.log("✓ Clone complete");
      console.log(`  Source: ${sourceId}`);
      console.log(`  New page: ${newPage.id}`);
      console.log(`  URL: ${newPage.url}`);
    }
  } catch (error: any) {
    console.error("Error:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

function getTitle(props: any): string {
  for (const val of Object.values(props) as any[]) {
    if (val.type === "title" && val.title?.[0]) {
      return val.title[0].plain_text;
    }
  }
  return "Untitled";
}

main();
