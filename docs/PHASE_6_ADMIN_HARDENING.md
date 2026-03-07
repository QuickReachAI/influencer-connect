# Phase 6: Admin Enhancements, Edge Cases & Hardening

## 1. Overview

Phase 6 hardens the platform with admin panel enhancements, edge case handlers for all known failure modes, OAuth social account linking (stretch goal), and a comprehensive final verification across all phases.

**Delivers**: Admin dispute split-screen, financial audit trail, KYC/KYB escalation queue, fraud detection, batch actions, 8 edge case handlers, OAuth social linking (stretch), infrastructure cost summary.

**Dependencies**: All previous phases (1-5) complete.

---

## 2. Prerequisites

### npm packages to install (stretch — OAuth only)

```bash
# Only if implementing OAuth social linking
npm install googleapis instagram-private-api
```

### Environment variables to add (`.env`)

```env
# OAuth Social Linking (stretch)
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### Prior phase completion checks

- [ ] Phase 1: All 14 models, Inngest infrastructure, wallet service
- [ ] Phase 2: Campaigns, applications, exclusive negotiation locks
- [ ] Phase 3: Pusher real-time chat, PII detection, escalation tracking
- [ ] Phase 4: Video pipeline, revision workflow
- [ ] Phase 5: Notifications, KYB, wallet-integrated escrow

---

## 3. Schema Changes

No new schema changes. All models exist from Phase 1.

---

## 4. Service Layer

### 4.1 Admin Service Enhancements

#### Dispute Split-Screen Data — add to existing admin service or create `lib/services/admin.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';

