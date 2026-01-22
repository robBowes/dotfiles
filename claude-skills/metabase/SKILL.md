---
name: metabase
description: Query and analyze data from Metabase, create/update questions and dashboards, access the Metabase REST API, and troubleshoot Metabase SQL queries. Use when user mentions Metabase, dashboards, metrics, or asks to fetch/analyze business intelligence data.
allowed-tools:
  - Bash
  - Read
  - Write
  - WebFetch
---

# Metabase Skill

This skill provides CLI scripts for interacting with Metabase.

## Setup

```bash
cd /Volumes/dev/git/dotfiles/claude-skills/metabase
pnpm install
```

## Environment Variables

Required:
- `METABASE_URL`: Base URL (e.g., `https://metabase.vessel.co`)
- `METABASE_API_KEY`: API key for authentication

## Scripts

All scripts support `--help` and `--json` flags.

### Cards (Questions)

```bash
# List all cards
./scripts/list-cards.ts

# List cards in a collection
./scripts/list-cards.ts --collection 5

# Get card details
./scripts/get-card.ts --id 123

# Update card SQL from file
./scripts/put-card.ts --id 123 query.sql

# Update card SQL from stdin
cat query.sql | ./scripts/put-card.ts --id 123

# Execute card and get results
./scripts/query-card.ts --id 123

# Delete card
./scripts/delete-card.ts --id 123
```

### Dashboards

```bash
# List all dashboards
./scripts/list-dashboards.ts

# List dashboards in collection
./scripts/list-dashboards.ts --collection 5

# Get dashboard details
./scripts/get-dashboard.ts --id 51
```

### Databases & Schema

```bash
# List connected databases
./scripts/list-databases.ts

# Get database schema (all tables/fields)
./scripts/get-schema.ts --db 2

# Filter to specific table
./scripts/get-schema.ts --db 2 --table orders
```

### Collections

```bash
# List all collections
./scripts/list-collections.ts

# Get collection contents
./scripts/get-collection.ts --id 5

# Get root collection
./scripts/get-collection.ts --id root
```

### Users & Permissions

```bash
# List users
./scripts/list-users.ts

# Get permissions graph
./scripts/get-permissions.ts
```

## Output Formats

All scripts default to human-readable output. Add `--json` for raw JSON:

```bash
./scripts/get-card.ts --id 123 --json | jq '.dataset_query.native.query'
```

## Common Workflows

### Modify a question's SQL

```bash
# 1. Get current SQL
./scripts/get-card.ts --id 123

# 2. Edit locally
./scripts/get-card.ts --id 123 --json | jq -r '.dataset_query.native.query' > query.sql
vim query.sql

# 3. Update
./scripts/put-card.ts --id 123 query.sql
```

### Explore database schema

```bash
# Find tables
./scripts/get-schema.ts --db 2 --table user

# Get full schema as JSON for analysis
./scripts/get-schema.ts --db 2 --json > schema.json
```

### Find questions in a collection

```bash
./scripts/get-collection.ts --id 5
```

## Troubleshooting

### Auth issues

```bash
# Test auth - should show current user
./scripts/list-users.ts
```

### 404 errors

Card/dashboard IDs must exist. List first:

```bash
./scripts/list-cards.ts | grep -i "search term"
```

## Vessel-Specific

- Database ID: `2` (production)
- Dashboard 51: Automated Portfolio Reporting
- Filter queries with `o.access_type = 'FULL'` for real org data
