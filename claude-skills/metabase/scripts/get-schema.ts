#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Database, Table, Field } from './api.js'

interface DatabaseMetadata extends Database {
  tables: Array<Table & { fields: Field[] }>
}

const { values } = parseArgs({
  options: {
    db: { type: 'string', short: 'd' },
    table: { type: 'string', short: 't' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.db) {
  console.log(`Usage: get-schema --db <database_id> [--table <name>] [--json]

Gets database schema (tables and fields).

Options:
  -d, --db     Database ID (required)
  -t, --table  Filter to specific table name
  -j, --json   Output raw JSON
  -h, --help   Show this help`)
  process.exit(values.help ? 0 : 1)
}

const metadata = await metabaseGet<DatabaseMetadata>(
  `/api/database/${values.db}/metadata?include_hidden=true`
)

let tables = metadata.tables || []

if (values.table) {
  tables = tables.filter(t =>
    t.name.toLowerCase().includes(values.table!.toLowerCase())
  )
}

if (values.json) {
  console.log(JSON.stringify(tables, null, 2))
} else {
  console.log(`Database: ${metadata.name} (${metadata.engine})\n`)

  if (tables.length === 0) {
    console.log('No tables found')
  } else {
    for (const table of tables) {
      const schema = table.schema ? `${table.schema}.` : ''
      console.log(`${schema}${table.name}`)
      for (const field of table.fields || []) {
        const semantic = field.semantic_type ? ` [${field.semantic_type}]` : ''
        console.log(`  ${field.name}: ${field.base_type}${semantic}`)
      }
      console.log()
    }
    console.log(`Total: ${tables.length} tables`)
  }
}
