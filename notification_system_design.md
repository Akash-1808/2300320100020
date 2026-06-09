# Stage 1

## Goal
REST API contract to show notifications to logged-in users with real-time updates.

## Base Rules
- Base path: `/api/v1`
- Auth: `Authorization: Bearer <token>`
- Content type: `application/json`
- Time format: ISO UTC (`2026-06-09T10:00:00Z`)

## Core Actions
1. Get unread count
2. Mark one as read

## Common Headers
Request:
```http
Authorization: Bearer <token>
Content-Type: application/json
```



## Notification Object
```json
{
  "id": "ntf_001",
  "userId": "usr_001",
  "title": "Payment Received",
  "message": "Your payment was successful",
  "category": "billing",
  "severity": "info",
  "status": "unread",
  "createdAt": "2026-06-09T10:00:00Z",
  "readAt": null,
  "actionUrl": "/billing/invoices/inv_001"
}
```

## Endpoints (Point-to-Point)
1. `GET /api/v1/notifications/unread-count`
- Response:
```json
{ "success": true, "data": { "unreadCount": 5 } }
```

2. `PATCH /api/v1/notifications/{notificationId}/read`
- Request:
```json
{ "read": true }
```

## Real-Time Design
Preferred: SSE
- Endpoint: `GET /api/v1/notifications/stream`
- Headers:
```http
Authorization: Bearer <token>
Accept: text/event-stream
Last-Event-ID: <optional>
```
- Event:
```text
event: notification.created
id: evt_001
data: {"id":"ntf_001","title":"Payment Received","status":"unread"}
```

Client flow:
1. Connect to stream after login.
2. On new event, add item to top and increment unread badge.
3. On reconnect, send `Last-Event-ID` and resync with list API.

## Status Codes
- `200` success
- `204` deleted
- `400` bad request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `429` rate limit
- `500` server error

# Stage 2

Use **PostgreSQL** for storage because notifications are simple, relational, and need consistent reads and updates.

## Schema
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
```

## What May Happen Later
- Lists can slow down when rows grow.
- Unread counts can get expensive.

## Simple Fixes
- Add an index on `(user_id, status, created_at)`.
- Cache unread count if traffic becomes high.
- Use pagination instead of loading everything.

## Only The Important Queries
### 2) Unread count
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1 AND status = 'unread';
```

### 3) Mark one as read
```sql
UPDATE notifications
SET status = 'read', read_at = now()
WHERE id = $1 AND user_id = $2
RETURNING id, status, read_at;
```

# Stage 3

This Query is logically correct for "unread notifications for one student" but it is slow because it scan full table 

What I would change
- In production we Avoid SELECT *
- Add composite index, not indexes on every coulmn
- Best index: (studentID, isRead, createdAt DESC)

Indexes on every column are not effective. They slow inserts/ updates and usually do not help this query as much as one good composite index.

SELECT DISTINCT studentID
FROM notifications
WHERE notification_type="Placement"
AND createdAT >= NOW() - INTEREVAL 7 DAY;

# Stage 4


Composite index (e.g. (user_id, status, created_at DESC))

Pros: large read speedup for common queries; no app changes; immediate ROI.
Cons: increases write latency and storage; index maintenance cost on heavy writes; single-node index still limited by DB CPU/IO.
Cache unread count in Redis (INCR/DECR)

Pros: O(1) reads for badges; huge reduction in DB load.
Cons: eventual consistency (race conditions), needs reconciliation/backfill; extra infra and complexity; failure modes if Redis is lost (must rebuild from DB).
Cursor pagination (fetch only first N, use created_at cursor)

Pros: avoids deep OFFSET scans and big payloads; predictable latency and bandwidth.
Cons: client complexity to handle cursors; pagination does not reduce cost of unread-count queries; complicates jumping to arbitrary pages.
Read replicas

Pros: offloads read traffic from primary, scales read throughput horizontally.
Cons: eventual consistency (replica lag), extra infra and cost, failover and routing complexity, doesn't help write-heavy workloads.
Cache regular (recent) notifications (Redis or CDN)

Pros: serves hot items fast, reduces DB queries for common reads.
Cons: cache invalidation complexity, memory cost, stale data risks; larger payloads increase cache size.
Push new notifications via SSE/WebSocket (instead of fetching on every load)

Pros: best UX, reduces repeated page-load requests, near-real-time delivery.
Cons: need connection management and scaling (fan-out), sticky sessions or dedicated push infrastructure, more complex testing and failure handling.