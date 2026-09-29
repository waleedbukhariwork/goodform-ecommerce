# Goodform design prompt 04: store identity, interface quality and performance

## Start

Read `AGENTS.md`, `docs/handoff.md`, `docs/scope.md`, `docs/architecture.md`,
`docs/commerce.md` and `docs/prompts/03-inference.md`. Read the existing
`apps/web/src/app/globals.css`, `layout.tsx`, `page.tsx`, the product, cart,
account and order pages, and `apps/web/src/features/commerce/*`.

Run `node scripts/harness/cli.mjs doctor`, then `node scripts/harness/cli.mjs
task start DESIGN`, before editing anything. `DESIGN` depends only on `FOUNDATION`,
which is verified complete, so the start will succeed. Do not skip this step:
without it the task is never registered and the finish gate will reject the work
at the end. `activeTask` is currently `DELIVERY`, which is `implemented but
unverified` rather than `in progress`, so it does not block the switch.

Before the first commit, note that these files carry pre-existing edits that must
never be staged: `.agent-logs/2026-09-29_01-08-48_01a0eab5-0cd5-7d33-a8f9-b0dec051cd27.md`
and `.commandcode/taste/taste/taste.md`. Stage only files belonging to this task.

This is a **redesign of an existing, working commerce application**. COMMERCE is
implemented and its behaviour is correct: server-owned money in integer cents,
owner-scoped carts and orders, default-deny sessions, Stripe test checkout,
reconciliation, and honest order status. That behaviour is the product. You are
replacing how it looks and feels, not how it works. Do not weaken, bypass, or
"simplify" any server rule to make a component easier.

Do not write or run automated tests. Do not run harness `verify` or `task finish`.
Do not add dependencies without naming the need and getting authorization — the
current web dependency set is `next`, `react`, `react-dom` only.

## The strategic position

Amazon wins on operational clarity: dense information, one-thumb reach, instant
feedback, zero ambiguity about price and stock, and a checkout that never
surprises anyone. That operational layer is the floor you must clear, and you must
clear it on a mid-range Android phone on 4G, not just on a laptop.

Amazon is also generic. The opportunity is to keep Amazon's rigour and add
something a 2026 brand can own: an **atelier fitting-room identity**. The product
is a private fitting room with measurement comparison, not a warehouse. The
visual language should feel like a well-made tailoring studio — considered,
tactile, warm, precise about measurement — rather than a fast-fashion grid.

Reference points to hold in mind: the restraint and typographic confidence of a
Japanese or Scandinavian workwear label, the product honesty of a technical
outfitter, and the checkout clarity of the best commerce apps. Not the visual
language of a SaaS landing page, which is what most generated storefronts become.

Define the art direction in a written statement before any component is built:
type of voice, colour philosophy, density rules, imagery rules, and what the
brand deliberately refuses to do. Every later decision is checked against it.

## Hard design prohibitions

These are the failure modes that make generated interfaces cheap. None are allowed.

- No gradient mesh blobs, glassmorphism used decoratively, or blurred glow orbs.
- No purple/indigo SaaS palette, no neon on dark, no "cyber" framing.
- No emoji as interface iconography. Use real inline SVG icons, a small
  consistent set, drawn on a 24-unit grid with consistent stroke weight.
- No centred hero with a headline, a subhead and two buttons.
- No generic stock 3D render, floating glass cards, or confetti.
- No auto-advancing carousel, scroll-jacking, parallax, or cursor-follow effects.
- No animation that blocks input, delays content, or runs on scroll for effect.
- No loading spinner used as the only loading state.
- No layout that reflows after data arrives. Reserve space before it loads.
- No custom cursor, no scroll-hijack, no autoplay video, no carousels by default.
- No AI-generated product imagery. No external stock photography without a
  recorded licence. Do not fetch remote images at runtime from a third party.

If a proposed effect cannot be justified by comprehension, feedback, or
perception of depth, delete it. "It looks impressive" is not a justification.

## The imagery problem, stated honestly

The current eight product images are flat 875-byte SVG placeholders authored for
this repository. No layout, colour or 3D treatment will make them look
premium — they are the largest single reason the current site reads as
unfinished. Fix this before spending effort on motion or effects.

**Decision: use licensed real garment photography.** This is authorized. Replace
the eight placeholders with genuinely licensed photographs.

Rules for the asset work, and these are not optional:

- Use only sources with a licence that permits commercial web display. Verify
  the actual licence terms for each source before use; do not assume a licence
  from the site's brand or from a search result snippet.
