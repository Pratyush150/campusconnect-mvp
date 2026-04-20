# Phase 2 — Strong Product

**Goal:** Turn the MVP into something a real first-campus cohort (~200 students) would actually log in to twice a week.

---

## Feature set

1. **College-email verification**
   - Restrict signup to a whitelist of `.ac.in` / `.edu` / per-partner-college domains.
   - OTP via SMTP (nodemailer; use Mailtrap in dev, Resend/SES in prod).
   - Unverified users can browse public services but not send connection requests.

2. **Profile system**
   - Avatar upload (Cloudinary — already wired in existing backend).
   - Year, major, LinkedIn/GitHub links.
   - Public profile page showing: bio, skills chips, services they've posted, reciprocal kudos count.

3. **Search & filters**
   - Feed filters: `kind`, `tag`, `college`, date range.
   - Full-text on title+description (Postgres `tsvector` once you migrate; in SQLite use `LIKE` as an interim).
   - Skill chips as clickable filters on profile & feed.

4. **Notifications**
   - New connection request, acceptance, new message (when tab inactive).
   - Tab-title unread count badge.
   - DB-backed `Notification` rows + Socket.io push.

5. **Ratings / reviews**
   - After a connection is `ACCEPTED` and the conversation is ≥24h old, either side can leave a 1–5 star rating + short note.
   - Visible on profile as an aggregate score + recent reviews.

6. **Safety primitives**
   - Block user (breaks any existing conversation).
   - Report service or message (admin queue in Phase 4).
   - Basic profanity filter on service creation (bad-words package).

7. **UI polish**
   - Tailwind design pass: consistent spacing, typography, dark mode.
   - Empty states + skeletons.
   - Mobile-responsive from day one (it's a student-phone-first product).

## Schema additions

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // CONN_REQUEST | CONN_ACCEPTED | MESSAGE | RATING
  payload   Json
  readAt    DateTime?
  createdAt DateTime @default(now())
}

model Rating {
  id             String   @id @default(cuid())
  raterId        String
  rateeId        String
  conversationId String
  stars          Int      // 1..5
  note           String?
  createdAt      DateTime @default(now())
  @@unique([raterId, rateeId, conversationId])
}

model Block {
  id        String   @id @default(cuid())
  blockerId String
  blockedId String
  createdAt DateTime @default(now())
  @@unique([blockerId, blockedId])
}

// User additions
model User {
  // ...existing
  verified     Boolean  @default(false)
  otp          String?
  otpExpiresAt DateTime?
  avatarUrl    String?
  year         Int?
  major        String?
  github       String?
  linkedin     String?
}
```

## Migration from SQLite to Postgres

Switch `datasource db { provider = "postgresql" }` and regenerate migrations against a fresh Postgres. Use Supabase or Neon (free tier) for a zero-ops dev DB.

## Task list for Phase 2

1. Add email verification flow (signup → OTP → verify → activate).
2. Port schema changes + migrations.
3. Build profile edit + avatar upload (reuse existing Cloudinary middleware from `campusconnect-backend`).
4. Implement feed filters + basic full-text search.
5. Add Notification model + emitter hooks in service/connection/message paths.
6. Build ratings UI + API after-the-fact on accepted connections.
7. Block + report endpoints; hide blocked users from feed and disable `join` socket event.
8. Design pass: define design tokens in Tailwind config, rebuild core screens.
9. QA pass on mobile viewport widths.
