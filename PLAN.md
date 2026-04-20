# CampusConnect — Master Technical Plan

**One-line pitch:** A secure, intent-based networking platform that connects students for academic collaboration, skill exchange, and meaningful interactions within verified campus communities.

**Differentiator:** Unlike generic social apps, every interaction starts with explicit intent ("I need help with DSA", "I can teach React") and chat only opens after mutual consent (connection request accepted).

---

## Existing assets (as of 2026-04-20)

On GitHub (`Pratyush150/...`):

| Repo                         | Purpose                                                 | Stack                                           | State                    |
| ---------------------------- | ------------------------------------------------------- | ----------------------------------------------- | ------------------------ |
| `CampusConnect`              | Monorepo — frontend + backend + extras + SQL backup     | React 19 / Vite + Node/Express 5 / Prisma / PG  | Most recent, works       |
| `campusconnect-frontend`     | Vite React app                                          | React + Tailwind + Socket.io client             | Ships                    |
| `campusconnect-backend`      | Express API + Prisma schema                             | Express 5 + Prisma + Postgres + Socket.io       | Ships                    |
| `Campusconnect-code-repo`    | Empty placeholder                                       | —                                               | Ignore                   |

Existing schema has: `User`, `Student`, `Mentor`, `Post`, `Resource`, `Event`, `Follow`, `Opportunity`, `Conversation`, `Message`, `CampusWall`, `College`. **What's missing for the new vision**: a `Service` model (offer/request help) and a consent-gated `ConnectionRequest` model — the current `Follow` is LinkedIn-style (one-way), not handshake-based.

## Local-dev stack (this repo)

To get running on localhost fast without a Postgres install in WSL:

- **Backend:** Node 20 + Express 5 + Prisma + **SQLite** (file DB, no server) + Socket.io + JWT
- **Frontend:** React 19 + Vite + Tailwind + Socket.io client
- **Auth:** JWT in httpOnly cookie, email/password (Phase 1); college-email verification (Phase 2)
- **Real-time:** Socket.io rooms keyed by `conversationId`

Switching the datasource back to Postgres is a one-line change in `schema.prisma` once you deploy.

---

## Phase roadmap

| Phase | Theme                   | Duration target | Deliverable                                                                 |
| ----- | ----------------------- | --------------- | --------------------------------------------------------------------------- |
| 1     | MVP — core loop         | 1–2 weeks       | Signup → create Service → send ConnectionRequest → accept → chat works      |
| 2     | Strong product          | 2–3 weeks       | Search/filter, profiles, notifications, ratings, polished UI                |
| 3     | Smart differentiation   | 3–4 weeks       | AI skill tagging, match scoring, chat suggestions                           |
| 4     | Scale & multi-campus    | 4+ weeks        | Multi-college, admin dashboard, analytics, moderation                       |

Details for each phase live in `plans/phase-1.md` … `plans/phase-4.md`.

---

## Architecture diagram (textual)

```
          ┌──────────────────┐   HTTP+JSON    ┌────────────────────────┐
          │  React (Vite)    │ ◀────────────▶ │  Express 5 API         │
          │  Tailwind + rrv7 │                │  /api/auth             │
          │  Socket.io-cli   │ ◀── WS ──────▶ │  /api/services         │
          └──────────────────┘                │  /api/connections      │
                                              │  /api/conversations    │
                                              │  Socket.io (rooms)     │
                                              └──────────┬─────────────┘
                                                         │ Prisma
                                                         ▼
                                              ┌────────────────────────┐
                                              │  SQLite (dev)          │
                                              │  → Postgres (prod)     │
                                              └────────────────────────┘
```

## Directory plan (this working copy)

```
/root/campusconnect/
├── PLAN.md                   # this file
├── plans/
│   ├── phase-1.md            # MVP — start here
│   ├── phase-2.md
│   ├── phase-3.md
│   └── phase-4.md
├── backend/                  # Express + Prisma + SQLite
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.js          # app + socket.io bootstrap
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/auth.js
│   │   └── lib/prisma.js
│   ├── .env                  # DATABASE_URL, JWT_SECRET, PORT
│   └── package.json
├── frontend/                 # React + Vite
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js            # axios client
│   │   ├── socket.js         # socket.io-client singleton
│   │   └── pages/{Login,Feed,ServiceDetail,Connections,Chat}.jsx
│   └── package.json
└── existing/                 # clone of Pratyush150/CampusConnect (reference)
```

## Ports

| Service  | Port | URL                         |
| -------- | ---- | --------------------------- |
| Backend  | 4000 | http://localhost:4000       |
| Frontend | 5173 | http://localhost:5173       |
