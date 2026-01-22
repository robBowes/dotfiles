#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Dashboard } from './api.js'

const { values } = parseArgs({
  options: {
    id: { type: 'string', short: 'i' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.id) {
  console.log(`Usage: get-dashboard --id <dashboard_id> [--json]

Options:
  -i, --id    Dashboard ID (required)
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(values.help ? 0 : 1)
}

const dashboard = await metabaseGet<Dashboard>(`/api/dashboard/${values.id}`)

if (values.json) {
  console.log(JSON.stringify(dashboard, null, 2))
} else {
  console.log(`Dashboard #${dashboard.id}: ${dashboard.name}`)
  if (dashboard.description) console.log(`Description: ${dashboard.description}`)
  console.log(`Collection ID: ${dashboard.collection_id ?? 'root'}`)
  console.log(`Updated: ${dashboard.updated_at}`)
  console.log(`\nCards (${dashboard.dashcards.length}):`)
  for (const dc of dashboard.dashcards) {
    if (dc.card) {
      console.log(`  #${dc.card.id}: ${dc.card.name}`)
    }
  }
}
