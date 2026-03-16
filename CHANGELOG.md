# QuickConnects — Changelog (March 10, 2026)

## Overview

This update addresses **security vulnerabilities**, **dead code**, **missing business logic**, and **API improvements** across the QuickConnects platform. All changes compile cleanly with zero build errors.

---

## 1. Authentication Security Overhaul

**What changed (simple):**
Previously, anyone who could guess a user's ID number could pretend to be that user. Now, every login cookie is cryptographically signed — like adding a tamper-proof seal to an envelope. If someone tries to forge a cookie, the system rejects it immediately.

**Technical details:**
- Added HMAC-SHA256 cookie signing using `crypto.createHmac` with `NEXTAUTH_SECRET`
- Cookie value format changed from `userId` → `userId.hmacSignature`
- Added `signCookie(userId)` and `verifyCookie(cookieValue)` to `lib/auth-helpers.ts`
- Added `getAuthUserId(request)` helper for routes using `request.cookies.get()`
- Updated **27 API route files** to verify cookie signatures before trusting user identity
- Constant-time comparison to prevent timing attacks

**Files modified:**
- `lib/auth-helpers.ts` — core signing/verification logic
- `app/api/auth/login/route.ts` — signs cookie on login
- 27 API routes (`auth/me`, `auth/kyc`, `campaigns/*`, `deals/*`, `chat/*`, `social-entities/*`, `oauth/*`, `files/*`, `admin/*`) — all now verify signatures

---

## 2. Dead MVP Code Removed

**What changed (simple):**
The app originally started as a Fiverr-style gig marketplace but evolved into a campaign/deal platform. The old gig pages (browse gigs, view a gig, track an order) were still sitting in the codebase doing nothing. They've been removed to reduce confusion and clutter.

**Technical details:**
- Deleted 3 orphaned page directories from the Next.js app router
- Deleted 2 legacy data files with types/sample data for the gig system
- Verified no live code imported from any deleted files before removal

**Files deleted:**
- `app/browse/` — gig marketplace browse page
- `app/gig/[slug]/` — individual gig detail page
- `app/order/[id]/` — order tracking page
- `data/enhanced-types.ts` — Gig, Order, Review, Category type definitions
- `data/enhanced-sample-data.ts` — sample gigs, categories, reviews, orders

---

## 3. Stale Documentation Cleaned Up

**What changed (simple):**
Five documentation files were describing the old gig-based MVP, not the current campaign/deal system. They were misleading for any new developer reading them. They've been removed — the remaining `README.md`, `IMPLEMENTATION_PLAN.md`, `DEVELOPMENT.md`, and `QUICKSTART.md` accurately describe the current system.

**Files deleted:**
- `BUILD_COMPLETE.md` — described MVP gig system completion
- `PROJECT_SUMMARY.md` — overview of the old architecture
- `FEATURES.md` — feature list referencing gigs/orders
- `PROGRESS.md` — progress tracker for MVP phases
- `PROJECT_CHECKLIST.md` — checklist for old milestones

---

## 4. Orphaned Validation Schemas Removed

**What changed (simple):**
The form validation rules for creating gigs, gig packages, orders, and reviews were still in the codebase even though those features no longer exist. They've been cleaned out.

**Technical details:**
- Removed `gigSchema`, `gigPackageSchema`, `orderSchema`, `reviewSchema` from `lib/validations.ts`
- Removed corresponding exported types: `GigInput`, `GigPackageInput`, `OrderInput`, `ReviewInput`
- All campaign, deal, auth, chat, and file-upload schemas remain untouched

**Files modified:**
- `lib/validations.ts`

---

## 5. Deal State Machine Implemented

**What changed (simple):**
Deals go through many stages — from draft, to negotiation, to script approval, to payment, to production, to delivery, to completion. Previously, there was no central system enforcing which stage can follow which. A deal could theoretically jump from "draft" straight to "completed." Now there's a strict state machine that only allows valid transitions and logs every change.

