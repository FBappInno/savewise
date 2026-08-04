# SaveWise storage architecture

SaveWise is designed as a cloud-agnostic personal knowledge platform. Storage and the AI knowledge engine are separate concerns: changing a storage target must not change how discoveries are analyzed or organized.

## Safety invariant

`activeMode` remains `local` until a target adapter has authenticated successfully and passed its health check. Synchronization only starts after an explicit user action. Selecting a future target in Settings never silently uploads existing data.

## Storage tiers

1. **Local** is the free default and must remain fully usable offline.
2. **Premium** connects the user's own cloud and enables multi-device synchronization. Dropbox, Nextcloud, Synology NAS and generic WebDAV are functional providers; Google Drive, OneDrive and iCloud Drive remain prepared provider targets.
3. **Premium+** is the future SaveWise-hosted cloud for managed sync, backups, history, sharing and server-side agents.

## Portable data domains

- discoveries
- knowledge graph
- embeddings
- AI memory
- images
- offline cache
- attachments
- settings

Each domain has an independent version in `StorageManifest`. This allows migrations and partial synchronization without coupling the knowledge engine to a vendor API.

## Adapter contract

Mobile storage adapters implement `read`, `write`, `remove`, `list` and `healthCheck`. Provider credentials are never part of the shared manifest or ordinary app settings. OAuth tokens and WebDAV credentials must use the platform keychain/secure store.

## Activation sequence

1. User chooses a target and provider.
2. Provider-specific authentication completes.
3. WebDAV creates or verifies `/SaveWise`; Dropbox verifies the account through its OAuth API.
4. Only then is `activeMode` changed from `local`.
5. The user starts synchronization explicitly. The remote bundle is merged by canonical URL and newest `updatedAt`, then the combined bundle is uploaded.

Credentials are kept in the device keychain through Expo SecureStore. Transport requires HTTPS outside local development. End-to-end encryption of the portable bundle is not yet implemented and remains required before production release.

## Dropbox beta setup

1. Create a scoped Dropbox API app with **App Folder** access. SaveWise only needs its own application folder.
2. Enable `account_info.read`, `files.content.read` and `files.content.write`.
3. Register `savewise://oauth/dropbox` as an exact OAuth redirect URI.
4. Put the public app key in `apps/mobile/.env` as `EXPO_PUBLIC_DROPBOX_APP_KEY=...`. Never ship the app secret.
5. Produce a new development/beta build after changing the native URL scheme. Expo Go cannot receive this standalone custom-scheme callback.

The app uses OAuth authorization code + PKCE, requests offline access, stores the refresh token in SecureStore and writes `savewise-sync-v1.json` relative to the Dropbox App Folder. The user starts every synchronization explicitly.

## Next implementation packages

1. Manifest persistence and per-domain version tracking.
2. Encrypted export/import package for local backups and production cloud sync.
3. Per-domain sync beyond the current discovery/knowledge-graph bundle.
4. OAuth adapters for Google Drive and OneDrive following the Dropbox reference implementation.
5. iCloud Drive adapter using the Apple platform container.
6. Sync journal, conflict resolution and resumable transfers.
7. SaveWise Cloud adapter backed by PostgreSQL and object storage.

The existing backend `DiscoveryRepository` remains the first persistence seam. Additional JSON stores should migrate behind the same domain-oriented adapter boundary incrementally.
