# CampusConnect

> A two-channel revenue platform built around one ruthless idea: **make it architecturally impossible for the people transacting to cut the platform out.**

---

## Why this exists (the 60-second version)

Every marketplace that connects two humans loses money the same way: the buyer and the seller exchange phone numbers and finish the job off-platform. Fiverr, Urban Company, Chegg, every student-tutor site — they all fight this. Most of them fight it with policies and detection. **CampusConnect fights it by never letting the two humans talk to each other in the first place.**

Two revenue streams live on the platform:

1. **Assignment Marketplace.** A **Client** posts "I need this homework done by Tuesday." An **Admin** reviews the post, strips identifying info, and publishes it as an anonymous listing. Approved **Doers** place sealed bids. Admin picks a winning bid, tells the client "we matched you with an expert — pay ₹X," holds the money in escrow, waits for the doer to deliver files, reviews the files, and releases the files + money. The client never learns who the doer is. The doer never learns who the client is. Both of them can only message admin, never each other.

2. **Mentorship Portal.** Admin-invited **Mentors** (think IIT alumni, professionals) publish public profiles, set their hourly rate, and drop availability slots. Any logged-in user can book a slot and pay. Platform takes 15%. Mentors get a platform-generated meeting link (so nobody can mask-swap it for a personal Zoom).

That's it. Zero peer-to-peer chat. Zero student-to-student social features. Zero Client↔Doer visibility. Everything else is engineered around defending those walls.

## The 10 non-negotiable invariants

These are the rules the code must never violate. Every bug report is judged against this list:

1. **Isolation.** No API, DB query, WebSocket event, JWT claim, or UI component exposes Client identity to Doer or vice-versa. Baked into the data layer.
2. **Escrow-first.** An assignment cannot transition to `in_progress` unless `payment.status = captured`. No exceptions.
3. **Admin gateway.** Every delivered file passes through admin review. Direct Doer→Client file transfer is architecturally impossible.
4. **Payment before access.** Mentor sessions require captured payment before the booking is confirmed.
5. **Single bid.** `@@unique([assignmentId, doerId])` — one bid per doer per assignment, at the DB level.
6. **Commission always taken.** Platform fee is deducted inside the `releaseEscrow` / `completeBooking` transactions. No manual-override path exists.
7. **Audit trail.** Every state transition writes an `AuditLog` row with actor, previous state, new state.
8. **Idempotent webhooks.** Capturing the same payment twice is a no-op. `capturePaymentByOrder` short-circuits if status is already `captured`.
9. **Rate limiting.** Auth endpoints throttle aggressively.
10. **Contact-info scanner.** Every piece of user-submitted text is scanned for phone, email, Instagram, WhatsApp, Telegram, URL shorteners, "call me"-style language. Flags go to the admin queue. Admin still decides — automation should never silently reject.

---

## The 13-state assignment state machine (print this out)

The assignment lifecycle is a DAG with one bad-path branch. This is the core object in the platform:

```
                          ┌───────────────── rejected ─────────────▶ cancelled
                          │                                            │
  pending ──admin.publish─┴──▶ published ──bid arrives──▶ bidding      │
     │                                                        │        │
     │                                        admin.assign(bidId)      │
     │                                                        ▼        │
     │                                                   assigned      │
     │                                                        │        │
     │                                  client.pay (mock or Razorpay)  │
     │                                                        ▼        │
     │                                                  in_progress    │
     │                                                        │        │
     │                                        doer.deliver(files)      │
     │                                                        ▼        │
     │                                                     review ──┐  │
     │                                                        │     │  │
     │                                admin.requestRevision   │     │  │
     │                                                        ▼     │  │
     │                                                   revision   │  │
     │                                                        │     │  │
     │                                     doer.deliver(new) │     │  │
     │                                                        └─────┘  │
     │                                                        │        │
     │                                admin.approveDelivery   │        │
     │                                                        ▼        │
     │                                                   delivered     │
     │                                                        │        │
     │            client.confirm OR cron.autoComplete(hold done)       │
     │                                                        ▼        │
     │                                                    completed ◀──┘
     │                                                        │
     │                                         client.dispute │
     │                                                        ▼
     │                                                     disputed
     │                                     admin resolves → one of: more revision / refund / side-with-doer
     │
     └─── admin.reject / admin.cancel anytime in early states ──▶ cancelled
                                                                        ↓
                                                                     refunded
```