- Record one row per asset in `docs/design-system.md`: source, author,
  licence name, licence URL, retrieval date, and the model or property release
  status if a person is identifiable.
- Any photograph containing an identifiable person requires documented model
  release. If a release is unavailable, do not use that image. Prefer garment
  and detail photography that does not depend on a person's likeness.
- Do not hotlink or fetch from a third-party CDN at runtime. Download the
  files, commit them under `apps/web/public/products/` with versioned filenames
  so a later content change gets a new immutable asset URL, and record the
  source.
- Convert to AVIF/WebP with a fallback, at the largest size actually rendered
  plus one density step. No image may be larger than it needs to be.
- The eight products must be visually consistent as a set: same lighting
  direction, same background treatment, consistent scale and crop. A mismatched
  mix of stock photos will look worse than a coherent illustration set, so if
  sourcing cannot produce a consistent set, stop and report rather than
  shipping a patchwork.

Do not begin any download until the source and licence for the first image are
stated and accepted. Do not generate imagery with AI.

Imagery rules regardless of option: every image gets a declared aspect ratio box,
explicit `width`/`height`, `decoding="async"`, and a `sizes` attribute that matches
the real grid. Below-the-fold images are lazy. The largest above-the-fold image is
preloaded. Images are served in AVIF/WebP with a fallback, and no image is larger
than it needs to be at the largest rendered size.

## Design system foundation

Build a real token layer before components. No hard-coded values in components.

- **Colour.** Define a small, deliberate palette with semantic names, not raw hex
  in components. Support light as the primary mode and implement dark mode
  properly rather than as an inverted afterthought, with tokens rather than
  overrides. Every text/background pair must clear WCAG AA at its real size, and
  AAA for body copy where it does not cost legibility.
- **Type.** Use `next/font` with self-hosted, subset, variable fonts. Establish a
  scale with a fixed ratio, a defined line-height per step, and a real type ramp
  rather than ad-hoc sizes. Use `clamp()` for fluid display type with explicit
  min/max so nothing overflows. Set a sensible measure for body copy and
  `text-wrap: balance` on headings. Tabular figures for prices and measurements.
- **Space.** One spacing scale, used everywhere. A strict 4/8px-based rhythm.
- **Radius, elevation, and border.** A small, consistent set. Shadows describe
  real layering; avoid dozens of arbitrary blur values.
- **Motion tokens.** Duration and easing tokens, with a small number of steps
  (roughly 120ms micro, 200ms standard, 320ms expressive). Animate only
  `transform` and `opacity` for anything on an interaction path.
- Honour `prefers-reduced-motion: reduce` globally by collapsing durations, and
  verify it actually works rather than assuming.
- Every interactive target is at least 44×44 CSS pixels, including on the
  smallest supported viewport.

## Every state of every component, designed

This is the core of the work. A component is not done when its happy path works.
For **each** component — product card, size selector, quantity stepper, add to
cart, cart line, cart summary, order status, account form, search field, filter,
sort, pagination, nav, footer, and every button — design and implement all of:

- **Loading.** A skeleton that matches the final layout's exact geometry, so
  nothing shifts when data lands. Not a spinner, not a grey box of the wrong size.
- **Empty.** A purposeful empty state that explains what goes here and offers the
  next action. An empty cart is a sales opportunity, not a shrug.
- **Error.** A specific, human message. Never a raw exception, a stack trace, or
  a provider error string. Never a silent failure. Always a support request ID,
  which the transport already returns.
- **Success.** A calm, brief confirmation that does not block the next action.
  Optimistic updates must be visibly reversible if they fail.
- **Disabled, and in-flight.** A submit button must show a pending state and
  prevent double submission without freezing the page.
- **Partial and slow.** What the screen shows on a slow connection, and when a
  request is still running after a few seconds.
- **Over-limit and edge cases.** Empty search results, quantity at maximum, size
  unavailable, item removed by another session, network loss, and retry.

Document the state matrix in `docs/design-system.md` as part of the deliverable.
A component with an undesigned error or empty state is unfinished.

## Commerce interaction quality

- **Add to cart** is optimistic. The item appears immediately with a visible
  pending affordance, and rolls back with a clear, non-alarming message if the
  server rejects it or if the reservation is refused. Reconcile with the server
  response; the client never invents a price or stock number.
- **Size selection** is prominent, keyboard reachable, and announces changes to
  screen readers. The unavailable-size state is visibly disabled and explained,
  never silently ignored.
- **Price and stock are never ambiguous.** Integer cents rendered through one
  formatting helper. Never a client-computed total presented as authoritative.
