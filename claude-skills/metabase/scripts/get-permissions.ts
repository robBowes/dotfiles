#!/usr/bin/env tsx
import { parseArgs } from 'util'
import { metabaseGet } from './api.js'

interface PermissionsGraph {
  revision: number
  groups: Record<string, Record<string, unknown>>
}

const { values } = parseArgs({
  options: {
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(`Usage: get-permissions [--json]

Gets the permissions graph for all groups.

Options:
  -j, --json  Output raw JSON
  -h, --help  Show this help`)
  process.exit(0)
}

const [permissions, groups] = await Promise.all([
  metabaseGet<PermissionsGraph>('/api/permissions/graph'),
  metabaseGet<Array<{ id: number; name: string }>>('/api/permissions/group')
])

if (values.json) {
  console.log(JSON.stringify({ permissions, groups }, null, 2))
} else {
  console.log(`Permissions Graph (revision ${permissions.revision})\n`)

  for (const group of groups) {
    console.log(`Group #${group.id}: ${group.name}`)
    const groupPerms = permissions.groups[group.id]
    if (groupPerms) {
      for (const [dbId, perms] of Object.entries(groupPerms)) {
        console.log(`  Database ${dbId}: ${JSON.stringify(perms)}`)
      }
    }
    console.log()
  }
}
