<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- Blog uses sanitized HTML, browser-only Quill, shared article previews and PageExtras; this keeps rich content safe and consistent.
- Admin role helpers require the verified owner, never first signup; this prevents unintended access.
- Blog AI streams through request-scoped server SDK helpers; denied access is persisted to prevent replay.
- Store navigation uses the shared SearchBox with an optional prominent submit control and accessible design-system dropdowns; preserve URL search and drag-to-cart when updating its layout.
- The homepage split hero (HeroSection) is driven by the hero_carousels/hero_promotions tables via resolveHeroSlides in src/lib/hero.ts; the storefront and the admin preview render the same components so the preview matches the store. On desktop the main carousel is absolutely filled into the row so the featured stack alone sets the hero height, and the featured card's desktop layout (short photo, two-line summary, buttons side by side) is what keeps that height compact.
- The featured-product carousel uses Swiper EffectCreative in a fixed footprint: the outgoing card tosses left (flat Z tilt), the next card is pushed back in Z, scaled down and offset downward so its lower edge stays visible; the first card alone sets layout height so transitions never resize the hero. Keep cards clipped until Swiper reports itself initialized (`src/styles.css`), otherwise the plain row smears neighbouring cards across the page.
- Featured-carousel animation bleed expands only at the desktop breakpoint; phone/tablet gutters contain it so transitions cannot widen the document.
- In the main hero carousel the price and the shop/basket buttons are their own block: on phone they sit below the product photo, on desktop below the headline copy, so the shopper sees the product before the ask.
- In the main hero carousel the product name is the biggest line and carries the `--font-hero` token (src/styles.css, loaded through the fonts <link> in src/routes/__root.tsx); the hook line above it takes the product-title treatment (`font-display`, bold, `text-lg`). Each slide's category label is the first line of the text column — a small uppercase label in the flow, its left edge flush with the hook line and product name, with the card's own padding above it — never a badge pinned to the card's corner.
- Delivery locations use shipping_zones as states and shipping_cities as their children; public reads filter both active flags, nullable city fees inherit state fees, and quote_cart_city plus an order-insert trigger enforce the same rules for payment totals.

- Categories and custom collections are database-managed; the shared catalog includes published collections with explicit product UUID membership, while category membership uses products.category_id. Admin group saves use an atomic staff-checked RPC so storefront sections and detail pages share authoritative selections, prices, and stock.
- Multi-column admin tables keep a readable minimum width inside a keyboard-focusable horizontal scroll region; page layouts use minmax(0,1fr) tracks to contain narrow-screen content.

- Search state lives in the URL (`/shop?q=&cat=`) so a search is shareable and back/forward work; the
  one matcher in `src/lib/search.ts` (name > category > description, every word must match) is the
  single source of truth for the header box, the home finder and the shop grid.
- A search that finds nothing hands the shopper to a person: the ask is stored in the
  `sourcing_requests` table through the generated browser client, behind an insert-only policy, so a
  public request needs no server secret and visitors cannot read other people's requests.
- Interaction hints that assume a mouse (dragging) are shown only where dragging is possible, via the
  `.can-drag` / `.no-drag` classes in `src/styles.css`, so phone visitors are never told to do
  something their device can't do.
- Product tag colours are data, not code: `tags.color` holds a hex chosen in admin, rendered through
  `chipStyle`/`tagColor` in `src/lib/badge.ts`, which derives the chip's text colour from the chip
  colour so a pale chip never gets pale text. The brand chip on product cards uses the `--brand-badge`
  theme token instead, so it follows the theme rather than the database.
- Outgoing email: the database queues rows in notification_logs on every order change; src/lib/email.server.ts drains QUEUED email rows by calling the Resend API directly with RESEND_API_KEY (sender from RESEND_FROM_EMAIL), right after payment confirmation and from the /api/public/jobs/tick schedule (which also runs expire_stale_orders), so emails never block checkout.
- Homepage section order/visibility is data: `store_settings.home_sections` (list of {id, visible}) resolved by `resolveHomeSections` in src/lib/home-sections.ts and edited at /admin/layout; new sections must be added to HOME_SECTIONS so they append visibly by default.
- Loading states use the shared placeholders in src/components/Skeletons.tsx (also the router's defaultPendingComponent) instead of spinners, so every page loads the same way.
- Public content pages end with the shared PageExtras blocks (src/components/PageExtras.tsx) so no page looks unfinished; the floating WhatsApp button reads the number from store_settings.support_phone.
- ProductCard keeps independent render branches for each style; StoreAppearance reads persisted store_settings.product_card_style through React context, so adding styles preserves existing cards and all public cards switch together without server-global state.
- Public sales/content page tails use PageExtras and resolvePublicSections with per-page store_settings.public_sections; normalization restores missing known sections while retaining explicit visibility and order. Admin appearance/layout saves all settings atomically through existing admin-only RLS.
- Both hero carousels use the shared hero-surface token to prevent background styling drift between the store and admin preview.
- homeProductRows supplies catalog defaults only for absent homepage collections, preserving explicit saved membership even when empty.
- Uploads use server-only credentials and StorageRouter; quota-only forward rotation persists in storage_state. Product image_refs store key/storage; storage.urlFor resolves media. Returns stay private.
- The admin Database page reads SQL generated live by the admin-only public.export_schema_sql() database function, so the copyable schema always matches the current database without a hand-maintained file.
- The database lives in the owner's own Supabase project; the drizzle/migrations folder is historical, and schema changes go through Supabase migrations.
