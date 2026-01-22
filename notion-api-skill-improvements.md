# Notion-API Skill Improvement Requests

## Issue 1: clone-page.ts - Sanitize people properties

**Priority**: High
**Type**: Bug fix

**Problem**: When cloning pages, people properties include full user objects (name, avatar_url, type, person.email) but Notion API only accepts `{id: string}`.

**Current behavior**:

```
API Error: body.properties.Assign.people[0].name should be not present
```

**Expected**: Clone should sanitize people arrays to `[{id: "..."}]`

**Fix applied** (can be merged):

```typescript
if (prop.type === 'people' && prop.people) {
    properties[name] = {
        type: 'people',
        people: prop.people.map((p: any) => ({ id: p.id })),
    };
}
```

---

## Issue 2: clone-page.ts - Sanitize user mentions in rich_text blocks

**Priority**: Medium
**Type**: Bug fix

**Problem**: When cloning content blocks containing @mentions, the API rejects full user objects in `rich_text[].mention.user`.

**Current behavior**:

```
API Error: body.children[0].paragraph.rich_text[1].mention.user.name should be not present
```

**Expected**: Strip user mentions to just `{id: string}` or convert to plain text.

---

## Issue 3: clone-page.ts - Handle internal file/image URLs

**Priority**: Medium
**Type**: Enhancement

**Problem**: Notion internal file URLs (`secure.notion-static.com`) can't be copied via API - they require `external.url` or `file_upload`.

**Current behavior**: Block creation fails silently
**Expected**: Either skip with warning, or download and re-upload if possible

---

## Issue 4: clone-page.ts - Add schema mapping for cross-database cloning

**Priority**: High
**Type**: Feature request

**Problem**: Cloning between databases with different schemas fails because properties don't exist or have different option values.

**Use case**: Migrating tasks between boards with different Status/Priority options

**Proposed solution**: Add `--property-map` flag:

```bash
clone-page.ts --page X --target-db Y \
    --property-map 'Name:Task name' \
    --property-map 'Due Date:Due' \
    --property-map 'Status.Triage:Status.Not Started'
```

---

## Issue 5: Add migrate-database.ts script

**Priority**: Medium
**Type**: Feature request

**Problem**: No built-in way to bulk migrate items between databases with property mapping.

**Proposed**: New script that:

1. Lists source items with filter
2. Maps properties via config
3. Creates in target DB
4. Optionally archives source
5. Handles content block cloning with sanitization

**Example**:

```bash
migrate-database.ts \
    --source DB1 --target DB2 \
    --filter 'Status != Done' \
    --map-file migration-config.json \
    --archive-source
```

---

## Issue 6: cloneBlocks - Handle code blocks over 2000 chars

**Priority**: Low
**Type**: Enhancement

**Problem**: Notion API limits rich_text to 2000 chars. Long code blocks fail.

**Expected**: Split into multiple text segments or truncate with warning.

---

## Issue 7: list-items.ts - Results seem cached/stale

**Priority**: Low
**Type**: Bug investigation

**Problem**: After creating 41 new items, `list-items.ts` with jq filter returned 0 matches, but direct API query returned 41.

**Needs investigation**: May be pagination, caching, or query timing issue.
