#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Dashboard, CollectionItem } from './api.js'

const { values } = parseArgs({
  options: {
    collection: { type: 'string', short: 'c' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(`Usage: list-dashboards [--collection <id>] [--json]

Lists dashboards in Metabase.

Options:
  -c, --collection  Collection ID to filter by (use 'root' for root collection)
  -j, --json        Output raw JSON
  -h, --help        Show this help`)
  process.exit(0)
}

let dashboards: Array<{ id: number; name: string; description?: string | null }>

if (values.collection) {
  const items = await metabaseGet<{ data: CollectionItem[] }>(
    `/api/collection/${values.collection}/items?models=dashboard`
  )
  dashboards = items.data.map(i => ({ id: i.id, name: i.name, description: i.description }))
} else {
  dashboards = await metabaseGet<Dashboard[]>('/api/dashboard')
}

if (values.json) {
  console.log(JSON.stringify(dashboards, null, 2))
} else {
  if (dashboards.length === 0) {
    console.log('No dashboards found')
  } else {
    for (const d of dashboards) {
      const desc = d.description ? ` - ${d.description.slice(0, 50)}` : ''
      console.log(`#${d.id}: ${d.name}${desc}`)
    }
    console.log(`\nTotal: ${dashboards.length} dashboards`)
  }
}
