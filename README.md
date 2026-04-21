# AssignMentor

A two-channel revenue platform:

1. **Assignment marketplace** — Client posts a requirement → Admin reviews and publishes anonymized → Doers bid → Admin assigns → Client pays escrow → Doer delivers → Admin reviews → Client confirms → payout. **Clients and Doers never see or talk to each other** — all communication flows through Admin.
2. **Mentorship portal** — Approved mentors (IIT alumni / professionals) publish profiles, availability, and rates. Any Client or Doer can book a paid session or subscribe monthly.

This repo is the previous "CampusConnect" codebase **fully rewritten** after a product pivot on 2026-04-21. All peer-to-peer features (feed, connections, chat, etc.) have been deleted.

---

## Quickstart (local dev, WSL / Linux / macOS)

```bash
# Terminal 1 — backend (API + WS on :4000)
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET for anything beyond local play
npx prisma migrate dev --name init
npm run seed              # creates admin, 2 clients, 2 approved doers, 1 approved mentor
npm start

# Terminal 2 — frontend (Vite on :5173)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and log in as any seeded user.

## Demo accounts

| Role    | Email                         | Password   | Notes                       |
| ------- | ----------------------------- | ---------- | --------------------------- |
| Admin   | admin@assignmentor.local      | admin123   | Full access                 |
| Client  | client@demo.local             | client123  | Post assignments            |
| Client  | client2@demo.local            | client123  |                             |
| Doer    | doer@demo.local               | doer123    | **Pre-approved**            |
| Doer    | doer2@demo.local              | doer123    | **Pre-approved**            |
| Mentor  | mentor@demo.local             | mentor123  | **Pre-approved** (hourly ₹1500) |

## Demo script (full revenue flow, 5 min)

1. Log in as `client@demo.local`. **+ Post** an assignment with a deadline >24h away.
2. Log out, log in as `admin@assignmentor.local`. **Assignments → your new one → Publish (anonymized)**.
3. Log in as `doer@demo.local` (another browser tab or incognito). You see the anonymized listing — no client name. Click in, enter a bid + cover note, submit.
4. Back as admin: open the assignment. See the bid. **Assign** with a final price.
5. Back as client: "Pay ₹N (mock)" button now visible. Click — escrow captured, status → *in_progress*.
6. Back as doer: your task now says *in_progress*. Upload a file (any PDF/image). Submit.
7. Back as admin: approve delivery.
8. Back as client: you now see the file. **Confirm & release payment**.
9. Admin dashboard shows platform earnings incremented by 25% of the assignment price.

## What's real vs. stubbed

| Area                  | Status                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------ |
| 4-role auth + signup  | Real (JWT in httpOnly cookie)                                                              |
| Role-based routing    | Real (`RequireRole` on every page + `requireRole` middleware server-side)                  |
| Assignment lifecycle  | Real 13-state machine, enforced on server                                                  |
| Client↔Doer isolation | Real — server responses to doers never include `clientId`, `client.email`, etc.            |
| Contact-info scanner  | Real — flags phone / email / IG / WhatsApp / Telegram / URL shorteners / "call me"         |
| Admin↔Client / Admin↔Doer messaging | Real, separate threads enforced by `to_user_id` scope                        |
| Mentor invite → signup → approve    | Real                                                                         |
| Mentor slots + bookings              | Real, DB unique constraint against double-booking                           |
| Session completion + rating          | Real                                                                        |
| Payouts                              | Real record-keeping; admin approval endpoint; actual bank transfer is your PSP |
| File uploads                         | Real, `multer` → local `uploads/` dir                                       |
| Audit log                            | Real, on every state transition                                             |
| Real-time admin notifications        | Real, Socket.io `user:<id>` rooms                                           |
| **Payments**                         | **MOCK** — `src/lib/payments.js`; `POST /api/payments/mock-capture` flips a payment to captured. Swap in Razorpay. |
| **Email**                            | Nodemailer; **console fallback** if no SMTP config                          |
| **File storage**                     | Local; swap to S3/R2 via `multer-s3`                                        |
| Cron jobs                            | Endpoints exist at `/api/admin/cron/*`; schedule with `node-cron` in prod   |
| Mentor monthly subscriptions         | Schema exists; auto-renewal deferred to Sprint 5                            |

## Architecture

| Layer     | Tech                                               |
| --------- | -------------------------------------------------- |
| Backend   | Node 20 + Express 5 + Prisma + Socket.io           |
| DB        | SQLite (dev) → Postgres (prod — one-line switch)   |
| Frontend  | React 18 + Vite + React Router                     |
| Auth      | JWT in httpOnly cookie                             |
| Logging   | pino + pino-http                                   |

## Security invariants enforced in code

1. **Isolation**: every client-facing response strips `assignedDoerId`; every doer-facing response strips `clientId`, `client.*`, `adminNotes`.
2. **Escrow-first**: `in_progress` transition requires `payment.status=captured`.
3. **Admin gateway**: deliveries only reach clients after `PUT /admin/assignments/:id/approve-delivery`.
4. **Single bid**: DB `@@unique([assignmentId, doerId])`.
5. **Commission**: automatic split on `releaseEscrow` and `completeBooking` paths.
6. **Rate limit**: auth endpoints 10 req/min/IP (bump down to 5 for prod).
7. **Audit log**: every state change recorded with actor + metadata.

## Repo layout

```
assignmentor/
├── PLAN.md
├── plans/
│   ├── phase-1.md          # Foundation (shipped)
│   ├── phase-2.md          # Assignment core (shipped)
│   ├── phase-3.md          # Payment & delivery (shipped, mock PSP)
│   ├── phase-4.md          # Mentorship (shipped, subs deferred)
│   ├── leakage-matrix.md   # Revenue-leakage defense matrix
│   └── launch-checklist.md # Pre-launch gates
├── backend/
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/
│       ├── index.js
│       ├── lib/            # prisma, audit, notify, payments, scanner, mailer
│       ├── middleware/auth.js
│       └── routes/         # auth, assignments, admin, payments, mentors,
│                           #   messages, notifications, uploads, payouts
└── frontend/
    └── src/
        ├── App.jsx
        ├── auth.jsx
        └── pages/{client,doer,mentor,admin,mentors}/
```

## Path to production

See **plans/launch-checklist.md**. Short version:

1. Switch `provider = "postgresql"` in `schema.prisma`, run `prisma migrate deploy`.
2. Implement `createOrder`, `verifyPayment`, `refund`, `webhookVerify` in `backend/src/lib/payments.js` with real Razorpay SDK.
3. Configure real SMTP (Resend recommended in India).
4. Swap local `uploads/` for S3/R2 presigned URLs.
5. Schedule `node-cron` for `/api/admin/cron/auto-complete` and `/reconcile-payments`.
6. Put Caddy/nginx in front for TLS.
7. Wire Sentry + uptime monitoring.

## License

MIT (update before public launch).
