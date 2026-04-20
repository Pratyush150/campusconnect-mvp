# Phase 3 — Smart Differentiation (AI-driven matching)

**Goal:** Stop being a bulletin board. Start being *useful* — when a student says "I need help with DSA trees," the platform surfaces the right tutor proactively.

**Why this matters (interview angle):** this is the moat. Without it, CampusConnect is a Discord server with a fancy UI.

---

## Capabilities

1. **Auto skill tagging**
   - When a user writes a `Service`, an embedding model (OpenAI `text-embedding-3-small` or open-source BGE via local inference) extracts tags + normalizes them against a canonical skill graph.
   - Same on user bios / profile.

2. **Match scoring**
   - For each `REQUEST` service, rank candidate helpers by cosine similarity of `(user's offered skills + past ratings in that skill)` vs. the request embedding.
   - Present as "Suggested helpers" on the service detail page.

3. **Chat assistance**
   - After a connection is accepted, a starter-message suggestion appears above the chat box ("Ask them which topic they're stuck on first").
   - For tutors, a short summary of the requester's stated problem.

4. **Quality guardrails**
   - Toxicity filter on messages (OpenAI moderation endpoint).
   - "Is this a real academic question?" classifier on services — flag joke or spam posts for admin review.

## Architecture additions

- **Embedding service:** separate worker process that consumes a Redis queue. On every `Service.create` or `User.update`, enqueue an embedding job, store the vector.
- **Vector store:** `pgvector` extension on Postgres (cleanest) or Qdrant if you outgrow pgvector. Add an `embedding vector(1536)` column to `Service` and `User`.
- **Model choice:** default to OpenAI `text-embedding-3-small` ($0.02/M tokens — cheap). Have a feature flag to swap to a self-hosted BGE model for cost / data-residency later.
- **LLM calls** (chat suggestions, classifier): Claude Haiku 4.5 via the Anthropic SDK — fastest for short-context tasks, and prompt-caching the system prompt halves the spend.

## Schema deltas

```prisma
model Service {
  // ...existing
  embedding Unsupported("vector(1536)")?  // pgvector
  canonicalTags String[]                  // normalized skills
}

model User {
  // ...existing
  embedding Unsupported("vector(1536)")?
}

model ModerationFlag {
  id        String   @id @default(cuid())
  subject   String   // "service:<id>" or "message:<id>"
  reason    String
  severity  Int      // 0..3
  createdAt DateTime @default(now())
}
```

## Task list for Phase 3

1. Enable `pgvector` on Postgres; run Prisma raw migration for vector columns.
2. Stand up Redis (dev: Docker; prod: Upstash).
3. Write `embed-worker.js` — BullMQ consumer, calls OpenAI embeddings, upserts vector.
4. Add `/api/services/:id/suggestions` endpoint — top-K nearest users by cosine similarity, filtered by college.
5. Frontend: suggestion carousel on service detail.
6. Integrate Anthropic SDK with prompt caching for chat starter suggestions. (Use the `claude-api` skill for correct SDK setup.)
7. Wire OpenAI moderation into the message save path; block severity-high messages.
8. A/B test: does showing suggestions increase acceptance rate on connection requests?
