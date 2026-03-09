# Test Accounts & Seed Data

> **Password for all accounts:** `Test1234`
>
> **How to seed:** Run `prisma/seed-data.sql` in Supabase SQL Editor. Safe to re-run (cleans up old data first).

---

## Brand Accounts

| # | Email | Password | KYC Status | Company Name | Dashboard |
|---|-------|----------|------------|-------------|-----------|
| B1 | `brand1@test.com` | `Test1234` | Verified | GlowSkin Beauty | `/dashboard/brand` |
| B2 | `brand2@test.com` | `Test1234` | Verified | UrbanFit India | `/dashboard/brand` |
| B3 | `brand3@test.com` | `Test1234` | Pending | NewBrand Co | `/dashboard/brand` |
| B4 | `brand4@test.com` | `Test1234` | Rejected | Rejected Brand LLC | `/dashboard/brand` |

### B1 — GlowSkin Beauty (`brand1@test.com`)
- **KYC:** Verified
- **Profile:** Complete — industry, description, website, company size
- **KYB/GSTIN:** `27AABCG1234F1Z5` — verified, filing status "Active"
- **Campaigns:** 2 (1 ACTIVE "Summer Glow SPF50 Launch", 1 DRAFT "Diwali Collection Promo")
- **Deals:** 2 (SCRIPT_PENDING with creator1, LOCKED with creator2)
- **Chat:** 4 messages across 2 deals
- **Best for testing:** Full brand experience — campaigns, deals, chat, KYB verified

### B2 — UrbanFit India (`brand2@test.com`)
- **KYC:** Verified
- **Profile:** Complete — industry, description, website, company size
- **KYB/GSTIN:** None
- **Campaigns:** 1 (ACTIVE "Fitness Influencer Collab" — has 1 pending application from creator3)
- **Deals:** 1 (COMPLETED with creator1 — full happy path with payments)
- **Chat:** 2 messages
- **Best for testing:** Reviewing applications, completed deal flow, no GSTIN state

### B3 — NewBrand Co (`brand3@test.com`)
- **KYC:** Pending
- **Profile:** Partial — only company name and industry (no description, website, logo, size)
- **KYB/GSTIN:** None
- **Campaigns:** None
- **Deals:** None
- **Best for testing:** Pending KYC state, incomplete profile, empty dashboard

### B4 — Rejected Brand LLC (`brand4@test.com`)
- **KYC:** Rejected
- **Profile:** Complete — industry, description, website, company size
- **KYB/GSTIN:** None
- **Campaigns:** None
- **Deals:** None
- **Best for testing:** Rejected KYC state, blocked from creating campaigns/deals

---

## Creator Accounts

| # | Email | Password | KYC Status | Name | Dashboard |
|---|-------|----------|------------|------|-----------|
| C1 | `creator1@test.com` | `Test1234` | Verified | Priya Sharma | `/dashboard/influencer` |
| C2 | `creator2@test.com` | `Test1234` | Verified | Arjun Tech Reviews | `/dashboard/influencer` |
| C3 | `creator3@test.com` | `Test1234` | Verified | Meera's Kitchen | `/dashboard/influencer` |
| C4 | `creator4@test.com` | `Test1234` | Pending | New Creator | `/dashboard/influencer` |
| C5 | `creator5@test.com` | `Test1234` | Verified | Rahul Vlogs | `/dashboard/influencer` |

### C1 — Priya Sharma (`creator1@test.com`)
- **KYC:** Verified
- **Profile:** Complete — bio, avatar, reliability score 4.8/5
- **Social Entities:**
  - Instagram `@priyasharma` — 520K followers, 4.2% engagement, rating 4.8
  - YouTube `PriyaSharmaVlogs` — 180K followers, 3.8% engagement, rating 4.5
- **Deals:** 2 (SCRIPT_PENDING with brand1, COMPLETED with brand2)
- **Wallet:** Balance ₹47,500 | Earned ₹95,000 | Withdrawn ₹47,500
- **Notifications:** 2 (new deal, payment received)
- **Best for testing:** Full creator experience — multiple entities, deals, wallet, chat