Every arrow is a route handler in `backend/src/routes/admin.js` or `backend/src/routes/assignments.js`. Every transition writes to `AuditLog`. Try it: run the demo flow below, then `SELECT * FROM AuditLog ORDER BY createdAt` and you'll see every hop.

---

## Architecture at a glance

```
  ┌──────────────────┐   cookie+JSON    ┌────────────────────────┐   Prisma    ┌───────────────┐
  │  Vite React App  │ ◀──────────────▶ │  Express 5 + Socket.io │ ◀─────────▶ │  SQLite (dev) │
  │  (5173)          │                  │  (4000)                │             │  Postgres     │
  └──────────────────┘                  └────────────────────────┘             │  (prod swap)  │
          ▲                                ▲         │                         └───────────────┘
          │                                │         │
          │                                │         └──▶ Mock payment adapter
          │                                │              (swap in Razorpay)
          └── role-gated routes ───────────┤
                                           │
                           ┌───────────────┴─────────────────┐
                           │ loadUser → requireAuth →        │
                           │ requireRole(["admin"]) …        │
                           │ requireApprovedDoer/Mentor      │
                           └─────────────────────────────────┘
```

Stack choices, with the reason for each:

| Layer | Choice | Why |
| --- | --- | --- |
| Backend | Node 20 + Express 5 | Fast to iterate; massive ecosystem; the CampusConnect spec explicitly allows Express-or-Next.js |
| ORM | Prisma | Type-safe queries, great migrations, one-line DB swap |
| DB | SQLite → Postgres | SQLite = zero-install local dev; flip `provider = "postgresql"` when you're ready |
| Auth | JWT in httpOnly cookie | Can't be read by XSS; sent automatically; no Authorization header dance |
| Realtime | Socket.io | Admin sees new bids / new deliveries instantly in dev; survives HTTP fallback |
| Logging | pino + pino-http | JSON logs, fast, ships cleanly to any log sink in prod |
| Uploads | multer → local `uploads/` | Simple for dev; swap to `multer-s3` for S3/R2 |
| Frontend | Vite + React 18 + React Router v6 | Snappy HMR, minimal config, future flags on |
| Payments | **Mock adapter** | Drop-in Razorpay — see *Going to production* below |

---

## Who can do what (the access-control matrix)

Four roles, baked into the JWT claim:

| Action | Admin | Client | Doer | Mentor |
| --- | :---: | :---: | :---: | :---: |
| Post assignment | — | ✓ | — | — |
| See own posted assignments | — | ✓ | — | — |
| See all assignments | ✓ | — | — | — |
| See anonymized "available" listings | — | — | ✓ (if approved) | — |
| Place bid | — | — | ✓ (if approved) | — |
| See other doers' bids | ✓ | — | — | — |
| Assign a doer | ✓ | — | — | — |
| Upload delivery | — | — | ✓ (assigned) | — |
| Approve delivery | ✓ | — | — | — |
| Download approved delivery | — | ✓ (own) | — | — |
| Raise dispute | — | ✓ | — | — |
| Browse mentors | ✓ | ✓ | ✓ | ✓ (own) |
| Create mentor slot | — | — | — | ✓ (if approved) |
| Book mentor slot | — | ✓ | ✓ | — |
| Mark session complete | — | — | — | ✓ |
| See platform earnings | ✓ | — | ✓ (own) | ✓ (own) |
| Manage settings | ✓ | — | — | — |

Server-side enforcement: `middleware/auth.js` ships `requireAuth`, `requireRole(...roles)`, `requireApprovedDoer`, `requireApprovedMentor`. Frontend mirrors this with `<RequireRole roles={["doer"]}>`.

---

## Quickstart (WSL / Linux / macOS)

```bash
git clone https://github.com/Pratyush150/campusconnect-mvp.git
cd campusconnect-mvp
```

### Terminal 1 — backend

