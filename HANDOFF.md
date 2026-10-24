# Work session continuation: SparQFire

Repository: https://github.com/AlphaZoneLabs/sparqfire

This overlay is the **first implementation**, not the entire marketing platform. It was built without write access to GitHub. Copy these project files into the repo root while preserving `sparqfireLogo.png` and `sparqfireIcon.png`.

Priority tasks for an implementation-enabled Work session:

1. Create `feat/expo-cloudflare-foundation` branch; inspect root image assets and verify `npm run brand:sync` copies the original logo/icon into Expo assets without changing root source images.
2. Install the SDK 58 dependencies and let `npx expo install --fix` reconcile actual versions. Commit a lockfile.
3. Run `npm run check`, `npx expo-doctor`, `npm run build:web`; correct all issues and verify iOS/Android/web UI.
4. Provision isolated preview D1; run migrations; bootstrap a development owner; verify login/logout and CRUD from Expo web/native.
5. Write proper D1 integration tests for tenant isolation, login failures, CSRF, and permission enforcement.
6. Address production hardening gaps in docs/ARCHITECTURE.md before importing real contacts.
7. Implement contact CSV/XLSX preview, mapping, deduping, suppressions, and consent history; preserve client isolation.
8. Add sender-domain verification workflow and marketing provider adapter (do not enable sending before all controls).
9. Create draft PR against main; do not auto-deploy real email sending.

Do not overwrite or rename the two existing branding PNGs. Do not deploy without the user's real Cloudflare configuration and review.