**Technical details:**
- Added `VALID_TRANSITIONS` map covering all 12 `DealStatus` enum values
- Added `transitionDealStatus(dealId, targetStatus, actorId)` method that:
  - Fetches the deal inside a `prisma.$transaction`
  - Validates the transition against the allowed map
  - Throws a descriptive error with allowed transitions on invalid attempts
  - Creates an `AuditLog` entry for every status change
  - Returns the updated deal
- Refactored `lockDeal`, `acceptLock`, and `rejectLock` to use the state machine instead of raw DB updates
- Uses Prisma's `DealStatus` enum for type safety

**Valid transitions:**
```
DRAFT           → LOCKED, CANCELLED
LOCKED          → SCRIPT_PENDING, CANCELLED
SCRIPT_PENDING  → SCRIPT_APPROVED, CANCELLED
SCRIPT_APPROVED → PAYMENT_50_PENDING, CANCELLED
PAYMENT_50_PENDING → PRODUCTION, CANCELLED
PRODUCTION      → DELIVERY_PENDING, DISPUTED
DELIVERY_PENDING → REVISION_PENDING, PAYMENT_100_PENDING, DISPUTED
REVISION_PENDING → DELIVERY_PENDING, DISPUTED
PAYMENT_100_PENDING → COMPLETED, DISPUTED
DISPUTED        → COMPLETED, CANCELLED
COMPLETED       → (terminal)
CANCELLED       → (terminal)
```

**Files modified:**
- `lib/services/deal.service.ts` — state machine + refactored methods

---

## 6. Escrow Approval Gate Fixed

**What changed (simple):**
Previously, when a creator uploaded their deliverables (videos, posts, etc.), the system automatically started a 2-day countdown to release payment — even if the brand hadn't reviewed the work yet. Now, the brand must explicitly approve the deliverables before the payment countdown begins. This prevents creators from getting paid for work the brand hasn't accepted.

**Technical details:**
- `handleFileUploadTrigger` now transitions to `DELIVERY_PENDING` (was incorrectly going to `PAYMENT_100_PENDING`)
- Added `approveDeliverables(dealId, brandId)` method — the explicit brand approval gate
- Only `approveDeliverables` can transition `DELIVERY_PENDING → PAYMENT_100_PENDING`
- Updated payment route to check `deal.status !== 'PAYMENT_100_PENDING'` instead of `!deal.filesUploaded`
- Inngest T+2 escrow release function unchanged — it correctly fires downstream of the approval

**Corrected flow:**
```
Creator uploads files → DELIVERY_PENDING → Brand reviews & approves → PAYMENT_100_PENDING → Brand pays → T+2 timer → COMPLETED
```

**Files modified:**
- `lib/services/escrow.service.ts` — new `approveDeliverables()`, fixed `handleFileUploadTrigger`
- `app/api/deals/[id]/payment/route.ts` — updated status guard

---

## 7. Campaign Full-Text Search

**What changed (simple):**
Creators looking for campaigns to apply to could only filter by category or budget. Now they can type a search query (like "skincare" or "tech review") and find campaigns by matching against titles and descriptions. The search is case-insensitive, so "SKINCARE" and "skincare" return the same results.

**Technical details:**
- Added `search` parameter to `DiscoverFilters` interface
- When `search` is provided, adds an `OR` condition matching `title` and `description` using Prisma's `contains` with `mode: 'insensitive'`
- No raw SQL — uses PostgreSQL's built-in case-insensitive matching via Prisma

**Files modified:**
- `lib/services/campaign.service.ts`
- `app/api/campaigns/route.ts`

---

## 8. Cursor-Based Pagination

**What changed (simple):**
Previously, campaign listings loaded everything at once (or used basic page numbers). Now the system uses cursor-based pagination — the API tells you "here are 20 results, and here's a bookmark to get the next 20." This is faster, more reliable, and handles real-time data changes gracefully (no skipped/duplicate results when new campaigns are added).

**Technical details:**
- Replaced `page`/`pageSize` with `cursor` (last campaign ID) and `limit` (default 20, max 50)
- Uses Prisma's native `cursor`/`skip` pattern — fetches `limit + 1` records, pops the extra to determine `hasMore`
- Response format: `{ data: Campaign[], nextCursor: string | null, hasMore: boolean }`

