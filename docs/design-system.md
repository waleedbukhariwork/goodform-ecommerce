# Goodform design system

## Art direction — atelier fitting room

Goodform speaks like a careful fitter: direct, warm, and exact about what is known. Garment names and measurements lead; decorative claims do not. Short service messages say what happened, what the shopper can do next, and a support request ID when a request fails. Demonstration garments, prices, and measurements remain plainly labelled as fictional.

The palette takes its cues from uncoated paper, charcoal pencil, undyed cloth, and a restrained rust accent. Light is the primary surface. Dark mode uses its own warm dark surfaces and controlled contrast, not inverted photographs. Colour never carries status alone. Body copy aims for AAA contrast; controls, large labels, and disabled explanations must clear AA at their rendered sizes.

The interface treats garments as objects on a bench, not as a magazine page. Navigation is a machined key tray: a row on a wide screen, a fixed bottom dock on a narrow one. The header stays at the top of the viewport while the page scrolls. The browser tab shows the same circular g mark as the brand. Product cards and the garment photograph carry a contact shadow and a small perspective tilt. That tilt is removed when the visitor prefers reduced motion, and the product photograph stays flat below 768px so it cannot spill sideways. Checkout, forms, and tables stay flat so the decision stays readable. The system still refuses glass, mesh gradients, glow, countdowns, and any motion that delays a tap.

Density follows the task. Collection cards show garment, category, colour, and server price without visual noise. Product pages spend space on the garment and size chart. Cart and checkout compress vertical distance between line items, total, and the primary action so the decision remains visible on a phone. A four or eight pixel rhythm governs spacing; no ornamental gap delays the next decision.

Photography must show the real garment clearly, with a stable crop, neutral background, consistent lighting and scale across eight products. Fabric and construction details matter more than lifestyle scenes. We will use only locally served, versioned, commercially licensed photographs with documented provenance. An identifiable person requires a documented model release. Every media box reserves its final ratio and size before loading. The user authorized temporary reference photographs for this demonstration. Their cut and colour differences are stated beside the product and in the asset table; they must be replaced before presenting the catalog as exact merchandise photography.

The brand refuses glow, glass, gradients, fashion countdowns, artificial scarcity, stock claims inferred by the browser, decorative motion, and imagery that claims to depict these fictional garments exactly. Interaction motion exists only to confirm an action or reveal a layer; it never delays input. The interface treats a Stripe redirect as pending until the server confirms payment.

## Component state matrix

| Component | Loading / slow | Empty / edge | Error / retry | Success | Disabled / in flight |
| --- | --- | --- | --- | --- | --- |
| Product card | Fixed 4:5 media and exact text-line skeleton | No card for absent result; collection empty state offers clear search | Catalog failure gives human message, retry and request ID | Navigates to detail | Link has visible focus and 44px target |
| Search, filter, sort | Toolbar geometry stays reserved while results load | No matches show query and clear action; unavailable facets explained | Failed read retains query, retry and request ID | URL reflects current selection | Controls remain 44px; browser form navigation |
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

These are temporary reference photographs for fictional demonstration garments. They do not verify the garments' exact cut, colour, measurements, or brand. The user authorized a best-suited temporary set after a fully coherent set proved difficult to source. The shared 4:5 crop and restrained display treatment provide consistency, but lighting and scale still vary; this remains a known visual limitation. All files are served locally from versioned paths. Every selected page links to the Pexels License, which permits commercial website use; no identifiable face is shown. Pexels prohibits implying endorsement by depicted brands or people, so the UI labels the photography as reference only.

| Garment | Source | Author | Licence | Licence URL | Retrieved | Model / property release status | Accuracy note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Canvas Overshirt | https://www.pexels.com/photo/person-holding-green-dress-shirt-9594952/ | Ron Lach | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | Hand only; identity not shown; property release not documented | Olive shirt reference, not an overshirt |
| Ribbed Knit Top | https://www.pexels.com/photo/close-up-of-a-light-beige-sweater-lying-on-white-fabric-10296683/ | Aljona Ovtšinnikova | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person visible; property release not documented | Knit detail; garment shape not shown |
| Linen Button Shirt | https://www.pexels.com/photo/shirt-on-hanger-on-branch-22441297/ | dayong tien | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person visible; property release not documented | Natural linen shirt reference; colour differs |
| Boxy Cotton Tee | https://www.pexels.com/photo/t-shirt-hanging-on-branch-18186107/ | dayong tien | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person shown; property release not documented | Grey V-neck reference differs from the rust crew-neck product; temporary visual reference only |
| Studio Polo | https://www.pexels.com/photo/dark-blue-shirt-on-hanger-22441317/ | dayong tien | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person visible; property release not documented | Unbranded dark blue short-sleeve shirt; polo collar not shown |
| Fleece Sweatshirt | https://www.pexels.com/photo/a-hanged-sweatshirt-9594694/ | Ron Lach | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person visible; property release not documented | Sage sweatshirt reference, not heather |
| Cropped Denim Jacket | https://www.pexels.com/photo/denim-jacket-with-pockets-16428589/ | James Frid | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person visible; property release not documented | Studio denim jacket; cropped cut not established |
| Woven Camp Shirt | https://www.pexels.com/photo/light-coral-shirt-with-pocket-in-close-up-photography-6843235/ | Antoni Shkraba | Pexels License | https://www.pexels.com/license/ | 2026-09-29 | No person visible; property release not documented | Coral shirt detail; camp collar not established |

The first denim candidate, https://www.pexels.com/photo/hanging-denim-jacket-in-close-up-photography-11096066/ by Mikael Monjour, was rejected because a prominent Levi's label and a tight crop could suggest an unrelated brand. It was not added to the application.

## Measurement protocol

Measure the production build at 320, 375, 390, 414, 768, 1024, 1280, 1440, and 1920 CSS pixels. Record each route's horizontal overflow and clipping. Use mobile emulation on a mid-range Android profile with 4G conditions, then desktop; record exact Lighthouse preset, command, run count, median, LCP, CLS and INP if measurable. A single run cannot establish a stable 99+ target. Check keyboard order, focus, screen-reader announcements, reduced motion, long names and emails, maximum quantity, and failed requests manually. Mark unobserved criteria pending, not passed.
