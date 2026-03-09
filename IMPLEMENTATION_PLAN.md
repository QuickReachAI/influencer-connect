# Influencer Connect - Complete Architecture & Implementation Plan

## Implementation Progress

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database Schema Evolution & Core Infrastructure | **DONE** |
| Phase 2 | Campaign Marketplace & Discovery | **DONE** |
| Phase 3 | Real-Time Chat & Enhanced PII Detection | PENDING |
| Phase 4 | Video Processing & Content Pipeline | PENDING |
| Phase 5 | Notification Engine & Brand KYB | PENDING |
| Phase 6 | Admin Enhancements, Edge Cases & Hardening | PENDING |

See `docs/PHASE_1_DATABASE_INFRASTRUCTURE.md` and `docs/PHASE_2_CAMPAIGN_MARKETPLACE.md` for detailed implementation status.

### What Has Been Implemented

**Schema & Infrastructure (Phase 1)**
- `prisma/schema.prisma` — 15 new enums, 14 new models, 5 existing models modified
- `prisma/seed.ts` — SocialEntity, Wallet, Campaign seed data added
- `lib/validations.ts` — 12 new Zod schemas + type exports
- `lib/inngest/client.ts` — Inngest singleton + 8 event types
- `lib/inngest/functions/escrow-release.ts` — Durable T+2 escrow release (replaced unsafe setTimeout)
- `lib/inngest/functions/cleanup.ts` — Daily expired file cleanup cron
- `lib/services/escrow.service.ts` — Modified: setTimeout → inngest.send()
- `lib/services/social-entity.service.ts` — CRUD, cross-user duplicate check, completion score
- `lib/services/wallet.service.ts` — credit, debit, withdraw, transaction history

**Campaign Marketplace & Discovery (Phase 2)**
- `lib/services/campaign.service.ts` — Campaign CRUD, trickle-down visibility discovery, applications, review
- `lib/services/deal.service.ts` — Exclusive negotiation lock/accept/reject
- `lib/inngest/functions/campaign-visibility.ts` — 30-min visibility tier upgrade cron
- `lib/inngest/functions/deal-locks.ts` — Hourly expired lock cleanup cron
- `app/api/inngest/route.ts` — Serves all 4 Inngest functions
- 11 new API routes: campaigns (5), social-entities (3), deal locks (3)
- `app/api/influencers/route.ts` — Rewritten: uses SocialEntity table instead of CreatorProfile JSON
- `app/api/deals/route.ts` — Modified: accepts optional entityId + campaignId

**Pre-existing MVP (before Phase 1)**
- `lib/services/auth.service.ts`, `lib/services/chat.service.ts`, `lib/services/file.service.ts`
- `lib/services/kyc.service.ts`, `lib/services/mediation.service.ts`, `lib/services/tax.service.ts`
- `lib/auth-helpers.ts` — Cookie-based auth (user_id cookie)
- `lib/rate-limit.ts` — Upstash Redis / in-memory fallback
- API routes: auth (login/signup/me/kyc), deals (CRUD/approve-script/payment/dispute), chat, files, influencers, brands, admin (disputes/users/stats/flagged-messages)

### What Remains To Be Built

**Phase 3 — Real-Time Chat & PII Detection**
- `lib/pusher.ts` — Pusher server singleton
- `lib/hooks/use-pusher.ts` — Client-side React hook
- `lib/services/pii.service.ts` — Comprehensive regex PII engine (Indian-specific patterns)
- `app/api/pusher/auth/route.ts` — Private channel auth
- `app/api/chat/[dealId]/typing/route.ts` — Typing indicators
- `app/api/chat/[dealId]/read/route.ts` — Read receipts
- Modify `lib/services/chat.service.ts` — Integrate Pusher + PII service
- Modify dashboard message pages — Replace setInterval polling with Pusher

**Phase 4 — Video Processing & Content Pipeline**
- `lib/inngest/functions/video-pipeline.ts` — Multi-step FFmpeg processing
- `lib/inngest/functions/video-clean-render.ts` — Clean version on approval
- `lib/services/revision.service.ts` — Bounded revision cycle workflow
- `app/api/files/initiate-upload/route.ts` — S3 multipart upload initiation
- `app/api/files/complete-upload/route.ts` — Multipart completion
- `app/api/files/[id]/stream/route.ts` — Secure HLS streaming
- `app/api/deals/[id]/revisions/route.ts` — Revision CRUD
- `app/api/deals/[id]/revisions/[revisionId]/review/route.ts` — Approve/request revision
- Modify `lib/services/file.service.ts` — Add multipart upload support

