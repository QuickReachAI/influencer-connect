# Phase 1: Database Schema Evolution & Core Infrastructure

## 1. Overview

Phase 1 lays the foundation for all subsequent phases by extending the Prisma schema with 14 new models and 15 new enums, setting up Inngest for reliable background jobs (replacing the unsafe `setTimeout` in escrow), and creating the initial service layer for social entities and wallets.

**Delivers**: Extended database schema, background job infrastructure, social entity CRUD, wallet service skeleton, Zod validations for all new models.

**Dependencies**: None (this is the first phase).

---

## 2. Prerequisites

### npm packages to install

```bash
npm install inngest
```

### Environment variables to add (`.env`)

```env
# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
ESCROW_RELEASE_DELAY=48h          # Set to 30s in dev/test for fast iteration

# OAuth encryption (for SocialEntity token storage)
OAUTH_ENCRYPTION_KEY=your_32_byte_hex_key   # openssl rand -hex 32

# Timezone
TZ=Asia/Kolkata
```

### Prior phase completion checks

- N/A (first phase)

---

## 3. Schema Changes

### 3.1 New Enums

Add to `prisma/schema.prisma` after line 63 (after `KYCStatus` enum):

```prisma
// ============================================================================
// PHASE 1 ENUMS
// ============================================================================

enum SocialPlatform {
  INSTAGRAM
  YOUTUBE
  FACEBOOK
}

enum ContentFormat {
  REEL
  SHORT
  VIDEO
  POST
  STORY
  CAROUSEL
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum CampaignApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}

enum DealMilestoneStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum RevisionStatus {
  PENDING
  APPROVED
  REVISION_REQUESTED
}

enum VideoAssetStatus {
  UPLOADING
  PROCESSING
  WATERMARKING
  PACKAGING
  READY
  APPROVED
  FAILED
}

enum WalletTransactionType {
  CREDIT
  DEBIT
  WITHDRAWAL
  REFUND
}

enum WalletTransactionStatus {
  PENDING
  COMPLETED
  FAILED
}

enum NotificationType {
  DEAL_CREATED
  DEAL_STATUS_CHANGED
  PAYMENT_RECEIVED
  PAYMENT_REQUIRED
  SCRIPT_APPROVED
  REVISION_REQUESTED
  DELIVERY_UPLOADED
  DISPUTE_RAISED
  DISPUTE_RESOLVED
  CAMPAIGN_PUBLISHED
  APPLICATION_RECEIVED
  APPLICATION_ACCEPTED
  APPLICATION_REJECTED
  WALLET_CREDIT
  WALLET_WITHDRAWAL
  KYC_VERIFIED
  PII_WARNING
  SYSTEM_ANNOUNCEMENT
}

enum PIIDetectedType {
  PHONE_NUMBER
  EMAIL_ADDRESS
  AADHAAR_NUMBER
  PAN_NUMBER
  BANK_ACCOUNT
  UPI_ID
  EXTERNAL_URL
  SOCIAL_HANDLE
}

enum PIISeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum PIIAction {
  WARNED
  REDACTED
  BLOCKED
  SHADOW_BLOCKED
}

enum WarningType {
  PII_LEAK
  PLATFORM_LEAKAGE
  ABUSIVE_CONTENT
  SPAM
  FRAUD_ATTEMPT
}
```

### 3.2 Modify Existing `DealStatus` Enum

File: `prisma/schema.prisma:174`

```diff
 enum DealStatus {
   DRAFT
+  LOCKED
   SCRIPT_PENDING
   SCRIPT_APPROVED
   PAYMENT_50_PENDING
   PRODUCTION
   DELIVERY_PENDING
+  REVISION_PENDING
   PAYMENT_100_PENDING
   COMPLETED
   DISPUTED
   CANCELLED
 }
```

### 3.3 New Models

Add to `prisma/schema.prisma` before the `AuditLog` model (before line 288):

