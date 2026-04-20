# Phase 1 — MVP

**Goal:** Working end-to-end loop. A student can sign up, post a Service (offer or request), another student can send a ConnectionRequest, the recipient can accept/reject, and *only then* chat opens between them.

**Definition of done:** Two browser tabs (two accounts) can complete the full flow on localhost in one sitting without errors.

---

## Scope

### In
- Email + password signup / login (JWT in httpOnly cookie)
- `User` profile fields: name, email, college, bio, skills (comma-separated)
- `Service` CRUD: create, list, view, delete own
- `ConnectionRequest`: send, list incoming/outgoing, accept, reject
- `Conversation` auto-created on `accept`; chat only accessible if an accepted connection exists between the two users
- `Message` send + fetch history over Socket.io rooms
- Minimal but functional UI: login, feed, create-service form, connections inbox, chat window
- SQLite file DB + seed script with two demo users

### Out (move to Phase 2)
- College-email verification / OTP
- Search / filters
- Notifications (real-time badges)
- Image upload on services or messages
- Typing indicators, read receipts
- Block / report
- Password reset

---

## Data model (Prisma, SQLite)

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  college   String?
  bio       String?
  skills    String?  // CSV for MVP; normalize later
  createdAt DateTime @default(now())

  services        Service[]
  sentRequests    ConnectionRequest[] @relation("Sent")
  receivedReqs    ConnectionRequest[] @relation("Received")
  messages        Message[]
  conversations   Conversation[]      @relation("Participants")
}

enum ServiceKind { OFFER REQUEST }

model Service {
  id          String      @id @default(cuid())
  kind        ServiceKind
  title       String
  description String
  tags        String?     // CSV
  authorId    String
  author      User        @relation(fields: [authorId], references: [id])
  createdAt   DateTime    @default(now())
}

enum ConnStatus { PENDING ACCEPTED REJECTED }

model ConnectionRequest {
  id           String     @id @default(cuid())
  senderId     String
  receiverId   String
  serviceId    String?    // optional context: "I'm reaching out about this service"
  status       ConnStatus @default(PENDING)
  message      String?    // short intro message on send
  createdAt    DateTime   @default(now())
  respondedAt  DateTime?

  sender   User @relation("Sent",     fields: [senderId],   references: [id])
  receiver User @relation("Received", fields: [receiverId], references: [id])

  @@unique([senderId, receiverId])  // only one open thread per pair
}

model Conversation {
  id           String   @id @default(cuid())
  participants User[]   @relation("Participants")
  messages     Message[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Message {
  id             String   @id @default(cuid())
  content        String
  senderId       String
  conversationId String
  createdAt      DateTime @default(now())

  sender       User         @relation(fields: [senderId],       references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])
}
```

## API surface

| Method | Path                              | Auth | Purpose                                          |
| ------ | --------------------------------- | ---- | ------------------------------------------------ |
| POST   | `/api/auth/signup`                | —    | Create user, set cookie                          |
| POST   | `/api/auth/login`                 | —    | Login, set cookie                                |
| POST   | `/api/auth/logout`                | ✓    | Clear cookie                                     |
| GET    | `/api/auth/me`                    | ✓    | Current user                                     |
| GET    | `/api/services?kind=OFFER`        | ✓    | List feed (optionally filtered by kind)          |
| POST   | `/api/services`                   | ✓    | Create offer/request                             |
| GET    | `/api/services/:id`               | ✓    | Detail                                           |
| DELETE | `/api/services/:id`               | ✓    | Delete own                                       |
| POST   | `/api/connections`                | ✓    | Send request `{receiverId, serviceId?, message?}` |
| GET    | `/api/connections/incoming`       | ✓    | Requests awaiting my response                    |
| GET    | `/api/connections/outgoing`       | ✓    | Requests I've sent                               |
| POST   | `/api/connections/:id/accept`     | ✓    | Accept → creates Conversation                    |
| POST   | `/api/connections/:id/reject`     | ✓    | Reject                                           |
| GET    | `/api/conversations`              | ✓    | My chat list                                     |
| GET    | `/api/conversations/:id/messages` | ✓    | History (guarded: must be participant + have ACCEPTED conn) |

Socket.io events:

| Event           | Direction  | Payload                                           |
| --------------- | ---------- | ------------------------------------------------- |
| `join`          | client→srv | `conversationId` (server verifies membership)     |
| `sendMessage`   | client→srv | `{ conversationId, content }`                     |
| `receiveMessage`| srv→room   | saved `Message` object                            |

## UI flow

```
/login ─┬─▶ /feed ──▶ [card] ──▶ /services/:id ──▶ [Connect button]
        │                                                 │
        │                                                 ▼
        │                                  POST /api/connections
        │                                                 │
        ▼                                                 ▼
     /connections ◀──── [inbox] ────────── (recipient sees pending)
        │                                                 │
        │ [accept]                                        │
        ▼                                                 │
     /chat/:conversationId ◀─── auto-created on accept ──┘
```

## Security non-negotiables in Phase 1

1. Passwords hashed with bcrypt (cost 10).
2. JWT in httpOnly + sameSite=lax cookie; never in localStorage.
3. Every `/api/*` except `/auth/signup`, `/auth/login` requires auth middleware.
4. `POST /api/connections/:id/accept|reject` verifies `receiverId === currentUserId`.
5. `GET /conversations/:id/messages` and `join` socket event verify the user is a participant **and** a corresponding `ConnectionRequest` is `ACCEPTED`.
6. CORS locked to `http://localhost:5173` in dev.

## Task list for Phase 1

1. Install Node 20 in WSL.
2. `npm init` backend + frontend; install deps.
3. Write `schema.prisma` (above) + `prisma migrate dev`.
4. Build auth middleware + auth routes.
5. Build service + connection + conversation routes.
6. Wire Socket.io with auth + join guard.
7. Write seed script (two users, a few services).
8. Scaffold frontend: router + auth context + pages.
9. Run both, smoke-test full flow in two browsers.

## Demo script (what to show at interview)

1. Log in as user A. Create service "Need help with DSA trees."
2. Log in as user B. Open feed, click the service, send a connection request with "Hey, I've taught this before."
3. Switch back to A. See pending request. Accept.
4. Both tabs: a chat window opens. Send messages — they arrive in real time.
5. **Key talking point:** "Notice B could not DM A before acceptance — that's the consent layer. It's the product's safety USP."
