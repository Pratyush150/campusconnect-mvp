# Revenue-leakage matrix

From CampusConnect spec §6.2. Each row maps to test cases the code must handle.

| ID  | Scenario                                                                        | Defense implemented                                                                                  |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| L1  | Client or Doer hides contact info in assignment text / bid cover note            | `scanText()` regex → flags to admin queue; admin must acknowledge before publishing                  |
| L2  | Doer hides contact info in delivered file name or notes                         | Admin reviews every delivery's `doerNotes`; file metadata scanned                                   |
| L3  | Client reposts to competitors after seeing our price                            | *Deferred:* 10% non-refundable booking fee on post (Sprint 5)                                        |
| L4  | Mentor & student exchange contacts during session                               | Meeting link is platform-issued; non-solicitation copy on mentor onboarding; report button           |
| L5  | Client claims delivery not received                                             | Escrow: admin has delivery proof; auto-complete after hold window                                    |
| L6  | Client pays Doer directly off-platform                                          | Doer never sees any Client identity field in any API response; architecturally impossible            |
| L7  | Mentor subscriber books 100 sessions                                            | `sessionsLimit` cap enforced on booking                                                              |
| L8  | Payment fails but service starts                                                | `in_progress` requires `payment.status=captured`; gate in `assignAssignment` + delivery endpoints    |
| L9  | Doer abandons mid-task                                                          | Admin can reassign via `PUT /api/admin/assignments/:id/reassign { newBidId }`; escrow unaffected     |
| L10 | Razorpay webhook missed                                                         | Stub cron `/api/admin/cron/reconcile-payments` — polls provider for pending orders                   |
| L11 | Mentor no-show                                                                  | Full refund; 3 no-shows → deactivation flag                                                          |
| L12 | Student no-show                                                                 | Slot consumed; mentor paid                                                                           |
| L13 | Double-booking a mentor slot                                                    | DB `@@unique([mentorId, slotDate, startTime])` + transaction on booking                              |
| L14 | Subscription renewal silently fails                                             | *Deferred:* subscription state machine lands in Sprint 5                                             |
| L15 | Admin forgets to review delivery                                                | `/api/admin/cron/stale-review-alert` emails admin after 24h                                          |