**Files modified:**
- `lib/services/campaign.service.ts`
- `app/api/campaigns/route.ts`

---

## 9. Campaign Sorting Options

**What changed (simple):**
Creators can now sort campaigns by newest first, highest budget, lowest budget, or closest deadline. Previously there was no sorting control.

**Technical details:**
- Added `SortBy` type: `'newest' | 'budget_high' | 'budget_low' | 'deadline'`
- Added `SORT_OPTIONS` lookup mapping each option to Prisma `orderBy` clauses with `id` as tiebreaker for stable cursor pagination
- Default sort: `newest` (by `publishedAt` descending)
- Accepted via `sortBy` query parameter in GET `/api/campaigns`

**Files modified:**
- `lib/services/campaign.service.ts`
- `app/api/campaigns/route.ts`

---

## 10. Mock Database Fallback Removed

**What changed (simple):**
The app used to silently fall back to a fake in-memory database when no real database was configured. This meant the app could appear to work fine during development while actually not connecting to any real database — hiding bugs that would only surface in production. Now, if no database is configured, the app immediately tells you with a clear error message.

**Technical details:**
- Rewrote `lib/prisma.ts` as a standard Prisma singleton
- Throws `Error('DATABASE_URL environment variable is required')` if missing
- Uses `globalThis` caching pattern for Next.js hot-reload compatibility

**Files modified:**
- `lib/prisma.ts` — simplified to standard singleton

**Files deleted:**
- `lib/mock-db.ts` — in-memory mock database implementation
- `lib/mock-data.ts` — seed data for the mock database

---

## 11. Duplicate Type System Cleaned

**What changed (simple):**
There were two competing sets of type definitions — manually written ones in `data/types.ts` and auto-generated ones from the database schema (Prisma). The manual ones didn't match the actual database structure and were confusing. They've been removed since nothing in the live codebase was using them.

**Technical details:**
- Deleted `data/types.ts` which defined `User`, `Brand`, `Influencer`, `Deal`, `Message`, `SocialPlatform` interfaces
- Verified via grep that no source files imported from this path
- Only references were in deleted documentation files

**Files deleted:**
- `data/types.ts`

---

## 12. Sample Data Import Fix

**What changed (simple):**
After removing the old type definitions file, the sample data file (used by the brand discovery page) broke because it was importing types from the deleted file. The types it needed were added directly into the sample data file so everything keeps working.

**Technical details:**
- Replaced `import { Brand, Influencer, Deal, Message } from "./types"` with inline interface declarations
- Interfaces match the shape of the sample data exactly
- No functional change to the sample data itself

**Files modified:**
- `data/sample-data.ts`

---

## Summary Table

| #  | Change | Category | Files Affected |
|----|--------|----------|----------------|
| 1  | Cookie signing (HMAC-SHA256) | Security | 28 files |
| 2  | Removed dead gig pages | Cleanup | 3 directories deleted |
| 3  | Removed stale docs | Cleanup | 5 files deleted |
| 4  | Removed orphaned schemas | Cleanup | 1 file edited |
| 5  | Deal state machine | Business Logic | 1 file edited |
| 6  | Escrow approval gate | Bug Fix | 2 files edited |
| 7  | Campaign full-text search | Feature | 2 files edited |
| 8  | Cursor-based pagination | Feature | 2 files edited |
| 9  | Campaign sorting | Feature | 2 files edited |
| 10 | Removed mock DB fallback | Reliability | 1 edited, 2 deleted |
| 11 | Removed duplicate types | Cleanup | 1 file deleted |
| 12 | Fixed sample data imports | Bug Fix | 1 file edited |

**Total: ~35 files modified, ~15 files/directories deleted. Build: Passing.**

---
---

# QuickConnects — Changelog (March 16, 2026)

## Overview

This update is a **comprehensive bug audit and fix session** targeting profile flows for both creators and brands. Three parallel audit agents scanned every profile page, API route, and service layer. Over 30 bugs were identified and the highest-priority ones fixed. All changes compile cleanly with zero TypeScript errors and a passing production build.

---

