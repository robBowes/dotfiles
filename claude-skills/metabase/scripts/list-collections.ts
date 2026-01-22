#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, Collection } from './api.js'

const { values } = parseArgs({
  options: {
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(`Usage: list-collections [--json]

Lists collections in Metabase.

Options:
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(0)
}

const collections = await metabaseGet<Collection[]>('/api/collection')

if (values.json) {
  console.log(JSON.stringify(collections, null, 2))
} else {
  if (collections.length === 0) {
    console.log('No collections found')
  } else {
    for (const c of collections) {
      const personal = c.personal_owner_id ? ' (personal)' : ''
      console.log(`#${c.id}: ${c.name}${personal}`)
    }
    console.log(`\nTotal: ${collections.length} collections`)
  }
}
