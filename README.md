# CampusConnect

A secure, intent-based networking platform that connects students for academic collaboration, skill exchange, and meaningful interactions within verified campus communities.

**Differentiator:** every interaction starts with explicit intent (*"I need help with DSA"* / *"I can teach React"*) and chat only opens after **mutual consent** — the recipient must accept a connection request before a DM is possible. No random cold DMs.

---

## Status

This repo is the **Phase 1 MVP** rebuild — a clean, minimal, end-to-end vertical slice of the core consent-gated flow. Earlier / larger prototypes live in sibling repos:

- [`Pratyush150/CampusConnect`](https://github.com/Pratyush150/CampusConnect) — original monorepo (Follow-based, social-network style)
- [`Pratyush150/campusconnect-frontend`](https://github.com/Pratyush150/campusconnect-frontend)
- [`Pratyush150/campusconnect-backend`](https://github.com/Pratyush150/campusconnect-backend)

This repo pivots the design to intent-based + consent-gated messaging, described in detail in [`PLAN.md`](./PLAN.md) and [`plans/phase-1.md`](./plans/phase-1.md).

## Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Frontend  | React 18 + Vite + React Router + Socket.io-client            |
| Backend   | Node 20 + Express 5 + Prisma + Socket.io                     |
| Database  | SQLite (dev) → Postgres (Phase 2+)                           |
| Auth      | JWT in httpOnly cookie, bcrypt password hashing              |
| Real-time | Socket.io rooms keyed by `conversationId`, auth via cookie    |

## Core data model (Phase 1)

`User` → `Service (OFFER | REQUEST)` → `ConnectionRequest (PENDING → ACCEPTED|REJECTED)` → `Conversation` → `Message`.

Chat access is double-gated: a user must be (a) a participant of the `Conversation` **and** (b) have a corresponding `ACCEPTED` `ConnectionRequest` — enforced for both REST (`GET /conversations/:id/messages`) and WebSocket (`join`, `sendMessage`).

## Quickstart (local dev)

Requires Node 20 and npm. On WSL/Ubuntu:

```bash
# Terminal 1 — backend (API + WS on :4000)
cd backend
npm install
cp .env.example .env        # edit JWT_SECRET before doing anything real
npx prisma migrate dev --name init
npm run seed                # seeds alice@campus.edu + bob@campus.edu (pw: password123)
npm start

# Terminal 2 — frontend (Vite on :5173)
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** and log in as one of the seeded users.

### Demo script

1. Log in as Bob. Feed → click *"DSA tutor — Graphs & DP"* (Alice's service).
2. Send a connection request with a short intro message.
3. Log out, log in as Alice. **Connections → Incoming → Accept**.
4. **Chats** → open the new conversation. Keep this tab open.
5. Log back in as Bob in another browser / private window. **Chats** → same conversation.
6. Type in either tab → the other receives it in real time via Socket.io.

## Repository layout

```
campusconnect/
├── PLAN.md                 # master technical plan
├── plans/
│   ├── phase-1.md          # MVP (this implementation)
│   ├── phase-2.md          # email verification, profiles, search, ratings
│   ├── phase-3.md          # AI skill-matching (pgvector + embeddings)
│   └── phase-4.md          # multi-campus, admin, analytics, scale
├── backend/                # Express + Prisma + Socket.io
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/
│       ├── index.js        # app + Socket.io bootstrap
│       ├── routes/         # auth, services, connections, conversations
│       ├── middleware/auth.js
│       └── lib/prisma.js
└── frontend/               # React + Vite
    └── src/
        ├── App.jsx         # router + guards
        ├── auth.jsx        # AuthContext
        ├── api.js          # axios (withCredentials)
        ├── socket.js       # socket.io-client singleton
        └── pages/          # Login, Feed, NewService, ServiceDetail, Connections, Chat
```

## Environment variables (`backend/.env`)

| Var                | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `DATABASE_URL`     | Prisma connection string; defaults to SQLite file    |
| `JWT_SECRET`       | **Change in production.** Signs auth cookies.        |
| `PORT`             | Backend HTTP/HTTPS port (default `4000`)             |
| `FRONTEND_ORIGIN`  | CORS origin — must match the Vite dev URL            |
| `HTTPS`            | `1` to enable TLS (self-signed), `0` for plain HTTP  |
| `SSL_KEY/CERT`     | Paths to cert files when `HTTPS=1`                   |

## Optional: local HTTPS

Self-signed cert lives in `backend/certs/{key,cert}.pem`. To turn it on:

```bash
# backend/.env
HTTPS=1
FRONTEND_ORIGIN=https://localhost:5173
```

Then restart both servers and accept the browser's cert warning once per port (`:4000` and `:5173`).

For a real trusted cert locally, use [`mkcert`](https://github.com/FiloSottile/mkcert) and drop its output into `backend/certs/`.

## Roadmap

See [`PLAN.md`](./PLAN.md) for the full phase roadmap. Summary:

| Phase | Theme                  | Highlights                                                   |
| ----- | ---------------------- | ------------------------------------------------------------ |
| 1     | MVP                    | Signup → Service → Request → Accept → Chat (this repo)       |
| 2     | Strong product         | College-email verification, profiles, filters, notifications |
| 3     | Smart differentiation  | Embedding-based skill matching, chat suggestions              |
| 4     | Multi-campus & scale   | Admin dashboard, analytics, moderation, Postgres, Docker     |

## License

MIT (or your preferred — update before public launch).