export class AdminService {
  /**
   * Get dispute data for split-screen mediation view.
   * Returns: approved script (from deal.scriptChecklist at scriptApprovedAt),
   * uploaded deliverable (latest VideoAsset), chat history snapshot,
   * and financial summary.
   */
  async getDisputeContext(dealId: string): Promise<{
    deal: any;
    scriptSnapshot: any;
    deliverables: any[];
    chatHistory: any[];
    financialSummary: any;
    piiViolations: any[];
  }> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        brand: { include: { brandProfile: true } },
        creator: { include: { creatorProfile: true } },
        deliverables: { orderBy: { uploadedAt: 'desc' } },
        videoAssets: { orderBy: { createdAt: 'desc' } },
        revisions: { orderBy: { revisionNumber: 'desc' } },
        escrowTransactions: { orderBy: { createdAt: 'asc' } },
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!deal) throw new Error('Deal not found');

    // Get chat history snapshot (from audit log if locked, otherwise live)
    const chatSnapshot = await prisma.auditLog.findFirst({
      where: {
        entityType: 'deal',
        entityId: dealId,
        action: { startsWith: 'conversation_locked' },
      },
      orderBy: { createdAt: 'desc' },
    });

    const chatHistory = chatSnapshot
      ? (chatSnapshot.changes as any)?.snapshot ?? []
      : await prisma.chatMessage.findMany({
          where: { dealId },
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { email: true, role: true } } },
        });

    // PII violations for involved users
    const piiViolations = await prisma.pIIViolation.findMany({
      where: {
        userId: { in: [deal.brandId, deal.creatorId] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Financial summary
    const financialSummary = {
      totalAmount: deal.totalAmount,
      platformFee: deal.platformFee,
      creatorPayout: deal.creatorPayout,
      payment50Paid: deal.payment50Paid,
      payment100Paid: deal.payment100Paid,
      escrowTransactions: deal.escrowTransactions,
    };

    return {
      deal,
      scriptSnapshot: {
        checklist: deal.scriptChecklist,
        approvedAt: deal.scriptApprovedAt,
        approvedBy: deal.scriptApprovedBy,
      },
      deliverables: deal.deliverables,
      chatHistory,
      financialSummary,
      piiViolations,
    };
  }

  /**
   * Financial audit trail — unalterable view of all wallet/escrow movements.
   * Uses existing AuditLog table + EscrowTransaction + WalletTransaction.
   */
  async getFinancialAudit(filters: {
    userId?: string;
    dealId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;

    const whereEscrow: any = {};
    const whereWallet: any = {};

    if (filters.dealId) {
      whereEscrow.dealId = filters.dealId;
      whereWallet.dealId = filters.dealId;
    }
    if (filters.startDate) {
      whereEscrow.createdAt = { gte: filters.startDate };
      whereWallet.createdAt = { gte: filters.startDate };
    }

    const [escrowTxns, walletTxns, auditLogs] = await Promise.all([
      prisma.escrowTransaction.findMany({
        where: whereEscrow,
        include: { deal: { select: { title: true, brandId: true, creatorId: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.walletTransaction.findMany({
        where: whereWallet,
        include: { wallet: { select: { userId: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: { in: ['deal', 'payment', 'wallet'] },
          ...(filters.dealId ? { entityId: filters.dealId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
      }),
    ]);

    return { escrowTxns, walletTxns, auditLogs };
  }

  /**
   * KYC/KYB escalation queue — cases where automated verification failed.
   * Returns users with PENDING KYC status + brands with unverified GSTIN.
   */
  async getEscalationQueue(): Promise<{
    pendingKYC: any[];
    pendingKYB: any[];
  }> {
    const [pendingKYC, pendingKYB] = await Promise.all([
      prisma.user.findMany({
        where: { kycStatus: 'PENDING', isBanned: false },
        include: {
          creatorProfile: { select: { name: true } },
          brandProfile: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.brandProfile.findMany({
        where: {
          gstin: { not: null },
          gstinVerified: false,
        },
        include: { user: { select: { email: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    return { pendingKYC, pendingKYB };
  }

  /**
   * Fraud detection — flag entities with suspicious engagement patterns.
   * Follower-to-engagement ratio anomalies:
   * - Normal: 1-5% engagement rate for 10K-100K followers
   * - Suspicious: >10% engagement with <1K followers, or <0.1% with >100K
   */
  async detectSuspiciousEntities(): Promise<any[]> {
    const suspicious = await prisma.socialEntity.findMany({
      where: {
        isActive: true,
        OR: [
          // Very high engagement with very low followers (likely fake)
          {
            followerCount: { lt: 1000 },
            engagementRate: { gt: 10 },
          },
          // Very low engagement with very high followers (likely bought)
          {
            followerCount: { gt: 100000 },
            engagementRate: { lt: 0.1 },
          },
          // Zero engagement with substantial followers
          {
            followerCount: { gt: 5000 },
            engagementRate: { equals: 0 },
          },
        ],
      },
      include: {
        master: { select: { email: true, isBanned: true } },
      },
    });

    return suspicious;
  }

  /**
   * Batch actions — bulk approve/reject applications.
   */
  async batchUpdateApplications(
    applicationIds: string[],
    status: 'ACCEPTED' | 'REJECTED',
    brandProfileId: string
  ): Promise<{ updated: number }> {
    // Verify all applications belong to brand's campaigns
    const applications = await prisma.campaignApplication.findMany({
      where: {
        id: { in: applicationIds },
        campaign: { brandId: brandProfileId },
        status: 'PENDING',
      },
    });

    const result = await prisma.campaignApplication.updateMany({
      where: { id: { in: applications.map((a) => a.id) } },
      data: { status, reviewedAt: new Date() },
    });

    return { updated: result.count };
  }

  /**
   * Batch ban users (admin only).
   */
  async batchBanUsers(
    userIds: string[],
    reason: string,
    adminId: string
  ): Promise<{ banned: number }> {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds }, isBanned: false },
      data: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
      },
    });

    // Audit log for each ban
    for (const userId of userIds) {
      await prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: userId,
          action: 'user_banned',
          actorId: adminId,
          changes: { reason },
        },
      });
    }

    return { banned: result.count };
  }
}

export const adminService = new AdminService();
```

---

## 5. API Routes

### 5.1 Admin API Routes

Add to existing admin routes or create new ones:

```typescript
// app/api/admin/disputes/[dealId]/route.ts
// GET — Dispute split-screen context
export async function GET(request, { params }) {
  // Auth: admin only
  const { dealId } = await params;
  const context = await adminService.getDisputeContext(dealId);
  return NextResponse.json(context);
}

// app/api/admin/financial-audit/route.ts
// GET — Financial audit trail
export async function GET(request) {
  // Auth: admin only
  const filters = parseSearchParams(request.url);
  const audit = await adminService.getFinancialAudit(filters);
  return NextResponse.json(audit);
}

// app/api/admin/escalation-queue/route.ts
// GET — KYC/KYB escalation queue
export async function GET() {
  // Auth: admin only
  const queue = await adminService.getEscalationQueue();
  return NextResponse.json(queue);
}

// app/api/admin/fraud-detection/route.ts
// GET — Suspicious entity list
export async function GET() {
  // Auth: admin only
  const suspicious = await adminService.detectSuspiciousEntities();
  return NextResponse.json(suspicious);
}

// app/api/admin/batch/route.ts
// POST — Batch actions (ban users, update applications)
export async function POST(request) {
  // Auth: admin only
  const { action, ...data } = await request.json();
  // Route to appropriate batch method
}
```

---

## 6. Inngest Functions

### 6.1 Edge Case Handlers

#### Expired OAuth Token Cron — `lib/inngest/functions/oauth-refresh.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/services/notification.service';

/**
 * Daily cron: check for expired OAuth tokens on SocialEntities.
 * Hide expired entities from discovery, notify creator.
 */
export const oauthRefreshFunction = inngest.createFunction(
  {
    id: 'oauth-token-check',
    name: 'Daily OAuth Token Check',
  },
  { cron: '0 4 * * *' }, // 4 AM IST daily
  async ({ step }) => {
    const expiredCount = await step.run('check-expired-tokens', async () => {
      const expired = await prisma.socialEntity.findMany({
        where: {
          isActive: true,
          isVerified: true,
          tokenExpiresAt: { lt: new Date() },
        },
      });

      for (const entity of expired) {
        // Hide from discovery
        await prisma.socialEntity.update({
          where: { id: entity.id },
          data: { isActive: false },
        });

        // Notify creator
        await notificationService.send({
          userId: entity.masterId,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Entity Sync Required',
          message: `Your ${entity.platform} account @${entity.handle} needs to be re-connected. It has been hidden from discovery.`,
          data: { entityId: entity.id, platform: entity.platform },
        });
      }

      return expired.length;
    });

    return { expiredCount };
  }
);
```

#### Creator Inactivity Check — `lib/inngest/functions/inactivity-check.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/services/notification.service';

/**
 * Hourly cron: check for deals with creator inactivity > 24h/48h.
 * - 24h: Send warning to creator
 * - 48h: Enable "One-Click Cancel" for brand with 100% refund
 */
export const inactivityCheckFunction = inngest.createFunction(
  {
    id: 'creator-inactivity-check',
    name: 'Creator Inactivity Monitor',
  },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const now = new Date();
    const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const h48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Find deals in active states with no recent activity
    const activeStatuses = ['PRODUCTION', 'SCRIPT_PENDING', 'REVISION_PENDING'];

    const result = await step.run('check-inactivity', async () => {
      let warned = 0;
      let cancellable = 0;

      const deals = await prisma.deal.findMany({
        where: {
          status: { in: activeStatuses as any[] },
          updatedAt: { lt: h24Ago },
        },
        include: {
          chatMessages: {
            where: { senderId: prisma.deal.fields?.creatorId as any },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      for (const deal of deals) {
        const lastCreatorActivity = deal.chatMessages[0]?.createdAt ?? deal.updatedAt;

        if (lastCreatorActivity < h48Ago) {
          // 48h inactivity — notify brand of cancel option
          await notificationService.send({
            userId: deal.brandId,
            type: 'DEAL_STATUS_CHANGED',
            title: 'Creator Inactive — Cancel Available',
            message: `Creator has been inactive for 48+ hours on "${deal.title}". You can now cancel with a 100% refund.`,
            data: { dealId: deal.id, canCancel: true },
          });
          cancellable++;
        } else if (lastCreatorActivity < h24Ago) {
          // 24h inactivity — warn creator
          await notificationService.send({
            userId: deal.creatorId,
            type: 'DEAL_STATUS_CHANGED',
            title: 'Activity Required',
            message: `You have not updated "${deal.title}" in 24+ hours. The brand may cancel if inactivity continues.`,
            data: { dealId: deal.id },
          });
          warned++;
        }
      }

      return { warned, cancellable };
    });

    return result;
  }
);
```

---

## 7. Edge Case Handling Summary

| # | Scenario | Implementation | Files |
|---|----------|---------------|-------|
| 1 | **Aadhaar/GST API outage** | Set user to `PENDING_VERIFICATION`, allow profile setup but block deal locking. Retry via Inngest with exponential backoff. | `kyb.service.ts`, `deal.service.ts` (check `gstinVerified` before lock) |
| 2 | **Interrupted video upload** | Resumable multipart via `tus-js-client`. Track partial state in `VideoAsset.status = UPLOADING`. On reconnect, client resumes from last uploaded part. | `file.service.ts` (abort cleanup), Phase 4 |
| 3 | **Wallet insufficiency** | Before broadcasting lock, check brand has sufficient funds via payment verification. Redirect to "Add Money" page if insufficient. | `deal.service.ts` (add balance check in `lockDeal`) |
| 4 | **Expired OAuth tokens** | Daily Inngest cron checks `tokenExpiresAt`. Hide entity from discovery (`isActive = false`), send "Entity Sync Required" notification. | `oauth-refresh.ts`, Section 6.1 |
| 5 | **Creator inactivity (48h)** | Hourly Inngest cron checks deals in active states with no activity >24h. Send warning at 24h, enable "One-Click Cancel" for brand at 48h with 100% refund. | `inactivity-check.ts`, Section 6.2 |
| 6 | **Malicious revisions** | `currentRevision >= maxRevisions` → disable revision button. Brand must purchase "Revision Extension" add-on (via `revisionService.addRevisionExtension`). | `revision.service.ts` (Phase 4) |
| 7 | **Chat circumvention** | Enhanced PII engine (Phase 3) with progressive enforcement. 3+ mentions of WhatsApp/Paytm/GPay → redaction mode. 5+ → auto shadow block. | `pii.service.ts` (Phase 3) |
| 8 | **Duplicate OAuth accounts** | Unique constraint `[masterId, platform, handle]` prevents same account linked twice by same user. Cross-user check: if same handle+platform exists for different user, flag for admin review. | `social-entity.service.ts` (Phase 1), `adminService.getEscalationQueue` |

### Edge Case Implementation Code

#### EC-1: API Outage Handling in KYB

```typescript
// In kyb.service.ts → verifyGSTIN(), wrap API call:
try {
  const response = await fetch(process.env.GSTIN_API_URL!, { ... });
  // ... process response
} catch (error) {
  // API outage: set pending and schedule retry
  await prisma.brandProfile.update({
    where: { id: brandProfileId },
    data: { gstinVerified: false, filingStatus: 'PENDING_VERIFICATION' },
  });

  // Schedule retry via Inngest with backoff
  await inngest.send({
    name: 'kyb/retry-verification',
    data: { brandProfileId, gstin, attempt: 1 },
  });

  return { valid: false, error: 'Verification service temporarily unavailable. Will retry.' };
}
```

#### EC-3: Wallet Insufficiency Check

```typescript
// In deal.service.ts → lockDeal(), add before creating lock:
// Verify brand has funds or active payment method
const deal = await prisma.deal.findUnique({ where: { id: dealId } });
if (deal && Number(deal.totalAmount) > 0) {
  // For now, just verify the deal amount is set
  // Full payment verification can be added when brands get wallets
  // or when Razorpay pre-authorization is implemented
}
```

---

## 8. Frontend Changes

### 8.1 Admin Panel Components

#### Dispute Split-Screen — `app/dashboard/admin/disputes/[dealId]/page.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Dispute: "GlowSkin Summer Campaign"                 │
├────────────────────────┬────────────────────────────┤
│ Script / Agreement     │ Uploaded Deliverable       │
│                        │                            │
│ ☑ Reel 1: Product      │ [Video Player]             │
│   unboxing             │ Status: READY              │
│ ☑ Reel 2: Morning      │ Duration: 45s              │
│   routine              │ Resolution: 1920x1080      │
│ ☐ Reel 3: Beach day    │                            │
│                        │ Revisions: 2/2             │
│ Script approved:       │                            │
│ 2024-01-15 10:30 IST   │                            │
├────────────────────────┴────────────────────────────┤
│ Chat History (locked snapshot)                      │
│ Brand: "Hi Priya! Excited to work with you..."     │
│ Creator: "Hey! Thanks for choosing me..."          │
├─────────────────────────────────────────────────────┤
│ Financial: ₹50,000 total | 50% paid | 50% escrow  │
│ [Favor Creator] [Favor Brand] [Split 50/50]        │
└─────────────────────────────────────────────────────┘
```

#### Financial Audit Trail — `app/dashboard/admin/finance/page.tsx`

- Filterable by date range, user, deal
- Combined view: escrow transactions + wallet transactions + audit logs
- Export to CSV capability
- Running balance calculation
- Read-only (no modifications allowed)

#### KYC/KYB Queue — `app/dashboard/admin/escalation/page.tsx`

- Tab view: "Pending KYC" | "Pending KYB"
- For each case: user details, submitted documents, verification status
- Action buttons: "Approve Manually", "Reject", "Request Re-submission"
- Link to user's chat history and deal activity

#### Fraud Detection — `app/dashboard/admin/fraud/page.tsx`

- List of suspicious entities with anomaly reason
- Engagement rate vs follower count scatter plot
- Action buttons: "Flag for Review", "Deactivate Entity", "Ban User"
- Batch select and ban

---

## 9. OAuth Social Account Linking (Stretch)

### 9.1 Architecture

```
Creator → "Connect Instagram" button
  → OAuth redirect to Instagram
  → Instagram callback to /api/auth/social/instagram/callback
  → Verify account ownership, pull metrics
  → Encrypt token with AES-256-GCM (OAUTH_ENCRYPTION_KEY)
  → Update SocialEntity: isVerified=true, oauthTokenEncrypted, tokenExpiresAt
```

### 9.2 API Routes

```
GET  /api/auth/social/instagram/connect    — Initiate OAuth flow
GET  /api/auth/social/instagram/callback   — Handle OAuth callback
GET  /api/auth/social/youtube/connect      — Initiate YouTube OAuth
GET  /api/auth/social/youtube/callback     — Handle YouTube callback
GET  /api/auth/social/facebook/connect     — Initiate Facebook OAuth
GET  /api/auth/social/facebook/callback    — Handle Facebook callback
POST /api/auth/social/disconnect           — Disconnect social account
```

### 9.3 Data Pulled from APIs

| Platform | Data |
|----------|------|
| Instagram | follower_count, media_count, engagement (likes+comments/followers), profile_picture_url |
| YouTube | subscriberCount, videoCount, viewCount, topicCategories |
| Facebook | fan_count, page_engagement |

### 9.4 Token Security

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY!, 'hex'); // 32 bytes

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptToken(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 10. Infrastructure Cost Summary

| Component | Monthly Cost | Phase |
|-----------|-------------|-------|
| Supabase PostgreSQL (Pro) | $25 | 1 |
| Vercel Hosting (Pro) | $20 | 1 |
| Inngest (Growth, 25k runs) | $50 | 1 |
| Pusher (Startup, 10k conn) | $49 | 3 |
| AWS Lambda (video, ~1k videos) | ~$5 | 4 |
| AWS S3 (storage + transfer) | ~$20 | 4 |
| Resend email (~20k emails) | $20 | 5 |
| Upstash Redis (rate limit + PII) | $10 | 1,3 |
| **Total** | **~$199/mo** | |

---

## 11. Verification Checklist — Full Platform

### Phase 1 Verification
1. [ ] `prisma migrate deploy` runs successfully
2. [ ] All 14 new tables exist with correct columns
3. [ ] GIN indexes and partial unique index verified
4. [ ] Inngest dashboard shows escrow-release function
5. [ ] T+2 release fires correctly with `ESCROW_RELEASE_DELAY=30s`

### Phase 2 Verification
6. [ ] Create campaign → publish → verify tiered visibility (0h, 1h, 2h)
7. [ ] Apply as creator → verify exclusive negotiation lock
8. [ ] Lock prevents second lock on same entity
9. [ ] Lock expires after 48h (test with short interval)

### Phase 3 Verification
10. [ ] Real-time message delivery (no page refresh)
11. [ ] PII detection: phone → warning, 3x → redaction, 5x → shadow block
12. [ ] Typing indicator and read receipts work
13. [ ] Hindi spelled-out numbers detected

### Phase 4 Verification
14. [ ] Multipart upload completes for 100MB+ file
15. [ ] Video watermark appears at 4 positions
16. [ ] HLS playback works through presigned URLs
17. [ ] Clean download available after final approval
18. [ ] Revision limit enforced

### Phase 5 Verification
19. [ ] Deal status change triggers in-app + email notification
20. [ ] Campaign announcement uses tiered batch delivery
21. [ ] GSTIN verification works end-to-end
22. [ ] Wallet credited on T+2 release with correct fee breakdown
23. [ ] Withdrawal request creates pending transaction

### Phase 6 Verification
24. [ ] Admin dispute split-screen shows script vs deliverable
25. [ ] Financial audit trail shows all wallet + escrow movements
26. [ ] KYC/KYB escalation queue populated with pending cases
27. [ ] Fraud detection flags suspicious engagement patterns
28. [ ] API outage fallback: user set to PENDING_VERIFICATION
29. [ ] 48h inactivity: brand gets cancel notification
30. [ ] OAuth token expiry: entity hidden + creator notified

### Load Testing
31. [ ] 100 concurrent chat connections via Pusher
32. [ ] 50 simultaneous campaign applications
33. [ ] 10 concurrent video uploads
34. [ ] 1000 notification batch delivery completes within 15 minutes

### Security
35. [ ] No PII in server logs (check Aadhaar, PAN masking)
36. [ ] OAuth tokens encrypted at rest (AES-256-GCM)
37. [ ] Presigned URLs expire correctly (15min for streaming, 24h for download)
38. [ ] Rate limiting active on all public endpoints
39. [ ] SQL injection protection via Prisma parameterized queries
40. [ ] XSS protection via React's default escaping + CSP headers
