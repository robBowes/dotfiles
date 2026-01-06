---
name: drata-api
description: Drata compliance automation API integration for managing controls, evidence, personnel, assets, risks, vendors, and devices. Use when interacting with Drata's public API v2 for compliance automation tasks including uploading evidence, managing personnel security training, querying controls, handling background checks, device compliance, vendor management, or any GRC (Governance, Risk, Compliance) automation workflows.
---

# Drata API Skill

## Base URLs

| Region | URL |
|--------|-----|
| North America | `https://public-api.drata.com` |
| Europe | `https://public-api.eu.drata.com` |
| Asia-Pacific | `https://public-api.apac.drata.com` |

## Authentication

The API key is stored in environment variable `DRATA_API_KEY`.

```bash
curl -H "Authorization: Bearer $DRATA_API_KEY" https://public-api.drata.com/public/v2/...
```

API keys created in Drata Settings > API Keys. Scope read/write per endpoint.

## Rate Limits

500 requests/minute per IP.

## API v2 Key Concepts

### Cursor Pagination

All list endpoints use cursor-based pagination:

```javascript
async function fetchAll(endpoint) {
  let cursor;
  const results = [];
  do {
    const params = cursor ? `?cursor=${cursor}` : '';
    const resp = await fetch(`https://public-api.drata.com/public/v2/${endpoint}${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const data = await resp.json();
    results.push(...data.data);
    cursor = data?.pagination?.cursor;
  } while (cursor);
  return results;
}
```

### Expand Parameter

Use `expand` query param to include related objects:
```
GET /v2/controls?expand=owners,evidence
```

## Endpoints

See `references/endpoints.md` for complete endpoint documentation.

## Common Workflows

### Upload Evidence for Personnel

```javascript
// 1. Find personnel by email
const resp = await fetch(`https://public-api.drata.com/public/personnel?q=user@company.com`, {
  headers: { Authorization: `Bearer ${API_KEY}` }
});
const userId = (await resp.json()).data[0].user.id;

// 2. Upload evidence
const form = new FormData();
form.append('type', 'SEC_TRAINING'); // or HIPAA_TRAINING, BACKGROUND_CHECK, etc.
form.append('file', fs.createReadStream('evidence.pdf'));

await fetch(`https://public-api.drata.com/public/users/${userId}/documents`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${API_KEY}` },
  body: form
});
```

### Evidence Types

| Type | Description |
|------|-------------|
| `SEC_TRAINING` | Security training completion |
| `HIPAA_TRAINING` | HIPAA training completion |
| `BACKGROUND_CHECK` | Background check results |
| `MFA_IDP` | MFA on identity provider |
| `PASSWORD_MANAGER` | Password manager evidence |
| `HARD_DRIVE_ENCRYPTION` | Device encryption |
| `ANTI_VIRUS` | Antivirus software |
| `AUTO_UPDATES` | Auto-updates enabled |
| `SCREENSAVER_LOCK` | Screensaver lock enabled |

### Upload Control Evidence

```javascript
const form = new FormData();
form.append('file', fs.createReadStream('evidence.pdf'));

await fetch(`https://public-api.drata.com/public/controls/${controlId}/external-evidence`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${API_KEY}` },
  body: form
});
```

## Error Handling

| Code | Meaning |
|------|---------|
| 400 | Malformed data / validation errors |
| 401 | Invalid authorization |
| 402 | Plan upgrade required |
| 403 | Action not permitted |
| 404 | Not found |
| 451 | Must accept Drata terms |
| 500 | Internal server error |

## Python Example

```python
import requests

API_KEY = "your_api_key"
BASE_URL = "https://public-api.drata.com/public/v2"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def get_all(endpoint):
    results, cursor = [], None
    while True:
        params = {"cursor": cursor} if cursor else {}
        resp = requests.get(f"{BASE_URL}/{endpoint}", headers=HEADERS, params=params)
        data = resp.json()
        results.extend(data.get("data", []))
        cursor = data.get("pagination", {}).get("cursor")
        if not cursor:
            break
    return results

# Get all personnel
personnel = get_all("personnel")

# Get all controls  
controls = get_all("controls")
```
