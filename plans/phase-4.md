# Phase 4 — Scale & Multi-Campus

**Goal:** Go from one pilot campus to N campuses without rewrites. Harden the system for public launch.

---

## Capabilities

1. **Multi-college tenancy**
   - Every `Service`, `ConnectionRequest`, feed, leaderboard scoped to user's `collegeId`.
   - Optional cross-campus sharing (opt-in per post).
   - `College` model becomes first-class: domain whitelist, branding, admin contacts.

2. **Admin dashboard**
   - Campus-admin role can: moderate flagged content, verify mentor accounts, see DAU/WAU, approve new college onboarding.
   - Built with Next.js (separate app in the monorepo) + server components for lists.

3. **Analytics**
   - Product metrics: signup → first-service → first-connection → first-message funnel.
   - Per-college dashboards (activation, retention cohorts).
   - Self-hosted PostHog (open-source) to avoid vendor lock-in for student data.

4. **Ops / reliability**
   - Containerize (Dockerfile + docker-compose for full local stack).
   - Deploy: backend on Fly.io or Render; frontend on Vercel/Netlify; Postgres on Neon; Redis on Upstash.
   - Structured logs (pino → Grafana Loki).
   - Error tracking with Sentry (already in existing backend deps — just re-enable).
   - Load test with k6; target p95 < 300ms on core endpoints at 500 concurrent WS connections.

5. **Moderation tooling**
   - Centralized flag queue (from Phase 3 ModerationFlag + Phase 2 Report).
   - Shadowban + timeout actions.
   - Appeal flow.

## Schema deltas

```prisma
enum Role { STUDENT MENTOR CAMPUS_ADMIN PLATFORM_ADMIN }

model College {
  id            String   @id @default(cuid())
  name          String   @unique
  domains       String[] // e.g. ["iitk.ac.in"]
  branding      Json?    // logo, primary color
  onboardedAt   DateTime @default(now())
  users         User[]
}

model User {
  // ...existing
  role      Role    @default(STUDENT)
  collegeId String?
  college   College? @relation(fields: [collegeId], references: [id])
}

model AdminAction {
  id        String   @id @default(cuid())
  actorId   String
  target    String   // "user:<id>" | "service:<id>"
  action    String   // HIDE | TIMEOUT | BAN | VERIFY_MENTOR
  reason    String?
  createdAt DateTime @default(now())
}
```

## Business model (what you can switch on here)

| Lever                   | How                                                           |
| ----------------------- | ------------------------------------------------------------- |
| Freemium                | Limit outgoing connection requests/day on free tier           |
| Priority listing        | Paid boost — pinned to top of feed for 24h                    |
| Campus partnerships     | Per-college license; they get a white-labeled admin dashboard |
| EdTech integration      | Affiliate links on high-demand skills ("Book a paid tutor")    |

## Task list for Phase 4

1. Add `collegeId` to every queryable model; migrate existing rows.
2. Scope every list/feed query by college; add cross-campus opt-in flag on `Service`.
3. Stand up Next.js admin app; wire role-based guard middleware.
4. Self-host PostHog + wire event tracking SDK on frontend.
5. Dockerize; write `docker-compose.dev.yml` (api + postgres + redis + worker + frontend).
6. Set up Sentry + pino + Loki.
7. k6 scripts for auth, feed, and socket-heavy chat; fix any p95 regressions.
8. Ship the moderation queue UI + admin action audit log.
9. Write a partner-college onboarding runbook (domain whitelist + brand setup + admin invite).
