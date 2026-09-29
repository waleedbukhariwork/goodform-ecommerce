# Approved scope and acceptance contract

## Product

Goodform is an independently branded eight-garment storefront with a private,
photo-based fitting room. The user approved accounts, Stripe test checkout,
measurement comparison and two-look preview comparison. Continuous live-camera
try-on, AI body measurements, fit guarantees, social sharing and admin tools are
excluded. Email verification and password reset were initially excluded and were
added by explicit later approval, delivered through Resend in production only; MFA,
billing notifications and marketing mail remain excluded. The deadline is a 20-hour implementation window with five hours reserved
for final verification and submission; do not imply this clock was measured here.

## Acceptance criteria

- S1: Browse/search eight seeded garments, inspect a product and its size chart on
  mobile and desktop. Use permitted assets and label fictional demonstration data.
- S2: Sign up/in/out; private carts, photos, jobs and orders enforce ownership.
  In production, signup requires confirming the email address and a password
  reset is available; verification is enforced only where mail actually sends.
- S3: Persist cart/variant quantities; calculate money server-side in integer cents.
- S4: Complete Stripe test checkout using verified webhooks, idempotency and atomic
  stock reservations; browser redirects cannot mark an order paid.
- S5: Upload once or select a permitted model photo; generate up to two previews
  from the same original, retain usable shopping during failures, and expose
  actual processing states. Provider access, credits, latency and quality must
  pass the feasibility gate before this feature is called working.
- S6: Calculate differences from explicit garment measurements; previews do not
  establish physical fit or the appearance of a chosen size.
- S7: Owner-only personal media, bounded generation, deletion/expiry, metadata
  stripping, and truthful provider-retention disclosure. No private media in logs.
- S8: Reproducible setup, migrations, seeds, isolated dev/staging/production,
  verified release artifacts, CI, smoke tests, known limitations and a demo script.

## Current engineering decisions

The current stack and boundaries are defined in architecture.md. The initial
implementation task is the bounded platform foundation prompt, not the whole
store. A new service or major dependency needs a clear purpose and authorization;
adding infrastructure does not demonstrate scalability.

## Funding and external gates

AWS credits cover eligible hosting; Google credits cover eligible try-on calls.
Stripe is test mode in every deployment. Observe is limited to its verified free
allowance. Credit availability, account access, hostnames, CI permissions and
provider retention are runtime prerequisites, not facts established by this repo.
No uncovered spending. Never silently replace an unavailable live integration
with mock results and call it verified.