```prisma
// ============================================================================
// SOCIAL ENTITY MANAGEMENT (Multi-Entity System)
// ============================================================================

model SocialEntity {
  id                    String         @id @default(uuid())
  masterId              String
  master                User           @relation(fields: [masterId], references: [id], onDelete: Cascade)

  platform              SocialPlatform
  handle                String
  followerCount         Int            @default(0)
  engagementRate        Decimal        @default(0) @db.Decimal(5, 2)

  // Per-entity reputation
  rating                Decimal        @default(0) @db.Decimal(3, 2)
  totalDeals            Int            @default(0)
  completionScore       Decimal        @default(0) @db.Decimal(5, 2)

  // OAuth
  isVerified            Boolean        @default(false)
  oauthTokenEncrypted   String?        // AES-256-GCM, key from OAUTH_ENCRYPTION_KEY
  tokenExpiresAt        DateTime?

  // Discovery
  audienceDemographics  Json?          // { ageRanges, genders, topCities, topCountries }
  niche                 String[]       // e.g. ["beauty", "lifestyle"]
  categories            String[]       // e.g. ["skincare", "fashion"]
  portfolioItems        Json?          // [{ url, thumbnail, title, views }]

  isActive              Boolean        @default(true)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  // Relations
  deals                 Deal[]
  applications          CampaignApplication[]
  exclusiveNegotiations ExclusiveNegotiation[]

  @@unique([masterId, platform, handle])
  @@index([platform, followerCount])
  @@index([platform, engagementRate])
  @@index([rating])
  @@index([masterId])
  // GIN index on niche[] added via raw SQL migration (see section 9)
}

// ============================================================================
// CAMPAIGN MARKETPLACE
// ============================================================================

model Campaign {
  id              String          @id @default(uuid())
  brandId         String
  brand           BrandProfile    @relation(fields: [brandId], references: [id])

  title           String
  description     String
  niche           String[]        // e.g. ["beauty", "tech"]
  minFollowers    Int             @default(0)
  maxFollowers    Int             @default(999999999)
  contentFormat   ContentFormat[]
  duration        String?         // e.g. "30 days"
  ownershipTransfer Boolean       @default(false)
  budget          Decimal         @db.Decimal(12, 2)

  status          CampaignStatus  @default(DRAFT)
  visibilityTier  Int             @default(1)
  publishedAt     DateTime?
  expiresAt       DateTime?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  applications    CampaignApplication[]
  deals           Deal[]

  @@index([status, publishedAt])
  @@index([minFollowers, maxFollowers])
  @@index([brandId])
  // GIN index on niche[] added via raw SQL migration (see section 9)
}

model CampaignApplication {
  id              String                     @id @default(uuid())
  campaignId      String
  campaign        Campaign                   @relation(fields: [campaignId], references: [id])
  entityId        String
  entity          SocialEntity               @relation(fields: [entityId], references: [id])
  applicantId     String
  applicant       User                       @relation(fields: [applicantId], references: [id])

  creatorMessage  String?
  proposedRate    Decimal?                   @db.Decimal(10, 2)
  status          CampaignApplicationStatus  @default(PENDING)
  appliedAt       DateTime                   @default(now())
  reviewedAt      DateTime?

  @@unique([campaignId, entityId])
  @@index([campaignId, status])
  @@index([applicantId])
}

// ============================================================================
// DEAL MILESTONES & REVISIONS
// ============================================================================

model DealMilestone {
  id          String              @id @default(uuid())
  dealId      String
  deal        Deal                @relation(fields: [dealId], references: [id], onDelete: Cascade)

  title       String
  description String?
  dueDate     DateTime?
  status      DealMilestoneStatus @default(PENDING)
  completedAt DateTime?
  sortOrder   Int                 @default(0)

  @@index([dealId, sortOrder])
}

model DealRevision {
  id              String         @id @default(uuid())
  dealId          String
  deal            Deal           @relation(fields: [dealId], references: [id], onDelete: Cascade)

  revisionNumber  Int
  feedback        String?
  videoUrl        String?
  watermarkedUrl  String?
  cleanUrl        String?
  status          RevisionStatus @default(PENDING)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  videoAsset      VideoAsset?

  @@unique([dealId, revisionNumber])
  @@index([dealId])
}

// ============================================================================
// EXCLUSIVE NEGOTIATION (Deal Locking)
// ============================================================================

model ExclusiveNegotiation {
  id          String       @id @default(uuid())
  dealId      String
  deal        Deal         @relation(fields: [dealId], references: [id])
  entityId    String
  entity      SocialEntity @relation(fields: [entityId], references: [id])

  lockedAt    DateTime     @default(now())
  expiresAt   DateTime     // lockedAt + 48h
  isActive    Boolean      @default(true)
  releasedAt  DateTime?

  @@index([entityId, isActive])
  @@index([expiresAt])
  // Partial unique index added via raw SQL migration (see section 9)
}

// ============================================================================
// WALLET SYSTEM
// ============================================================================

model Wallet {
  id                String              @id @default(uuid())
  userId            String              @unique
  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  balance           Decimal             @default(0) @db.Decimal(12, 2)
  totalEarned       Decimal             @default(0) @db.Decimal(12, 2)
  totalWithdrawn    Decimal             @default(0) @db.Decimal(12, 2)
  lastTransactionAt DateTime?

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relations
  transactions      WalletTransaction[]
}

model WalletTransaction {
  id                String                  @id @default(uuid())
  walletId          String
  wallet            Wallet                  @relation(fields: [walletId], references: [id])

  type              WalletTransactionType
  amount            Decimal                 @db.Decimal(12, 2)
  dealId            String?
  description       String?
  status            WalletTransactionStatus @default(PENDING)
  bankTransactionId String?

  createdAt         DateTime                @default(now())

  @@index([walletId, createdAt])
  @@index([dealId])
}

// ============================================================================
// NOTIFICATION ENGINE
// ============================================================================

model Notification {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      NotificationType
  title     String
  message   String
  data      Json?            // { dealId, campaignId, etc. }
  read      Boolean          @default(false)
  readAt    DateTime?

  createdAt DateTime         @default(now())

  @@index([userId, read, createdAt])
}

model NotificationPreference {
  id     String           @id @default(uuid())
  userId String
  user   User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  type   NotificationType
  email  Boolean          @default(true)
  push   Boolean          @default(true)
  inApp  Boolean          @default(true)

  @@unique([userId, type])
}

// ============================================================================
// VIDEO ASSET MANAGEMENT
// ============================================================================

model VideoAsset {
  id              String           @id @default(uuid())
  dealId          String
  deal            Deal             @relation(fields: [dealId], references: [id])
  revisionId      String?          @unique
  revision        DealRevision?    @relation(fields: [revisionId], references: [id])
  deliverableId   String?          @unique
  deliverable     Deliverable?     @relation(fields: [deliverableId], references: [id])

  originalUrl     String
  watermarkedUrl  String?
  cleanUrl        String?
  hlsUrl          String?
  thumbnailUrl    String?

  duration        Int?             // seconds
  resolution      String?          // e.g. "1920x1080"
  fileSize        BigInt?
  codec           String?
  watermarkConfig Json?            // { brandName, date, positions }
  drmKeyId        String?
  status          VideoAssetStatus @default(UPLOADING)

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([dealId])
  @@index([status])
}

// ============================================================================
// KYB & COMPLIANCE
// ============================================================================

model GSTStatusLog {
  id              String       @id @default(uuid())
  brandProfileId  String
  brandProfile    BrandProfile @relation(fields: [brandProfileId], references: [id])

  previousStatus  String?
  newStatus       String
  checkedAt       DateTime     @default(now())
  rawResponse     Json?

  @@index([brandProfileId, checkedAt])
}

// ============================================================================
// PII DETECTION & USER WARNINGS
// ============================================================================

model PIIViolation {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  chatMessageId   String?
  chatMessage     ChatMessage?    @relation(fields: [chatMessageId], references: [id])

  detectedType    PIIDetectedType
  originalContent String
  redactedContent String?
  severity        PIISeverity
  actionTaken     PIIAction

  createdAt       DateTime        @default(now())

  @@index([userId, createdAt])
  @@index([chatMessageId])
}

model UserWarning {
  id              String      @id @default(uuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])

  warningType     WarningType
  count           Int         @default(1)
  lastWarningAt   DateTime    @default(now())
  shadowBlocked   Boolean     @default(false)
  shadowBlockedAt DateTime?

  @@unique([userId, warningType])
}
```