**Phase 5 — Notifications, KYB & Wallet**
- `lib/services/notification.service.ts` — Notification routing + preferences
- `lib/inngest/functions/notifications.ts` — Dispatch, batching, thundering herd prevention
- `lib/services/kyb.service.ts` — GSTIN verification (Gridlines/HyperVerge)
- `lib/inngest/functions/gstin-recheck.ts` — Monthly GSTIN re-verification cron
- `app/api/notifications/route.ts` — List/read notifications
- `app/api/notifications/preferences/route.ts` — Preference management
- `app/api/wallet/route.ts` — Balance, withdraw, transaction history
- `app/api/auth/kyb/route.ts` — KYB endpoint
- Modify `lib/services/escrow.service.ts` — Credit wallet on fund release

**Phase 6 — Admin & Hardening**
- Admin dispute split-screen UI
- Financial audit trail view
- KYC/KYB escalation queue
- Fraud detection (engagement anomalies)
- Batch admin actions
- Edge case handlers (API outages, interrupted uploads, inactivity auto-cancel)
- OAuth social account linking (stretch)

**Frontend (deferred across all phases)**
- Brand dashboard: campaign management UI (create, list, status actions)
- Creator dashboard: campaign discovery UI (entity selector, browse, apply)
- Deal negotiation: lock UI (countdown timer, accept/reject)
- Notification bell component
- Wallet UI

---

## Context

Influencer Connect is a multi-entity influencer-brand marketplace for the Indian market. The existing codebase (Next.js 16, Prisma 7, PostgreSQL, TypeScript) has a solid MVP with auth, deal lifecycle, escrow (50/50), basic chat with keyword-based PII detection, S3 file management, KYC via Digio, tax compliance (GST/TDS), and admin dashboard. However, multiple critical systems from the spec remain unbuilt: multi-entity social management, campaign marketplace, tiered visibility, real-time chat, video watermarking/DRM, wallet system, notification engine, and robust PII detection. The T+2 escrow release currently uses `setTimeout` (lost on restart). Scale target: 10k creators, 5-10k brands.

**Timezone**: All timestamps, cron schedules, campaign publish times, escrow release windows, lock expiries, and user-facing dates/times operate in **IST (Asia/Kolkata, UTC+5:30)**. The database stores timestamps in UTC but all business logic, display, and scheduling must convert to/from IST. Set `TZ=Asia/Kolkata` in environment config. The platform supports only **Instagram, YouTube, and Facebook** as social platforms.

---

## Phase 1: Database Schema Evolution & Core Infrastructure (Week 1-3) ✅ IMPLEMENTED

### 1.1 New Prisma Enums

Add to `prisma/schema.prisma`:

```
SocialPlatform: INSTAGRAM, YOUTUBE, FACEBOOK
ContentFormat: REEL, SHORT, VIDEO, POST, STORY, CAROUSEL
CampaignStatus: DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
CampaignApplicationStatus: PENDING, ACCEPTED, REJECTED, WITHDRAWN
DealMilestoneStatus: PENDING, IN_PROGRESS, COMPLETED, SKIPPED
RevisionStatus: PENDING, APPROVED, REVISION_REQUESTED
VideoAssetStatus: UPLOADING, PROCESSING, WATERMARKING, PACKAGING, READY, APPROVED, FAILED
WalletTransactionType: CREDIT, DEBIT, WITHDRAWAL, REFUND
WalletTransactionStatus: PENDING, COMPLETED, FAILED
NotificationType: DEAL_CREATED, DEAL_STATUS_CHANGED, PAYMENT_RECEIVED, PAYMENT_REQUIRED, SCRIPT_APPROVED, REVISION_REQUESTED, DELIVERY_UPLOADED, DISPUTE_RAISED, DISPUTE_RESOLVED, CAMPAIGN_PUBLISHED, APPLICATION_RECEIVED, APPLICATION_ACCEPTED, APPLICATION_REJECTED, WALLET_CREDIT, WALLET_WITHDRAWAL, KYC_VERIFIED, PII_WARNING, SYSTEM_ANNOUNCEMENT
PIIDetectedType: PHONE_NUMBER, EMAIL_ADDRESS, AADHAAR_NUMBER, PAN_NUMBER, BANK_ACCOUNT, UPI_ID, EXTERNAL_URL, SOCIAL_HANDLE
PIISeverity: LOW, MEDIUM, HIGH, CRITICAL
PIIAction: WARNED, REDACTED, BLOCKED, SHADOW_BLOCKED
WarningType: PII_LEAK, PLATFORM_LEAKAGE, ABUSIVE_CONTENT, SPAM, FRAUD_ATTEMPT
```

Modify existing `DealStatus` enum - add: `LOCKED`, `REVISION_PENDING`

### 1.2 New Models

**SocialEntity** (core of multi-entity system):
- `id`, `masterId` (FK User), `platform` (SocialPlatform), `handle`, `followerCount`, `engagementRate`
- Per-entity reputation: `rating`, `totalDeals`, `completionScore`
- OAuth: `isVerified`, `oauthTokenEncrypted` (AES-256-GCM, key from `OAUTH_ENCRYPTION_KEY` env var, never log decrypted), `tokenExpiresAt`
- Discovery: `audienceDemographics` (JSON), `niche` (String[]), `categories` (String[]), `portfolioItems` (JSON)
- `isActive`, timestamps
- Unique constraint: `@@unique([masterId, platform, handle])`
- Critical indexes: `[platform, followerCount]`, `[platform, engagementRate]`, `[rating]`, `[niche]` (GIN), `[masterId]`