- **Cart** supports quantity change and removal with immediate feedback, a
  clearly separated summary block, and an unmistakable checkout action.
- **Checkout** is unambiguous about what is being purchased and what it costs
  before the user leaves for the provider.
- **Order status** continues to treat a redirect as meaningless: only the server
  can say an order is paid. Keep the polling and reconciliation affordance, and
  make the pending state genuinely reassuring rather than a dead spinner.
- **Auth** surfaces errors without saying which credential was wrong, matching
  the current server behaviour.

## Responsive behaviour

Design mobile-first and treat the phone as the primary surface, not an
afterthought. Support 320px through ultrawide. Verify real viewports: 320, 375,
390, 414, 768, 1024, 1280, 1440, and 1920. Nothing may overflow horizontally at
any width, and no text may be clipped. Checkout, cart, and order status must be
fully usable one-handed on a 390px screen with the thumb's reach in mind. Test
with a long product name, a long email, a large quantity, and a failed request,
because those are the cases that break layouts.

## Accessibility as a requirement

Full keyboard operability with a visible, high-contrast focus indicator, correct
semantic landmarks and heading order, labelled controls, live regions for async
results, and `aria-current` in navigation. Colour is never the only carrier of
meaning. Reduced motion honoured. Automated checks catch roughly a third of
issues, so verify manually with a keyboard and a screen reader pass.

## Performance: measure, never assert

`@playwright/test` is already a devDependency, so no new tooling is needed to
measure. Do not add a Lighthouse CI service, a bundle analyzer, or a web-vitals
package without asking.

Targets to work toward, and to report honestly against:

- Lighthouse performance category 99+ on both a desktop preset and a mobile
  emulation, measured on the production build, not the dev server.
- LCP under roughly 1.8s on mobile emulation, CLS under 0.1, INP under 200ms.
- Effectively zero layout shift. Enforce fixed aspect-ratio boxes on every
  card, image, and media container. Reserve space for anything that loads late.
- No hydration mismatch and no layout shift from client-only effects.
- JavaScript shipped to the page should be small. Prefer Server Components.
  Client Components only where interaction genuinely requires them, and keep
  their prop surface narrow so the boundary is cheap.
- No third-party script, tag manager, chat widget, or remote font request on the
  critical path.

Enforce zero CLS structurally: every card has a fixed media aspect ratio, every
async region has a reserved box, and no element changes size after first paint.
Record the measured numbers in the review with the exact command, the preset
used, and the run conditions. If a target is missed, say so and explain what
caused it. A fabricated 99 is worse than an honest 94, and the project rules
prohibit claiming results that were not measured.

## Implementation discipline

- Follow the existing structure: feature folders own their API calls, view
  models, components and hooks; shared UI holds presentation only.
- Server Components for initial reads, Client Components for interaction.
  No global client state store for server-owned data. URL state for catalog
  filters, local state for temporary UI.
- Keep the catalog's public ETag caching behaviour and the `private, no-store`
  behaviour on cart, account, and order routes. Do not accidentally make
  personalized pages publicly cacheable — that is a security regression.
- Respect the existing CSP posture. Inline SVG icons are fine; inline scripts
  and remote scripts are not.
- The back end remains the authority for money, stock, authorization, and
  payment state. The front end may be fast, never authoritative.
- Prefer a small, well-composed primitive set over a component library. Do not
  install Tailwind, a UI kit, Framer Motion, or an icon package without
  requesting it and justifying it.

## Deliverables

1. A written art direction in `docs/design-system.md`, including the state matrix
   for every component.
2. The token layer and the rebuilt component set in the existing app.
3. A redesigned home, catalog, product, cart, account, and order-status surface
   that keeps every current behaviour intact.
4. Real measured performance and accessibility results in
   `docs/reviews/DESIGN.json`, with the commands and presets recorded, and honest
   pass or fail per criterion.
5. An updated `docs/handoff.md` stating what was measured, what was missed, and
   the remaining known visual and imagery limitations.

## Stop conditions

- If the task needs a dependency, a licence, a remote asset, or a scope change,
  stop and ask rather than proceeding.
- If a redesign would weaken an existing security, caching, or ownership rule,
  stop and report it.
- If a Core Web Vitals target cannot be met without a structural change the task
  does not authorise, document the target as missed and explain the trade-off.

## Commit

Commit in bounded, reviewable phases: tokens and primitives, then one surface at
a time. Stage only files belonging to this task. Do not stage the pre-existing
unstaged edits to `.agent-logs/` or `.commandcode/taste/taste/taste.md`. No
co-author lines. Do not push.