### 3.4 Modifications to Existing Models

#### User model (`prisma/schema.prisma:17-51`)

Add these relations inside the `User` model, after the existing relations (after line 46):

```diff
   disputesRaised    Deal[]            @relation("DisputeRaiser")
   mediatedDisputes  Deal[]            @relation("Mediator")
+
+  // Phase 1 relations
+  socialEntities        SocialEntity[]
+  wallet                Wallet?
+  notifications         Notification[]
+  notificationPrefs     NotificationPreference[]
+  piiViolations         PIIViolation[]
+  userWarnings          UserWarning[]
+  campaignApplications  CampaignApplication[]

   @@index([email])
   @@index([kycStatus])
   @@index([isBanned])
+  @@index([role])
+  @@index([createdAt])
```

#### Deal model (`prisma/schema.prisma:112-172`)

Add nullable FKs inside the `Deal` model, after `creatorId` (after line 117):

```diff
   creator     User       @relation("CreatorDeals", fields: [creatorId], references: [id])
+
+  // Phase 1 additions
+  entityId    String?
+  entity      SocialEntity? @relation(fields: [entityId], references: [id])
+  campaignId  String?
+  campaign    Campaign?     @relation(fields: [campaignId], references: [id])
+  maxRevisions    Int       @default(2)
+  currentRevision Int       @default(0)

   title       String
```

Add new relations and indexes at the end of the `Deal` model:

```diff
   deliverables       Deliverable[]
   chatMessages       ChatMessage[]
+  milestones         DealMilestone[]
+  revisions          DealRevision[]
+  videoAssets         VideoAsset[]
+  exclusiveNegotiations ExclusiveNegotiation[]

   @@index([brandId])
   @@index([creatorId])
   @@index([status])
   @@index([createdAt])
+  @@index([entityId])
+  @@index([campaignId])
+  @@index([brandId, status])
+  @@index([creatorId, status])
+  @@index([payment100PaidAt])
```

#### BrandProfile model (`prisma/schema.prisma:90-106`)

Add KYB fields inside `BrandProfile`, after `companySize` (after line 100):

```diff
   companySize     String?
+
+  // KYB fields (Phase 1)
+  gstin               String?   @unique
+  gstinVerified       Boolean   @default(false)
+  gstinVerifiedAt     DateTime?
+  registeredAddress   String?
+  filingStatus        String?
+  gstStatusLastChecked DateTime?
+
+  // Relations
+  campaigns           Campaign[]
+  gstStatusLogs       GSTStatusLog[]

   createdAt DateTime @default(now())
```

#### ChatMessage model (`prisma/schema.prisma:255-276`)

Add relation inside `ChatMessage`:

```diff
   flagReason  String?

   createdAt   DateTime    @default(now())
+
+  // Phase 1 relation
+  piiViolations PIIViolation[]

   @@index([dealId])
   @@index([createdAt])
   @@index([flagged])
+  @@index([dealId, createdAt])
```

#### Deliverable model (`prisma/schema.prisma:224-249`)

Add relation for VideoAsset:

```diff
   deletedAt     DateTime?
+
+  // Phase 1 relation
+  videoAsset    VideoAsset?

   @@index([dealId])
```

---

## 4. Service Layer

### 4.1 Inngest Client — `lib/inngest/client.ts` (NEW)

```typescript
import { Inngest } from 'inngest';

/**
 * Inngest client singleton.
 * All background jobs (escrow release, cron cleanup, campaign visibility,
 * notifications, video pipeline) use this client.
 *
 * @see https://www.inngest.com/docs/reference/client/create
 */
export const inngest = new Inngest({
  id: 'influencer-connect',
  /**
   * Event types used across the application.
   * Extend this as new events are added in later phases.
   */
});

// ---- Event type definitions ----

export type InngestEvents = {
  'deal/payment-completed': {
    data: {
      dealId: string;
    };
  };
  'deal/deliverable-approved': {
    data: {
      dealId: string;
      revisionId?: string;
    };
  };
  'deal/lock-expired': {
    data: {
      negotiationId: string;
    };
  };
  'campaign/published': {
    data: {
      campaignId: string;
    };
  };
  'video/process': {
    data: {
      dealId: string;
      deliverableId: string;
      s3Key: string;
    };
  };
  'video/clean-render': {
    data: {
      dealId: string;
      videoAssetId: string;
    };
  };
  'notification/send': {
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    };
  };
  'notification/batch-send': {
    data: {
      campaignId: string;
      type: string;
      title: string;
      message: string;
    };
  };
};
```

