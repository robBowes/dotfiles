#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseDelete } from './api.js'

const { values } = parseArgs({
  options: {
    id: { type: 'string', short: 'i' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help || !values.id) {
  console.log(`Usage: delete-card --id <card_id>

Deletes a card (question) from Metabase.

Options:
  -i, --id    Card ID (required)
  -h, --help  Show this help`)
  process.exit(values.help ? 0 : 1)
}

await metabaseDelete(`/api/card/${values.id}`)
console.log(`Deleted card #${values.id}`)
