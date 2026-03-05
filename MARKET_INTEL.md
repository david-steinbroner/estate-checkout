# MARKET INTEL — Estate Checkout

**Last updated:** 2026-03-03
**Purpose:** Living document for competitive research, market data, positioning, and go-to-market intelligence. Feeds directly into product design, release strategy, marketing, and expansion planning. Update this as we learn from discovery conversations, field tests, and market research.

---

## 1. Market Overview

### Estate Sale Industry (US)

The estate sale industry is large, fragmented, and professionalizing — but technologically stuck in the 1990s.

**Key stats (from EstateSales.NET industry surveys, 2020–2023):**
- Average company conducts ~30 sales per year
- Average of 5 staff members per sale
- Typical sale generates $10K–$20K in revenue (70% of all sales)
- Average commission rate: 35–40%
- 60% of operators say estate sales are their primary income (up from 49% in 2021)
- 74% conduct estate sales exclusively; 20% do both auctions and estate sales
- 82% accept credit cards (mostly through Square)
- Average company has been operating for 15 years
- Texas leads with 12% of all US operators; California 7%; Florida 8%

**Operator demographics:**
- Average age: 58–59
- 64% female-led companies
- 90%+ have some college education
- Most sales have 1,000–2,000 items

**Checkout reality today:**
- Card table with 1–2 checkout workers, a printing calculator, and a cash box
- Items tagged with masking tape, adhesive labels, string hang tags, or perforated tear-off tags
- Prices manually entered into calculator; discounts calculated by hand
- Paper ticket or calculator tape handed to customer for payment line
- Payment typically handled by a separate worker with Square/Clover POS
- WiFi/cell signal unreliable in residential homes — operators rely on mobile hotspots

### What's Changing

- Industry shifting from side-hustle to primary profession (60% primary income)
- Growing adoption of online/hybrid sales (accelerated by COVID)
- EstateSales.NET, Facebook, and Instagram are dominant marketing channels
- More operators accepting credit cards, but checkout process itself hasn't evolved
- PROSALE launched ~2020 as first estate-sale-specific management software
- AI-powered item entry emerging (SimpleConsign)
- Aging operator demographic means tech adoption is slow and must be frictionless

---

## 2. Competitive Landscape

### Tier 1: The Real Competitor — The Adding Machine

**What it is:** A printing calculator, masking tape price tags, hand-written tickets, and mental math for discounts.

**Why operators use it:** It's free, it's familiar, it requires zero setup, and it works without internet. Every estate sale worker in America knows how to use a calculator. There's no learning curve, no subscription, and no risk of tech failure mid-sale.

**Where it fails:**
- Slow: 5–10 minutes per customer for multi-item checkouts
- Error-prone: manual discount math leads to pricing mistakes
- No data: operators have no revenue visibility until they count the cash at the end of the day
- Creates long lines: customers leave when waits exceed 15–20 minutes
- Paper tickets get lost, are illegible, or cause disputes at the payment table

**Our job:** Be faster, more accurate, and nearly as simple. If we can't beat the adding machine on speed and simplicity, nothing else matters.

---

### Tier 2: Full Estate Sale Management Platforms

These are comprehensive business tools. They solve many problems, but checkout speed isn't their primary focus.

#### PROSALE
- **What:** First purpose-built estate sale management software
- **Launched:** ~2020, showcased at National Estate Sale Conference
- **Pricing:** $29–$329/month (base management $99/mo, e-commerce tiers $129–$329/mo)
- **Features:** POS with barcode scanning, inventory management, label printing, automated discounting, suggestive pricing, loss prevention (item photos at checkout), multi-sale management, online sales, reporting, email marketing
- **Requires:** Internet (cloud-based), barcode labels on items, inventory setup
- **Integrates with:** Square for payments
- **Strengths:** Purpose-built for estate sales; automated discount schedules; professional reporting for client payouts; multi-sale management
- **Weaknesses:** Requires pre-sale inventory and barcoding (significant setup time); cloud-dependent; monthly subscription commitment; heavy for operators who just want faster checkout
- **Their positioning:** "Stop fumbling around with garage sale pricing stickers. You have a professional business!"
- **Website:** prosale.com

