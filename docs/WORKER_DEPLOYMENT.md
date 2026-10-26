# Deploy SparQFire to Cloudflare

This deploys the Expo web application and the authenticated Worker API together. Production uses `https://sparqfire.getsparqd.com`. The native app uses that same public API origin. Campaigns remain drafts; email sending and sender-domain verification are not implemented.

## Prerequisites

- Node 24.11+ and npm, with this repository checked out.
- A Cloudflare account with Workers and D1 enabled. Use Workers Paid for password-hashing CPU requirements and monitor actual usage.
- The `getsparqd.com` zone in that Cloudflare account. The configured Worker Custom Domain provisions DNS/TLS for `sparqfire.getsparqd.com`; resolve any existing conflicting DNS record before deployment.
- Account permissions to create D1 databases and deploy Workers/custom domains.

## Configure databases

The repository already contains separate database UUIDs from your latest configuration. If those databases belong to your deployment account, keep them and skip database creation/configuration below. Create new databases only when deploying into a different account or intentionally creating a fresh environment.

From the repository root:

```sh
npm ci
npx wrangler login
npx wrangler d1 create sparqfire-preview
npx wrangler d1 create sparqfire-production
npm run configure:worker -- preview PREVIEW_DATABASE_UUID
npm run configure:worker -- production PRODUCTION_DATABASE_UUID
```

Use the UUIDs returned by Cloudflare. These IDs are configuration, not credentials; commit the resulting Wrangler configuration. The helper rejects invalid UUIDs and reuse of one database across environments. Deployment stops if the selected database is still a placeholder. The preview web app uses its Worker URL; `http://localhost:8081` is additionally allowed for local Expo development.

## Validate and deploy

```sh
npm run check
npm run test:release
npm run deploy:preview
```

`deploy:preview` validates configuration, exports the web app, applies the preview database migrations, and uploads the preview Worker and assets. Smoke-test its URL before production:

```sh
npm run deploy:production
```

Production deployment runs the same sequence against the separate production database, and attaches the production custom domain. If migration fails, the upload does not run. Changes to migrations must remain backward compatible with the currently deployed Worker in case a later upload fails.

Verify both endpoints:

```sh
curl https://sparqfire.getsparqd.com/api/v1/health
curl https://sparqfire.getsparqd.com/api/v1/ready
```

Health checks process availability. Readiness queries the deployed database/schema and returns 503 if it is unavailable. Confirm `/`, `/login`, and `/settings` load the web app; API errors must stay JSON rather than returning the SPA page.

## Create the owner securely

Run `npx wrangler secret put BOOTSTRAP_KEY --env production` from `apps/worker` and enter a randomly generated value of at least 32 characters. Do not put it in Wrangler configuration or Git. Preview uses a separate secret with `--env preview`.

Use this PowerShell example to submit the one-time setup request without entering the password in shell history:

```powershell
$setupSecret = Read-Host 'Bootstrap key' -AsSecureString
$ownerEmail = Read-Host 'Owner email'
$ownerPassword = Read-Host 'Owner password (14–256 characters)' -AsSecureString
$setupBody = @{
  email = $ownerEmail
  password = [System.Net.NetworkCredential]::new('', $ownerPassword).Password
} | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri 'https://sparqfire.getsparqd.com/api/v1/setup/owner' `
    -Headers @{ 'X-Bootstrap-Key' = [System.Net.NetworkCredential]::new('', $setupSecret).Password } `
    -ContentType 'application/json' -Body $setupBody
} finally {
  Remove-Variable setupSecret,ownerPassword,setupBody
}
```

After success, run `npx wrangler secret delete BOOTSTRAP_KEY --env production` from `apps/worker`. The database also enforces a single owner if two setup requests race. Sign in through the web login screen and verify creating a workspace and reading its contacts. Native login returns a bearer token instead of a browser cookie.

## Operations and limits

- Cloudflare's authentication rate limiter allows 10 login/setup requests per minute per IP per location. Email-based failure lockout also applies after five failures within 15 minutes. Shared IPs can share the limit; tune deliberately. Production authentication fails closed when the rate-limit binding is absent.
- Browser session cookies are HttpOnly, SameSite=Lax, and Secure over HTTPS. Cookie-authenticated mutations require an allowed Origin; native clients use bearer tokens.
- A daily scheduled task removes expired sessions and login-attempt records older than one day. Review scheduled invocation failures and HTTP 5xx logs in Cloudflare observability. Avoid logging tokens, passwords, or request bodies.
- D1 migrations are additive. Take a D1 export before future destructive schema changes and rehearse recovery. A code rollback does not roll back the database.
- Test the domain, login/logout, readiness, workspace isolation, and native connectivity after each release. Set up uptime alerts for `/api/v1/ready` and budget alerts in your Cloudflare account.
- This release does not add password recovery, MFA, team invitations, legal retention/export flows, DNS verification, unsubscribe processing, or campaign sending. Complete the applicable features and a security review before handling real marketing lists.

For iOS build/signing and OTA setup, see [IOS_RELEASES.md](IOS_RELEASES.md).
