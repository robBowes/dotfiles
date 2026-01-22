#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet, User } from './api.js'

const { values } = parseArgs({
  options: {
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(`Usage: list-users [--json]

Lists users in Metabase.

Options:
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(0)
}

const result = await metabaseGet<{ data: User[] }>('/api/user')
const users = result.data

if (values.json) {
  console.log(JSON.stringify(users, null, 2))
} else {
  if (users.length === 0) {
    console.log('No users found')
  } else {
    for (const u of users) {
      const status = u.is_active ? '' : ' (inactive)'
      const admin = u.is_superuser ? ' [admin]' : ''
      console.log(`#${u.id}: ${u.first_name} ${u.last_name} <${u.email}>${admin}${status}`)
    }
    console.log(`\nTotal: ${users.length} users`)
  }
}