**Campaign**:
- `id`, `brandId` (FK BrandProfile), `title`, `description`, `niche` (String[]), `minFollowers`, `maxFollowers`
- `contentFormat` (ContentFormat[]), `duration`, `ownershipTransfer`, `budget`, `status`, `visibilityTier`
- `publishedAt`, `expiresAt`, timestamps
- Indexes: `[status, publishedAt]`, `[niche]` (GIN), `[minFollowers, maxFollowers]`, `[brandId]`

**CampaignApplication**:
- `id`, `campaignId` (FK Campaign), `entityId` (FK SocialEntity), `applicantId` (FK User)
- `creatorMessage`, `proposedRate`, `status`, `appliedAt`, `reviewedAt`
- Unique: `@@unique([campaignId, entityId])`

**DealMilestone**:
- `id`, `dealId` (FK Deal), `title`, `description`, `dueDate`, `status`, `completedAt`, `sortOrder`

**DealRevision**:
- `id`, `dealId` (FK Deal), `revisionNumber`, `feedback`, `videoUrl`, `watermarkedUrl`, `cleanUrl`, `status`
- Unique: `@@unique([dealId, revisionNumber])`

**ExclusiveNegotiation**:
- `id`, `dealId` (FK Deal), `entityId` (FK SocialEntity), `lockedAt`, `expiresAt` (48h), `isActive`, `releasedAt`
- Constraint: one active lock per entity at a time
- **Enforcement**: Filtered unique index via raw SQL migration: `CREATE UNIQUE INDEX "ExclusiveNegotiation_entityId_active" ON "ExclusiveNegotiation" ("entityId") WHERE "isActive" = true` (Prisma doesn't support partial unique indexes natively)

**Wallet**:
- `id`, `userId` (FK User, unique), `balance`, `totalEarned`, `totalWithdrawn`, `lastTransactionAt`

**WalletTransaction**:
- `id`, `walletId` (FK Wallet), `type`, `amount`, `dealId`, `description`, `status`, `bankTransactionId`

**Notification**:
- `id`, `userId` (FK User), `type`, `title`, `message`, `data` (JSON), `read`, `readAt`, `createdAt`
- Index: `[userId, read, createdAt]` (covers unread notification query)

**NotificationPreference**:
- `id`, `userId` (FK User), `type` (NotificationType), `email`, `push`, `inApp`
- Unique: `@@unique([userId, type])`

**VideoAsset**:
- `id`, `dealId` (FK Deal), `revisionId` (FK DealRevision nullable), `deliverableId` (FK Deliverable nullable, 1:1), `originalUrl`, `watermarkedUrl`, `cleanUrl`, `hlsUrl`, `thumbnailUrl`
- `duration`, `resolution`, `fileSize`, `codec`, `watermarkConfig` (JSON), `drmKeyId`, `status`
- **Link to Deliverable**: VideoAsset is created when `complete-upload` fires the video-pipeline Inngest event. One Deliverable maps to one VideoAsset.

**GSTStatusLog**:
- `id`, `brandProfileId` (FK BrandProfile), `previousStatus`, `newStatus`, `checkedAt`, `rawResponse` (JSON)

**PIIViolation**:
- `id`, `userId` (FK User), `chatMessageId` (FK ChatMessage nullable), `detectedType`, `originalContent`, `redactedContent`, `severity`, `actionTaken`

**UserWarning**:
- `id`, `userId` (FK User), `warningType`, `count`, `lastWarningAt`, `shadowBlocked`, `shadowBlockedAt`
- Unique: `@@unique([userId, warningType])`

### 1.3 Modifications to Existing Models

**Deal**: Add nullable FKs `entityId` (SocialEntity), `campaignId` (Campaign), `maxRevisions` (default 2), `currentRevision` (default 0). New indexes: `[entityId]`, `[campaignId]`, `[brandId, status]`, `[creatorId, status]`, `[payment100PaidAt]`.

**BrandProfile**: Add KYB fields: `gstin` (unique), `gstinVerified`, `gstinVerifiedAt`, `registeredAddress`, `filingStatus`, `gstStatusLastChecked`. Add relation to `Campaign[]`, `GSTStatusLog[]`.

**ChatMessage**: Add relation to `PIIViolation[]`. New index: `[dealId, createdAt]`.

**User**: Add relations: `socialEntities`, `wallet`, `notifications`, `notificationPrefs`, `piiViolations`, `userWarnings`. New indexes: `[role]`, `[createdAt]`.

### 1.4 Migration Strategy

All changes are **additive** (no breaking changes):
1. Add new enums
2. Add new tables (no FK to existing data initially)
3. Add nullable columns to Deal, BrandProfile, User
4. Add new indexes on existing tables
5. Add GIN indexes via raw SQL: `CREATE INDEX ... USING GIN ("niche")` on SocialEntity and Campaign

**Data backfill scripts** (run after migration):
- Populate `SocialEntity` from `CreatorProfile.socialPlatforms` JSON
- Create `Wallet` for all existing users
- Reconcile wallet balances from `EscrowTransaction` + `CreatorProfile.totalEarnings`

### 1.5 Background Job Infrastructure (Inngest)

**Why Inngest**: Serverless-native, works with Next.js App Router via `app/api/inngest/route.ts`, built-in retry/backoff/cron, free tier 5k runs/mo ($50/mo for 25k). No separate worker process needed.

**New files**:
- `lib/inngest/client.ts` - Inngest client singleton
- `app/api/inngest/route.ts` - Inngest serve endpoint
- `lib/inngest/functions/escrow-release.ts` - Replace `setTimeout` in `escrow.service.ts:282` with `step.sleep('t-plus-2', process.env.ESCROW_RELEASE_DELAY ?? '48h')`. Set `ESCROW_RELEASE_DELAY=30s` in dev/test for fast iteration.
- `lib/inngest/functions/cleanup.ts` - File cleanup, OAuth refresh, inactivity checks

**Modify**: `lib/services/escrow.service.ts` - Replace `setTimeout` (line 282) with `inngest.send({ name: 'deal/payment-completed', data: { dealId } })`

### 1.6 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add all new models, enums, relations, indexes |
| `prisma/migrations/` | Create | Multiple migration files (enums → tables → columns → indexes) |
| `prisma/seed.ts` | Modify | Add seed data for SocialEntity, Wallet, sample Campaigns |
| `lib/inngest/client.ts` | Create | Inngest client initialization |
| `app/api/inngest/route.ts` | Create | Inngest serve endpoint |
| `lib/inngest/functions/escrow-release.ts` | Create | T+2 escrow release function |
| `lib/inngest/functions/cleanup.ts` | Create | Cron: file cleanup, inactivity checks |
| `lib/services/escrow.service.ts` | Modify | Replace setTimeout with Inngest event |
| `lib/services/social-entity.service.ts` | Create | CRUD for social entities |
| `lib/services/wallet.service.ts` | Create | Wallet operations (credit, debit, withdraw) |
| `lib/validations.ts` | Modify | Add Zod schemas for new models |

---

## Phase 2: Campaign Marketplace & Discovery (Week 4-5) ✅ IMPLEMENTED

### 2.1 Campaign Service (`lib/services/campaign.service.ts`)

- `createCampaign(brandId, data)` - Create with niche, follower range, content format, budget, ownership transfer flag
- `publishCampaign(campaignId)` - Set status ACTIVE, set publishedAt, emit visibility event
- `pauseCampaign(campaignId)` / `cancelCampaign(campaignId)`
- `discoverCampaigns(entityId, filters)` - Returns campaigns matching entity's platform, niche, follower count, respecting visibility tier
- `applyCampaign(entityId, campaignId, message, proposedRate)` - Enforces unique application per entity
- `reviewApplication(applicationId, status)` - Brand accepts/rejects. On accept, creates Deal linked to campaign + entity

### 2.2 Trickle-Down Visibility Logic

Implemented as Inngest cron function (`lib/inngest/functions/campaign-visibility.ts`):
- On campaign publish: visibility starts at tier 1 (rating 4.0-5.0 only)
- After 1 hour: tier 2 (3.0-4.0)
- After 2 hours: tier 3 (all creators)
- Query filter in `discoverCampaigns`: `WHERE publishedAt + interval based on creator rating <= NOW()`
- Uses Redis sorted set for fast tier lookup: `ic:campaign_vis:{campaignId}` (TTL 24h) with score = tier unlock timestamp
- **Redis convention**: Reuse existing Upstash Redis instance. All keys prefixed with `ic:`. PII tracking: `ic:pii:{userId}` (TTL 90d). Rate limiting: `ic:rate:{key}` (existing).

### 2.3 Profile Completion Algorithm

Service method on `SocialEntity`: `calculateCompletionScore(entityId)`:
- Bio: 10%, Niche/Category: 15%, Portfolio: 25%, Audience Demographics: 30%, OAuth Connected: 20%
- `completionScore = sum(weight * (field_filled ? 1 : 0)) * 100`
- Stored on `SocialEntity.completionScore`, recalculated on profile update
- Used as secondary sort in discovery: `ORDER BY completionScore DESC` after primary filters

### 2.4 Lock Deal & Exclusive Negotiation

When brand accepts application or initiates deal from chat:
1. Check `ExclusiveNegotiation` table: entity must have no active lock
2. Create lock with 48h expiry
3. Deal status → `LOCKED`
4. Brand fills milestone form (deliverables, revision count, deadlines, payment)
5. Creator accepts → Deal moves to `SCRIPT_PENDING`, lock persists until deal completes/cancels
6. Creator rejects → Lock released, deal cancelled
7. Expired locks: Inngest cron releases them every hour

### 2.5 New API Routes

```
POST   /api/campaigns                    - Create campaign (brand, KYC required)
GET    /api/campaigns                    - Role-based: brand sees own campaigns, creator sees discovery with visibility tier filtering. Admin: `?mode=discover|manage` override.
GET    /api/campaigns/[id]               - Campaign details
PATCH  /api/campaigns/[id]               - Update/pause/cancel campaign
POST   /api/campaigns/[id]/apply         - Creator applies with social entity
GET    /api/campaigns/[id]/applications  - Brand views applications
PATCH  /api/campaigns/[id]/applications/[appId] - Accept/reject application
GET    /api/social-entities              - List creator's entities
POST   /api/social-entities              - Add social entity
PATCH  /api/social-entities/[id]         - Update entity profile
DELETE /api/social-entities/[id]         - Deactivate entity
GET    /api/social-entities/[id]/completion - Profile completion breakdown
POST   /api/deals/[id]/lock              - Lock deal (exclusive negotiation)
POST   /api/deals/[id]/lock/accept       - Creator accepts lock
POST   /api/deals/[id]/lock/reject       - Creator rejects lock
```

### 2.6 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/services/campaign.service.ts` | Create | Campaign CRUD, discovery, application management |
| `lib/services/social-entity.service.ts` | Modify | Add completion score, discovery queries |
| `lib/services/deal.service.ts` | Create | Lock deal, exclusive negotiation logic |
| `lib/inngest/functions/campaign-visibility.ts` | Create | Hourly trickle-down cron |
| `lib/inngest/functions/deal-locks.ts` | Create | Expired lock cleanup cron |
| `app/api/campaigns/route.ts` | Create | Campaign list/create endpoints |
| `app/api/campaigns/[id]/route.ts` | Create | Campaign detail/update |
| `app/api/campaigns/[id]/apply/route.ts` | Create | Apply to campaign |
| `app/api/campaigns/[id]/applications/route.ts` | Create | View applications |
| `app/api/social-entities/route.ts` | Create | Entity CRUD |
| `app/api/social-entities/[id]/route.ts` | Create | Entity detail/update |
| `app/api/deals/[id]/lock/route.ts` | Create | Lock deal endpoints |
| `app/api/influencers/route.ts` | Modify | Use SocialEntity for discovery instead of CreatorProfile JSON |
| `app/api/deals/route.ts` | Modify | Accept optional `entityId` and `campaignId` when creating deals from accepted applications |
| `app/api/deals/[id]/route.ts` | Modify | Support entityId/campaignId in deal detail |
| `lib/validations.ts` | Modify | Add campaign, entity, lock schemas |
| Dashboard pages (brand/influencer) | Modify | Campaign browse, entity management, lock UI |

---

## Phase 3: Real-Time Chat & Enhanced PII Detection (Week 6-7)

### 3.1 Real-Time Chat (Pusher)

**Why Pusher**: Free tier 200k msgs/day, 100 connections. Startup plan ($49/mo) handles 10k connections. No persistent server needed (works with serverless Next.js). Migration path to Socket.io + Redis later.

**New dependencies**: `pusher` (server), `pusher-js` (client)

**Channel design**:
- `private-deal-{dealId}` - Messages, typing, read receipts per deal
- `private-user-{userId}` - Notifications, online status per user

**Events**: `new-message`, `typing-start`, `typing-stop`, `read-receipt`, `message-flagged`, `system-notification`

**Integration**:
- `lib/pusher.ts` - Server-side Pusher singleton
- `lib/hooks/use-pusher.ts` - Client-side React hook
- `app/api/pusher/auth/route.ts` - Private channel authentication
- Modify `lib/services/chat.service.ts` - After `prisma.chatMessage.create()` (line 87), trigger Pusher event
- Modify `app/dashboard/brand/messages/page.tsx` - Replace `setInterval` polling with Pusher subscription
- Modify `app/dashboard/influencer/messages/page.tsx` - Same treatment

### 3.2 Enhanced PII Detection (`lib/services/pii.service.ts`)

Replace basic keyword matching in `chat.service.ts` (lines 3-57) with comprehensive regex engine:

**Indian-specific patterns**:
- Phone: `(?:\+91[\s-]?)?[6-9]\d{9}` (Indian mobile prefix 6-9)
- UPI: `[a-zA-Z0-9._-]+@(?:okaxis|okhdfcbank|okicici|oksbi|ybl|paytm|gpay|phonepe|...)`
- Aadhaar: `[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}` (starts with 2-9)
- PAN: `[A-Z]{5}\d{4}[A-Z]`
- Text-spelled numbers: `(?:zero|one|two|...){7,}` and Hindi: `(?:ek|do|teen|char|...){7,}`
- Platform keywords: whatsapp, telegram, signal, dm me, call me, etc.

**Escalation tracking** (Redis sorted set `ic:pii:{userId}`):
- 1st violation: Soft warning toast
- 3rd violation: Hard redaction mode (PII replaced with `[REDACTED]` in recipient view)
- 5th violation: Shadow block (sender sees message as sent, recipient never receives)
- 10th violation: Auto-ban

**Integration**: PII scan runs synchronously before message save (~2-5ms regex). Escalation level fetched from Redis. Results stored in `PIIViolation` and `UserWarning` tables.

### 3.3 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/pusher.ts` | Create | Server-side Pusher client |
| `lib/hooks/use-pusher.ts` | Create | Client-side Pusher hook |
| `app/api/pusher/auth/route.ts` | Create | Private channel auth |
| `app/api/chat/[dealId]/typing/route.ts` | Create | Typing indicator endpoint |
| `app/api/chat/[dealId]/read/route.ts` | Create | Read receipt endpoint |
| `lib/services/pii.service.ts` | Create | Comprehensive PII detection engine |
| `lib/services/chat.service.ts` | Modify | Integrate Pusher + PII service, replace keyword matching |
| `app/dashboard/brand/messages/page.tsx` | Modify | Replace polling with Pusher |
| `app/dashboard/influencer/messages/page.tsx` | Modify | Replace polling with Pusher |
| `app/dashboard/admin/flagged-messages/page.tsx` | Modify | Show PII violation details, undo redaction |

---

## Phase 4: Video Processing & Content Pipeline (Week 8-10)

### 4.1 Resumable Multipart Upload

Modify `lib/services/file.service.ts` to support S3 multipart uploads:

**New endpoints**:
- `POST /api/files/initiate-upload` - Returns S3 multipart upload ID + presigned URLs per part
- `POST /api/files/complete-upload` - Completes multipart, creates Deliverable, emits processing event

Client uploads parts directly to S3 (browser → S3), bypassing Next.js for large files. Use `tus-js-client` for automatic retry/resume of interrupted uploads.

### 4.2 Video Processing Pipeline (FFmpeg on AWS Lambda)

**Why Lambda**: Videos max 60s at 1080p (~100-300MB). FFmpeg transcode + watermark takes ~30-90s at 3GB RAM. Cost: ~$0.003/video. At 1000 videos/month = $3/mo vs Cloudinary $89/mo.

**Lambda packaging**: Use **Docker container image** (pushed to ECR), not Lambda layers. FFmpeg binary (~100MB) with dependencies exceeds the 250MB layer limit. Inngest event passes S3 key(s); Lambda streams input from S3 and writes output back to S3.

**Pipeline** (Inngest step function `lib/inngest/functions/video-pipeline.ts`):
1. **Validate & extract metadata** - Duration, resolution, codec check
2. **Transcode** to H.264/AAC 1080p (Lambda Docker container + FFmpeg)
3. **Apply dynamic watermark** - Brand name + date + "DRAFT ONLY", repositions every 10s via FFmpeg drawtext expression cycling through 4 corner positions
4. **Generate HLS segments** - `ffmpeg -hls_time 6 -hls_list_size 0`
5. **Upload processed files to S3** - `/processed/{dealId}/watermarked/`, `/processed/{dealId}/hls/`
6. **Update DB status** → READY

**On final approval**: Separate Inngest function re-transcodes from raw (no watermark) → `/processed/{dealId}/clean/` → enables download

**Secure playback**: New route `app/api/files/[id]/stream/route.ts` generates short-lived (15min) presigned URL for HLS manifest. Client uses `hls.js` player. No direct S3 URLs exposed.

**S3 lifecycle rules**:
- `raw/` → Glacier after 7 days, delete after 30 days
- `processed/` → Delete 30 days after deal completion

### 4.3 Content Revision Pipeline

Enhances existing deal workflow with bounded revision cycles:

**Flow**: Script Approval → 1st Draft → Brand Review → Revision Request (bounded by `maxRevisions`) → Final Approval

- Brand provides text feedback per revision
- System creates `DealRevision` record with `revisionNumber`
- If `currentRevision >= maxRevisions`, disable "Request Revision" button, show "Add Revision Extension" (additional fee)
- On final approval: emit `deal/deliverable-approved` Inngest event → triggers clean render + escrow release

### 4.4 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/inngest/functions/video-pipeline.ts` | Create | Multi-step video processing |
| `lib/inngest/functions/video-clean-render.ts` | Create | Clean version on approval |
| `lib/services/file.service.ts` | Modify | Add multipart upload, processing status tracking |
| `lib/services/revision.service.ts` | Create | Revision workflow, bounded cycles |
| `app/api/files/initiate-upload/route.ts` | Create | Multipart upload initiation |
| `app/api/files/complete-upload/route.ts` | Create | Multipart completion |
| `app/api/files/[id]/stream/route.ts` | Create | Secure HLS streaming |
| `app/api/deals/[id]/revisions/route.ts` | Create | Revision CRUD |
| `app/api/deals/[id]/revisions/[revisionId]/review/route.ts` | Create | Approve/request revision |

---

## Phase 5: Notification Engine & Brand KYB (Week 11-12)

### 5.1 Notification System

**Architecture**: Events emitted from services → Inngest function routes to channels → In-app (Pusher `private-user-{userId}`), Email (Resend, $0 for 3k emails/mo)

**Thundering herd prevention** for campaign announcements: Tiered batch delivery via Inngest step function. Platinum creators (4.5+) notified immediately, then Gold (3.5+) after 60s, Silver (2.5+) after 5min, Bronze after 10min. Each tier processed in batches of 100.

**Integration points** (every existing route that changes deal state emits notification event):
- `escrow.service.ts` - Payment events (replace TODO comments at lines 143, 183)
- `chat.service.ts` - Offline message notifications (replace TODO at line 170)
- `mediation.service.ts` - Dispute actions
- `kyc.service.ts` - KYC status changes
- All new campaign/application endpoints

**New API routes**:
```
GET  /api/notifications              - List notifications (paginated)
PUT  /api/notifications/[id]/read    - Mark as read
PUT  /api/notifications/read-all     - Mark all as read
GET  /api/notifications/unread-count - Badge counter
GET  /api/notifications/preferences  - Get preferences
PUT  /api/notifications/preferences  - Update preferences
```

### 5.2 Brand KYB (GSTIN Verification)

- Integrate GSTN API (via Gridlines/HyperVerge) for business validation
- On GSTIN submission: verify business name, registered address, filing status
- Award "Verified Brand" badge only after successful validation
- Store GST details in BrandProfile (new fields from Phase 1)
- Periodic re-verification cron (monthly): check filing status, trigger "Identity Risk" alert if status changes to Suspended/Cancelled, pause active campaigns
- Log all status changes in `GSTStatusLog` table
- Auto-generate B2B tax-compliant invoices with correct GST headers

**New files**: `lib/services/kyb.service.ts`, `app/api/auth/kyb/route.ts`, `lib/inngest/functions/gstin-recheck.ts`

### 5.3 Wallet Integration

Modify `escrow.service.ts` `releaseFundsToCreator()` to credit Wallet instead of direct transfer:
1. On T+2 release: `wallet.credit(userId, netPayout, dealId)` — **net amount = gross - platformFee (10%) - TDS (1%/2%)**. Fee breakdown stays in `EscrowTransaction`; Wallet only records the net credit.
2. Creator requests withdrawal from wallet → `wallet.withdraw(userId, amount, bankDetails)`
3. Withdrawal processed via Razorpay Payout API

**New API routes**:
```
GET  /api/wallet              - Balance, recent transactions
POST /api/wallet/withdraw     - Request withdrawal
GET  /api/wallet/transactions - Transaction history (paginated)
```

### 5.4 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/services/notification.service.ts` | Create | Notification routing, preferences |
| `lib/inngest/functions/notifications.ts` | Create | Notification dispatch, batching, thundering herd |
| `app/api/notifications/route.ts` | Create | List/read notifications |
| `app/api/notifications/preferences/route.ts` | Create | Preference management |
| `lib/services/kyb.service.ts` | Create | GSTIN verification |
| `app/api/auth/kyb/route.ts` | Create | KYB endpoint |
| `lib/inngest/functions/gstin-recheck.ts` | Create | Monthly GSTIN re-verification |
| `lib/services/escrow.service.ts` | Modify | Credit wallet on fund release |
| `lib/services/wallet.service.ts` | Modify | Add withdrawal logic |
| `app/api/wallet/route.ts` | Create | Wallet endpoints |
| Components: notification bell, wallet UI | Create | Frontend components |

---

## Phase 6: Admin Enhancements, Edge Cases & Hardening (Week 13-14)

### 6.1 Admin Panel Enhancements

- **Dispute split-screen**: Side-by-side view of approved script vs uploaded draft for quick mediation
- **Financial audit trail**: Unalterable view of all wallet/escrow movements (already have AuditLog, add dedicated finance view)
- **KYC/KYB escalation queue**: Cases where automated verification fails, manual document review
- **Fraud detection**: Flag entities with suspicious engagement patterns (follower-to-engagement ratio anomalies)
- **Batch actions**: Bulk approve/reject applications, bulk ban users

### 6.2 Edge Case Handling

| Scenario | Implementation |
|----------|---------------|
| Aadhaar/GST API outage | Set user to "PENDING_VERIFICATION" state, allow profile setup but block deal locking. Retry via Inngest with backoff. |
| Interrupted video upload | Resumable multipart (Phase 4). Track partial state in DB via `VideoAssetStatus.UPLOADING`. |
| Wallet insufficiency | Check brand wallet/payment before broadcasting lock. Redirect to "Add Money" if insufficient. |
| Expired OAuth tokens | Daily Inngest cron checks `tokenExpiresAt`. Hide entity from discovery, send "Entity Sync Required" notification. |
| Creator inactivity (48h) | Inngest cron checks deals in PRODUCTION/SCRIPT_PENDING with no activity >48h. Send warning at 24h, enable "One-Click Cancel" for brand at 48h with 100% refund. |
| Malicious revisions | `currentRevision >= maxRevisions` → disable revision button. Brand must purchase "Revision Extension" add-on. |
| Chat circumvention | Enhanced PII engine (Phase 3) with shadow blocking. 3+ mentions of WhatsApp/Paytm/GPay → auto shadow block. |
| Duplicate OAuth accounts | Unique constraint `[masterId, platform, handle]` prevents same account linked twice. Cross-user check: if same handle+platform exists for different user, flag for admin review. |

### 6.3 OAuth Social Account Linking (Stretch)

- Instagram Graph API, YouTube Data API, Facebook Graph API integration
- Pull follower counts, engagement metrics, verify account ownership
- Token refresh via daily Inngest cron
- On token expiry: hide entity from discovery, notify creator

---

## Infrastructure Cost Summary (10k users)

| Component | Monthly Cost |
|-----------|-------------|
| Supabase PostgreSQL (Pro) | $25 |
| Vercel Hosting (Pro) | $20 |
| Pusher (Startup plan, 10k connections) | $49 |
| Inngest (Growth plan, 25k runs) | $50 |
| AWS Lambda (video processing, ~1000 videos) | ~$5 |
| AWS S3 (storage + transfer) | ~$20 |
| Resend email (~20k emails) | $20 |
| Upstash Redis (rate limiting + PII tracking) | $10 |
| **Total** | **~$199/mo** |

---

## Verification Plan

After each phase, verify with:

1. **Phase 1** ✅: Run `prisma migrate deploy` successfully. Seed DB. Verify Inngest dashboard shows escrow-release function. Test T+2 release fires correctly (set `ESCROW_RELEASE_DELAY=30s` in `.env.test`). **Status**: All code implemented, TypeScript passes. Deploy-time steps (migrations, GIN indexes, seed) pending database connection.

2. **Phase 2** ✅: Create campaign as brand → verify tiered visibility (check at 0h, 1h, 2h). Apply as creator → verify exclusive negotiation lock prevents second lock. Verify completion score updates on profile change. **Status**: All services, routes, and Inngest functions implemented. TypeScript passes. Frontend dashboard UI deferred.

3. **Phase 3**: Send message → verify appears in real-time (no page refresh). Send phone number → verify soft warning. Send 3 violations → verify hard redaction. Send 5 → verify shadow block.

4. **Phase 4**: Upload 60s video → verify watermark appears at 4 positions. Verify HLS playback works. Approve final → verify clean download available. Test resumable upload by killing connection mid-upload.

5. **Phase 5**: Trigger deal status change → verify notification appears. Verify GSTIN validation. Verify wallet credit on T+2 release, withdrawal request.

6. **Phase 6**: Test API outage fallback. Test 48h inactivity auto-cancel. Verify admin dispute split-screen. Load test with 100 concurrent chat connections.

---

## Key Files Reference

| Existing File | Modifications Needed | Status |
|--------------|---------------------|--------|
| `prisma/schema.prisma` | All new models, enums, indexes (Phase 1) | **DONE** |
| `lib/services/escrow.service.ts` | Replace setTimeout:282 with Inngest, credit wallet (Phase 1, 5) | **DONE** (Phase 1: Inngest) |
| `lib/services/chat.service.ts` | Integrate Pusher + PII service (Phase 3) | PENDING |
| `lib/services/file.service.ts` | Multipart upload, video processing (Phase 4) | PENDING |
| `lib/validations.ts` | Add schemas for all new models (Phase 1-5) | **DONE** (Phase 1-2 schemas) |
| `app/api/influencers/route.ts` | Use SocialEntity for discovery (Phase 2) | **DONE** |
| `app/api/deals/route.ts` | Accept entityId, campaignId (Phase 2) | **DONE** |
| `app/dashboard/*/messages/page.tsx` | Replace polling with Pusher (Phase 3) | PENDING |
| `prisma/seed.ts` | Seed new tables (Phase 1) | **DONE** |
| `package.json` | Add: pusher, pusher-js, inngest, resend, tus-js-client, hls.js (Phase 1-5) | **DONE** (inngest) |
| `app/api/inngest/route.ts` | Register all Inngest functions | **DONE** (4 functions) |
