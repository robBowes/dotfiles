#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Collection, CollectionItem } from './api.js'

const { values } = parseArgs({
  options: {
    id: { type: 'string', short: 'i' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.id) {
  console.log(`Usage: get-collection --id <collection_id> [--json]

Gets collection details and its items.

Options:
  -i, --id    Collection ID (use 'root' for root collection)
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(values.help ? 0 : 1)
}

const [collection, items] = await Promise.all([
  metabaseGet<Collection>(`/api/collection/${values.id}`),
  metabaseGet<{ data: CollectionItem[] }>(`/api/collection/${values.id}/items`)
])

if (values.json) {
  console.log(JSON.stringify({ ...collection, items: items.data }, null, 2))
} else {
  console.log(`Collection #${collection.id}: ${collection.name}`)
  if (collection.description) console.log(`Description: ${collection.description}`)
  console.log(`Location: ${collection.location || '/'}`)

  const grouped = {
    card: items.data.filter(i => i.model === 'card'),
    dashboard: items.data.filter(i => i.model === 'dashboard'),
    collection: items.data.filter(i => i.model === 'collection')
  }

  if (grouped.collection.length > 0) {
    console.log(`\nSub-collections (${grouped.collection.length}):`)
    for (const i of grouped.collection) console.log(`  #${i.id}: ${i.name}`)
  }

  if (grouped.dashboard.length > 0) {
    console.log(`\nDashboards (${grouped.dashboard.length}):`)
    for (const i of grouped.dashboard) console.log(`  #${i.id}: ${i.name}`)
  }

  if (grouped.card.length > 0) {
    console.log(`\nCards (${grouped.card.length}):`)
    for (const i of grouped.card) console.log(`  #${i.id}: ${i.name}`)
  }
}