### C2 — Arjun Tech Reviews (`creator2@test.com`)
- **KYC:** Verified
- **Profile:** Complete — bio, reliability score 4.5/5
- **Social Entities:**
  - YouTube `ArjunTechReviews` — 1,200,000 followers, 5.1% engagement, rating 4.5
- **Deals:** 1 (LOCKED with brand1 — exclusive negotiation, 72h lock)
- **Wallet:** Balance ₹320,000 | Earned ₹320,000
- **Notifications:** 1 (deal locked)
- **Best for testing:** High-follower creator, locked/exclusive deal state

### C3 — Meera's Kitchen (`creator3@test.com`)
- **KYC:** Verified
- **Profile:** Complete — bio, reliability score 4.0/5
- **Social Entities:**
  - Instagram `@meeraskitchen` — 85K followers, 6.5% engagement, rating 4.0
- **Deals:** None
- **Applications:** 1 pending application to B2's "Fitness Influencer Collab" (proposed ₹30,000)
- **Wallet:** Balance ₹75,000 | Earned ₹75,000
- **Best for testing:** Campaign application flow, no active deals

### C4 — New Creator (`creator4@test.com`)
- **KYC:** Pending
- **Profile:** Incomplete — name only (no bio, no avatar)
- **Social Entities:** None
- **Deals:** None
- **Wallet:** Balance ₹0
- **Best for testing:** Pending KYC, empty profile, no entities, onboarding flow

### C5 — Rahul Vlogs (`creator5@test.com`)
- **KYC:** Verified
- **Profile:** Complete — bio, reliability score 2.5/5 (low)
- **Social Entities:**
  - Instagram `@rahulvlogs` — 15K followers, 1.2% engagement, rating 2.5
- **Deals:** None
- **Wallet:** Balance ₹25,000 | Earned ₹25,000
- **Best for testing:** Low-rating creator, trickle-down campaign visibility delay

---

## Admin Account

| Email | Password | Dashboard |
|-------|----------|-----------|
| `admin@test.com` | `Test1234` | `/dashboard/admin` |

- Full access to admin panel: disputes, escalation queue, finance audit, fraud detection, flagged messages
- Has 1 system notification

---

## Seed Data Relationships

```
brand1 ──── Campaign: "Summer Glow SPF50 Launch" (ACTIVE)
  │              └── Deal D1 (SCRIPT_PENDING) ──── creator1 (IG @priyasharma)
  │                      └── 3 chat messages
  │
  ├──── Campaign: "Diwali Collection Promo" (DRAFT)
  │
  └──── Deal D2 (LOCKED) ──── creator2 (YT ArjunTechReviews)
            ├── 1 chat message
            └── ExclusiveNegotiation (72h lock)

brand2 ──── Campaign: "Fitness Influencer Collab" (ACTIVE)
  │              └── Application (PENDING) ──── creator3 (IG @meeraskitchen)
  │
  └──── Deal D3 (COMPLETED) ──── creator1 (IG @priyasharma)
            ├── 2 chat messages
            ├── Escrow: 50% deposit → 100% deposit → release → platform fee
            └── Wallet: credit ₹47,500 → withdrawal ₹47,500

brand3 ──── (empty — pending KYC)

brand4 ──── (empty — rejected KYC)

creator4 ── (empty — pending KYC, no entities)

creator5 ── IG @rahulvlogs (low rating 2.5 — trickle-down delay)
```

---

## Test Scenarios by Account

| Scenario | Login As |
|----------|----------|
| Full brand flow (campaigns + deals + chat) | `brand1@test.com` |
| Review campaign applications | `brand2@test.com` |
| Pending KYC brand (restricted) | `brand3@test.com` |
| Rejected KYC brand (blocked) | `brand4@test.com` |
| Full creator flow (entities + deals + wallet) | `creator1@test.com` |
| Locked deal / exclusive negotiation | `creator2@test.com` |
| Campaign application (pending) | `creator3@test.com` |
| New creator onboarding (empty state) | `creator4@test.com` |
| Low-rating creator (trickle-down) | `creator5@test.com` |
| Admin panel (all features) | `admin@test.com` |
