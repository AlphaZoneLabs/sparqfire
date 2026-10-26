# SparQFire — Expo + Cloudflare Foundation

**Stage:** implementation foundation (NOT production-ready for marketing delivery). A universal Expo application for web, iOS, and Android plus a Cloudflare Worker + D1 API.

> **Brand assets:** This overlay must be extracted **into a checkout of `AlphaZoneLabs/sparqfire` that still contains** `sparqfireLogo.png` and `sparqfireIcon.png` in the repository root. Neither source image is overwritten or renamed by this package. The postinstall script generates gitignored copies for Metro.

## Implemented

- Expo Router navigation with adaptive sidebar (desktop) and bottom tabs (mobile).
- Branded overview, clients, contacts, campaigns, domains, settings, and sign-in screens.
- Clearly labeled interactive local demonstration mode using `.test` placeholder addresses. Demo state is not durable and is never sent to the Worker.
- Cloudflare Worker API with D1-backed owner bootstrap, email/password login, opaque 7-day sessions (HttpOnly browser cookies, SecureStore tokens for native), and sign-out.
- Client workspaces, permission checks, opted-in contacts, draft campaigns, and pending sender-domain registration.
- Cross-client isolation at the API, audit events for writes, duplicate-contact rejection, login attempt lockout, CSRF origin checks for cookie mutations, and safe JSON error messages.
- Separate preview/production Worker and D1 configuration, SQL migrations, unit tests, and CI checks.

## Not yet implemented

**No marketing emails can be sent.** Domain DNS verification, SPF/DKIM/DMARC provisioning, unsubscribe links and suppression sync, segmentation and imports, template editor, real broadcasts, delivery provider integration, provider webhooks, Google sign-in, 2FA, account invitations, rate limiting at the Cloudflare edge, data export/delete controls, and production readiness review are future work. Domain status always begins as `pending`; it cannot be promoted by the existing API.

## Deploy the Worker and standalone iOS app

Production is configured for **https://sparqfire.getsparqd.com**, with separate preview/production D1 databases from the repository. Follow [the Worker deployment guide](docs/WORKER_DEPLOYMENT.md) to authenticate, apply migrations, deploy the web app/API, and create the owner. Follow [the iOS release guide](docs/IOS_RELEASES.md) to link the AlphaZoneLabs Expo project, sign standalone builds, publish OTA updates, and verify rollback.

## Requirements

- Node.js 22.13+ (Node.js 24 LTS also suitable)
- npm 10+
- Cloudflare account with paid Workers/D1 access as appropriate
- Access to your repository including the two existing PNG files

## Local setup (Windows PowerShell)

```powershell
git clone https://github.com/AlphaZoneLabs/sparqfire.git
cd sparqfire
# Extract the overlay ZIP here, preserving the two existing PNG files.
npm ci
npm run check
Copy-Item apps/app/.env.example apps/app/.env
# Update EXPO_PUBLIC_API_URL if your Worker is not at localhost:8787.
npm run dev
```

The UI opens in demo mode even if the Worker is not configured. The root postinstall script verifies the existing logo and icon and copies them into the standard Expo assets folder. Generated copies are gitignored; root source assets remain unchanged.

## Configuring Cloudflare preview

1. Log in: `npx wrangler login`.
2. The repository already contains separate preview/production D1 UUIDs. If deploying into a new Cloudflare account, create replacements (do **not** use the same database for preview and production):

```powershell
npx wrangler d1 create sparqfire-preview
npx wrangler d1 create sparqfire-production
```

3. Only when replacing databases, run `npm run configure:worker -- preview UUID` and `npm run configure:worker -- production UUID` with the returned IDs.
4. In preview, `APP_ORIGIN` permits `http://localhost:8081` for Expo development. Production uses `https://sparqfire.getsparqd.com`.
5. Copy `apps/worker/.dev.vars.example` to `apps/worker/.dev.vars.preview`, replace the dummy key with a long random secret. This file is gitignored.
6. Build the web assets, apply local migrations, start the local Worker:

```powershell
npm run build:web
npm run db:local -w @sparqfire/worker
npm run dev:api
```

7. Start Expo in another terminal: `npm run dev`. Press `w` for web. Since Expo and Wrangler listen on different ports in local development, the CORS/origin configuration must match your actual Expo URL.
8. Bootstrap exactly one owner from PowerShell, using a secret that matches `.dev.vars.preview`:

```powershell
$secret = Read-Host 'Preview bootstrap key'
$owner = Read-Host 'Owner email'
$password = Read-Host 'Owner password (min. 14 chars)' -AsSecureString
$plain = [System.Net.NetworkCredential]::new('', $password).Password
$body = @{ email=$owner; password=$plain } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8787/api/v1/setup/owner' -Headers @{ 'X-Bootstrap-Key'=$secret } -ContentType 'application/json' -Body $body
Remove-Variable plain,body,password
```

9. Sign in through `/login` in the Expo app, or Settings → Sign in.
10. After creating the owner, **remove the bootstrap secret from deployed environments** so owner setup is no longer callable.

### Remote preview deployment (optional)

```powershell
npm run db:preview -w @sparqfire/worker
npm run deploy:preview
```

Set `EXPO_PUBLIC_API_URL` for native to the HTTPS preview Worker origin (not `localhost`, which means the phone itself). Production web requests automatically use their own Worker origin. Deploy web assets after exporting them. Do not put any secret in `EXPO_PUBLIC_*` variables. Local web preview and native debugging may require different `.env` values.

### Production deployment

Production should **not** be deployed to real client contacts until the security and delivery prerequisites are finished. When ready, migrate the isolated production database with `npm run db:production -w @sparqfire/worker` before `npm run deploy:production`. Configure real Cloudflare routes, DNS, app credentials, edge rate limiting, and security reviews first.

## Quick commands

| Command | Purpose |
|---|---|
| `npm run dev` | Expo development server |
| `npm run dev:api` | Local Cloudflare Worker preview |
| `npm run check` | Both TypeScript checks + validation tests |
| `npm run build:web` | Export static Expo web assets |
| `npm run db:local -w @sparqfire/worker` | Create/update local D1 schema |
| `npm run deploy:preview` | Export web and deploy preview Worker |

## Repo structure

```
sparqfire/
├── sparqfireLogo.png          # Existing logo (unchanged)
├── sparqfireIcon.png          # Existing icon (unchanged)
├── apps/
│   ├── app/                  # Expo Router; iOS, Android, web
│   │   ├── app/              # File-based screens
│   │   └── src/              # Components, state, API, theme
│   └── worker/               # Cloudflare Worker API
│       ├── src/              # Router + validation
│       ├── migrations/       # D1 schema migrations
│       └── test/             # Unit tests
├── docs/                      # Architecture and roadmap
├── .github/workflows/         # CI
└── package.json               # npm workspaces
```

## Engineering principles

- All client access checks happen in the Worker, never just by hiding a UI control.
- No actual email delivery endpoint exists until consent, DNS verification, suppressions, and send approval are implemented.
- Use separate Cloudflare D1 resources for preview/production.
- No API keys or private data in Expo public env variables, Git, or browser bundles.
- The initial app has no persisted local demo contacts; preview changes reset on reload.
- Do not put real customer data in demo mode.

## Current limitations

The lockfile pins the installed dependency set. Signing and device-level iOS/OTA acceptance require the owning Expo project and Apple Developer credentials. Follow the release acceptance checklist before distributing to users. Campaign sending and domain verification remain future work.
