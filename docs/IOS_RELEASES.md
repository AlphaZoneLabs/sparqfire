# Standalone iOS builds and OTA updates

The app uses Expo Continuous Native Generation: EAS generates the iOS project from the Expo configuration. No Mac is required to request a cloud build. The resulting Release app includes its JavaScript and assets and runs without Metro or Expo Go. Backend features still require network access to the deployed Worker.

## One-time account setup

1. Install Node 24.11+ and run `npm ci` at the repository root. The postinstall step copies the existing brand assets without modifying the originals.
2. From `apps/app`, run `npx eas login`, then `npx eas init`. Use an account with access to the configured `AlphaZoneLabs` owner. Because this project has a dynamic config, if EAS asks for a manual change, put the returned project UUID in `expo.extra.eas.projectId` in `app.json`. Commit that non-secret identifier. Alternatively, set `EAS_PROJECT_ID` in the local shell and both EAS environments. Do not invent a project UUID.
3. Set the public backend origin for each environment (replace the example URLs with deployed Workers):

   ```sh
   npx eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://YOUR-PREVIEW-WORKER.workers.dev --visibility plaintext
   npx eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://sparqfire.getsparqd.com --visibility plaintext
   ```

   This value is bundled into the app; it must contain no secrets. Use an HTTPS origin without an `/api` suffix, credentials, query, or fragment. Keep preview and production backends separate. Release builds and the update launcher reject missing or local origins. OTA commands load the selected EAS environment and disable local dotenv loading so a development `.env` cannot overwrite it. Keep the project link stable across both environments.
4. For physical iPhones, enroll in the Apple Developer Program. Confirm ownership/availability of `com.alphazonelabs.sparqfire` before the first build. EAS can manage signing certificates and provisioning profiles when you sign in interactively. For preview, register devices using `npx eas device:create` before building. Apple credentials and signing files must stay out of Git.
5. For TestFlight/App Store, create the matching app in App Store Connect. The initial app declares exempt encryption for its ordinary HTTPS/SecureStore use; reassess this declaration if custom encryption is introduced.

## Build and install

Run from the repository root:

| Command | Result |
| --- | --- |
| `npm run build:ios:preview` | Ad hoc signed standalone Release for registered iPhones; preview OTA channel |
| `npm run build:ios:simulator` | Standalone simulator build; preview OTA channel; install on a Mac simulator |
| `npm run build:ios:production` | App Store signed Release for TestFlight/App Store; production OTA channel |
| `npm run submit:ios -w @sparqfire/app` | Interactively select and submit a production build to App Store Connect |

The EAS build page provides installation/download links. Internal distribution requires registered device UDIDs; use TestFlight for wider testing. Production build numbers increment through EAS remote versioning. Submission uploads a binary; finish TestFlight testing, metadata, and App Review in App Store Connect.

EAS is configured in `apps/app/eas.json`, so run direct `npx eas ...` commands from `apps/app`. Native projects are generated rather than checked in. Native/config changes belong in Expo config or config plugins.

## Publish an OTA update

First validate with `npm run check`, `npm run test:release`, and `npx expo install --check` from `apps/app`. Commit the intended code and use the same lockfile as the build. Then run from the repo root:

```sh
npm run update:ios:preview
# Test the update on an installed preview Release app before publishing production.
npm run update:ios:production
```

The commands use the matching EAS environment and channel, validate release configuration, and prompt for an update message. They publish only iOS. Nothing publishes automatically on push or merge. EAS account permissions are required to publish.

On app launch, expo-updates checks its channel and downloads a compatible update in the background. The embedded/cached bundle starts immediately, including offline. The update runs on the next cold launch; fully close and reopen after the download. An unavailable update service does not prevent launching the bundled app. Expo Go is not a test of this release behavior.

Runtime versions use Expo's `fingerprint` policy. A native dependency, SDK, permission, or config-plugin change can produce a new runtime: build and distribute a new binary before expecting that update to reach users. JavaScript/assets can update over the air when the native fingerprint matches. Inspect runtime versions in the build/update dashboard if an update does not arrive. OTA cannot add missing native code or replace App Store review requirements.

To undo a bad release, use `npx eas update:rollback` from `apps/app` and select the affected channel/runtime, or republish a verified update using `npx eas update:republish`. Follow the CLI prompts and verify recovery on a matching Release build. Already-running sessions need to restart before launch-time recovery applies.

## Acceptance checklist

- Install a preview Release build on a registered iPhone and open it with Metro stopped.
- Verify login/logout and API requests against the preview Worker, including native SecureStore session persistence.
- Launch once offline: the embedded/cached UI must open. Network-only API actions may fail normally.
- Change visible text only, publish to preview, download online, cold-launch again, and verify the text changed.
- Verify an installed production build does not receive preview updates.
- Exercise rollback on preview before the first production OTA.
- Repeat on TestFlight before public distribution.

Repository CI checks TypeScript, Worker tests, release guards, Expo package consistency, and exports both web and the iOS embedded bundle. CI does not sign, submit, or publish. A successful export is not a successful signed iOS build or a device OTA test.

References: [EAS Build](https://docs.expo.dev/build/setup/), [EAS Update setup](https://docs.expo.dev/eas-update/getting-started/), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/), [EAS environments](https://docs.expo.dev/eas/environment-variables/usage/).