### 4.2 Inngest Serve Endpoint — `app/api/inngest/route.ts` (NEW)

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { escrowReleaseFunction } from '@/lib/inngest/functions/escrow-release';
// Import additional functions as they're created in later phases:
// import { campaignVisibilityFunction } from '@/lib/inngest/functions/campaign-visibility';
// import { dealLockCleanupFunction } from '@/lib/inngest/functions/deal-locks';
// import { videoPipelineFunction } from '@/lib/inngest/functions/video-pipeline';
// import { notificationDispatchFunction } from '@/lib/inngest/functions/notifications';
// import { gstinRecheckFunction } from '@/lib/inngest/functions/gstin-recheck';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    escrowReleaseFunction,
    // Add functions from later phases here
  ],
});
```

### 4.3 Escrow Release Function — `lib/inngest/functions/escrow-release.ts` (NEW)

Replaces `setTimeout` at `lib/services/escrow.service.ts:282-284`.

```typescript
import { inngest } from '@/lib/inngest/client';
import { escrowService } from '@/lib/services/escrow.service';

/**
 * Reliable T+2 escrow release.
 * Replaces the unsafe `setTimeout(48h)` in escrow.service.ts:282.
 * Uses Inngest step.sleep for durable, restart-safe delays.
 *
 * Trigger: 'deal/payment-completed' event
 * Behavior: Sleep for ESCROW_RELEASE_DELAY (default 48h), then release funds.
 */
export const escrowReleaseFunction = inngest.createFunction(
  {
    id: 'escrow-release',
    name: 'T+2 Escrow Release',
    retries: 3,
  },
  { event: 'deal/payment-completed' },
  async ({ event, step }) => {
    const { dealId } = event.data;

    // Durable sleep — survives server restarts
    // Set ESCROW_RELEASE_DELAY=30s in .env.test for fast iteration
    await step.sleep(
      'wait-for-inspection-window',
      process.env.ESCROW_RELEASE_DELAY ?? '48h'
    );

    // Release funds to creator wallet (modified in Phase 5 to credit wallet)
    await step.run('release-funds', async () => {
      await escrowService.releaseFundsToCreator(dealId);
    });

    return { dealId, status: 'released' };
  }
);
```

### 4.4 Cleanup Functions — `lib/inngest/functions/cleanup.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import { fileService } from '@/lib/services/file.service';

/**
 * Daily cron: clean up expired deliverable files.
 * Replaces manual cron setup — runs via Inngest scheduler.
 */
export const fileCleanupFunction = inngest.createFunction(
  {
    id: 'file-cleanup',
    name: 'Daily File Cleanup',
  },
  { cron: '0 2 * * *' }, // 2 AM IST daily
  async ({ step }) => {
    const deletedCount = await step.run('cleanup-expired-files', async () => {
      return await fileService.cleanupExpiredFiles();
    });

    return { deletedCount };
  }
);
```

### 4.5 Escrow Service Modification — `lib/services/escrow.service.ts`

Replace `setTimeout` block at lines 280-284 with Inngest event:

```typescript
// BEFORE (lib/services/escrow.service.ts:280-284):
// setTimeout(() => {
//     this.releaseFundsToCreator(dealId);
// }, 48 * 60 * 60 * 1000);

// AFTER:
import { inngest } from '@/lib/inngest/client';

// Inside handleFinalPaymentSuccess(), replace lines 282-284 with:
await inngest.send({
  name: 'deal/payment-completed',
  data: { dealId },
});
```

### 4.6 Social Entity Service — `lib/services/social-entity.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';
import type { SocialPlatform } from '@prisma/client';

interface CreateEntityInput {
  masterId: string;
  platform: SocialPlatform;
  handle: string;
  followerCount?: number;
  engagementRate?: number;
  niche?: string[];
  categories?: string[];
}

interface UpdateEntityInput {
  followerCount?: number;
  engagementRate?: number;
  niche?: string[];
  categories?: string[];
  audienceDemographics?: Record<string, unknown>;
  portfolioItems?: Record<string, unknown>[];
}

export class SocialEntityService {
  /**
   * Create a new social entity for a creator.
   * Enforces unique constraint [masterId, platform, handle].
   */
  async create(input: CreateEntityInput): Promise<any> {
    // Check for cross-user duplicate (same handle+platform, different user)
    const existing = await prisma.socialEntity.findFirst({
      where: {
        platform: input.platform,
        handle: input.handle,
        masterId: { not: input.masterId },
      },
    });

    if (existing) {
      throw new Error(
        'This social account is linked to another user. Flagged for admin review.'
      );
    }

    return prisma.socialEntity.create({
      data: {
        masterId: input.masterId,
        platform: input.platform,
        handle: input.handle,
        followerCount: input.followerCount ?? 0,
        engagementRate: input.engagementRate ?? 0,
        niche: input.niche ?? [],
        categories: input.categories ?? [],
      },
    });
  }

