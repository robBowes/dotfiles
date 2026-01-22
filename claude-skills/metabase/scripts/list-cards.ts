#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Card, CollectionItem } from './api.js'

const { values } = parseArgs({
  options: {
    collection: { type: 'string', short: 'c' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(`Usage: list-cards [--collection <id>] [--json]

Lists cards (questions) in Metabase.

Options:
  -c, --collection  Collection ID to filter by (use 'root' for root collection)
  -j, --json        Output raw JSON
  -h, --help        Show this help`)
  process.exit(0)
}

let cards: Array<{ id: number; name: string; description?: string | null; collection_id?: number | null }>

if (values.collection) {
  const items = await metabaseGet<{ data: CollectionItem[] }>(
    `/api/collection/${values.collection}/items?models=card`
  )
  cards = items.data.map(i => ({ id: i.id, name: i.name, description: i.description }))
} else {
  cards = await metabaseGet<Card[]>('/api/card')
}

if (values.json) {
  console.log(JSON.stringify(cards, null, 2))
} else {
  if (cards.length === 0) {
    console.log('No cards found')
  } else {
    for (const card of cards) {
      const desc = card.description ? ` - ${card.description.slice(0, 50)}` : ''
      console.log(`#${card.id}: ${card.name}${desc}`)
    }
    console.log(`\nTotal: ${cards.length} cards`)
  }
}
