# AssignMentor — Master Plan

> **Pivot note (2026-04-21):** This repo was originally "CampusConnect" (peer-to-peer, consent-gated chat for students). It has been fully rewritten as **AssignMentor** — a two-channel revenue platform. All peer-to-peer code (feed, services, connections, conversations, blocks, ratings, suggestions, chat) has been deleted.

## One-line pitch

A middleman assignment marketplace + paid mentorship portal, where **Clients and Doers never communicate directly** — all transactions flow through Admin, so platform revenue can't leak off-platform.

## Two revenue channels

| Channel                 | Flow                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Assignment marketplace  | Client posts → Admin reviews & publishes anonymized → Doers bid → Admin assigns → Client pays escrow → Doer delivers → Admin reviews → Client receives → payout |
| Mentorship portal       | Verified mentors (IIT alumni / pros) list profiles + slots + monthly plans → Client or Doer books → pays → attends session → rates |

## Non-negotiable invariants (enforced in code)

1. **Isolation.** No API, DB query, socket event, or UI component ever leaks Client identity to Doer or vice versa.
2. **Escrow-first.** No assignment work begins without captured payment.
3. **Admin gateway.** All deliveries pass through Admin review. Direct Doer→Client transfer is architecturally impossible.
4. **Payment before access.** Mentor sessions require captured payment or active subscription.
5. **Single bid per doer per assignment** (DB unique constraint).
6. **Commission always taken** — automatic earnings split.
7. **Audit trail** on every assignment/payment/payout state change.
8. **Idempotent webhooks.**
9. **Rate limiting** on auth endpoints.
10. **Contact-info scanner** on every user-submitted text field — flags to admin, never auto-rejects.

## Roles

| Role    | Signup                          | Can                                                     |
| ------- | ------------------------------- | ------------------------------------------------------- |
| ADMIN   | Seeded / invite-only            | See everything, match clients↔doers, approve, refund    |
| CLIENT  | Public `/register/client`       | Post requirements, pay, receive delivery                |
| DOER    | Public `/register/doer`         | Bid on admin-approved listings, deliver files           |
| MENTOR  | Admin invite `/register/mentor` | Publish profile, manage slots, run paid sessions        |

## Architecture (this repo)

| Layer     | Choice                                                       | Notes                                                    |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Backend   | Node 20 + Express 5 + Prisma + Socket.io                     | JWT auth w/ httpOnly cookie, pino logging                |
| Database  | SQLite (dev) → Postgres (prod — one-line prisma switch)      | Migrations committed                                     |
| Frontend  | React 18 + Vite + React Router                               | Role-specific dashboards, no public feed                 |
| Payments  | **Mock adapter** — real Razorpay is a drop-in                | See `src/lib/payments.js`                                |
| Email     | Nodemailer SMTP (optional) → console fallback                | OTP + notifications                                      |
| Files     | Local `uploads/` dir (dev) → S3/R2 (prod — swap in multer-s3)| Attachments on requirements, deliveries, portfolios      |
| Realtime  | Socket.io (admin gets live flags + new-request pings)        | No peer-to-peer chat                                     |

## Ports (dev)

| Service  | URL                     |
| -------- | ----------------------- |
| Backend  | http://localhost:4000   |
| Frontend | http://localhost:5173   |

## Data model (see `backend/prisma/schema.prisma`)

Core tables: `User` (role + role-specific profile), `AssignmentRequest`, `AssignmentBid`, `AssignmentDelivery`, `AdminMessage`, `MentorSlot`, `MentorBooking`, `MentorSubscription`, `Payment`, `PlatformEarning`, `Payout`, `BankAccount`, `PlatformSetting`, `Notification`, `AuditLog`.

## Revenue-leakage defenses (test cases)

See `plans/leakage-matrix.md` for the full list (L1–L15). Key ones implemented:

- **L1** Admin reviews client text before publishing; `contactScanner` middleware flags phone/email/IG/Telegram/WhatsApp.
- **L2** Admin reviews doer deliveries before forwarding.
- **L5** Escrow: `in_progress` is unreachable without `payments.status=captured`.
- **L6** Doer never sees client identity — route responses strip those fields even from admin-intended queries.
- **L13** DB unique constraint on `(mentorId, slotDate, startTime)` + transaction on booking.
- **L15** Stale-review cron warns admin.

## Phase map (sprints)

Files under `plans/`:

| Phase | Sprint   | Theme                                                                          | Status    |
| ----- | -------- | ------------------------------------------------------------------------------ | --------- |
| 1     | Sprint 1 | Foundation — schema, auth, 4 role signups, admin/dashboards shell              | **shipped** |
| 2     | Sprint 2 | Assignment core — post, publish, bid, assign, admin messaging, contact scanner | **shipped** |
| 3     | Sprint 3 | Payment & delivery — mock Razorpay escrow, upload, review, release             | **shipped** |
| 4     | Sprint 4 | Mentorship — mentor invite, profile, slots, booking, session completion        | **shipped (subscriptions stubbed)** |
| 5     | Sprint 5 | Polish & launch — revenue dashboards, payouts, cron, Razorpay swap-in          | pending   |

## What is real vs. stubbed in this repo

| Area                  | Status                                          |
| --------------------- | ----------------------------------------------- |
| Auth + roles          | Real, production-shaped                         |
| Assignment lifecycle  | Real end-to-end (state machine enforced)        |
| Contact scanner       | Real (regex + flag)                             |
| Admin messaging       | Real, role-scoped threads                       |
| Mentor slots/bookings | Real                                            |
| Mentor subscriptions  | Stub (record-only, no auto-renewal cron)        |
| Payments              | **Mock**: `POST /api/payments/mock-capture` simulates Razorpay success. Swap to real Razorpay in `src/lib/payments.js` |
| File storage          | Local `uploads/` — swap to S3/R2 via multer-s3  |
| Email                 | SMTP if configured, else console log            |
| Cron jobs             | Endpoints exist (`/api/admin/cron/*`); schedule via node-cron before launch |
| Audit log             | Real, on every state change                     |

## Production launch checklist

See `plans/launch-checklist.md`. Key items:

- [ ] Swap SQLite → Postgres (`datasource db { provider = "postgresql" }`)
- [ ] Provide real `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`, wire `verifyPayment` in `src/lib/payments.js`
- [ ] Configure real SMTP (Resend recommended in India)
- [ ] Move uploads to S3/R2 (add signed-URL endpoint)
- [ ] Add node-cron scheduler for `/api/admin/cron/auto-complete` + reconciliation
- [ ] Enable Sentry
- [ ] HTTPS via Caddy/nginx in front
