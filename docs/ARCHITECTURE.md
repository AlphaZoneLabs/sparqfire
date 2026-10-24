# SparQFire technical design

## Authentication

- Email + 14+-character password hashed using PBKDF2-SHA256, 600k iterations, random 128-bit salt.
- Opaque random 256-bit session tokens; SHA-256 digest stored in D1; expiration after seven days.
- HttpOnly, SameSite=Lax, Secure cookies on HTTPS browser sessions; native stores bearer token in Expo SecureStore.
- Explicit Origin checks for cookie-based state-changing calls, fixed allowed web origins, and per-email lockout (5 attempts/15 min). Production still requires Cloudflare WAF rate limits and 2FA.
- Owner account setup requires a long secret and works only while no owner exists; remove the secret after bootstrap.

## Multi-tenancy

- `workspace_id` on contacts, campaigns, sender domains, audit events and access mapping.
- All API reads/writes use a specific validated workspace id, membership check, and scoped SQL query.
- No hard delete, import, mass-send or unsubscribed-contact reactivation endpoints at this stage.
- Add tenant-isolation integration tests before handling real client data.

## Web and native

- Expo Router provides platform-specific navigation patterns with shared business logic.
- Web builds to `apps/app/dist` and is served as Cloudflare Worker static assets.
- Native uses HTTPS Worker API and token auth; browser uses same-origin credentials.
- `EXPO_PUBLIC_API_URL` holds only a **public origin**, never a secret.

## Sending engine (next phase, not yet active)

1. Create verified sending identity, configure SPF/DKIM/DMARC without breaking existing MX.
2. Record verified opt-in, consent history and a per-tenant suppression table.
3. Build branded responsive HTML templates with plain-text equivalents.
4. Add audience segmentation, unsubscribe and physical address footer.
5. Add queued campaign transitions and an adapter to an approved marketing email service.
6. Verify webhook signatures, deduplicate events, cap volumes and protect sender reputation.
7. Add approvals, scheduling, audit trail, idempotency and pause/cancel.

Cloudflare manages hosting, API, database, media and job orchestration; a purpose-built provider handles promotional email delivery. Cloudflare Email Service itself is **not** a marketing blast service.

## Future schema

`contact_imports`, `contact_tags`, `contact_events`, `consent_records`, `suppression_entries`, `templates`, `campaign_audiences`, `campaign_messages`, `campaign_events`, `domain_dns_checks`, `approvals`, `provider_accounts`, and `billing_usage`. Avoid adding nullable placeholder tables until implementing actual features.

## Security gates before production

- Google sign-in and MFA/passkeys with recovery
- Authenticated invites and per-role authorization for every route
- Tenant isolation automated tests + Cloudflare Access controls on staging tools
- Edge rate limiting, bot protection, account recovery and monitoring
- Privacy policy, data retention/export/deletion, incident response
- Actual sender DNS ownership verification and unsubscribe suppression
- Email-provider approval, webhooks, deliverability safeguards
- Do not claim GDPR/CAN-SPAM compliance solely by having a consent field