```bash
cd backend
npm install
cp .env.example .env            # edit JWT_SECRET if you plan to share the URL
npx prisma migrate dev --name init
npm run seed                    # creates admin + 2 clients + 2 approved doers + 1 approved mentor
npm start                       # 🚀 CampusConnect API on http://localhost:4000
```

### Terminal 2 — frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Open **http://localhost:5173** in your browser. If you had a stale cookie from an earlier run, do one of: private/incognito window, or DevTools → Application → Cookies → delete `token`.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@campusconnect.local` | `admin123` |
| Client | `client@demo.local` | `client123` |
| Client | `client2@demo.local` | `client123` |
| Doer (approved) | `doer@demo.local` | `doer123` |
| Doer (approved) | `doer2@demo.local` | `doer123` |
| Mentor (approved) | `mentor@demo.local` | `mentor123` |

The login page has **4 role tabs** at the top — tap one and it pre-fills the demo creds for that role, so you can fly through the flow.

---

## The 5-minute demo script (do this at least once)

Open three browser windows/profiles so you can play all three roles at once. Or cycle through one window — your call.

1. **Client window.** Log in as `client@demo.local`. Click **+ Post**. Fill in a title like *"1500-word essay on game theory"*, pick a deadline ≥ 24 hours away, submit. You're now in `pending` state.
2. **Admin window.** Log in as `admin@campusconnect.local`. Go to **Assignments**, find the new one, open it. Click **Publish (anonymized)**. Status → `published`.
3. **Doer window.** Log in as `doer@demo.local`. Go to **Available assignments** — you'll see the listing, but zoom in: **no client name, no email, no phone.** Click in, place a bid with a cover note and a price, submit.
4. **Admin window.** Refresh the assignment. You'll see the bid with the doer's rating and completed-count. Click **Assign to this doer** (enter final price). Other bids, if any, auto-reject.
5. **Client window.** Refresh. A "Pay ₹N (mock)" button appears. Click it — this calls `createOrder` then `mock-capture`, flipping the payment to `captured` and the assignment to `in_progress`.
6. **Doer window.** Refresh. The task now shows `in_progress`. Upload any PDF/image and submit.
7. **Admin window.** Refresh. Click **Approve & deliver**. Status → `delivered`.
8. **Client window.** Refresh. The file link appears. Click **Confirm & release payment**. Status → `completed`, platform earns 25% of the price (default setting, editable in `/admin/settings`).

**Do this for mentors too:** log in as `mentor@demo.local`, add a slot, log out, log in as a client, go to `/mentors`, book the slot, mock-pay. The booking is confirmed with a platform-issued meeting link.

Want to test the contact scanner? Put `reach me on whatsapp +919876543210` in an assignment description. When admin opens it, they see a red **contact-flag** chip and the matched patterns (`phone,whatsapp,contactLanguage`).

---

## The repo layout

