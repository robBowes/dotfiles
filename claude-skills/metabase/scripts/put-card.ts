#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { readFileSync } from 'fs'
import { metabaseGet, metabasePut, Card } from './api.js'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    id: { type: 'string', short: 'i' },
    name: { type: 'string', short: 'n' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.id) {
  console.log(`Usage: put-card --id <card_id> [file.sql] [--name <new_name>]

Updates a card's SQL query from a file or stdin.

Options:
  -i, --id    Card ID (required)
  -n, --name  New card name (optional)
  -h, --help  Show this help

Examples:
  put-card --id 123 query.sql
  cat query.sql | put-card --id 123`)
  process.exit(values.help ? 0 : 1)
}

// Get current card
const card = await metabaseGet<Card>(`/api/card/${values.id}`)

if (card.dataset_query.type !== 'native') {
  console.error('Error: Card is not a native query (SQL). Cannot update.')
  process.exit(1)
}

// Read SQL from file or stdin
let sql: string
if (positionals.length > 0) {
  sql = readFileSync(positionals[0], 'utf-8')
} else {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  sql = Buffer.concat(chunks).toString('utf-8')
}

if (!sql.trim()) {
  console.error('Error: No SQL provided')
  process.exit(1)
}

// Build update payload
const update: Partial<Card> = {
  dataset_query: {
    ...card.dataset_query,
    native: {
      ...card.dataset_query.native,
      query: sql.trim()
    }
  }
}

if (values.name) {
  update.name = values.name
}

const updated = await metabasePut<Card>(`/api/card/${values.id}`, update)
console.log(`Updated card #${updated.id}: ${updated.name}`)