  /** List all active entities for a creator */
  async listByUser(masterId: string): Promise<any[]> {
    return prisma.socialEntity.findMany({
      where: { masterId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get single entity with ownership check */
  async getById(entityId: string, masterId: string): Promise<any> {
    const entity = await prisma.socialEntity.findUnique({
      where: { id: entityId },
    });
    if (!entity || entity.masterId !== masterId) {
      throw new Error('Entity not found or unauthorized');
    }
    return entity;
  }

  /** Update entity profile fields */
  async update(entityId: string, masterId: string, data: UpdateEntityInput): Promise<any> {
    await this.getById(entityId, masterId); // ownership check
    const updated = await prisma.socialEntity.update({
      where: { id: entityId },
      data,
    });
    // Recalculate completion score
    await this.recalculateCompletionScore(entityId);
    return updated;
  }

  /** Soft-deactivate entity (hide from discovery) */
  async deactivate(entityId: string, masterId: string): Promise<void> {
    await this.getById(entityId, masterId);
    await prisma.socialEntity.update({
      where: { id: entityId },
      data: { isActive: false },
    });
  }

  /**
   * Calculate profile completion score.
   * Bio: 10%, Niche/Category: 15%, Portfolio: 25%,
   * Audience Demographics: 30%, OAuth Connected: 20%
   * See PHASE_2 section 4.3 for discovery usage.
   */
  async recalculateCompletionScore(entityId: string): Promise<number> {
    const entity = await prisma.socialEntity.findUniqueOrThrow({
      where: { id: entityId },
      include: { master: { include: { creatorProfile: true } } },
    });

    let score = 0;
    const bio = entity.master.creatorProfile?.bio;
    if (bio && bio.length > 0) score += 10;
    if (entity.niche.length > 0 || entity.categories.length > 0) score += 15;
    if (entity.portfolioItems && Object.keys(entity.portfolioItems as object).length > 0) score += 25;
    if (entity.audienceDemographics && Object.keys(entity.audienceDemographics as object).length > 0) score += 30;
    if (entity.isVerified) score += 20;

    await prisma.socialEntity.update({
      where: { id: entityId },
      data: { completionScore: score },
    });

    return score;
  }
}

export const socialEntityService = new SocialEntityService();
```

### 4.7 Wallet Service — `lib/services/wallet.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';

export class WalletService {
  /**
   * Get or create wallet for a user.
   * Every user gets a wallet on first access.
   */
  async getOrCreateWallet(userId: string): Promise<any> {
    return prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Credit wallet (called by escrow release in Phase 5).
   * Net amount = gross - platformFee (10%) - TDS (1%/2%).
   * Fee breakdown stays in EscrowTransaction; Wallet records net credit.
   */
  async credit(
    userId: string,
    amount: number,
    dealId: string,
    description?: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);

    const tx = await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount,
          dealId,
          description: description ?? `Payout for deal ${dealId}`,
          status: 'COMPLETED',
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
          lastTransactionAt: new Date(),
        },
      }),
    ]);

    return tx;
  }

  /**
   * Debit wallet (for refunds, chargebacks).
   */
  async debit(
    userId: string,
    amount: number,
    dealId: string,
    description?: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < amount) {
      throw new Error('Insufficient wallet balance');
    }

    return prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          dealId,
          description: description ?? `Debit for deal ${dealId}`,
          status: 'COMPLETED',
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          lastTransactionAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Request withdrawal to bank account.
   * Actual payout processed via Razorpay Payout API (see PHASE_5 section 4.5).
   */
  async withdraw(
    userId: string,
    amount: number,
    description?: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < amount) {
      throw new Error('Insufficient wallet balance');
    }

    return prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount,
          description: description ?? 'Withdrawal to bank account',
          status: 'PENDING', // Becomes COMPLETED after Razorpay confirms
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          lastTransactionAt: new Date(),
        },
      }),
    ]);
  }

  /** Get paginated transaction history */
  async getTransactions(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ transactions: any[]; total: number }> {
    const wallet = await this.getOrCreateWallet(userId);

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return { transactions, total };
  }
}

export const walletService = new WalletService();
```

---

## 5. API Routes

No new API routes in Phase 1 beyond the Inngest serve endpoint (`app/api/inngest/route.ts` — see section 4.2). Social entity and wallet API routes are added in Phase 2 and Phase 5 respectively.

---

## 6. Inngest Functions

See section 4.3 (`escrow-release.ts`) and section 4.4 (`cleanup.ts`).

Register all functions in the Inngest serve endpoint at `app/api/inngest/route.ts` (section 4.2).

---

## 7. Validation Schemas

Add to `lib/validations.ts` after line 237 (end of file):

```typescript
// ============================================================================
// PHASE 1 — NEW MODEL VALIDATIONS
// ============================================================================

// Social Entity
export const socialEntityCreateSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'YOUTUBE', 'FACEBOOK']),
  handle: z.string().min(1, 'Handle is required').max(100),
  followerCount: z.number().min(0).optional(),
  engagementRate: z.number().min(0).max(100).optional(),
  niche: z.array(z.string()).max(10).optional(),
  categories: z.array(z.string()).max(10).optional(),
});

export const socialEntityUpdateSchema = z.object({
  followerCount: z.number().min(0).optional(),
  engagementRate: z.number().min(0).max(100).optional(),
  niche: z.array(z.string()).max(10).optional(),
  categories: z.array(z.string()).max(10).optional(),
  audienceDemographics: z.record(z.unknown()).optional(),
  portfolioItems: z.array(z.record(z.unknown())).optional(),
});

// Campaign
export const campaignCreateSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200),
  description: z.string().min(50, 'Description must be at least 50 characters').max(5000),
  niche: z.array(z.string()).min(1, 'Select at least one niche').max(5),
  minFollowers: z.number().min(0).default(0),
  maxFollowers: z.number().min(0).default(999999999),
  contentFormat: z.array(z.enum(['REEL', 'SHORT', 'VIDEO', 'POST', 'STORY', 'CAROUSEL'])).min(1),
  duration: z.string().optional(),
  ownershipTransfer: z.boolean().default(false),
  budget: z.number().min(1000, 'Minimum budget is ₹1,000'),
  expiresAt: z.string().datetime().optional(),
});