```
campusconnect/
├── PLAN.md                     # Master plan — pitch, invariants, sprint map
├── plans/
│   ├── phase-1.md              # Sprint 1: Foundation (shipped)
│   ├── phase-2.md              # Sprint 2: Assignment core (shipped)
│   ├── phase-3.md              # Sprint 3: Payment + delivery (shipped, mock PSP)
│   ├── phase-4.md              # Sprint 4: Mentorship (shipped)
│   ├── leakage-matrix.md       # L1–L15 revenue-leakage defenses, each mapped to code
│   └── launch-checklist.md     # Pre-launch gates — nothing goes live until these are ✓
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # 17 models, commented
│   │   └── seed.js             # Admin + demo users + platform settings
│   ├── src/
│   │   ├── index.js            # App bootstrap — CORS, JSON, pino, sockets, route mount
│   │   ├── lib/
│   │   │   ├── prisma.js       # Prisma client singleton
│   │   │   ├── audit.js        # audit({ actorId, entity, entityId, action, newState, ...})
│   │   │   ├── scanner.js      # Regex-based contact-info detector
│   │   │   ├── payments.js     # Mock Razorpay adapter (createOrder, verify, refund, webhook)
│   │   │   ├── notify.js       # Writes DB notification + pushes to socket room user:<id>
│   │   │   └── mailer.js       # SMTP → console fallback
│   │   ├── middleware/
│   │   │   └── auth.js         # loadUser, requireAuth, requireRole, requireApprovedDoer/Mentor
│   │   └── routes/
│   │       ├── auth.js         # /register/{client,doer,mentor}, /login, /logout, /me
│   │       ├── assignments.js  # Client + doer surface, including deliver + confirm + dispute
│   │       ├── admin.js        # Every admin-only action
│   │       ├── mentors.js      # Public mentor listing + booking + mentor self-service
│   │       ├── messages.js     # Admin↔Client and Admin↔Doer — role-scoped threads
│   │       ├── payments.js     # createOrder, verify, mock-capture, webhook
│   │       ├── notifications.js
│   │       ├── uploads.js      # multer for delivery files
│   │       └── payouts.js      # Doer/mentor earnings + payout request + bank account
│   └── uploads/                # gitignored; local file storage
│
└── frontend/
    └── src/
        ├── App.jsx             # Router + RequireRole guard + top nav
        ├── auth.jsx            # AuthProvider + useAuth hook + dashboardPath()
        ├── api.js              # axios({ withCredentials: true })
        ├── socket.js           # socket.io-client singleton
        └── pages/
            ├── Login.jsx       # 4 role tabs + demo-cred shortcut
            ├── Register*.jsx   # One per role (Client / Doer / Mentor-with-invite)
            ├── client/         # Dashboard, NewAssignment, AssignmentDetail
            ├── doer/           # Dashboard, AvailableDetail, TaskDetail
            ├── mentor/         # Dashboard (slots + bookings)
            ├── mentors/        # Public list + detail for booking
            └── admin/          # Dashboard, Assignments, Doers, Mentors, Payouts, Settings
```

### Anatomy of a single request (trace `POST /api/assignments/:id/bid`)

1. Browser sends POST with cookie `token=<jwt>`.
2. `index.js` runs `pinoHttp` (log), `cors`, `express.json`, `cookieParser`, `loadUser`.
3. `loadUser` pulls the JWT from the cookie, verifies it, and hangs `req.userId` + `req.userRole` off the request.
4. Route-level middleware: `requireAuth` → `requireApprovedDoer` (checks `DoerProfile.isApproved`).
5. Handler runs `scanMany(coverNote)` — if any pattern matches, `contactFlagged = true`.
6. Prisma creates the bid inside a try/catch that maps P2002 (unique violation) to 409 — the "one bid per doer per assignment" invariant.
7. If the assignment was `published`, it transitions to `bidding`.
8. `audit()` writes an `AuditLog` row.
9. `notifyUser()` for every admin writes a DB notification **and** emits `notification:new` to the `user:<adminId>` socket room.
10. 201 response.

Every route is this shape.

---

## Data model (17 tables, in natural groups)

**Users & auth.** `User` (role + profile fields), `DoerProfile`, `MentorProfile`, `RefreshToken`, `MentorInvite`.

**Assignment flow.** `AssignmentRequest` (the state machine), `AssignmentBid` (one-per-doer enforced by DB), `AssignmentDelivery` (versioned), `AdminMessage` (role-scoped — note the `toUserId` column is the enforcement point).

