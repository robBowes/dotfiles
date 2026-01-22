#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabasePost } from './api.js'

interface QueryResult {
  data: {
    rows: unknown[][]
    cols: Array<{ name: string; display_name: string; base_type: string }>
    native_form?: { query: string }
  }
  row_count: number
  status: string
}

const { values } = parseArgs({
  options: {
    id: { type: 'string', short: 'i' },
    json: { type: 'boolean', short: 'j' },
    limit: { type: 'string', short: 'l' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.id) {
  console.log(`Usage: query-card --id <card_id> [--json] [--limit <n>]

Executes a card's query and returns results.

Options:
  -i, --id     Card ID (required)
  -j, --json   Output raw JSON
  -l, --limit  Limit rows returned (default: 100)
  -h, --help   Show this help`)
  process.exit(values.help ? 0 : 1)
}

const limit = values.limit ? parseInt(values.limit, 10) : 100

const result = await metabasePost<QueryResult>(`/api/card/${values.id}/query`, {
  parameters: [],
  ignore_cache: false
})

if (values.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  const cols = result.data.cols.map(c => c.display_name)
  const rows = result.data.rows.slice(0, limit)

  // Simple table output
  console.log(cols.join('\t'))
  console.log('-'.repeat(cols.join('\t').length))
  for (const row of rows) {
    console.log(row.map(v => v === null ? 'NULL' : String(v)).join('\t'))
  }
  console.log(`\nRows: ${rows.length}${result.row_count > limit ? ` (of ${result.row_count})` : ''}`)
}