export const campaignUpdateSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().min(50).max(5000).optional(),
  niche: z.array(z.string()).max(5).optional(),
  minFollowers: z.number().min(0).optional(),
  maxFollowers: z.number().min(0).optional(),
  contentFormat: z.array(z.enum(['REEL', 'SHORT', 'VIDEO', 'POST', 'STORY', 'CAROUSEL'])).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
});

// Campaign Application
export const campaignApplicationSchema = z.object({
  entityId: z.string().uuid('Invalid entity ID'),
  creatorMessage: z.string().max(1000).optional(),
  proposedRate: z.number().min(0).optional(),
});

// Deal Milestone
export const dealMilestoneSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  sortOrder: z.number().min(0).optional(),
});

// Deal Revision
export const dealRevisionSchema = z.object({
  feedback: z.string().min(10, 'Feedback must be at least 10 characters').max(2000),
});

// Exclusive Negotiation (Lock)
export const dealLockSchema = z.object({
  entityId: z.string().uuid('Invalid entity ID'),
});

// Wallet
export const walletWithdrawSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is ₹100'),
});

// Notification Preference
export const notificationPreferenceSchema = z.object({
  type: z.string(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
});

// KYB (GSTIN)
export const kybSchema = z.object({
  gstin: z.string()
    .length(15, 'GSTIN must be 15 characters')
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'),
});

// Type exports
export type SocialEntityCreateInput = z.infer<typeof socialEntityCreateSchema>;
export type SocialEntityUpdateInput = z.infer<typeof socialEntityUpdateSchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
export type CampaignApplicationInput = z.infer<typeof campaignApplicationSchema>;
export type DealMilestoneInput = z.infer<typeof dealMilestoneSchema>;
export type DealRevisionInput = z.infer<typeof dealRevisionSchema>;
export type DealLockInput = z.infer<typeof dealLockSchema>;
export type WalletWithdrawInput = z.infer<typeof walletWithdrawSchema>;
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
export type KYBInput = z.infer<typeof kybSchema>;
```

---

## 8. Frontend Changes

No frontend changes in Phase 1. The dashboard pages are updated in Phase 2+ after the API routes are in place.

---

## 9. Migration & Seed

### 9.1 Migration Strategy (5-step additive)

All changes are additive — no column drops, no type changes. Run in order:

```bash
# Step 1: Add new enums
npx prisma migrate dev --name add_phase1_enums

# Step 2: Add new tables (no FK to existing data initially)
npx prisma migrate dev --name add_phase1_models

# Step 3: Add nullable columns to Deal, BrandProfile, User, ChatMessage, Deliverable
npx prisma migrate dev --name add_phase1_existing_model_fields

# Step 4: Add new indexes on existing tables
npx prisma migrate dev --name add_phase1_indexes

# Step 5: GIN indexes + partial unique index via raw SQL
```

### 9.2 Raw SQL Migration (Step 5)

Create `prisma/migrations/<timestamp>_add_gin_and_partial_indexes/migration.sql`:

```sql
-- GIN indexes for array columns (PostgreSQL-specific)
CREATE INDEX IF NOT EXISTS "SocialEntity_niche_gin"
  ON "SocialEntity" USING GIN ("niche");

CREATE INDEX IF NOT EXISTS "Campaign_niche_gin"
  ON "Campaign" USING GIN ("niche");

-- Partial unique index for exclusive negotiation
-- Ensures only one active lock per entity at a time
CREATE UNIQUE INDEX IF NOT EXISTS "ExclusiveNegotiation_entityId_active"
  ON "ExclusiveNegotiation" ("entityId")
  WHERE "isActive" = true;
```

### 9.3 Data Backfill Scripts

Create `prisma/backfill-phase1.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Phase 1 backfill: Starting...');

  // 1. Populate SocialEntity from CreatorProfile.socialPlatforms JSON
  const creators = await prisma.creatorProfile.findMany({
    include: { user: true },
  });

  for (const creator of creators) {
    const platforms = creator.socialPlatforms as any[];
    if (!platforms || !Array.isArray(platforms)) continue;

    for (const p of platforms) {
      const platformMap: Record<string, string> = {
        Instagram: 'INSTAGRAM',
        YouTube: 'YOUTUBE',
        Facebook: 'FACEBOOK',
      };
      const platform = platformMap[p.platform];
      if (!platform) continue;

      await prisma.socialEntity.upsert({
        where: {
          masterId_platform_handle: {
            masterId: creator.userId,
            platform: platform as any,
            handle: p.handle,
          },
        },
        create: {
          masterId: creator.userId,
          platform: platform as any,
          handle: p.handle,
          followerCount: p.followers ?? 0,
          isVerified: p.verified ?? false,
        },
        update: {},
      });
    }
  }

  console.log(`Backfilled SocialEntities for ${creators.length} creators`);

  // 2. Create Wallet for all existing users
  const users = await prisma.user.findMany({
    where: { wallet: null },
  });

  for (const user of users) {
    await prisma.wallet.create({
      data: { userId: user.id },
    });
  }

  console.log(`Created wallets for ${users.length} users`);

  // 3. Reconcile wallet balances from EscrowTransaction + CreatorProfile
  const creatorsWithEarnings = await prisma.creatorProfile.findMany({
    where: { totalEarnings: { gt: 0 } },
    include: { user: { include: { wallet: true } } },
  });

  for (const cp of creatorsWithEarnings) {
    if (cp.user.wallet) {
      await prisma.wallet.update({
        where: { id: cp.user.wallet.id },
        data: {
          totalEarned: cp.totalEarnings,
          // Balance = totalEarned - totalWithdrawn (no withdrawals yet)
          balance: cp.totalEarnings,
        },
      });
    }
  }

  console.log(`Reconciled ${creatorsWithEarnings.length} wallet balances`);

  await prisma.$disconnect();
}

