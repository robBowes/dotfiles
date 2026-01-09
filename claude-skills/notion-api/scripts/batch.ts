#!/usr/bin/env npx tsx
/**
 * Batch operations helper using zx
 * 
 * Usage examples:
 *   npx tsx scripts/batch.ts mark-done <DB_ID> --filter-status "In Progress"
 *   npx tsx scripts/batch.ts export <DB_ID> --output items.json
 */
import { $ } from 'zx';
import { Client } from '@notionhq/client';
import { parseArgs } from 'util';
import { writeFile } from 'fs/promises';

$.verbose = false; // Quiet mode

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const args = process.argv.slice(2);
const command = args[0];

const { values } = parseArgs({
  args: args.slice(1),
  options: {
    database: { type: 'string', short: 'd' },
    'filter-status': { type: 'string' },
    'filter-project': { type: 'string' },
    'new-status': { type: 'string', default: 'Done' },
    output: { type: 'string', short: 'o' },
    'dry-run': { type: 'boolean', default: false },
  },
});

async function getItems(databaseId: string, status?: string, project?: string) {
  const filters: any[] = [];
  
  if (status) {
    filters.push({ property: 'Status', status: { equals: status } });
  }
  if (project) {
    filters.push({ property: 'Project', select: { equals: project } });
  }
  
  const query: any = { database_id: databaseId, page_size: 100 };
  if (filters.length > 0) {
    query.filter = filters.length === 1 ? filters[0] : { and: filters };
  }
  
  const results: any[] = [];
  let cursor: string | undefined;
  
  do {
    const response = await notion.databases.query({ ...query, start_cursor: cursor });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor! : undefined;
  } while (cursor);
  
  return results;
}

async function main() {
  if (!command || !values.database) {
    console.log(`Usage: npx tsx scripts/batch.ts <command> --database <DB_ID> [options]

Commands:
  mark-done     Change status of filtered items to Done (or --new-status)
  export        Export all items to JSON file
  count         Count items matching filter

Options:
  --database, -d      Database ID (required)
  --filter-status     Filter by status
  --filter-project    Filter by project
  --new-status        Status to set (default: "Done")
  --output, -o        Output file for export
  --dry-run           Show what would be done without making changes

Examples:
  npx tsx batch.ts mark-done -d abc123 --filter-status "In Progress"
  npx tsx batch.ts export -d abc123 -o backup.json
  npx tsx batch.ts count -d abc123 --filter-status "Not Started"
`);
    process.exit(1);
  }
  
  const items = await getItems(
    values.database,
    values['filter-status'],
    values['filter-project']
  );
  
  console.log(`Found ${items.length} items`);
  
  switch (command) {
    case 'mark-done':
    case 'set-status': {
      const newStatus = values['new-status'];
      console.log(`Setting status to "${newStatus}"...`);
      
      for (const item of items) {
        const title = getTitle(item.properties);
        
        if (values['dry-run']) {
          console.log(`  [dry-run] Would update: ${title}`);
          continue;
        }
        
        try {
          await notion.pages.update({
            page_id: item.id,
            properties: {
              Status: { status: { name: newStatus! } },
            },
          });
          console.log(`  ✓ ${title}`);
        } catch (e: any) {
          console.log(`  ✗ ${title}: ${e.message}`);
        }
      }
      break;
    }
    
    case 'export': {
      const output = values.output || 'notion-export.json';
      const exportData = items.map(item => ({
        id: item.id,
        url: item.url,
        properties: item.properties,
        created_time: item.created_time,
        last_edited_time: item.last_edited_time,
      }));
      
      await writeFile(output, JSON.stringify(exportData, null, 2));
      console.log(`Exported to ${output}`);
      break;
    }
    
    case 'count': {
      console.log(`Total: ${items.length}`);
      
      // Group by status
      const byStatus: Record<string, number> = {};
      for (const item of items) {
        const status = item.properties?.Status?.status?.name || 
                      item.properties?.Status?.select?.name || 
                      '(none)';
        byStatus[status] = (byStatus[status] || 0) + 1;
      }
      
      console.log('\nBy status:');
      for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${status}: ${count}`);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

function getTitle(props: any): string {
  for (const val of Object.values(props) as any[]) {
    if (val.type === 'title' && val.title?.[0]) {
      return val.title[0].plain_text;
    }
  }
  return '(Untitled)';
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
