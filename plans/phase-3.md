# Sprint 3 — Payment & Delivery

**Goal:** Real escrow state machine + file delivery + admin review. Payments adapter is a **mock** for this repo; real Razorpay is a drop-in.

## Payment adapter

File: `backend/src/lib/payments.js`

```js
// mock interface — swap for Razorpay calls in prod
createOrder({ amount, currency, receipt }) → { orderId }
verifyPayment({ orderId, paymentId, signature }) → boolean
refund({ paymentId, amount }) → { refundId }
webhookVerify({ body, signature }) → boolean
```

The mock:
- `createOrder` returns a cuid as orderId
- `verifyPayment` always returns true if `signature === 'MOCK_OK'`
- `POST /api/payments/mock-capture` is a dev endpoint that flips a payment from `pending → captured` directly (no front-end webhook needed)

**To go live:** implement all 4 methods with Razorpay SDK. Do not change any caller.

## Escrow state machine

```
pending (order created)
   ↓ captured  (payment verified)
ASSIGNMENT status: in_progress
   ↓ doer delivers, admin approves, client confirms (or hold expires)
released    (→ payout queue)
   ↓ admin runs payout batch
paid_out
```

**Never** skip `captured` — `in_progress` requires `payment.status=captured`.

## Delivery + review

- `POST /api/assignments/:id/deliver` (doer only) — multipart files → `uploads/`; creates `AssignmentDelivery` row with `adminReview=pending`
- `PUT /api/admin/assignments/:id/approve-delivery`
- `PUT /api/admin/assignments/:id/request-revision { feedback }` — increments revision counter; max = `max_revision_count`
- `PUT /api/admin/assignments/:id/deliver-to-client` — flips status to `delivered`; starts `escrow_hold_days` window
- `POST /api/assignments/my-requests/:id/confirm` (client) — release escrow early
- Cron stub `/api/admin/cron/auto-complete` — completes any `delivered` assignment past the hold window

## Dispute

- `POST /api/assignments/my-requests/:id/dispute { reason }`
- Admin has four outcomes: another revision (free), partial refund, full refund, or side with doer (release escrow)

## Definition of done

End-to-end: client posts → admin publishes → doer bids → admin assigns → client mock-pays → doer uploads file → admin approves → client downloads + confirms → payout queued. All via API + UI.
