# Roadmap

## Larger carousel detail card and MacBook image (Nov 14 2026)
- Done: restore the small photo card for products without additional gallery photos, using their existing Tigris photo.
- Done: small card and photo dialog verified on desktop/phone; five regression tests pass. MacBook photo loads with HTTP 200 from https://correctbuyecommerce.t3.tigrisfiles.io/catalog/laptop-silver.jpg; /p/macbook-air-m2 is the product page link, not the image address.

## Local logos and Tigris-only photos (Nov 14 2026)
- Done: full logo and icon use local project files; favicon already uses a local file.
- Done: home (55 images), shop, product and cart photos loaded from Tigris public addresses; logos stayed local. Phone homepage also passed, with no broken images or page errors. Nine image-source/storage tests pass.

## Admin account and featured stack (Nov 13 2026)
- Done: requested owner account is confirmed and has admin access; sign-in through the admin page succeeded.
- Done: rear cards now peek beneath the featured carousel; desktop/phone transitions preserve height and never widen the page.
- Done: signed-in admin photo upload displayed correctly and matched the original in Tigris byte-for-byte; temporary upload removed without saving a test product. Nine targeted tests pass and build is clean.

## Tigris photo migration (Nov 13 2026)
- Done: copied all 26 original photos into Tigris bucket 1; authenticated and public read-back matched every original byte-for-byte.
- Done: removed original-photo fallback delivery so store photos resolve to Tigris.
- Done: all 55 homepage photos load through Tigris with no broken images or page errors; 11 storage/store regression tests pass.
- Done (Nov 13): owner admin sign-in and a real photo upload now verified, including byte-for-byte Tigris read-back.

## Tigris switch (Nov 11 2026)
- Done: saved both Tigris accounts as server-only settings without unsafe VITE_ credentials.
- Done: uploads use Tigris with shared quota-only forward rotation and private return photos.
- Done: 50 products use image_refs; removed Cloudflare display addresses and kept original asset backups visible.
- Done (Nov 13): corrected access now works; all 26 photos copied and verified through authenticated and public reads.
- Done: all 74 tests pass, including six bucket-rotation checks; all 55 homepage images and cart photos load, with no Cloudflare bucket requests or page errors. Private media URLs return 404. Authenticated admin upload remains unverified because the supplied Tigris credentials deny writes.

## Current request
- Done: uploaded and byte-for-byte verified 26 photos/brand images in ecommerce R2; updated 51 saved records, all 50 product photos, and storefront fallback/branding references. All 55 homepage images load from Cloudflare without broken images.
- Done: R2_PUBLIC_BASE_URL replaced through the secure settings form.
- Done: repeated store checkout to Paystack; provider verification returned HTTP 200 with matching ₦820,000 total. Blocked: payment completion is unverified because Paystack's human-verification screen stops automated testing; provider reports abandoned, not paid. All 68 tests pass.
- Done: mobile bus icon before Nationwide delivery; Blog only in footer; admin-selectable large-photo Style 3 with existing styles/default preserved. Public rendering and cart read-back checked at phone/tablet/desktop; 13 targeted tests passed.
- Blocked: Style 3 admin save/read-back verification requires the owner's registered account; large-photo rendering was checked with a simulated setting, not a saved admin change.
- Done: public blog/article pages and existing configurable sales sections; phone/desktop rendering verified.
- Done: admin creation/updates, draft/publish, preview, Quill and AI suggestions; live AI request passed.
- Done: verified-owner-only admin authorization; other registered account denied.
- Done: nine branded order email templates, HTML/plain-text rendering and tests.
- Blocked: admin save/publish end-to-end verification requires registration and confirmation of omoniyioluwaseun22@gmail.com.
- Blocked: custom auth email templates and delivery tests require the owner's email-domain setup; existing Resend sender is not connected.