**Mentorship.** `MentorSlot` (unique on `(mentorId, slotDate, startTime)` → can't double-book), `MentorBooking`, `MentorSubscription`.

**Money.** `Payment` (central ledger), `PlatformEarning` (commission split per payment), `Payout` (doer/mentor withdrawal), `BankAccount`.

**Ops.** `PlatformSetting` (commission %, limits, windows — admin-editable), `Notification`, `AuditLog`.

Full schema lives in `backend/prisma/schema.prisma`, heavily commented.

---

## What's shipped vs what's a stub (read before launching)

| Area | Status | Notes |
| --- | --- | --- |
| 4-role auth + role-guarded routing | **Real** | JWT httpOnly cookie, bcrypt, rate-limit |
| Full assignment state machine | **Real** | 13 states, server-enforced |
| Client↔Doer isolation | **Real** | Verified: doer endpoints strip `clientId`, `client.email` |
| Contact-info scanner | **Real** | Regex + admin-flag, doesn't auto-reject |
| Admin↔Client / Admin↔Doer messaging | **Real** | Separate threads per `toUserId` |
| Mentor invite → signup → approve | **Real** | Invite tokens expire in 14 days |
| Mentor slots + bookings + ratings | **Real** | DB unique prevents double-booking |
| File uploads | **Real** | `multer` → local `uploads/` — swap to S3/R2 |
| Audit log | **Real** | Every state change |
| Socket.io admin notifications | **Real** | `user:<id>` rooms |
| 4-category client posting | **Real** | `category` on `AssignmentRequest`: `assignments_essays`, `ed_drawing`, `projects`, `custom`. Custom requires a free-text note (also scanned). |
| Bid-likelihood indicator (client posting) | **Real** | `GET /api/assignments/budget-stats?category=…` → percentile-based verdict once ≥5 completed jobs exist; otherwise a category-floor heuristic. Surfaces as Lower / Moderate / Higher next to the budget input. |
| Admin earnings dashboard | **Real** | `GET /api/admin/earnings` + `/admin/earnings/export.csv`. Date presets (Today / 7d / 30d / This month / Last month / Custom), gross inflow + net platform fee + payout cards, daily stacked bar by source (assignments vs mentor sessions), vs-prev-period delta, CSV export. |
| **Payments** | **MOCK** | `src/lib/payments.js` — `verifyPayment` accepts `signature: "MOCK_OK"`. Dev endpoint `POST /api/payments/mock-capture` flips a payment to captured without a real PSP. |
| **Email** | **Optional** | Nodemailer if SMTP env set; else logs the body to server console |
| Cron jobs | **Endpoints exist** | `/api/admin/cron/auto-complete`, `/stale-review-alert`, `/reconcile-payments`. Not scheduled — use `node-cron` in prod |
| Mentor monthly subscriptions | **Schema only** | Row model exists, auto-renewal flow deferred |
| Password reset, email verification | **Deferred** | Sprint 5 polish |

---

## Posting-intelligence: how the bid-likelihood indicator decides

When a client picks a category and types a `budgetMax`, the New-Assignment page calls `GET /assignments/budget-stats?category=…` and shows a Lower / Moderate / Higher verdict.

**Two regimes, automatic switchover:**

1. **≥5 completed jobs in the category** → the endpoint returns p25 / p50 (median) / p75 of historical `finalPrice` plus a recommended range (p40–p70). The verdict is:
   - `budgetMax < p25` → 🔴 Lower (suggests p40 to lift the budget)
   - `p25 ≤ budgetMax ≤ p75` → 🟡 Moderate
   - `budgetMax > p75` → 🟢 Higher
2. **<5 samples** (cold start, fresh DB, or new category) → falls back to a per-category floor (`assignments_essays: 300`, `ed_drawing: 500`, `projects: 1500`, `custom: 300`). The verdict becomes:
   - `< floor` → 🔴 Lower (suggests floor)
   - `floor ≤ x < 1.6 × floor` → 🟡 Moderate (suggests `1.4 × floor`)
   - `≥ 1.6 × floor` → 🟢 Higher

The widget always tells the user which regime it's in (`median ₹X (n=…)` vs `category baseline`), so it's transparent and not a black box. The endpoint is client-role-only — no leakage of accepted-price data to doers.

**Why this exists (business framing):** the biggest revenue leak at posting time is clients underpricing because they don't know market rates → no doers bid → no transaction. A small nudge here directly converts dead posts into completed jobs.

---

## Revenue-leakage defenses (L1–L15)

Full matrix in `plans/leakage-matrix.md`. The short version of the critical ones:

- **L1 / L2** — Contact-info hidden in assignment text / bid notes / file metadata. **Defense:** scanner flags every user-submitted string; admin must acknowledge before publishing.
- **L5** — Client claims delivery not received. **Defense:** escrow keeps the client's money safe until they confirm, and the admin has cryptographic proof of the delivery files.
- **L6** — Client pays doer directly outside the platform. **Defense:** the doer literally does not have a field in any API response containing the client's identity. You can't email someone whose email you don't know.
- **L8** — Payment fails but work starts. **Defense:** `in_progress` transition is gated on `payment.status = captured`. The button is disabled until then.
- **L13** — Double-booked mentor slot. **Defense:** DB unique constraint + transaction in the booking path.

---

## Environment variables (`backend/.env`)

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✓ | `file:./dev.db` | Prisma connection. Flip to Postgres URL in prod. |
| `JWT_SECRET` | ✓ | *dev value* | **Change in prod.** 32-byte random. |
| `PORT` | | `4000` | Backend HTTP port |
| `FRONTEND_ORIGIN` | | `http://localhost:5173` | CORS origin; must match Vite URL |
| `HTTPS` | | `0` | `1` to serve TLS locally with self-signed certs |
| `SSL_KEY`, `SSL_CERT` | | | Required if `HTTPS=1` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | | — | If any unset → emails print to server console |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | | — | If unset → mock adapter accepts `signature: "MOCK_OK"` |

---

## Going to production (checklist short form)

Long form in `plans/launch-checklist.md`. The hard gates:

1. **Postgres.** Flip `datasource db { provider = "postgresql" }` in `schema.prisma`. Run `prisma migrate deploy`.
2. **Razorpay.** Get keys. Implement the 4 methods in `backend/src/lib/payments.js` with the Razorpay SDK. Configure the webhook URL in the Razorpay dashboard pointing to `POST /api/payments/webhook`.
3. **Email.** Resend works great for India. Set `SMTP_HOST=smtp.resend.com` etc.
4. **File storage.** S3 or Cloudflare R2. Swap the multer storage engine for `multer-s3` and add a presigned-URL endpoint.
5. **Cron.** Use `node-cron` (or the host's cron) to hit the three endpoints under `/api/admin/cron/*`.
6. **TLS.** Put Caddy or nginx in front. `HTTPS=1` plus self-signed is for local only.
7. **Sentry.** Drop in `@sentry/node` — the unhandled-error middleware is already in place.
8. **GST / legal.** Platform commission is taxable revenue in India.
9. **Rotate JWT_SECRET. Revoke all existing cookies.** (You did not share the dev JWT with anyone, right?)

---

## Troubleshooting

| Symptom | What's happening | Fix |
| --- | --- | --- |
| `Cannot read properties of null (reading 'role')` on server start | Cookie from an old DB (pre-migration). | Clear cookies in browser OR re-seed DB. The `/me` route now handles this gracefully (401 instead of crash). |
| 403 on `/api/assignments/available` while logged in as admin | You navigated to `/doer` while logged in as admin. Server is correctly refusing. | Not a bug — RequireRole will redirect you. |
| Rate-limit 401s | You tried to log in too fast. | 10/min/IP. Wait 60 seconds. |
| `ERR_CONNECTION_REFUSED` on `:4000` | Backend isn't running. | `npm start` in `backend/`. |
| Vite picked port 5174 instead of 5173 | Another Vite process is bound to 5173. | `ss -ltnp \| grep 5173` → `kill <pid>`. |
| "Cannot update a component while rendering…" warning | Fixed in the latest commit. | Pull and reload. |

---

## Contributing (or: how I'd extend this if I were you)

In order of bang-per-buck:

1. **Finish the payment adapter.** Wire real Razorpay (test mode first) in `backend/src/lib/payments.js`. ~2 hours.
2. **Write the password-reset flow.** New endpoints, reuse the OTP util for the token. ~3 hours.
3. **Ship the doer-earnings UI.** The API exists (`/api/payouts/earnings`); the page does not. ~2 hours.
4. **Schedule the cron jobs.** `node-cron` + 3 lines in `index.js`. ~30 minutes.
5. **Admin dispute-resolution UI.** Backend can already resolve, frontend has no UI. ~3 hours.
6. **Mentor monthly subscriptions.** Schema exists; write the subscribe, auto-renew, and session-cap logic. ~1 day.
7. **Multi-admin support + admin invite flow.** Small. ~2 hours.
8. **Move uploads to S3.** `multer-s3` + a presigned-URL endpoint. ~2 hours.

Each of these is scoped to be a single PR. The plan docs in `plans/` tell you where each belongs.

## License

MIT. Update before taking money from real users.
