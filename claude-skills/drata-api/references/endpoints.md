# Drata API v2 Endpoints Reference

## Company

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/company` | Get company settings |

## Personnel

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/personnel` | List personnel (supports `q` search param) |
| GET | `/v2/personnel/{id}` | Get personnel by ID |
| PATCH | `/v2/personnel/{id}` | Update personnel |

## Users & Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/users` | List users |
| GET | `/v2/users/{id}` | Get user by ID |
| POST | `/v2/users/{id}/documents` | Upload document for user |
| GET | `/v2/users/{id}/documents` | List user documents |

## User Documents (Evidence)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/users/{userId}/documents` | Upload evidence document |
| DELETE | `/v2/users/{userId}/documents/{docId}` | Delete evidence document |

## Controls

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/controls` | List controls |
| GET | `/v2/controls/{id}` | Get control by ID |
| POST | `/v2/controls/{id}/external-evidence` | Upload external evidence |

## Control Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/controls/{id}/notes` | List control notes |
| POST | `/v2/controls/{id}/notes` | Create control note |

## Control Owners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/controls/{id}/owners` | List control owners |
| POST | `/v2/controls/{id}/owners` | Add control owner |
| DELETE | `/v2/controls/{id}/owners/{ownerId}` | Remove control owner |

## Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/assets` | List assets |
| GET | `/v2/assets/{id}` | Get asset by ID |
| POST | `/v2/assets` | Create asset |
| PATCH | `/v2/assets/{id}` | Update asset |
| DELETE | `/v2/assets/{id}` | Delete asset |

## Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/devices` | List devices |
| GET | `/v2/devices/{id}` | Get device by ID |
| PATCH | `/v2/devices/{id}` | Update device |

## Device Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/devices/{id}/documents` | Upload device document |
| GET | `/v2/devices/{id}/documents` | List device documents |

## Background Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/background-checks` | List background checks |
| POST | `/v2/background-checks` | Create background check |

## Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/vendors` | List vendors |
| GET | `/v2/vendors/{id}` | Get vendor by ID |
| POST | `/v2/vendors` | Create vendor |
| PATCH | `/v2/vendors/{id}` | Update vendor |
| DELETE | `/v2/vendors/{id}` | Delete vendor |

## Vendor Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/vendors/{id}/documents` | Upload vendor document |
| GET | `/v2/vendors/{id}/documents` | List vendor documents |

## Vendor Security Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/vendors/{id}/security-reviews` | List security reviews |
| POST | `/v2/vendors/{id}/security-reviews` | Create security review |

## Risks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/risks` | List risks |
| GET | `/v2/risks/{id}` | Get risk by ID |
| POST | `/v2/risks` | Create risk |
| PATCH | `/v2/risks/{id}` | Update risk |
| DELETE | `/v2/risks/{id}` | Delete risk |

## Risk Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/risks/{id}/documents` | Upload risk document |
| GET | `/v2/risks/{id}/documents` | List risk documents |

## Risk Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/risks/{id}/notes` | List risk notes |
| POST | `/v2/risks/{id}/notes` | Create risk note |

## Evidence Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/evidence-library` | List evidence library items |
| GET | `/v2/evidence-library/{id}` | Get evidence item |
| POST | `/v2/evidence-library` | Upload evidence |

## Monitoring Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/monitoring-tests` | List monitoring tests |
| GET | `/v2/monitoring-tests/{id}` | Get test details |

## Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/events` | List audit events |

## Custom Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/custom-connections` | List custom connections |
| POST | `/v2/custom-connections` | Create custom connection |

## Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/workspaces` | List workspaces |

## User's Assigned Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/users/{id}/policies` | List user's assigned policies |

## Query Parameters

### Common Parameters

| Param | Description |
|-------|-------------|
| `cursor` | Pagination cursor from previous response |
| `expand` | Comma-separated list of relations to expand |
| `q` | Search query (personnel endpoint) |

### Expand Examples

```
GET /v2/controls?expand=owners,evidence
GET /v2/personnel?expand=user,devices
GET /v2/vendors?expand=documents,securityReviews
```