## Done
- Matched hero backgrounds and arrival-link styling; preserved Style 1 and added admin-selectable reference Style 2; added per-page default section arrangements and restored homepage product rows when collections are unconfigured. Public desktop/phone/tablet rendering, quick add, and 55 tests passed.
- Moved project here: database, sign-in (email + Google), starter catalog, product photos.
- WhatsApp chat button bottom-right; skeleton loaders everywhere; admin Homepage layout (reorder/hide sections); fuller public pages; one-line clickable brands; slimmer search bar; product page trust badges + Add to cart / Buy now.
- Restored visible hooks above product titles; widened second-carousel photos on phone/tablet; contained tablet animation overflow and removed compact-header entrance movement. Verified stable carousel heights at 320–1280px, public browsing pages at phone/tablet widths, and 15 shopping tests.
- Removed main-row Help while keeping third-row help; restored the previous bag-style cart navigation.
- Jumia-inspired store navigation with prominent search, account/help dropdowns, category links and mobile menu; search results, sign-in window, cart links and narrow widths verified; 13 search/cart tests passed.
- Design-only CorrectBuy storefront (home, shop, product, cart)
- Clean white + red palette
- Heading font swapped to bold Archivo, body Hind
- Hero carousel: auto-advancing, product photo + "Worn by you" collage, modal with add to bag
- Drag a product onto the bag icon in the nav bar to add it to the cart
- Site search: live suggestions in the header, results at /shop?q=, popular searches, keyboard nav
- Home "Find what's yours": search box you can drop a product into; no match hands the ask to a person (sourcing request form)
- Admin category and custom collection editing, explicit product selection, public-page updates, and phone/desktop editor checks.
- Connected category and curated collection directory/detail pages linked from navigation and home sections.
- Verified collection browsing and saved admin changes in the preview; collection and store tests passed.
- Product brands verified publicly; admin state/city activation, inherited/custom delivery amounts, public selectors, and checkout payment totals verified. All 34 tests passed.
- Featured-product stack: four live products and one promotional card, no indicators; Swiper EffectCreative deck transition (card behind fully visible, front card tosses left), fast flick and slow drag both advance; verified on desktop/phone.
- Featured-stack look tuned per user: next card directly behind (translate 0/0/-100, scale 0.94, opacity 1, shadow), front card exits left with flat -18° tilt.

- Imported into this project with its own database; admin "Homepage hero" page controls both hero carousels (on/off, autoslide, timing, counts, chosen products and promotions) with live preview.
- Desktop hero made shorter (featured card and carousel both 447px, down from 681px) by compacting the featured card; on phone the carousel's price and buttons now sit below the product photo; the stacked cards no longer smear across the page before the page finishes loading. Verified on desktop and phone.

- Hero raised a little on desktop; phone and tablet photo and price sizes restored to full width.
- Product tags: admin creates tags, attaches them to products, and picks a colour per tag (UK used red, New green, Fairly used amber); tags show on product cards.
- Brand shows as a coloured chip on product cards and on the product page.
- 30 products added across laptops, phones and accessories, each with a brand and a tag.
- Public pages open a sign-in window from the user icon instead of jumping away; Google sign-in switched on.
- Home collections and product sections restored, plus Brand new / Fairly used / UK used rows.
- Tag colour picker verified as admin: picking a colour persists and changes the chip in the store.
- Hero headline in the main carousel made small and neat in its own font (Bricolage Grotesque via --font-hero), still bigger than the product name; both hero carousels raised again (desktop featured 583px, carousel 559px). Verified on desktop and phone.
- Main carousel type swapped: product name is now the big line in Bricolage Grotesque, the hook line is small bold Archivo; every slide's category label (Bags, Wearables, promotion label) sits flush at the card's top-left corner. Verified on desktop, phone, and the admin live preview.

## Open
- Verify admin appearance/layout saves and public read-back: owner must register and confirm the specified admin email.
- Try saving from the admin "Homepage hero" page and confirm the homepage picks the changes up.
- Check and improve every storefront, account, checkout, and admin page at phone, tablet, and desktop widths.

## Launch checklist (Nov 2026)
- Done: project moved into this workspace with its own database; logo in header and browser tab.
- Done: Paystack test keys wired (secret stored securely; public key in src/lib/paystack.ts).
- Done: order emails via Resend from info@correctbuy.ng (confirmation, shipping/status updates, supplier orders, new-order alerts to info@correctbuy.ng).
- Done: every-10-minute job releases stock from unpaid orders and sends queued emails (needs the app published).
- Done: admin dashboard "Refund needed" list; refunds handled manually in the Paystack dashboard.
- Open (owner): set up email sending; switch to live Paystack keys and set webhook to https://<domain>/api/public/webhooks/paystack; replace demo products/images, suppliers, coupons, delivery fees; write policies in admin; connect domain; register and confirm the specified owner email for admin access; final phone/desktop check.

## Open
- Import real products, orders and customers from the old store (needs export).
- Reconnect Paystack key and Resend email.

## New request (Nov 10 2026)
- Done: project imported from zip; .env values saved as secure settings.
- Done: connected to the owner's Supabase; full store database set up there.
- Done: admin Database page with live copy-ready SQL.
- Done: uploads use ecommerce R2; public photo access and upload/read-back verified with the updated public address.
- Done: 50 products / 60 variants / 10 categories / 3 collections with photos.
- Done: Paystack (guest checkout reaches Paystack page) and Resend (domain verified, live test email sent); 68 tests pass.
- Done: sender address updated in settings.
