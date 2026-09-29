# Identity and application access

Better Auth 1.7.6 owns `/api/auth/*` through its official Node handler on Express 5.2.1. Its official Drizzle PostgreSQL adapter owns `user`, `session`, `account`, `verification` and `rate_limit`. The generated migration is `0001_sturdy_warbound.sql`. The application does not read passwords or issue session tokens itself.

`PUBLIC_ORIGIN` is an explicit, exact browser origin. Development defaults to `http://127.0.0.1:8080`, the local proxy; staging and production must inject their HTTPS origin. No Host or forwarded-host header is used to choose trust. `SESSION_KEY_FILE` is validated in the existing API config; deployment requires a key file with at least 32 characters. Development without the file uses a random process-lifetime secret, so local sessions do not survive an API restart. Use a local file when testing persistence. The release Compose file passes its environment-specific secret file and public origin.

The implemented Express/Nest order is:

1. Request ID and safe request-completion logging.
2. Raw Better Auth route. It can read the untouched request stream. Session lookup enforces a 24-hour absolute age; a new sign-in revokes any existing session before Better Auth creates a new one.
3. Mutation Origin check for Nest application routes. Requests require the exact configured `PUBLIC_ORIGIN`; a mismatch or missing Origin gets 403 problem+json.
4. Session guard for Nest routes. Only GET/HEAD health (`live`, `ready`) and public product list/detail are allowed anonymously. All other Nest paths require a valid server-side session. Private responses use `Cache-Control: private, no-store`.
5. Bounded JSON parser, then Nest routes and DTO validation.

A signed Stripe webhook raw route will be inserted at step 2 in the payments phase. It must remain before the Origin check and parser; its signature will be checked by the official Stripe SDK. The auth route has Better Auth's own origin checks. No session cookie is set on public catalog responses.

The session cookie is host-only, HttpOnly, SameSite=Lax, Path=/, and Secure when `PUBLIC_ORIGIN` is HTTPS. Better Auth's database session expiry is refreshed with one hour of idle validity and a five-minute update threshold; the middleware also revokes a session once its creation time exceeds 24 hours. Signout deletes the server-side session. No cookie cache or stateless session mode is enabled. Better Auth's PostgreSQL rate-limit table stores sign-in and sign-up counters across API processes, with five attempts per minute for each endpoint and client key. Its built-in credential path performs a password hash on an unknown account and uses the same 401 code for unknown email and wrong password.

Application handlers must take `ownerId` from the guarded request. They must not accept an owner ID from client JSON, query or path input. Auth protocol responses remain Better Auth's own JSON format; application errors use problem+json.

## Local observations, 2026-09-29

Against the running API and disposable PostgreSQL: migration and seed exited 0; health and catalog returned 200 JSON; anonymous private path returned 401 problem+json with `X-Request-Id`; cross-origin POST returned 403 problem+json; signup, signin, signout and get-session returned 200. A post-signout cookie and a pre-signin cookie each returned 401 on a private path, while the new signin cookie was accepted. Wrong password and unknown email both returned 401 with `INVALID_EMAIL_OR_PASSWORD`; their observed request durations were 119 ms and 90 ms in one probe, so exact timing equality has not been established. A sixth sign-in attempt in a one-minute window returned 429 with `X-Retry-After: 60`. HTTP development signup set a cookie with `Path`, `HttpOnly`, `SameSite`, and no `Domain`; `Secure` is enabled by Better Auth for the HTTPS public origin in deployed configuration but has not been observed over a deployed HTTPS connection. The local API stdout had no test email marker or session-cookie name. These checks are local only.
