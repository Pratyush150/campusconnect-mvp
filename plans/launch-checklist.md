# Launch checklist

Before taking money from a real user, every unchecked box must be closed. Items in **bold** are security/finance critical.

## Database

- [ ] Flip `datasource db { provider = "postgresql" }` in `schema.prisma`
- [ ] Provision managed Postgres (Supabase / Neon / Railway)
- [ ] Run `npx prisma migrate deploy`
- [ ] Automated daily backups
- [ ] Seed an admin user with a strong password; rotate immediately

## Payments

- [ ] Razorpay account created, verified
- [ ] **`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` set**
- [ ] Implement `createOrder`, `verifyPayment`, `refund`, `webhookVerify` in `backend/src/lib/payments.js`
- [ ] Webhook URL registered with Razorpay, signature verified server-side
- [ ] **Reconciliation cron scheduled (15 min)**
- [ ] Test full order → capture → release loop in Razorpay test mode
- [ ] **Bank accounts verified before any payout**

## Security

- [ ] **Rotate `JWT_SECRET` to a 32-byte random value**
- [ ] HTTPS terminated at edge (Caddy / Cloudflare / nginx)
- [ ] Secure cookie flag enabled (already driven by `HTTPS=1`)
- [ ] Rate-limit: auth endpoints 5/min/IP, general API 100/min/user
- [ ] Helmet + CSRF middleware on state-changing routes
- [ ] File upload type + size enforcement (already implemented)
- [ ] File virus scan (clamav or Cloudflare R2 scan)
- [ ] Sentry wired, source maps uploaded
- [ ] Log redaction for passwords, tokens, card data

## Files

- [ ] Swap local `uploads/` for S3/R2
- [ ] Presigned URL endpoint (1h TTL)
- [ ] CORS configured on bucket
- [ ] Lifecycle rule: delete abandoned uploads after 30 days

## Email

- [ ] Real SMTP (Resend recommended for India)
- [ ] SPF, DKIM, DMARC records
- [ ] Transactional templates: verify email, OTP, assignment status, booking, refund

## Observability

- [ ] pino logs shipped to Loki / Papertrail
- [ ] Sentry error tracking
- [ ] Uptime monitoring (Better Stack / UptimeRobot)

## Business

- [ ] Terms of Service, Privacy Policy, Refund Policy live
- [ ] GST registration (platform commission is taxable in India)
- [ ] Mentor agreements signed digitally — include non-solicitation
- [ ] Customer support inbox monitored
- [ ] Dispute SOP written
