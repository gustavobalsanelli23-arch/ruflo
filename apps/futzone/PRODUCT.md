# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences weighted equally (confirmed by the owner):

- **The supporter**: arrives looking for the shirt of their own club or national team, wants to find it fast and trust the purchase.
- **The collector / style buyer**: buys retro, national-team and less common shirts to wear as streetwear; values exclusivity and the culture around the shirt.

Most traffic is mobile (the owner shares the store link to be opened on a phone "as if buying").

## Product Purpose

FutZone is an online store for football shirts: clubs (Brazilian and European), national teams, retro classics, kits (shirt + shorts), women's and kids' shirts. Success is a visitor finding the shirt they want, choosing a size and checking out with confidence.

## Positioning

A curated football-shirt shop with its own brand (FutZone) rather than a marketplace: one catalogue photographed consistently on models, organised by team and collection, for people who treat the shirt as both fandom and style.

## Operating Context

- Catalogue: 217 products across 51 teams, 7 collections (Brasileirão, Europeus, Seleções, Retrô, Kits, Femininas, Infantis), categories clubes/retro/kits/selecoes/femininas.
- Customers browse by team, collection, search, then product page (size, stock, quantity), cart, 5-step checkout (identification or guest, address with CEP, shipping, review with coupon, payment step).
- Customer account: orders with timeline and tracking, addresses, favourites, notifications, profile, security.
- A private admin panel exists for the two store administrators; it is never linked from the public store.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, lucide-react icons. Deployed on Vercel.
- Real today: catalogue browsing, search, filters, cart with stock validation, favourites, recently viewed, checkout flow, server-side admin authentication (2 admins, env-configured).
- Demo / not yet integrated (must stay labelled honestly in the UI): customer accounts live in the browser (demo provider, password hashed), shipping prices are simulated, CEP lookup is partial, coupons are demo, no payment gateway is chosen (no charge happens), no transactional e-mail is sent, tracking has no carrier API.
- Undecided: payment provider, real shipping provider, database.

## Brand Commitments

- Name and logo: FutZone wordmark (public/brand/logo-full.png, public/brand/logo-wordmark.png). Must be preserved, not redrawn.
- Brand blue from the logo: #054ECC.
- Owner's binding direction for the visual layer: deep black and graphite base, logo blue as the accent, white for titles and key information, grey for secondary text; gradients only when they earn it. Inspired by football culture, sportswear and premium streetwear; must not look like a template or "AI-generated".
- Voice (confirmed): mixed. Headlines carry stadium energy, short and direct; the rest of the site is sober and functional. No generic advertising phrases.
- Brand Instagram: @futzone11_oficial (not publicly readable from this environment; nothing was copied from it).

## Evidence on Hand

- Real product photography: 649 JPEGs, 720x960 (3:4), models wearing the shirts, in public/produtos/<team>/<slug>/1..n.jpg.
- No testimonials, reviews, ratings, sales numbers, press or customer counts exist. Never invent them. Stock levels and prices come only from the catalogue data.

## Product Principles

1. The shirt is the hero: real photos lead, chrome stays out of their way.
2. Find it fast: team, collection and search are always one step away, especially on mobile.
3. Honest commerce: never present simulated shipping, coupons, payment or e-mail as real; never fake urgency, reviews or discounts.
4. Fandom and style in one place: speak to the supporter and the collector without choosing between them.

## Accessibility & Inclusion

WCAG AA contrast on the dark theme, keyboard navigation and visible focus everywhere, prefers-reduced-motion respected, comfortable touch targets on mobile, Portuguese (pt-BR) copy.
