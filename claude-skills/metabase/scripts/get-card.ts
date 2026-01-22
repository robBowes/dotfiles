#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Card } from './api.js'

const { values } = parseArgs({
  options: {
    id: { type: 'string', short: 'i' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.id) {
  console.log(`Usage: get-card --id <card_id> [--json]

Options:
  -i, --id    Card ID (required)
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(values.help ? 0 : 1)
}

const card = await metabaseGet<Card>(`/api/card/${values.id}`)

if (values.json) {
  console.log(JSON.stringify(card, null, 2))
} else {
  console.log(`Card #${card.id}: ${card.name}`)
  if (card.description) console.log(`Description: ${card.description}`)
  console.log(`Database ID: ${card.database_id}`)
  console.log(`Collection ID: ${card.collection_id ?? 'root'}`)
  console.log(`Display: ${card.display}`)
  console.log(`Updated: ${card.updated_at}`)
  if (card.dataset_query.type === 'native' && card.dataset_query.native?.query) {
    console.log(`\nSQL:\n${card.dataset_query.native.query}`)
  }
}
