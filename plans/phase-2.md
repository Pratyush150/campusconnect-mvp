# Sprint 2 — Assignment Core

**Goal:** Client posts → Admin publishes (anonymized) → Doers bid → Admin assigns. No payment yet.

## Scope

- `AssignmentRequest` state machine:
  - `pending → published → bidding → assigned → in_progress → review → revision|delivered → completed | disputed → cancelled | refunded`
- `AssignmentBid` with single-bid-per-doer constraint
- Contact-info scanner middleware (phone, email, IG, Telegram, WhatsApp, URL shorteners) — sets `flagged=true` on content + notifies admin; never auto-rejects
- Admin↔Client and Admin↔Doer messaging: **two separate threads** per assignment. A `to_user_id` scope on every message enforces isolation.
- Doer anonymization: every `/api/assignments/available/*` response strips `clientId`, `client.email`, `client.fullName`
- Client anonymization: every client-facing assignment response shows `assignedTo: "Expert"` only
- Notifications: admin gets WS+DB notification on new request and on new bid
- Audit log on every state transition

## Admin flows

- `PUT /api/admin/assignments/:id/publish` — validates scanner flags are acknowledged
- `PUT /api/admin/assignments/:id/assign { bidId, finalPrice }` — atomic: set status=assigned, reject other bids, notify both sides
- `PUT /api/admin/assignments/:id/reject`
- `PUT /api/admin/assignments/:id/cancel`

## Definition of done

Two demo users (client & doer) can complete a full assignment match loop up to "ready for payment" — no file upload, no payment yet.