#### SimpleConsign
- **What:** Cloud-based POS and inventory management, originally for consignment stores, now marketing to estate sales
- **Pricing:** Plans vary; new stores get Professional Plan at $99/month for first $75K in revenue
- **Features:** POS, AI-powered item entry (snap photo → auto-populate description/pricing), inventory management, consignor portals, Shopify integration, reporting, ACH payouts
- **Requires:** Internet, ongoing subscription, training
- **Strengths:** AI item entry is genuinely innovative; deep consignor/vendor management; Shopify integration for online sales
- **Weaknesses:** Designed for permanent retail stores, not pop-up estate sales; complex for the checkout-only use case; requires internet
- **Website:** simpleconsign.com

#### Aravenda
- **What:** Cloud-based consignment/resale platform that claims estate sale support but is fundamentally an inventory and consignment management system
- **Pricing:** $289–$559/month (Basic to Pro)
- **Features:** Mobile item entry with voice descriptions, Shopify/Clover POS integration, cross-platform selling (eBay, Amazon, Instagram, etc.), consignor payouts, white-label e-commerce, sustainability tracking
- **Requires:** Internet, Shopify, significant onboarding
- **Strengths:** Fully mobile-enabled; voice item entry; multi-channel e-commerce; enterprise-grade feature set
- **Weaknesses:** Expensive; designed for multi-channel resale businesses, not on-site checkout; still in active development (some features were beta as of 2022)
- **Website:** aravenda.com

**Deeper findings (from website analysis, March 2026):**

Aravenda's website and marketing materials reveal that estate sales are not a real focus area for the platform. Their FAQ page is 100% consignment/inventory content — questions about consignor payouts, inventory management, multi-channel selling — with zero mention of estate sale checkout, on-site speed, or the two-person workflow. Their "Best Consignment Software" comparison page positions them against consignment competitors, not estate sale tools.

Their demo videos (linked from YouTube) only show desktop interfaces — no mobile checkout flows visible. This is significant because estate sale checkout happens on phones, standing in houses.

Leadership is old enterprise tech: President/Board Chair Carolyn Thompson has a background in AOL, Deloitte advisory, Georgetown MBA, private equity. The team skews corporate/enterprise rather than scrappy or field-tested. This suggests the product is built for enterprise consignment operations, not for a solo estate sale operator standing in a house with a phone.

