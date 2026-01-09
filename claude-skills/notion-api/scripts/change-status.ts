#!/usr/bin/env npx tsx
import { Client } from '@notionhq/client';
import { parseArgs } from 'util';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const { values } = parseArgs({
  options: {
    page: { type: 'string', short: 'p' },
    status: { type: 'string', short: 's' },
    property: { type: 'string', default: 'Status' }, // Allow custom status property name
    json: { type: 'boolean', default: false },
  },
});

if (!values.page || !values.status) {
  console.error(`Usage: npx tsx change-status.ts --page <PAGE_ID> --status <STATUS_VALUE>

Options:
  --page, -p      Page ID (required)
  --status, -s    New status value (required)
  --property      Status property name (default: "Status")
  --json          Output full response as JSON

Common status values:
  "Not Started", "In Progress", "Paused", "Done", "Blocked"

Examples:
  npx tsx change-status.ts -p abc123 -s "Done"
  npx tsx change-status.ts --page abc123 --status "In Progress"
  npx tsx change-status.ts -p abc123 -s "Complete" --property "Task Status"
`);
  process.exit(1);
}

async function main() {
  try {
    // Get the page to determine status property type
    const page = await notion.pages.retrieve({ page_id: values.page! }) as any;
    const statusProp = page.properties[values.property!];
    
    if (!statusProp) {
      console.error(`Property "${values.property}" not found. Available properties:`);
      for (const [name, prop] of Object.entries(page.properties) as any[]) {
        if (prop.type === 'status' || prop.type === 'select') {
          console.error(`  - ${name} (${prop.type})`);
        }
      }
      process.exit(1);
    }
    
    let propertyUpdate: any;
    
    if (statusProp.type === 'status') {
      propertyUpdate = { status: { name: values.status } };
    } else if (statusProp.type === 'select') {
      propertyUpdate = { select: { name: values.status } };
    } else {
      console.error(`Property "${values.property}" is type "${statusProp.type}", expected "status" or "select"`);
      process.exit(1);
    }
    
    const oldStatus = statusProp.status?.name || statusProp.select?.name || '(none)';
    
    const updated = await notion.pages.update({
      page_id: values.page!,
      properties: {
        [values.property!]: propertyUpdate,
      },
    });
    
    if (values.json) {
      console.log(JSON.stringify(updated, null, 2));
    } else {
      // Get title for confirmation
      const title = Object.values(page.properties)
        .find((p: any) => p.type === 'title') as any;
      const titleText = title?.title?.[0]?.plain_text || '(Untitled)';
      
      console.log('✓ Status updated');
      console.log(`  Page: ${titleText}`);
      console.log(`  ${oldStatus} → ${values.status}`);
    }
    
  } catch (error: any) {
    console.error('Error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
