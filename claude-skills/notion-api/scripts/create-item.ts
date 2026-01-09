#!/usr/bin/env npx tsx
import { Client } from '@notionhq/client';
import { parseArgs } from 'util';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const { values } = parseArgs({
  options: {
    database: { type: 'string', short: 'd' },
    title: { type: 'string', short: 't' },
    status: { type: 'string', short: 's' },
    assign: { type: 'string', short: 'a' },
    project: { type: 'string', short: 'p' },
    priority: { type: 'string' },
    props: { type: 'string' }, // JSON string for additional properties
    json: { type: 'boolean', default: false },
  },
});

if (!values.database || !values.title) {
  console.error(`Usage: npx tsx create-item.ts --database <DB_ID> --title "Task name" [options]

Options:
  --title, -t     Task title (required)
  --status, -s    Status value (e.g., "Not Started", "In Progress", "Done")
  --assign, -a    Assignee user ID
  --project, -p   Project name (for select properties)
  --priority      Priority value
  --props         Additional properties as JSON: '{"Key": {"type": "value"}}'
  --json          Output full response as JSON

Examples:
  npx tsx create-item.ts -d abc123 -t "New task" -s "Not Started"
  npx tsx create-item.ts -d abc123 -t "Bug fix" --status "In Progress" --priority "High"
  npx tsx create-item.ts -d abc123 -t "Review" --props '{"Notes": {"rich_text": [{"text": {"content": "Check this"}}]}}'
`);
  process.exit(1);
}

async function main() {
  try {
    // Get database schema to understand property types
    const db = await notion.databases.retrieve({ database_id: values.database! });
    const schema = db.properties as any;
    
    // Find the title property
    const titleProp = Object.entries(schema)
      .find(([_, p]: any) => p.type === 'title')?.[0] || 'Name';
    
    const properties: any = {
      [titleProp]: {
        title: [{ text: { content: values.title } }],
      },
    };
    
    // Add status if provided
    if (values.status && schema.Status) {
      if (schema.Status.type === 'status') {
        properties.Status = { status: { name: values.status } };
      } else if (schema.Status.type === 'select') {
        properties.Status = { select: { name: values.status } };
      }
    }
    
    // Add assignee if provided
    if (values.assign && schema.Assign) {
      properties.Assign = { people: [{ id: values.assign }] };
    }
    
    // Add project if provided
    if (values.project && schema.Project) {
      if (schema.Project.type === 'select') {
        properties.Project = { select: { name: values.project } };
      } else if (schema.Project.type === 'relation') {
        // For relations, value should be page ID
        properties.Project = { relation: [{ id: values.project }] };
      }
    }
    
    // Add priority if provided
    if (values.priority && schema.Priority) {
      if (schema.Priority.type === 'select') {
        properties.Priority = { select: { name: values.priority } };
      } else if (schema.Priority.type === 'status') {
        properties.Priority = { status: { name: values.priority } };
      }
    }
    
    // Parse additional properties
    if (values.props) {
      try {
        const additionalProps = JSON.parse(values.props);
        Object.assign(properties, additionalProps);
      } catch (e) {
        console.error('Invalid JSON in --props:', e);
        process.exit(1);
      }
    }
    
    const page = await notion.pages.create({
      parent: { database_id: values.database! },
      properties,
    });
    
    if (values.json) {
      console.log(JSON.stringify(page, null, 2));
    } else {
      console.log('✓ Created successfully');
      console.log(`  Page ID: ${page.id}`);
      console.log(`  Title: ${values.title}`);
      console.log(`  URL: ${(page as any).url}`);
    }
    
  } catch (error: any) {
    console.error('Error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
