# Account and email verification

Local-only SaveWise use does not require an account. Premium own-cloud storage and multi-device access require a verified account session.

## Flow

1. The user supplies username, email and the new password twice.
2. For an existing account, the current password is mandatory and verified first.
3. The backend derives a salted, memory-hard scrypt password hash. Plaintext passwords are never persisted.
4. A single-use verification token valid for 60 minutes is emailed through SMTP. Only its SHA-256 hash is stored.
5. Opening the link verifies the account, revokes all prior sessions and redirects to `savewise://account-verified`.
6. SaveWise shows a fresh login screen. A successful login stores the opaque session token in the device keychain; the server stores only its hash.
7. Premium cloud adapters verify that session before connection.

iOS and Android do not permit an application to terminate itself as part of a normal account flow. SaveWise therefore closes the prior authenticated session and replaces the app content with a fresh login screen, which provides the intended security outcome without unsupported process termination.

## Mail configuration

Production requires `SMTP_URL`, `MAIL_FROM` and a public HTTPS `PUBLIC_BACKEND_URL`. Without SMTP, production rejects the account update. Development and tests use Nodemailer's stream transport and expose a development verification URL only in the API response; no such URL is returned in production.

The current file-backed account repository is intended for local beta development. A production deployment must move account records to PostgreSQL, add rate limiting, password reset, audit logging without sensitive values, abuse protection and transactional email monitoring before public launch.
