# Sprint 1 — Foundation

**Goal:** 4-role auth + empty dashboards so every subsequent flow has a home.

## Scope

- Prisma schema for `User`, `DoerProfile`, `MentorProfile`, `RefreshToken`, `PlatformSetting`, `AuditLog`, `Notification`
- Email/password auth with JWT in httpOnly cookie + refresh token
- 4 signup flows:
  - `POST /api/auth/register/client`
  - `POST /api/auth/register/doer` (creates `DoerProfile`, `isApproved=false`)
  - `POST /api/auth/register/mentor` (requires invite token)
  - Admin user seeded; no public admin signup
- Role middleware `requireRole(['admin'])`, `requireApprovedDoer`, `requireApprovedMentor`
- Role-based frontend routing — `/client`, `/doer`, `/mentor`, `/admin` guards
- Empty dashboard shells per role

## Out

- Email verification OTP (moved to Sprint 5 polish)
- Password reset

## Seed

- Admin: `admin@assignmentor.local / admin123`
- Two clients, two approved doers, one approved mentor
- Platform settings: `assignment_commission_percent=25`, `mentor_commission_percent=15`, `min_bid_amount=200`, `escrow_hold_days=3`, `max_revision_count=3`, `mentor_cancellation_window_hours=4`

## Definition of done

Every role can log in and see a placeholder dashboard that confirms their role.
