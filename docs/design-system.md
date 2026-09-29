# Goodform design system

## Art direction — atelier fitting room

Goodform speaks like a careful fitter: direct, warm, and exact about what is known. Garment names and measurements lead; decorative claims do not. Short service messages say what happened, what the shopper can do next, and a support request ID when a request fails. Demonstration garments, prices, and measurements remain plainly labelled as fictional.

The palette takes its cues from uncoated paper, charcoal pencil, undyed cloth, and a restrained rust accent. Light is the primary surface. Dark mode uses its own warm dark surfaces and controlled contrast, not inverted photographs. Colour never carries status alone. Body copy aims for AAA contrast; controls, large labels, and disabled explanations must clear AA at their rendered sizes.

Density follows the task. Collection cards show garment, category, colour, and server price without visual noise. Product pages spend space on the garment and size chart. Cart and checkout compress vertical distance between line items, total, and the primary action so the decision remains visible on a phone. A four or eight pixel rhythm governs spacing; no ornamental gap delays the next decision.

Photography must show the real garment clearly, with a stable crop, neutral background, consistent lighting and scale across eight products. Fabric and construction details matter more than lifestyle scenes. We will use only locally served, versioned, commercially licensed photographs with documented provenance. An identifiable person requires a documented model release. Every media box reserves its final ratio and size before loading. The collection will keep its current authored illustrations until all eight photographs form a coherent set; a partial replacement would misrepresent the products and break the visual system.

The brand refuses glow, glass, gradients, fashion countdowns, artificial scarcity, stock claims inferred by the browser, decorative motion, and imagery that claims to depict these fictional garments exactly. Interaction motion exists only to confirm an action or reveal a layer; it never delays input. The interface treats a Stripe redirect as pending until the server confirms payment.

## Component state matrix

| Component | Loading / slow | Empty / edge | Error / retry | Success | Disabled / in flight |
| --- | --- | --- | --- | --- | --- |
| Product card | Fixed 4:5 media and exact text-line skeleton | No card for absent result; collection empty state offers clear search | Catalog failure gives human message, retry and request ID | Navigates to detail | Link has visible focus and 44px target |
| Search, filter, sort, pagination | Toolbar geometry stays reserved while results load; slow state announced | No matches show query and clear action; unavailable facets explained | Failed read retains query, retry and request ID | URL reflects current selection | Submit prevents duplicate navigation; controls remain 44px |
| Size selector | Product detail skeleton reserves selector | No sizes or unavailable size is explained and disabled | Add failure preserves selection and request ID | Selection announced in a live region | Keyboard reach, visible focus, 44px options |
| Quantity stepper | Reserved control geometry | Limits 1–10; boundary action disabled with explanation | Mutation rolls back and reports request ID | Server cart quantity replaces pending value | Only affected line pending; other page controls usable |
| Add to cart | Inline pending label and immediate pending cart affordance | No size/invalid quantity blocks action with reason | Pending item rolls back; human message and request ID; sign-in route for 401 | Quiet confirmation and cart route | Button locks during request; pending status announced |
| Cart line | Fixed thumbnail and line geometry | Removed line disappears; empty cart offers collection action | Rollback and request ID; retry available | Updated server line and total shown | Per-line pending state; 1–10 bound |
| Cart summary / checkout | Reserved summary and status text; slow request explains wait | Empty cart cannot checkout and points to collection | Reservation or checkout failure gives request ID; no automatic billable retry | Provider handoff begins only after validated server response | One checkout request at a time; total remains server-derived |
| Order status | Reserved status panel and lines; slow poll retains last known status | Missing order gives safe explanation and cart route | Poll or reconciliation failure shows request ID and manual retry | Paid only after server confirmation | Reconcile button announces pending; polling never blocks page |
| Account form | Fixed form geometry and pending action text | Required values explain validation | Generic credential failure, request ID, retry | Route moves to cart after server session | No double submit; mode switch and fields stay keyboard reachable |
| Navigation / footer | Stable shell across route transitions | Current route uses aria-current; unavailable page offers collection | Route error offers retry and request ID when transport supplied one | Focus and hover feedback are immediate | Every link has a 44px target; no disabled dead links |
| Buttons and notices | Label stays present with inline pending state | Inapplicable action is disabled with adjacent reason | Human message, next action, support request ID | Brief live confirmation without modal | 44px target, focus ring, no layout-changing animation |

## Asset provenance

No photograph has shipped yet. The first candidate was accepted for evaluation on 2026-09-29, downloaded into temporary storage, and rejected on visual review. It shows a visible Levi's label and a tight detail crop, while the seeded product is a fictional cropped jacket with patch pockets. Using it as that product's catalog image could suggest a brand association and would obscure garment shape. The temporary candidate was never added to the application.

| Candidate | Source | Author | Licence | Licence URL | Retrieved | Model / property release | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cropped denim jacket | https://www.pexels.com/photo/hanging-denim-jacket-in-close-up-photography-11096066/ | Mikael Monjour | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No identifiable person; property release not documented; visible label | Rejected: visible brand and incompatible crop |

Searches for the seeded olive overshirt, rust tee, navy polo, and coral camp shirt returned a mixture of portraits requiring model-release evidence, folded cardigans, close fabric crops, and product shots with unrelated backgrounds. Those results do not establish a coherent eight-image set. No asset paths or seed references were changed.

## Measurement protocol

Measure the production build at 320, 375, 390, 414, 768, 1024, 1280, 1440, and 1920 CSS pixels. Record each route's horizontal overflow and clipping. Use mobile emulation on a mid-range Android profile with 4G conditions, then desktop; record exact Lighthouse preset, command, run count, median, LCP, CLS and INP if measurable. A single run cannot establish a stable 99+ target. Check keyboard order, focus, screen-reader announcements, reduced motion, long names and emails, maximum quantity, and failed requests manually. Mark unobserved criteria pending, not passed.
