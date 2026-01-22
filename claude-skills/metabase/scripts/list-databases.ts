#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Database } from './api.js'

const { values } = parseArgs({
  options: {
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(`Usage: list-databases [--json]

Lists databases connected to Metabase.

Options:
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(0)
}

const result = await metabaseGet<{ data: Database[] }>('/api/database')
const databases = result.data

if (values.json) {
  console.log(JSON.stringify(databases, null, 2))
} else {
  if (databases.length === 0) {
    console.log('No databases found')
  } else {
    for (const db of databases) {
      console.log(`#${db.id}: ${db.name} (${db.engine})`)
    }
    console.log(`\nTotal: ${databases.length} databases`)
  }
}
