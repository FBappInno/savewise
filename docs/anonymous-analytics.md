# Anonymous analytics and error analysis

SaveWise analytics is privacy-off by default. No analytics identifier is created and no event is transmitted before explicit opt-in. Declining does not reduce application functionality.

## Data boundary

The API accepts only an allowlisted event name plus:

- random UUIDv4 installation identifier
- platform (`ios`, `android`, `web`, `unknown`)
- application version
- timestamp
- optional bounded duration and item count
- optional allowlisted operation and error category

The strict request schema rejects extra properties. URLs, titles, summaries, descriptions, keywords, notes, prompts, chat messages, Knowledge Graph data, research results, account data and arbitrary error messages cannot be submitted through this endpoint.

No country is currently collected because deriving it would require processing network-location information. Express IP data is not persisted by the analytics store.

## Consent and deletion

- Default: `undecided`, analytics disabled.
- “Not now”: consent becomes `denied`; no UUID is generated.
- Opt-in: consent becomes `granted`; a random local UUID is created on first event.
- Toggle off: future transmission stops immediately.
- Delete: `DELETE /api/analytics/devices/:anonymousId` removes all matching events and only then removes the local identifier.

## Storage and retention

The repository currently provides a self-hosted Analytics API and a file-backed development store at `backend/data/anonymous-analytics.json`. It retains events for 90 days and caps the development file at 250,000 events. The file is gitignored.

Production should replace this store with a PostgreSQL repository hosted in the selected Swiss or EU region. The mobile contract remains unchanged and can point to a separate deployment through `EXPO_PUBLIC_ANALYTICS_API_URL`.

## Initial events

The client currently records app lifecycle, discovery import/create/edit/delete, library and topic use, searches, Knowledge Graph load performance, AI Chat use, Research Agent actions, cloud synchronization and categorized operational errors. Content values are never accepted as event properties.

Native process crashes require a platform crash bridge in a later beta build. The `AppCrashed` event is reserved in the allowlist, but no stack trace or exception message may be attached.

Community mode is intentionally not enabled yet. It requires a separate, explicit consent purpose and must never be inferred from anonymous analytics consent.