The free trial signup on their website was broken during our review (page didn't render properly, duplicated content across pages). This is a minor signal but suggests the estate sale onboarding path isn't well-maintained.

**Key competitive insight:** Aravenda confirms our thesis that there's a massive gap between "the adding machine" and "a full management platform." They serve the consignment/resale ecosystem well but have no answer for the core estate sale checkout problem: a worker needs to add up items fast, apply discounts, and hand off a total. Aravenda's voice entry feature is the closest analog to our speech input, but it's designed for cataloging inventory (detailed item descriptions for resale), not for speed-entering prices at a checkout table.

**Estate sale fit assessment:** Low. An estate sale operator running 2 sales/month with 3-5 workers would be paying $289+/month for a consignment management platform when all they need is a faster checkout. The setup burden (Shopify integration, inventory loading, consignor account configuration) is the exact complexity that drives operators back to the adding machine.

**Summary of Tier 2:** These platforms are for operators who want to professionalize and digitize their entire operation — inventory, POS, online sales, client reporting, the whole stack. They don't target the checkout speed problem specifically. An operator using PROSALE still needs to pre-barcode items and maintain inventory to get value from the system. That's a fundamentally different commitment level than "replace the adding machine."

---

### Tier 3: General POS Systems

#### Square
- **What:** The dominant mobile POS for small businesses, widely adopted at estate sales
- **Pricing:** Free for basic POS; percentage-based transaction fees
- **Features:** Manual item entry, barcode scanning, offline mode, split tenders, digital receipts, reporting
- **Strengths:** Free, trusted, familiar to many operators, accepts all payment types, integrated with EstateSales.NET
- **Weaknesses:** Doesn't understand estate sale day-based discounting; no two-person checkout/payment handoff; still requires manual total entry — operators use the adding machine FIRST, then enter the total into Square

#### Shopify POS / Lightspeed
- **What:** Retail POS systems with more features than Square
- **Pricing:** Monthly subscription + transaction fees
- **Features:** Inventory management, custom tax settings, staff logins, detailed reporting
- **Strengths:** More powerful than Square; supports custom item entry
- **Weaknesses:** Monthly cost; designed for permanent retail, not pop-up sales; doesn't solve the checkout speed problem

**Summary of Tier 3:** General POS systems sit at the PAYMENT step — they process the transaction after the total has been calculated. Estate Checkout sits at the CHECKOUT step — it replaces the adding machine that calculates the total in the first place. These are complementary, not competitive. In the two-person workflow, our QR code hands off the total to the payment worker, who then enters it into Square. We don't replace Square; we sit in front of it.

---

### Tier 4: Adjacent / Niche Apps

#### StickerPrice
- **What:** Mobile POS app using pre-priced QR code stickers
- **Pricing:** Free app; revenue from selling proprietary QR sticker sheets
- **Features:** Scan QR sticker at checkout → app tallies total; sale-wide discount percentage; multi-seller support via different sticker symbols; payment processing
- **Strengths:** Eliminates manual addition; interesting QR-based model; on iOS and Android app stores; has some traction and positive reviews
- **Weaknesses:** Requires pre-stickering every item with proprietary QR labels (significant pre-sale work); QR stickers are tiny and hard to scan (user complaints); doesn't integrate with POS; no automated day-based discounts; sales total doesn't transfer to Venmo/payment apps automatically; "a glorified QR code calculator" per some reviewers
- **Their insight worth noting:** They observed that buyers negotiate prices on masking-tape-tagged items but NOT on sticker-priced items — suggesting that professional-looking price presentation reduces haggling
- **Website:** stickerpriceapp.com

#### Garage Sale Checkout (Amazon Appstore)
- **What:** Very basic calculator app with customizable quick-keys and multi-seller tracking
- **Features:** 8 quick-keys for common prices, tracks up to 5 sellers, calculates change
- **Strengths:** Simple
- **Weaknesses:** Essentially a slightly better calculator; minimal features; no discount automation; no data/reporting; minimal adoption
- **Relevance:** Shows there IS demand for something better than a calculator, even if this product barely improves on it

---

### Tier 5: The Platform (EstateSales.NET)

Not a competitor but a critical ecosystem player.
- **What:** The dominant estate sale listing and discovery platform in the US
- **Used by:** 82–85% of estate sale companies for marketing
- **Features:** Sale listings with photos, shopper notifications, company profiles
- **Integrations:** Square for payments; conducts annual industry surveys
- **Hosts:** National Estate Sale Conference
- **Relevance to us:** Potential distribution channel, partnership opportunity, or integration point. If we could get featured or listed on EstateSales.NET, we'd have instant visibility to the entire operator market. Also a valuable source of industry data via their annual surveys.

---

## 3. Positioning & Differentiation

### Where We Sit

```
THE CHECKOUT WORKFLOW AT AN ESTATE SALE:

[Items priced with tags] → [CHECKOUT: Add up items, apply discount] → [PAYMENT: Charge customer]
                                     ↑                                       ↑
                              WE REPLACE THIS                    Square/Clover lives here
                              (adding machine)                   (not our competitor)
```

**Nobody else occupies this position.** The management platforms (PROSALE, SimpleConsign, Aravenda) try to own the entire workflow from inventory to payment. General POS (Square) owns the payment step. We own the checkout step — the one that creates the bottleneck.

### Our Differentiation

| | Estate Checkout | PROSALE | Square | StickerPrice | Adding Machine |
|---|---|---|---|---|---|
| **Solves checkout speed** | ✅ Primary focus | Secondary | ❌ | Partially | ❌ |
| **Auto day-based discounts** | ✅ | ✅ | ❌ | Partial (sale-wide only) | ❌ |
| **Works offline** | ✅ | ❌ (cloud) | Partial | ✅ | ✅ |
| **Setup time** | < 2 min | Hours (inventory) | Minutes | Hours (stickering) | 0 |
| **Pre-sale item prep** | None | Barcode everything | None | Sticker everything | Tag items |
| **Cost** | Free | $99+/mo | Free (+ fees) | Free (+ stickers) | $15 one-time |
| **Learning curve** | Minutes | Days | Minutes | Minutes | None |
| **Two-person handoff** | ✅ QR code | ✅ | ❌ | ❌ | Paper ticket |
| **Revenue dashboard** | ✅ Basic | ✅ Advanced | ✅ | Basic | ❌ |
| **Voice input** | ✅ | ❌ | ❌ | ❌ | ❌ |

### One-Line Positioning

**"The fastest way to check out customers at an estate sale. Free. Works offline. No setup."**

---

## 4. Target Segments

### Segment 1: Estate Sale Operators (v0.1 — NOW)

**Who:** Professional estate sale companies in Austin, TX
**Size:** ~100+ operators in Austin metro; ~750+ in Texas; thousands nationally
**Pain:** Checkout bottleneck, manual discount math, no revenue visibility
**Entry point:** Alissa's network → field test → soft launch → Austin market
**Pricing sensitivity:** High. Most are small businesses. Free or very low cost wins.
**Adoption barrier:** Trust. "I've been doing this for 15 years, why change?"
**Key insight:** The operator (owner) decides to adopt, but the worker (checkout person) decides if it actually gets used. Both must be convinced.

### Segment 2: Vintage Markets & Pop-Up Shops (v0.2+ — EXPANSION)

**Who:** Vintage market vendors, flea market sellers, pop-up shop operators
**Examples in Austin:** Austin Flea, Blue Genie Art Bazaar, Uncommon Objects-style multi-vendor markets, Round Top/Warrenton antique fair vendors
**Pain:** Same manual checkout process; multi-day markets have day-based pricing; vendors often share checkout space
**How we'd adapt:**
- Multi-vendor support (track sales by vendor/booth)
- Flexible discount schedules (not just day-based — could be time-based, category-based)
- Vendor payout reporting (split revenue between market organizer and vendor)
- Potentially a "market organizer" mode where one app instance manages multiple vendors
**Why this works:** Alissa IS a vintage reseller. She lives in this world. The Austin vintage market scene is large and interconnected with estate sales. Same demographic, same manual pain, same word-of-mouth network.
**Adjacency strength:** Very high. Same core product (fast checkout + QR handoff), same target user profile, same local market.

### Segment 3: Garage Sales / Tag Sales (v0.3+ — BROAD MARKET)

**Who:** Individuals and families running garage sales, yard sales, moving sales
**Size:** Massive — millions of garage sales per year in the US
**Pain:** Lighter version of the same problem (manual addition, making change, no data)
**How we'd adapt:**
- Simplified setup (no discount schedule needed for most garage sales)
- Multi-seller tracking (family members selling their own stuff)
- Change calculator
- Possibly payment integration (Venmo QR, etc.)
**Why this matters:** Much larger TAM than estate sales. But lower pain intensity — garage sales are shorter, lower volume, and the operator usually IS the checkout worker.
**Adjacency strength:** Moderate. Same core product, but different user needs and motivation level.

### Segment 4: Charity Sales / Church Rummage Sales / School Fundraisers (v0.3+)

**Who:** Nonprofits running large-scale sales events
**Pain:** Volunteer checkout workers with zero training, massive item counts, need for accurate revenue tracking for donors/reporting
**How we'd adapt:**
- Multi-station support (several checkout devices at one sale)
- Reporting for tax/donation purposes
- Even simpler onboarding (volunteers rotate and may only work one shift)
**Adjacency strength:** Moderate-to-high. These sales look a lot like estate sales operationally.

---

## 5. Go-to-Market Strategy

### Phase 1: Austin Estate Sales (Now → Summer 2026)

**Channel:** Alissa's personal network
**Approach:** Direct, relationship-based. Alissa introduces us to operators she knows. We offer to shadow a sale and let them try the app alongside their existing system. Zero risk to them.
**Goal:** 3–5 Austin operators using the app at real sales

### Phase 2: Austin Estate Sale Community (Summer → Fall 2026)

**Channels:**
- Word of mouth from Phase 1 operators
- Austin estate sale Facebook groups and community pages
- EstateSales.NET operator profiles in Austin area
- Local estate sale association meetings or informal operator meetups
- Landing page at estatecheckout.com (or similar domain)

**Approach:** Let the product sell itself through operator-to-operator referral. Support this with:
- A clear landing page with screenshots, install instructions, and a 60-second demo video
- A "Getting Started" one-pager (PDF or in-app guide)
- Direct text/email support for early adopters

### Phase 3: Texas → National (2027+)

**Channels:**
- EstateSales.NET partnership or feature (their platform reaches 82% of operators)
- National Estate Sale Association (NESA) conference or events
- Industry blog posts or guest content
- App Store / Play Store listing (if we wrap the PWA)
- Social media (Instagram is growing among operators — 42% usage in 2021, rising)
- YouTube walkthrough/demo videos
- SEO: "estate sale checkout app," "estate sale discount calculator," "estate sale POS"

**Approach:** Shift from direct relationship-based growth to scalable channels. This is where brand, content, and distribution matter.

---

## 6. Referral & Ambassador Strategy

### Brand Ambassadors

Estate sale operators talk to each other. The industry is tight-knit and reputation-driven. A single enthusiastic operator can drive 5–10 referrals.

**Ambassador profile:**
- Runs 20+ sales per year
- Active on EstateSales.NET and Facebook
- Known in their local market
- Willing to mention Estate Checkout to other operators
- Ideally, willing to post about it on social media after a successful sale

**What we offer ambassadors (ideas to validate):**
- Early access to new features
- Direct line to the product team (they shape what we build)
- Co-marketing (feature their sale company on our site/social)
- Eventually: referral credit, free premium features, or similar

**Alissa's role:** First ambassador. She bridges both estate sales and vintage markets. Her credibility in the Austin scene is our distribution channel.

### Organic Referral Triggers

The best referral moment is **during a sale** when an operator next to another operator (or a customer) sees the QR code handoff and asks "what is that?" Design the product so this moment happens naturally:
- QR code screen could include a small "Powered by Estate Checkout" watermark
- Payment receive screen (what the payment worker sees) could include a subtle "Try Estate Checkout — free" link
- Digital receipt (if we build one) could include a link

---

## 7. Onboarding Strategy

### The Challenge

Our target user is 40–70 years old, has been running sales the same way for 15 years, didn't ask for this app, and gets maybe 2 minutes of training before a sale opens. They're standing in a crowded house, probably holding someone's phone or a tablet they barely know how to use.

### Onboarding Layers

**Layer 1: In-App Walkthrough (Built — v0.1)**
- 3-card first-run overlay: Set Up Your Sale → Ring Up Items → Mark It Paid
- Replayable from "How It Works" on Setup screen
- Must communicate the core flow in under 30 seconds

**Layer 2: Getting Started Guide (Needed — Soft Launch)**
- One-page PDF or mobile-friendly web page
- Step-by-step with screenshots: install as PWA → set up sale → check out first customer
- Printable so an operator can hand it to their checkout worker

**Layer 3: Demo Video (Needed — Public Launch)**
- 60–90 second video showing the full checkout flow on a real phone
- Post on landing page, YouTube, and share link with operators
- Consider operator testimonial format: "Here's how I use Estate Checkout at my sales"

**Layer 4: In-Context Help (Future)**
- Tooltips or "?" icons on non-obvious features
- Smart defaults that reduce decisions (already doing this — e.g., "Sale starts today" default)
- Error messages that teach (already doing this — e.g., "Hold the button longer" for speech)

### First-Sale Buddy System

For the first 5–10 operators, offer to be on-site (or on-call via text) for their first sale using the app. This is support AND research — we learn what confuses people and fix it in the product.

---

## 8. Discovery Findings

_This section gets filled in as Alissa and others report back from conversations with operators and from field tests._

### Competitive Platform Analysis

| Date | Platform | Key Findings | Implications |
|------|----------|-------------|--------------|
| 2026-03-03 | Aravenda | FAQ is 100% consignment/inventory focused. No estate sale checkout content. Demo videos show only desktop. Leadership is enterprise tech (AOL, Deloitte, private equity). Free trial signup broken. President (Carolyn Thompson) doing sales demos personally — small team. | Confirms the gap: full management platforms don't address checkout speed. Aravenda serves consignment well but has no estate sale checkout story. Strengthens our positioning as the only tool focused on the checkout step. |

### Operator Conversations

| Date | Operator | Key Quotes / Insights | Implications |
|------|----------|----------------------|--------------|
| — | — | — | — |

### Field Test Observations

| Date | Sale | Observer | What Worked | What Didn't | Surprises |
|------|------|----------|-------------|-------------|-----------|
| — | — | — | — | — | — |

### Customer Reactions (Observed at Sales)

| Date | Observation | Implication |
|------|-------------|-------------|
| — | — | — |

---

## 9. Open Research Questions

- [ ] How many items are in a typical checkout? (Need field data to validate QR size limits)
- [ ] How often do operators actually calculate Day 2/3 discounts wrong?
- [ ] Do operators feel the checkout pain, or do they see it as "just how it works"?
- [ ] Have any operators tried PROSALE or similar? What happened? Why did they stop or continue?
- [ ] What's the operator's reaction to "free, works on your phone, no internet needed"?
- [ ] Would operators pay for this? At what price point? Or does it need to stay free to drive adoption?
- [ ] How do vintage market vendors handle checkout today? Same manual process?
- [ ] Is there an estate sale operator community in Austin (meetup, Facebook group, informal network)?
- [ ] What role does EstateSales.NET play in operator decision-making about tools?
- [ ] Would operators share revenue data or testimonials in exchange for early access?
- [x] Does Aravenda have a real estate sale checkout story? → **No.** FAQ, videos, and marketing are 100% consignment/inventory focused. No mobile checkout demo. Confirms the gap.
- [ ] Does Aravenda's voice entry work for price-only input (like ours) or is it inventory cataloging? → Pending demo. Website suggests cataloging focus.
- [ ] Does SimpleConsign's AI item entry work for estate sale items (one-of-a-kind)? → Pending demo.
- [ ] What does Aravenda's actual estate sale operator base look like? They claim to serve estate sales but couldn't demonstrate how on their website.

---

## 10. Key Sources

- EstateSales.NET Industry Surveys: estatesales.net/surveys (2018, 2020, 2021, 2023)
- PROSALE: prosale.com
- SimpleConsign: simpleconsign.com
- Aravenda: aravenda.com
- StickerPrice: stickerpriceapp.com
- EstateSales.NET (listings platform): estatesales.net
- ASEL (American Society of Estate Liquidators): aselonline.com
- NESA (National Estate Sale Association): referenced in PROSALE materials
- DIYAuctions "12 Best Estate Sale Software Platforms": diyauctions.com/learn/estate-sale-software

---

## Revision History

| Date | What Changed |
|------|-------------|
| 2026-03-03 | Added Aravenda deep-dive findings from website analysis. Updated §2 with detailed competitive assessment, §8 with competitive platform analysis table, §9 with answered/new research questions. |
| 2026-03-03 | Initial version — competitive research, market data, positioning, segments, GTM strategy |