## 13. Sign-In / Sign-Up Flow Overhaul

**What changed (simple):**
The login and signup forms had several rough edges — placeholder text was too dark (looked like real input), signup didn't redirect anywhere after success, and password requirements weren't surfaced until submission failed. Now placeholders are clearly lighter, signup auto-logs you in and redirects to the dashboard, passwords show a live checklist, and there are toggle buttons to show/hide passwords.

**Technical details:**
- Changed `--muted-foreground` from `220 10% 40%` to `220 10% 62%` in `app/globals.css` — placeholders now visually distinct from real values
- Signup API (`app/api/auth/signup/route.ts`) now sets the `user_id` session cookie directly using `signCookie()`, eliminating a second login API call that was hitting the rate limiter
- Login page (`app/auth/login/page.tsx`): password toggle, input trimming, autocomplete attributes, better error messages
- Signup page (`app/auth/signup/page.tsx`): live password checklist (uppercase, lowercase, digit, length), phone validation feedback, auto-redirect to dashboard on success

**Why this architecture:**
The original signup did `signup → toast → user manually clicks login → login API → redirect`. This hit the per-IP rate limiter because two auth calls happened within seconds. Setting the cookie directly in the signup response eliminates the round-trip entirely. One request, one cookie, one redirect.

**Files modified:**
- `app/globals.css`
- `app/api/auth/signup/route.ts`
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`

---

## 14. Reusable Dropdown Components (z-index Fix)

**What changed (simple):**
Custom dropdowns on profile pages were being clipped — the dropdown menu would render behind the card below it instead of floating on top. This happened on both brand and influencer profiles for niche selection, industry picker, etc.

**Technical details:**
- Created `components/ui/dropdown-select.tsx` with `SingleSelect` and `MultiSelect` components
- Uses `z-50` absolute positioning, `mousedown` listener for click-outside-to-close
- MultiSelect supports badges, optional max selection limit, disabled state
- Added `relative z-10` to parent `AnimatedSection` wrappers that contain dropdowns — this was the key fix because sibling AnimatedSections created competing stacking contexts

**Why this architecture:**
The root cause wasn't missing z-index on the dropdown itself — it was CSS stacking context isolation. Each `AnimatedSection` used `transform` (for animations), which creates a new stacking context. A `z-50` inside one stacking context can't escape to overlap a sibling stacking context. Adding `relative z-10` to the parent section elevates the entire context, letting the dropdown float above sibling cards.

**Files created:**
- `components/ui/dropdown-select.tsx`

**Files modified:**
- `app/dashboard/influencer/profile/page.tsx`
- `app/dashboard/brand/profile/page.tsx`

---

## 15. Social Entity `isVerified` Persistence

**What changed (simple):**
When a creator connected their Instagram via Apify lookup, the "connected" status only lived in browser memory. If they refreshed the page, every account showed as disconnected again — even though the data (followers, handle) was saved. Now the connected/verified status is saved to the database and survives page reloads.

**Technical details:**
- Added `isVerified: z.boolean().optional()` to both `socialEntityCreateSchema` and `socialEntityUpdateSchema` in `lib/validations.ts`
- Added `isVerified` to `CreateEntityInput` and `UpdateEntityInput` interfaces in `lib/services/social-entity.service.ts`
- Passed `isVerified: input.isVerified ?? false` in Prisma upsert create/update blocks
- Influencer profile save handler now sends `isVerified: entity.connected` in both POST (new) and PATCH (existing) API calls
- `fetchProfile` maps `e.isVerified` from DB back to `connected` in component state

**Why this architecture:**
The `SocialEntity` model already had an `isVerified` boolean column — it just wasn't being written to or read from. The fix threads the value through the full pipeline: UI state → request body → Zod validation → service layer → Prisma → DB. No schema migration needed since the column existed.

**Files modified:**
- `lib/validations.ts`
- `lib/services/social-entity.service.ts`
- `app/dashboard/influencer/profile/page.tsx`

---

## 16. Creator Niches Database Persistence

**What changed (simple):**
Creators could select niche categories (Beauty, Tech, Fitness, etc.) on their profile, but these were only saved in the browser's localStorage. Switch browsers or clear cache — gone. Now niches are saved to the database via the existing `CreatorProfile.niche` column.

**Technical details:**
- `auth.service.ts` `updateProfile()` now includes `niche: data.niche` in the Prisma update for creators
- `fetchProfile` in the influencer profile page parses the comma-separated `niche` string from DB back into an array: `user.creatorProfile.niche.split(",").map(s => s.trim()).filter(Boolean)`
- The save handler was already sending `body.niche = niches.join(", ")` — it just wasn't being persisted by the service

**Why this architecture:**
The `CreatorProfile` model stores niches as a single comma-separated `String?` field rather than a `String[]` array. This is a pragmatic choice for a single-column field that doesn't need array queries (no "find all creators in Beauty AND Tech" yet). The join/split happens at the UI boundary, keeping the service layer simple.

**Files modified:**
- `lib/services/auth.service.ts`
- `app/dashboard/influencer/profile/page.tsx`

---

## 17. Brand Niches Database Persistence (Schema Change)

**What changed (simple):**
Brand profiles had the same localStorage-only problem for niches, but worse — there was no database column at all. Added a proper `niches` array column to `BrandProfile` and wired it through the full save/fetch pipeline.

**Technical details:**
- Added `niches String[] @default([])` to `BrandProfile` in `prisma/schema.prisma`
- Ran `prisma db push` to apply to Supabase PostgreSQL
- Added `niches: z.array(z.string()).optional()` to `brandUpdateSchema` in `app/api/auth/me/route.ts`
- Added `niches: data.niches` to the brand branch of `auth.service.ts` `updateProfile()`
- Brand profile save handler now sends `body.niches = niches` (array, not comma-separated — PostgreSQL natively supports arrays)
- `fetchProfile` already reads `user.brandProfile.niches` on page load

**Why `String[]` for brands but `String?` for creators:**
Brands were built later and could use PostgreSQL's native array type, which is cleaner — no split/join needed, supports `@>` array containment queries for future "find brands interested in Beauty" filtering. Creator niches use the older comma-separated pattern. Both work; consistency can be addressed in a future migration.

**Files modified:**
- `prisma/schema.prisma`
- `app/api/auth/me/route.ts`
- `lib/services/auth.service.ts`
- `app/dashboard/brand/profile/page.tsx`

---

## 18. Save Button Validation (Privacy Consent Gate)

**What changed (simple):**
The "Save Changes" button on profile pages appeared clickable even when the privacy consent checkbox wasn't ticked. Users could click it, the save would go through, but their profile would show as incomplete. Now the button is visually disabled and unclickable until privacy consent is given.

**Technical details:**
- Influencer profile: `disabled={saving || !privacyConsent}`
- Brand profile: `disabled={saving || !companyName.trim() || !privacyConsent}`
- Brand profile now has a full Privacy & Data Consent section (card with checkbox) — previously only the influencer profile had one

**Files modified:**
- `app/dashboard/influencer/profile/page.tsx`
- `app/dashboard/brand/profile/page.tsx`

---

## 19. Entity Removal Calls DELETE API

**What changed (simple):**
When a creator removed a social account from their profile (clicking the X button), it only disappeared from the screen. The database record stayed, so on next page load, the "removed" account reappeared. Now removing an account calls the DELETE API to deactivate it in the database first.

**Technical details:**
- `removeEntity()` in influencer profile is now async
- If the entity has a DB `id`, calls `DELETE /api/social-entities/${id}` before removing from state
- If the API call fails, shows an error and does NOT remove from UI (prevents state divergence)
- Entities without an `id` (newly added, not yet saved) are still removed from state immediately
- The DELETE endpoint already existed — it calls `socialEntityService.deactivate()` which sets `isActive: false` (soft delete)

**Why soft delete:**
Hard-deleting social entities would orphan any deals or campaign applications linked to that entity via foreign keys. Soft-deactivating (`isActive: false`) hides the entity from discovery and profile display while preserving referential integrity.

**Files modified:**
- `app/dashboard/influencer/profile/page.tsx`

---

## 20. Handle `@` Normalization

**What changed (simple):**
Instagram handles were being stored inconsistently — sometimes with `@` prefix, sometimes without. The Apify lookup strips `@` internally, but the profile page was re-adding it (`@${igProfile.username}`). This caused duplicate entity creation when the same account was looked up twice (once typed as `username`, once as `@username`).

**Technical details:**
- Instagram lookup result now sets `handle: igProfile.username` (without `@` prefix)
- POST save handler strips `@` prefix: `handle: entity.handle.trim().replace(/^@/, "")`
- The `SocialEntity` unique constraint is `[masterId, platform, handle]` — consistent handle format prevents duplicates
- Display can add `@` at render time; storage should be normalized

**Files modified:**
- `app/dashboard/influencer/profile/page.tsx`

---

## 21. Avatar URL Validation Relaxed

**What changed (simple):**
The creator profile update API required avatar URLs to pass strict `.url()` validation. But Instagram CDN URLs from Apify lookups are long, contain special characters, and expire quickly. The strict validation was rejecting valid avatar URLs. Changed to accept any string.

**Technical details:**
- `creatorUpdateSchema` in `app/api/auth/me/route.ts`: avatar changed from `z.string().url().optional().or(z.literal(''))` to `z.string().optional()`
- This is a pragmatic fix — the avatar URL comes from a trusted source (our own Apify lookup) and doesn't need URL format validation at the API boundary

**Files modified:**
- `app/api/auth/me/route.ts`

---

## Summary Table

| #  | Change | Category | Files Affected |
|----|--------|----------|----------------|
| 13 | Sign-in/sign-up flow overhaul | UX / Bug Fix | 4 files |
| 14 | Reusable dropdown components | UX / Bug Fix | 1 created, 2 edited |
| 15 | Social entity `isVerified` persistence | Bug Fix | 3 files |
| 16 | Creator niches DB persistence | Bug Fix | 2 files |
| 17 | Brand niches DB persistence | Feature / Schema | 4 files + migration |
| 18 | Save button privacy consent gate | UX | 2 files |
| 19 | Entity removal calls DELETE API | Bug Fix | 1 file |
| 20 | Handle `@` normalization | Bug Fix | 1 file |
| 21 | Avatar URL validation relaxed | Bug Fix | 1 file |

**Total: ~15 files modified, 1 file created, 1 schema migration. Build: Passing. Zero TypeScript errors.**

---

## Architectural Decisions Explained

### Why localStorage was the root cause of most bugs

The original profile pages used **localStorage as the primary data store** for niches, privacy consent, and entity connection status. This creates a "dual source of truth" problem: the database has one version of reality, the browser has another. On page reload, whichever loads first wins. On a new device, localStorage is empty — everything looks blank.

**The fix pattern across bugs 15-17:** Make the database the single source of truth. localStorage is now a **write-through cache** — we write to both on save, but on load, the database always wins. If the DB has data, it overwrites whatever localStorage had.

### Why the signup flow was hitting the rate limiter

The original flow: signup → show toast → user clicks "login" → call login API → set cookie → redirect. Two auth API calls from the same IP within seconds triggered the per-IP rate limiter (designed to prevent brute-force attacks). The fix sets the cookie directly in the signup response — one request, one cookie, zero rate limiter conflicts.

### Why z-index alone didn't fix dropdowns

CSS `z-index` only works within the same stacking context. The `AnimatedSection` component uses CSS `transform` for entrance animations, which creates an isolated stacking context per section. A `z-50` dropdown inside section A cannot overlap section B regardless of z-index value — they're in separate stacking contexts. The fix elevates the parent section itself (`relative z-10`) so the entire context stacks above its siblings.

### Why brand niches use `String[]` but creator niches use `String?`

Historical accident. `CreatorProfile` was built in the MVP phase and uses a comma-separated string. `BrandProfile.niches` was added later and uses PostgreSQL's native array type, which is cleaner (no split/join, supports array operators for queries). Both approaches work. Migrating creator niches to `String[]` is possible but wasn't worth the risk of breaking existing data mid-session.
