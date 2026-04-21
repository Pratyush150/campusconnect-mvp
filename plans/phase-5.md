# Sprint 5 — UX Refresh + Live Session Tools

**Goal:** polish the mentor flow so it feels like a paid product, add the video-call and shared-notes pieces that justify the price, and clean up the UI fundamentals (dark mode, toasts, forms).

## Scope

### A. Mentor booking UX
- **Date-grouped slot picker** on `/mentors/:id`: a horizontal strip of available dates; picking one reveals the time-chips for that date only.
- **Mentor bulk slot creator** on `/mentor`: one form produces N slots over a date range + times per day + duration. Backend `POST /api/mentors/slots/bulk`.
- **Unified book-and-pay**: one confirm modal with price + "Book & Pay ₹X" button that does `create booking → create order → capture` atomically. Loading spinner, toast on success, error recovery.
- **Expiring pending bookings**: `MentorBooking.expiresAt` set to `+15 min` when created; cron `POST /api/admin/cron/release-unpaid-bookings` releases slots whose bookings stayed unpaid past the window. Fixes slot-leakage.

### B. Live session tools
- **Video call via Jitsi Meet**: platform-issued room URL `https://meet.jit.si/assignmentor-<bookingId>-<rand>`. Generated on `capture` (when booking becomes `confirmed`). Both sides see a **Join call** button on the booking detail page. No API key, no third-party auth.
- **Session notes board**: new `MentorBooking.sessionNotes` field (plus `sessionNotesUpdatedAt`). Mentor has an autosave textarea (2s debounce) on the booking detail page; student sees the same page with notes as read-only markdown. Post-session the notes are the student's takeaway. Future upgrade: swap in Yjs for real-time multi-cursor.

### C. Fundamentals cleanup
- **Dark/light theme toggle** via CSS variables. Persists to `localStorage`. Toggle lives in nav.
- **Toast system** to replace `alert()` everywhere. Success / error / info variants. Auto-dismiss after 4s.
- **Confirm modal** to replace `confirm()` on destructive actions.
- **Loading states** on every async action (buttons go disabled + show spinner).
- **Form affordances**: labels above inputs, inline error messages, required-field asterisks.
- **Empty states** that teach the user what to do next, not just "No data".
- **Typography + spacing** pass — consistent 8px grid.

### D. Deferred (not this sprint)
- Real-time collaborative notes (Yjs / Liveblocks)
- Embedded Jitsi iframe (we use new-tab navigation)
- Calendar widget with multi-month view
- Mobile-first redesign

## Schema changes

```prisma
model MentorBooking {
  // ...existing
  durationMin           Int       @default(60)
  expiresAt             DateTime?
  sessionNotes          String?
  sessionNotesUpdatedAt DateTime?
}
```

## API additions

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/mentors/slots/bulk` | Mentor only. Body `{ dates: string[], times: {start,end}[], durationMin? }`. Creates cross-product. |
| `GET` | `/api/mentors/bookings/:id` | Either participant or admin. Returns booking + mentor + student summary + notes. |
| `PATCH` | `/api/mentors/bookings/:id/notes` | Mentor only. Body `{ notes: string }`. Debounce client-side. |
| `POST` | `/api/payments/book-and-capture` | Dev-only shortcut. Body `{ slotId, topic? }`. Internally: create booking (with expiresAt) → create order → mock-capture → attach meeting link. |
| `POST` | `/api/admin/cron/release-unpaid-bookings` | Releases slots where `booking.status='pending_payment' AND expiresAt < now()`. |

## Definition of done

- Client books a slot using the new UX in under 10 seconds.
- Mentor adds 14 days of slots in one form submission.
- After payment, both parties see a "Join call" link and a notes area.
- Mentor types notes; student refreshes; notes appear.
- Toggling the theme switches the whole app.
- No `alert()` anywhere; no `confirm()` on destructive actions.
