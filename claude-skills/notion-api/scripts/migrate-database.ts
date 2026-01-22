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
    source: { type: "string", short: "s" },
    target: { type: "string", short: "t" },
    "filter-status": { type: "string" },
    "property-map": { type: "string", multiple: true },
    "archive-source": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "clone-content": { type: "boolean", default: true },
    limit: { type: "string", short: "l" },
  },
});

if (!values.source || !values.target) {
  console.error(`Usage: migrate-database.ts --source <DB_ID|URL> --target <DB_ID|URL>

Bulk migrate pages from one database to another.

Options:
  --source, -s       Source database ID or URL (required)
  --target, -t       Target database ID or URL (required)
  --filter-status    Only migrate pages with this status
  --property-map     Map property names/values (can repeat)
  --archive-source   Archive source pages after migration
  --clone-content    Clone page content blocks (default: true)
  --dry-run          Preview migration without making changes
  --limit, -l        Maximum pages to migrate

Property Mapping:
  Rename property:     --property-map 'OldName:NewName'
  Map status value:    --property-map 'Status.OldValue:Status.NewValue'

Examples:
  migrate-database.ts --source abc123 --target def456 --dry-run
  migrate-database.ts -s abc -t def --filter-status "Not Done" --archive-source
  migrate-database.ts -s abc -t def --property-map 'Name:Task name'
`);
  process.exit(1);
}

const sourceDbId = extractId(values.source);
const targetDbId = extractId(values.target);
const dryRun = values["dry-run"];
const archiveSource = values["archive-source"];
const cloneContent = values["clone-content"] ?? true;
const limit = values.limit ? parseInt(values.limit) : Infinity;

// Notion API limit for rich_text content
const MAX_TEXT_LENGTH = 2000;

// Property mapping types and functions
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
      return { fromProp: from, toProp: to };
    } else if (fromParts.length === 2 && toParts.length === 2) {
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

// Rich text helpers
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

function chunkRichText(richText: any[]): any[] {
  if (!richText || !Array.isArray(richText)) return richText;
  const result: any[] = [];
  for (const item of richText) {
    if (item.type === "text" && item.text?.content?.length > MAX_TEXT_LENGTH) {
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

function isInternalNotionUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("secure.notion-static.com") ||
    url.includes("prod-files-secure.s3")
  );
}

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

const FILE_BLOCK_TYPES = ["file", "image", "video", "pdf"];

// Clone blocks from source to target
async function cloneBlocks(
  sourceBlockId: string,
  targetBlockId: string,
): Promise<void> {
  const blocks = await notion.blocks.children.list({ block_id: sourceBlockId });

  for (const block of blocks.results as any[]) {
    if (block.type === "child_page" || block.type === "child_database") {
      continue;
    }

    if (FILE_BLOCK_TYPES.includes(block.type)) {
      const fileData = block[block.type];
      const url =
        fileData?.file?.url || fileData?.external?.url || fileData?.url;
      if (fileData?.type === "file" || isInternalNotionUrl(url)) {
        continue;
      }
    }

    const blockData: any = {
      object: "block",
      type: block.type,
      [block.type]: { ...block[block.type] },
    };

    if (blockData[block.type]) {
      delete blockData[block.type].id;
      delete blockData[block.type].created_time;
      delete blockData[block.type].last_edited_time;
    }

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

      if (
        block.has_children &&
        block.type !== "child_page" &&
        block.type !== "child_database"
      ) {
        const newBlockId = (newBlock.results[0] as any).id;
        await cloneBlocks(block.id, newBlockId);
      }
    } catch (e: any) {
      // Skip unsupported block types
    }
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

async function queryAllPages(): Promise<any[]> {
  const pages: any[] = [];
  let cursor: string | undefined;

  const filter = values["filter-status"]
    ? { property: "Status", status: { equals: values["filter-status"] } }
    : undefined;

  do {
    const response = await notion.databases.query({
      database_id: sourceDbId,
      filter,
      start_cursor: cursor,
      page_size: Math.min(100, limit - pages.length),
    });
    pages.push(...response.results);
    cursor =
      response.has_more && pages.length < limit
        ? response.next_cursor!
        : undefined;
  } while (cursor);

  return pages;
}

async function migratePage(sourcePage: any): Promise<string | null> {
  const title = getTitle(sourcePage.properties);

  // Prepare properties
  const properties: any = {};
  for (const [name, prop] of Object.entries(sourcePage.properties) as [
    string,
    any,
  ][]) {
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
    if (prop.type === "people" && prop.people) {
      properties[name] = {
        type: "people",
        people: prop.people.map((p: any) => ({ id: p.id })),
      };
    } else {
      properties[name] = prop;
    }
  }

  const mappedProperties =
    propertyMappings.length > 0
      ? applyPropertyMappings(properties, propertyMappings)
      : properties;

  if (dryRun) {
    console.log(`  [DRY-RUN] Would create: ${title}`);
    return null;
  }

  // Create new page
  const newPage = await notion.pages.create({
    parent: { database_id: targetDbId },
    properties: mappedProperties,
  });

  // Clone content blocks
  if (cloneContent) {
    await cloneBlocks(sourcePage.id, newPage.id);
  }

  // Archive source
  if (archiveSource) {
    await notion.pages.update({
      page_id: sourcePage.id,
      archived: true,
    });
  }

  return (newPage as any).id;
}

async function main() {
  try {
    console.log("Fetching source pages...");
    const pages = await queryAllPages();
    console.log(`Found ${pages.length} pages to migrate`);

    if (dryRun) {
      console.log("\n[DRY-RUN MODE - No changes will be made]\n");
    }

    let migrated = 0;
    let failed = 0;

    for (const page of pages) {
      const title = getTitle(page.properties);
      try {
        const newId = await migratePage(page);
        if (newId) {
          console.log(`✓ Migrated: ${title}`);
          migrated++;
        } else {
          migrated++; // dry-run counts as success
        }
      } catch (e: any) {
        console.error(`✗ Failed: ${title} - ${e.message}`);
        failed++;
      }
    }

    console.log(`\nComplete: ${migrated} migrated, ${failed} failed`);
    if (dryRun) {
      console.log("(Dry-run mode - no actual changes made)");
    }
  } catch (error: any) {
    console.error("Error:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