backfill().catch(console.error);
```

### 9.4 Seed Data Additions

Add to `prisma/seed.ts` after line 175 (end of `main()`, before `prisma.$disconnect()`):

```typescript
// --- Phase 1: Seed SocialEntities ---
const entity1 = await prisma.socialEntity.upsert({
  where: {
    masterId_platform_handle: {
      masterId: influencer.id,
      platform: 'INSTAGRAM',
      handle: '@priyasharma',
    },
  },
  update: {},
  create: {
    masterId: influencer.id,
    platform: 'INSTAGRAM',
    handle: '@priyasharma',
    followerCount: 520000,
    engagementRate: 4.2,
    rating: 4.8,
    totalDeals: 23,
    isVerified: true,
    niche: ['beauty', 'lifestyle'],
    categories: ['skincare', 'fashion'],
  },
});

const entity2 = await prisma.socialEntity.upsert({
  where: {
    masterId_platform_handle: {
      masterId: influencer.id,
      platform: 'YOUTUBE',
      handle: 'PriyaSharmaVlogs',
    },
  },
  update: {},
  create: {
    masterId: influencer.id,
    platform: 'YOUTUBE',
    handle: 'PriyaSharmaVlogs',
    followerCount: 180000,
    engagementRate: 3.8,
    rating: 4.5,
    totalDeals: 8,
    isVerified: true,
    niche: ['beauty', 'vlogs'],
    categories: ['skincare', 'tutorials'],
  },
});

console.log(`Social entities created: ${entity1.handle}, ${entity2.handle}`);

// --- Phase 1: Seed Wallets ---
for (const user of [brand, influencer, admin]) {
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
}

console.log('Wallets created for all users');

// --- Phase 1: Seed Sample Campaign ---
const campaign = await prisma.campaign.create({
  data: {
    brandId: brand.brandProfile!.id,
    title: 'Summer Glow SPF50 Launch Campaign',
    description:
      'Looking for beauty creators to showcase our new Summer Glow SPF50 sunscreen. We need engaging Instagram Reels and YouTube Shorts demonstrating product application and benefits.',
    niche: ['beauty', 'skincare'],
    minFollowers: 10000,
    maxFollowers: 1000000,
    contentFormat: ['REEL', 'SHORT'],
    budget: 200000,
    status: 'ACTIVE',
    publishedAt: new Date(),
  },
});

