---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Storefront (public store: home, catalogue, product, cart, checkout, account, auth)

## Scope and mode
Whole public storefront under src/app/(store) and its components. Home is Persuade; catalogue, product, cart, checkout and account are Operate surfaces that inherit the same world in quieter form. The admin panel is out of scope and keeps its own look.

## Audience, job, action, proof
- Supporters (find their club fast, trust the purchase) and collectors / style buyers (retro, national teams, exclusivity), weighted equally. Mostly mobile.
- Primary action: find a shirt (team, collection, search) and add it to the cart; the hero exposes it in working form (real shirts that open their product page, plus the team search).
- Proof: the real photographed catalogue (649 photos, 3:4, models wearing the shirts), real prices, real size availability. No reviews, sales counts or discounts exist; none may be invented.
- Constraints: logo preserved; black/graphite ground, logo blue (#054ECC) accent, white titles, grey secondary text (owner-pinned); demo states (shipping, coupons, payment, e-mail, customer accounts) stay honestly labelled; all labels, routes and flows keep working.

## Chosen direction: Vestiário (seed 7226c043, assigned candidate 7)
Memorable moment: the kit-room lights switching on one by one over a row of lockers, each holding a real shirt.

Raised lines (donated discipline, never clothes):
- From Parede de caixas (competitive alternate): every locker is ruled by the same label grid: plate (team and season), name, price, size run with unavailable sizes dimmed. No ad-hoc badges.
- From Néon de Tóquio (declined): blue is reserved for the single live element in view (active nav item, primary action, selected size, the lit locker); everything else stays dormant graphite and white.
- From Espécime tipográfico (declined): no ornament. No glows, no glass chips over photos, no gradient blobs; hierarchy by type-scale contrast alone.
- From Atlas estelar (declined): one fixed type ramp carries hierarchy; labels are rationed (at most one eyebrow per three sections).
- From Sol interno (declined): each section sits on one horizontal axis, the shelf line, a 1px rule the content aligns to.
- From Câmara escura (declined): checkout and the order timeline read as fixed stations in order, with the irreversible point (Finalizar pedido) clearly marked.

Unresolved: real payment, shipping and e-mail providers (out of scope); brand Instagram could not be viewed.

## Direction contract
THESIS: The store is the team's kit room before the match: every shirt waits in its own numbered steel locker under a ceiling light, and the visitor walks the row and takes one out. It refuses the category default of a centred hero over a gradient with floating product chips and a row of rounded cards.

OWN-WORLD: Graphite locker steel on a near-black floor; lockers are near-square (2px corners), separated by 1px seams, each with a stencil plate on top (team name in Big Shoulders Stencil, season or year at the right). Light is the only effect: a thin blue-white light strip on the locker's top edge that switches on for the live locker, and a soft cone of light falling onto the shirt. Titles in white Big Shoulders, body in Manrope grey, prices and size runs in tabular figures. Buttons are rectangular steel plates; the primary one is the logo blue.

STORY: The visitor understands in one look that this is a shirt store with real shirts on real people, sees prices and sizes without hunting, believes it is a real brand with care in the details, and takes one shirt out: opens the product, picks a size, adds it to the bag, checks out through clear stations.

FIRST VIEWPORT: Desktop: the left 40% holds the stencil headline (two lines, about 9-11vw cap scale clamped), one sober line of subcopy and the primary action "Ver camisas" with the team search beside it; the right 60% is a row of four tall lockers (3:4 photos of real shirts from the hero showcase) sitting on the shelf line, plates on top, prices below, each a link to its product. The header floats transparent over it and turns solid graphite after the first scroll. Mobile: headline and actions first, then a horizontally scroll-snapped row of lockers at 70% width each, the next one peeking.

FORM: Vestiário, position 7 of the ordered grounded list (1 nome e número, 2 álbum de figurinhas, 3 linhas do campo, 4 mosaico da torcida, 5 programa do jogo, 6 placar, 7 vestiário); seed key 7226c043.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