console.log(`Sample campaign created: "${campaign.title}"`);
```

---

## 10. Verification Checklist

### Code Implementation

| # | Check | Status | How to verify |
|---|-------|--------|---------------|
| 1 | Schema: 15 new enums exist in `prisma/schema.prisma` | **DONE** | `grep "^enum" prisma/schema.prisma \| wc -l` → 18 total (3 pre-existing + 15 new) |
| 2 | Schema: 14 new models exist in `prisma/schema.prisma` | **DONE** | `grep "^model" prisma/schema.prisma \| wc -l` → 24 total (10 pre-existing + 14 new) |
| 3 | Schema: Deal model has entityId, campaignId, maxRevisions, currentRevision | **DONE** | Read `prisma/schema.prisma` Deal model |
| 4 | Schema: BrandProfile has 6 KYB fields (gstin, gstinVerified, etc.) | **DONE** | Read `prisma/schema.prisma` BrandProfile model |
| 5 | Schema: User model has 7 new relations + 2 new indexes | **DONE** | socialEntities, wallet, notifications, notificationPrefs, piiViolations, userWarnings, campaignApplications |
| 6 | Inngest client exports 8 event types | **DONE** | Read `lib/inngest/client.ts` |
| 7 | Inngest serve endpoint registers 4 functions | **DONE** | escrowRelease, fileCleanup, campaignVisibility, dealLockCleanup |
| 8 | Escrow release uses `step.sleep()` instead of `setTimeout()` | **DONE** | Read `lib/inngest/functions/escrow-release.ts` — uses ESCROW_RELEASE_DELAY env var |
| 9 | File cleanup cron runs at 2 AM daily | **DONE** | Read `lib/inngest/functions/cleanup.ts` — cron: `0 2 * * *` |
| 10 | `escrow.service.ts` calls `inngest.send()` instead of `setTimeout()` | **DONE** | Read `lib/services/escrow.service.ts` — no more setTimeout for 48h delay |
| 11 | SocialEntity service has 6 methods | **DONE** | create, listByUser, getById, update, deactivate, recalculateCompletionScore |
| 12 | Wallet service has 5 methods | **DONE** | getOrCreateWallet, credit, debit, withdraw, getTransactions |
| 13 | `lib/validations.ts` has 12 new Zod schemas | **DONE** | socialEntityCreate/Update, campaignCreate/Update, campaignApplication, dealMilestone, dealRevision, dealLock, walletWithdraw, notificationPreference, kyb |
| 14 | Seed script creates SocialEntities, Wallets, Campaign | **DONE** | Read `prisma/seed.ts` — 2 entities, 3 wallets, 1 campaign |
| 15 | `inngest` package installed | **DONE** | Check `package.json` |
| 16 | TypeScript compiles with zero errors | **DONE** | `npx tsc --noEmit` → no output |

### Deploy-Time Steps (require database connection)

| # | Check | Status | Command |
|---|-------|--------|---------|
| 17 | Run Prisma migrations | PENDING | `npx prisma migrate dev --name phase1_schema_evolution` |
| 18 | Create GIN indexes via raw SQL | **DONE** | `prisma/migrations/gin-indexes.sql` created — run after migration |
| 19 | Create partial unique index on ExclusiveNegotiation | **DONE** | Included in `prisma/migrations/gin-indexes.sql` |
| 20 | Run seed script | PENDING | `npx prisma db seed` |
| 21 | Run backfill script (SocialEntity from CreatorProfile JSON) | **DONE** | `prisma/backfill-phase1.ts` created — run with `npx tsx prisma/backfill-phase1.ts` |
| 22 | Verify Inngest dashboard shows 4 functions | PENDING | Start dev server, hit `GET /api/inngest` |
| 23 | Test T+2 escrow release (set delay to 30s) | PENDING | Set `ESCROW_RELEASE_DELAY=30s`, trigger deal payment, verify release |

### Runtime Verification (require running app + DB)

| # | Check | Status | Steps |
|---|-------|--------|-------|
| 24 | SocialEntity CRUD works | PENDING | POST `/api/social-entities` → create entity, GET → list, PATCH → update, DELETE → deactivate |
| 25 | Wallet credit/debit works | PENDING | Trigger escrow release → verify wallet balance incremented |
| 26 | Completion score recalculates | PENDING | Update entity profile → verify `completionScore` changes |
| 27 | Cross-user duplicate entity rejected | PENDING | Try creating same handle+platform for different user → expect error |

### Files Created

| File | Purpose |
|------|---------|
| `lib/inngest/client.ts` | Inngest singleton + event type definitions |
| `lib/inngest/functions/escrow-release.ts` | Durable T+2 escrow release (replaces setTimeout) |
| `lib/inngest/functions/cleanup.ts` | Daily expired file cleanup cron |
| `app/api/inngest/route.ts` | Inngest HTTP serve endpoint |
| `lib/services/social-entity.service.ts` | SocialEntity CRUD + completion score |
| `lib/services/wallet.service.ts` | Wallet credit/debit/withdraw/transactions |

### Files Modified

| File | What Changed |
|------|-------------|
| `prisma/schema.prisma` | Full rewrite: 15 enums, 14 models, 5 model modifications, new indexes |
| `lib/services/escrow.service.ts` | Added inngest import; replaced setTimeout (line 282) with inngest.send() |
| `lib/validations.ts` | Added 12 Zod schemas + 11 type exports at end of file |
| `prisma/seed.ts` | Added SocialEntity, Wallet, Campaign seed data |

---

## 11. Setup Guide

Complete setup instructions for Phase 1. Run these steps after cloning or pulling Phase 1 code.

### 11.1 Environment Variables

Ensure `.env` has these entries (values below are dev defaults):

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"

# Inngest
INNGEST_EVENT_KEY=dev_local_key
INNGEST_SIGNING_KEY=dev_local_signing_key
ESCROW_RELEASE_DELAY=30s

# OAuth encryption (for SocialEntity token storage)
OAUTH_ENCRYPTION_KEY=<run: openssl rand -hex 32>

# Timezone
TZ=Asia/Kolkata
```

### 11.2 Database Migration

**Option A — Prisma CLI** (requires direct DB connectivity):

```bash
npx prisma generate
npx prisma migrate dev --name init
```

**Option B — Supabase SQL Editor** (if CLI can't reach DB):

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `prisma/migrations/complete-setup.sql`
3. Run the script
4. After running, mark the migration as applied locally:

```bash
npx prisma migrate resolve --applied 20260307000000_init
```

### 11.3 GIN Indexes

These are included in `complete-setup.sql`. If you ran Prisma CLI instead, apply them manually:

```bash
# Via Supabase SQL Editor, paste contents of:
# prisma/migrations/gin-indexes.sql
```

The three indexes created:
- `SocialEntity_niche_gin` — GIN index on `SocialEntity.niche` array
- `Campaign_niche_gin` — GIN index on `Campaign.niche` array
- `ExclusiveNegotiation_entityId_active` — Partial unique index (one active lock per entity)

### 11.4 Seed & Backfill

```bash
# Seed test users, deals, social entities, wallets, campaign
npx tsx prisma/seed.ts

# Backfill: migrate CreatorProfile.socialPlatforms JSON → SocialEntity rows
# and create wallets for any users missing one
npx tsx prisma/backfill-phase1.ts
```

### 11.5 Inngest Setup

Phase 1 introduces Inngest as an external service for durable background jobs.

1. **Install** (already in `package.json`): `npm install inngest`
2. **Dev server**: Inngest Dev Server runs alongside your app. Start it with:
   ```bash
   npx inngest-cli@latest dev
   ```
3. **Start your app**: `npm run dev`
4. **Verify**: Open `http://localhost:8288` (Inngest dashboard) — you should see 4 registered functions:
   - `escrow-release` — T+2 durable escrow release
   - `file-cleanup` — Daily expired file cleanup cron
   - `campaign-visibility-update` — 30-min visibility tier upgrade (Phase 2)
   - `deal-lock-cleanup` — Hourly expired lock cleanup (Phase 2)

### 11.6 Verification

```bash
# 1. Migration applied
npx prisma migrate status

# 2. TypeScript compiles
npx tsc --noEmit

# 3. App starts
npm run dev

# 4. Inngest functions visible
# Open http://localhost:8288 after starting both inngest dev + app
```
