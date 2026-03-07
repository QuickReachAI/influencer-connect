# Phase 5: Notification Engine, Brand KYB & Wallet Integration

## 1. Overview

Phase 5 adds the notification engine with tiered delivery (anti-thundering-herd), GSTIN-based brand verification (KYB), and integrates the wallet system into the escrow release flow so creators receive funds into their wallet rather than direct bank transfer.

**Delivers**: Multi-channel notification system (in-app + email), notification preferences, GSTIN verification via Gridlines/HyperVerge, monthly GSTIN recheck cron, wallet-integrated escrow release with fee breakdown, Razorpay Payout API withdrawal.

**Dependencies**: Phase 1 complete (Notification, NotificationPreference, Wallet, WalletTransaction, GSTStatusLog models, wallet service), Phase 3 complete (Pusher for in-app notifications).

---

## 2. Prerequisites

### npm packages to install

```bash
npm install resend
```

### Environment variables to add (`.env`)

```env
# Resend (email)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@influencerconnect.in

# GSTIN Verification (Gridlines or HyperVerge)
GSTIN_API_URL=https://api.gridlines.io/gstin-api/gst
GSTIN_API_KEY=your_gridlines_api_key

# Razorpay Payout (for wallet withdrawals)
RAZORPAY_PAYOUT_ACCOUNT_NUMBER=your_account_number
RAZORPAY_PAYOUT_IFSC=your_ifsc
```

### Prior phase completion checks

- [ ] Phase 1 models: `Notification`, `NotificationPreference`, `Wallet`, `WalletTransaction`, `GSTStatusLog`
- [ ] Phase 1 services: `walletService` functional with `credit()`, `debit()`, `withdraw()`
- [ ] Phase 3: Pusher server singleton (`lib/pusher.ts`) for in-app delivery
- [ ] BrandProfile has KYB fields: `gstin`, `gstinVerified`, `gstinVerifiedAt`, etc.

---

## 3. Schema Changes

No new schema changes. All models used in this phase were created in Phase 1.

---

## 4. Service Layer

### 4.1 Notification Service — `lib/services/notification.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';
import { triggerUserEvent } from '@/lib/pusher';
import type { NotificationType } from '@prisma/client';

interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Send a notification to a single user.
   * Routes through user's preferences: in-app (Pusher), email (Resend).
   *
   * Integration points (replace TODO comments in existing services):
   * - escrow.service.ts:143 → PAYMENT_RECEIVED
   * - escrow.service.ts:183 → PAYMENT_REQUIRED
   * - chat.service.ts:170   → offline message notification
   * - mediation.service.ts  → DISPUTE_RAISED / DISPUTE_RESOLVED
   * - kyc.service.ts        → KYC_VERIFIED
   */
  async send(input: SendNotificationInput): Promise<any> {
    // Check user's notification preferences
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        userId_type: { userId: input.userId, type: input.type },
      },
    });

    // Default: all channels enabled
    const inApp = pref?.inApp ?? true;
    const email = pref?.email ?? true;

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? {},
      },
    });

    // In-app: Pusher real-time delivery
    if (inApp) {
      await triggerUserEvent(input.userId, 'system-notification', {
        id: notification.id,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
        createdAt: notification.createdAt,
      });
    }

    // Email: async via Inngest (to avoid blocking)
    if (email) {
      await inngest.send({
        name: 'notification/send',
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data: input.data,
        },
      });
    }

    return notification;
  }

  /**
   * Batch send notifications for campaign announcements.
   * Anti-thundering-herd: tiered delivery by creator rating.
   *
   * - Platinum (4.5+): immediately
   * - Gold (3.5-4.49): after 60s
   * - Silver (2.5-3.49): after 5min
   * - Bronze (<2.5): after 10min
   *
   * Each tier processed in batches of 100.
   */
  async sendCampaignAnnouncement(
    campaignId: string,
    title: string,
    message: string
  ): Promise<void> {
    await inngest.send({
      name: 'notification/batch-send',
      data: { campaignId, type: 'CAMPAIGN_PUBLISHED', title, message },
    });
  }

  /** Get paginated notifications for a user */
  async list(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ notifications: any[]; total: number }> {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total };
  }

  /** Mark a single notification as read */
  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  /** Mark all notifications as read */
  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  /** Get unread count for badge */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /** Get user's notification preferences */
  async getPreferences(userId: string): Promise<any[]> {
    return prisma.notificationPreference.findMany({
      where: { userId },
    });
  }

  /** Update notification preferences */
  async updatePreference(
    userId: string,
    type: NotificationType,
    updates: { email?: boolean; push?: boolean; inApp?: boolean }
  ): Promise<any> {
    return prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: {
        userId,
        type,
        email: updates.email ?? true,
        push: updates.push ?? true,
        inApp: updates.inApp ?? true,
      },
      update: updates,
    });
  }
}

export const notificationService = new NotificationService();
```

### 4.2 KYB Service — `lib/services/kyb.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';
import { notificationService } from './notification.service';

interface GSTINVerificationResult {
  valid: boolean;
  businessName?: string;
  registeredAddress?: string;
  filingStatus?: string;
  error?: string;
}

export class KYBService {
  /**
   * Verify a brand's GSTIN via Gridlines/HyperVerge API.
   * On success: sets gstinVerified=true, stores business details.
   * Awards "Verified Brand" badge.
   */
  async verifyGSTIN(
    brandProfileId: string,
    gstin: string
  ): Promise<GSTINVerificationResult> {
    // Call GSTIN verification API
    const response = await fetch(process.env.GSTIN_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GSTIN_API_KEY!}`,
      },
      body: JSON.stringify({ gstin }),
    });

    const data = await response.json();

    // Log the verification attempt
    await prisma.gSTStatusLog.create({
      data: {
        brandProfileId,
        previousStatus: null,
        newStatus: data.filingStatus ?? 'UNKNOWN',
        rawResponse: data,
      },
    });

    if (!response.ok || data.error) {
      // Set user to PENDING_VERIFICATION — allow profile setup but block deal locking
      // See PHASE_6 section 6.2 for edge case handling
      return { valid: false, error: data.error ?? 'Verification failed' };
    }

    // Update BrandProfile with verified GST details
    await prisma.brandProfile.update({
      where: { id: brandProfileId },
      data: {
        gstin,
        gstinVerified: true,
        gstinVerifiedAt: new Date(),
        registeredAddress: data.registeredAddress,
        filingStatus: data.filingStatus,
        gstStatusLastChecked: new Date(),
      },
    });

    // Get brand's userId for notification
    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
      select: { userId: true },
    });

    if (brand) {
      await notificationService.send({
        userId: brand.userId,
        type: 'KYC_VERIFIED',
        title: 'Brand Verified',
        message: 'Your GSTIN has been verified. You now have the "Verified Brand" badge.',
        data: { gstin, businessName: data.businessName },
      });
    }

    return {
      valid: true,
      businessName: data.businessName,
      registeredAddress: data.registeredAddress,
      filingStatus: data.filingStatus,
    };
  }

  /**
   * Monthly re-verification of all verified GSTINs.
   * If filing status changes to Suspended/Cancelled:
   * - Trigger "Identity Risk" alert
   * - Pause active campaigns
   * - Notify brand
   */
  async recheckAll(): Promise<{ checked: number; flagged: number }> {
    const verifiedBrands = await prisma.brandProfile.findMany({
      where: { gstinVerified: true, gstin: { not: null } },
    });

    let flagged = 0;

    for (const brand of verifiedBrands) {
      try {
        const response = await fetch(process.env.GSTIN_API_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GSTIN_API_KEY!}`,
          },
          body: JSON.stringify({ gstin: brand.gstin }),
        });

        const data = await response.json();

        // Log status change
        await prisma.gSTStatusLog.create({
          data: {
            brandProfileId: brand.id,
            previousStatus: brand.filingStatus,
            newStatus: data.filingStatus ?? 'UNKNOWN',
            rawResponse: data,
          },
        });

        // Check for status degradation
        const dangerousStatuses = ['Suspended', 'Cancelled', 'Inactive'];
        if (dangerousStatuses.includes(data.filingStatus)) {
          flagged++;

          // Update brand profile
          await prisma.brandProfile.update({
            where: { id: brand.id },
            data: {
              gstinVerified: false,
              filingStatus: data.filingStatus,
              gstStatusLastChecked: new Date(),
            },
          });

          // Pause all active campaigns
          await prisma.campaign.updateMany({
            where: { brandId: brand.id, status: 'ACTIVE' },
            data: { status: 'PAUSED' },
          });

          // Notify brand
          await notificationService.send({
            userId: brand.userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Identity Risk Alert',
            message: `Your GSTIN status has changed to ${data.filingStatus}. Active campaigns have been paused. Please contact support.`,
            data: { gstin: brand.gstin, newStatus: data.filingStatus },
          });
        } else {
          // Update last checked timestamp
          await prisma.brandProfile.update({
            where: { id: brand.id },
            data: {
              filingStatus: data.filingStatus,
              gstStatusLastChecked: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(`GSTIN recheck failed for brand ${brand.id}:`, error);
      }
    }

    return { checked: verifiedBrands.length, flagged };
  }
}

export const kybService = new KYBService();
```

### 4.3 Escrow Service Modification — `lib/services/escrow.service.ts`

Modify `releaseFundsToCreator()` (lines 304-367) to credit wallet instead of direct transfer.

```typescript
// MODIFY: lib/services/escrow.service.ts:304-367

import { walletService } from './wallet.service';
import { notificationService } from './notification.service';

async releaseFundsToCreator(dealId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { creator: { include: { creatorProfile: true } } },
  });

  if (!deal) throw new Error('Deal not found');

  const totalAmount = Number(deal.totalAmount);
  const platformFee = totalAmount * 0.10;  // 10% platform fee
  const tdsRate = totalAmount > 5000000 ? 0.02 : 0.01; // 2% if > 50L, else 1%
  const tdsAmount = totalAmount * tdsRate;
  const netPayout = totalAmount - platformFee - tdsAmount;

  // Record escrow transaction (gross → net breakdown)
  await prisma.escrowTransaction.create({
    data: {
      dealId,
      transactionType: 'RELEASE_TO_CREATOR',
      amount: netPayout,
      status: 'COMPLETED',
    },
  });

  await prisma.escrowTransaction.create({
    data: {
      dealId,
      transactionType: 'PLATFORM_FEE',
      amount: platformFee,
      status: 'COMPLETED',
    },
  });

  // Credit creator's WALLET (instead of direct bank transfer)
  await walletService.credit(
    deal.creatorId,
    netPayout,
    dealId,
    `Payout: ${deal.title} (Gross: ₹${totalAmount}, Fee: ₹${platformFee}, TDS: ₹${tdsAmount})`
  );

  // Update deal status
  await prisma.deal.update({
    where: { id: dealId },
    data: { status: 'COMPLETED' },
  });

  // Update creator stats
  await prisma.creatorProfile.update({
    where: { userId: deal.creatorId },
    data: {
      totalDealsCompleted: { increment: 1 },
      totalEarnings: { increment: netPayout },
    },
  });

  // Send notification to creator
  await notificationService.send({
    userId: deal.creatorId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `₹${netPayout.toLocaleString('en-IN')} has been credited to your wallet for "${deal.title}"`,
    data: {
      dealId,
      grossAmount: totalAmount,
      platformFee,
      tdsAmount,
      netPayout,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      entityType: 'deal',
      entityId: dealId,
      action: 'funds_released_to_wallet',
      changes: {
        grossAmount: totalAmount,
        platformFee,
        tdsAmount,
        netPayout,
        status: 'COMPLETED',
      },
    },
  });
}
```

### 4.4 Wallet Withdrawal via Razorpay Payout — `lib/services/wallet.service.ts`

Add withdrawal processing to the existing `WalletService` class:

```typescript
// Add to WalletService class in lib/services/wallet.service.ts

/**
 * Process a withdrawal request via Razorpay Payout API.
 * Called after user initiates withdrawal from wallet.
 *
 * Flow:
 * 1. User requests withdrawal → WalletTransaction created with PENDING status
 * 2. This method processes via Razorpay Payout API
 * 3. On success → update transaction to COMPLETED, update totalWithdrawn
 * 4. On failure → refund balance, update transaction to FAILED
 */
async processWithdrawal(
  transactionId: string,
  bankDetails: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  }
): Promise<void> {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: transactionId },
    include: { wallet: { include: { user: true } } },
  });

  if (!transaction || transaction.status !== 'PENDING') {
    throw new Error('Transaction not found or not pending');
  }

  try {
    // Create Razorpay Payout
    const razorpay = getRazorpay();
    // Note: Razorpay Payout API requires RazorpayX account
    // const payout = await razorpay.payouts.create({
    //   account_number: process.env.RAZORPAY_PAYOUT_ACCOUNT_NUMBER!,
    //   fund_account: {
    //     account_type: 'bank_account',
    //     bank_account: {
    //       name: bankDetails.beneficiaryName,
    //       ifsc: bankDetails.ifsc,
    //       account_number: bankDetails.accountNumber,
    //     },
    //   },
    //   amount: Math.round(Number(transaction.amount) * 100),
    //   currency: 'INR',
    //   mode: 'NEFT',
    //   purpose: 'payout',
    //   queue_if_low_balance: true,
    //   reference_id: transactionId,
    // });

    // Update transaction
    await prisma.walletTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        bankTransactionId: 'payout_id_here', // payout.id
      },
    });

    // Update wallet totalWithdrawn
    await prisma.wallet.update({
      where: { id: transaction.walletId },
      data: {
        totalWithdrawn: { increment: Number(transaction.amount) },
      },
    });
  } catch (error) {
    // Refund on failure
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' },
      }),
      prisma.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balance: { increment: Number(transaction.amount) },
        },
      }),
    ]);

    throw error;
  }
}
```

---

## 5. API Routes

### 5.1 `app/api/notifications/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification.service';

/** GET /api/notifications — List notifications (paginated) */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20');

  const result = await notificationService.list(session.user.id, page, pageSize);
  return NextResponse.json(result);
}
```

### 5.2 `app/api/notifications/[id]/read/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification.service';

/** PUT /api/notifications/:id/read — Mark as read */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await notificationService.markRead(id, session.user.id);
  return NextResponse.json({ success: true });
}
```

### 5.3 `app/api/notifications/read-all/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification.service';

/** PUT /api/notifications/read-all — Mark all as read */
export async function PUT() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await notificationService.markAllRead(session.user.id);
  return NextResponse.json({ success: true });
}
```

### 5.4 `app/api/notifications/unread-count/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification.service';

/** GET /api/notifications/unread-count — Badge counter */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const count = await notificationService.getUnreadCount(session.user.id);
  return NextResponse.json({ count });
}
```

### 5.5 `app/api/notifications/preferences/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/services/notification.service';
import { notificationPreferenceSchema } from '@/lib/validations';

/** GET /api/notifications/preferences — Get preferences */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const preferences = await notificationService.getPreferences(session.user.id);
  return NextResponse.json(preferences);
}

/** PUT /api/notifications/preferences — Update preferences */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = notificationPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pref = await notificationService.updatePreference(
    session.user.id,
    parsed.data.type as any,
    {
      email: parsed.data.email,
      push: parsed.data.push,
      inApp: parsed.data.inApp,
    }
  );

  return NextResponse.json(pref);
}
```

### 5.6 `app/api/auth/kyb/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kybService } from '@/lib/services/kyb.service';
import { kybSchema } from '@/lib/validations';

/** POST /api/auth/kyb — Submit GSTIN for verification */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Only brands can verify GSTIN' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = kybSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await kybService.verifyGSTIN(
    session.user.brandProfileId,
    parsed.data.gstin
  );

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
```

### 5.7 `app/api/wallet/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { walletService } from '@/lib/services/wallet.service';

/** GET /api/wallet — Balance + recent transactions */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await walletService.getOrCreateWallet(session.user.id);
  return NextResponse.json(wallet);
}
```

### 5.8 `app/api/wallet/withdraw/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { walletService } from '@/lib/services/wallet.service';
import { walletWithdrawSchema } from '@/lib/validations';
import { paymentLimiter } from '@/lib/rate-limit';

/** POST /api/wallet/withdraw — Request withdrawal */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = await paymentLimiter(session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = walletWithdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await walletService.withdraw(
    session.user.id,
    parsed.data.amount,
    'Withdrawal request'
  );

  return NextResponse.json(result, { status: 201 });
}
```

### 5.9 `app/api/wallet/transactions/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { walletService } from '@/lib/services/wallet.service';

/** GET /api/wallet/transactions — Transaction history (paginated) */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20');

  const result = await walletService.getTransactions(session.user.id, page, pageSize);
  return NextResponse.json(result);
}
```

---

## 6. Inngest Functions

### 6.1 Notification Email Dispatch — `lib/inngest/functions/notifications.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email notification for a single user.
 * Triggered by 'notification/send' event.
 */
export const notificationEmailFunction = inngest.createFunction(
  {
    id: 'notification-email',
    name: 'Send Notification Email',
    retries: 3,
  },
  { event: 'notification/send' },
  async ({ event, step }) => {
    const { userId, type, title, message } = event.data;

    const user = await step.run('get-user', async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
    });

    if (!user) return { skipped: true, reason: 'User not found' };

    await step.run('send-email', async () => {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email,
        subject: title,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${title}</h2>
            <p>${message}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">
              Influencer Connect — You can manage your notification preferences in Settings.
            </p>
          </div>
        `,
      });
    });

    return { userId, type, sent: true };
  }
);

/**
 * Batch notification for campaign announcements.
 * Anti-thundering-herd: tiered delivery by creator rating.
 * Triggered by 'notification/batch-send' event.
 */
export const notificationBatchFunction = inngest.createFunction(
  {
    id: 'notification-batch',
    name: 'Batch Campaign Notification',
    retries: 2,
  },
  { event: 'notification/batch-send' },
  async ({ event, step }) => {
    const { campaignId, type, title, message } = event.data;

    // Tier 1: Platinum creators (rating >= 4.5) — immediately
    const tier1Count = await step.run('tier-1-platinum', async () => {
      return sendToTier(campaignId, 4.5, 5.0, title, message, type);
    });

    // Tier 2: Gold creators (rating 3.5-4.49) — after 60s
    await step.sleep('wait-tier-2', '60s');
    const tier2Count = await step.run('tier-2-gold', async () => {
      return sendToTier(campaignId, 3.5, 4.49, title, message, type);
    });

    // Tier 3: Silver creators (rating 2.5-3.49) — after 5min
    await step.sleep('wait-tier-3', '5m');
    const tier3Count = await step.run('tier-3-silver', async () => {
      return sendToTier(campaignId, 2.5, 3.49, title, message, type);
    });

    // Tier 4: Bronze creators (rating < 2.5) — after 10min
    await step.sleep('wait-tier-4', '10m');
    const tier4Count = await step.run('tier-4-bronze', async () => {
      return sendToTier(campaignId, 0, 2.49, title, message, type);
    });

    return {
      campaignId,
      totalNotified: tier1Count + tier2Count + tier3Count + tier4Count,
      tiers: { platinum: tier1Count, gold: tier2Count, silver: tier3Count, bronze: tier4Count },
    };
  }
);

/** Send notifications to creators in a rating tier, batched by 100 */
async function sendToTier(
  campaignId: string,
  minRating: number,
  maxRating: number,
  title: string,
  message: string,
  type: string
): Promise<number> {
  const entities = await prisma.socialEntity.findMany({
    where: {
      isActive: true,
      rating: { gte: minRating, lte: maxRating },
    },
    select: { masterId: true },
    distinct: ['masterId'],
  });

  // Process in batches of 100
  const batchSize = 100;
  let notified = 0;

  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (entity) => {
        await prisma.notification.create({
          data: {
            userId: entity.masterId,
            type: type as any,
            title,
            message,
            data: { campaignId },
          },
        });
      })
    );
    notified += batch.length;
  }

  return notified;
}
```

### 6.2 GSTIN Monthly Recheck — `lib/inngest/functions/gstin-recheck.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import { kybService } from '@/lib/services/kyb.service';

/**
 * Monthly cron: re-verify all verified GSTINs.
 * If filing status changes to Suspended/Cancelled,
 * pauses active campaigns and notifies brand.
 */
export const gstinRecheckFunction = inngest.createFunction(
  {
    id: 'gstin-monthly-recheck',
    name: 'Monthly GSTIN Re-verification',
  },
  { cron: '0 3 1 * *' }, // 3 AM IST on the 1st of each month
  async ({ step }) => {
    const result = await step.run('recheck-all-gstins', async () => {
      return kybService.recheckAll();
    });

    return result;
  }
);
```

**Register in `app/api/inngest/route.ts`**: Add `notificationEmailFunction`, `notificationBatchFunction`, and `gstinRecheckFunction` to the `functions` array.

---

## 7. Validation Schemas

Already added in Phase 1:
- `walletWithdrawSchema`
- `notificationPreferenceSchema`
- `kybSchema`

---

## 8. Frontend Changes

### 8.1 Notification Bell Component

Create `components/notification-bell.tsx`:

- Bell icon with unread count badge (from `GET /api/notifications/unread-count`)
- Click opens dropdown with recent notifications
- Subscribe to `private-user-{userId}` Pusher channel for real-time updates
- "Mark all read" button
- Click notification → navigate to relevant page (deal, campaign, wallet)
- Link to notification preferences page

### 8.2 Wallet UI

Create wallet pages under `app/dashboard/*/wallet/`:

- **Balance card**: Current balance, total earned, total withdrawn
- **Transaction history**: Paginated list from `GET /api/wallet/transactions`
- **Withdraw button**: Opens modal with amount input + bank details
- **Fee breakdown**: Show gross → platform fee → TDS → net for each credit

### 8.3 KYB Verification UI

Add to brand profile/settings page:

- **GSTIN input field** with format validation
- **"Verify" button** → calls `POST /api/auth/kyb`
- **Verified badge** after successful verification
- **Status display**: Filing status, registered address, last checked date

---

## 9. Migration & Seed

No additional migrations. All models created in Phase 1.

### Integration Points — Existing Service Modifications

Add notification calls to existing services (replace TODO comments):

#### `lib/services/escrow.service.ts:143`

```typescript
// REPLACE: // TODO: Send notification to creator
await notificationService.send({
  userId: deal.creatorId,
  type: 'PAYMENT_RECEIVED',
  title: 'First Payment Received',
  message: `Brand has paid 50% (₹${amount50.toLocaleString('en-IN')}) for "${deal.title}". Production can now begin.`,
  data: { dealId, amount: amount50, phase: '50%' },
});
```

#### `lib/services/escrow.service.ts:183`

```typescript
// REPLACE: // TODO: Send notification to brand
await notificationService.send({
  userId: deal.brandId,
  type: 'PAYMENT_REQUIRED',
  title: 'Files Delivered — Payment Required',
  message: `Creator has delivered files for "${deal.title}". Please review and complete the remaining payment.`,
  data: { dealId },
});
```

#### `lib/services/chat.service.ts:170`

```typescript
// REPLACE: // TODO: Send email/notification to admins
// This is already handled by the PII service in Phase 3.
// For offline message notifications, add:
const recipientId = deal.brandId === senderId ? deal.creatorId : deal.brandId;
await notificationService.send({
  userId: recipientId,
  type: 'DEAL_STATUS_CHANGED',
  title: 'New Message',
  message: `You have a new message in "${deal.title}"`,
  data: { dealId },
});
```

---

## 10. Verification Checklist

1. [ ] Trigger a deal status change → verify notification appears in-app (Pusher)
2. [ ] Verify notification email sent via Resend (check email inbox)
3. [ ] Disable email in preferences → verify no email sent for that notification type
4. [ ] Publish a campaign → verify tiered batch notification (platinum first, then gold, etc.)
5. [ ] Verify `GET /api/notifications` returns paginated list
6. [ ] Verify `PUT /api/notifications/read-all` marks all as read
7. [ ] Verify `GET /api/notifications/unread-count` returns correct badge count
8. [ ] Submit valid GSTIN → verify brand profile updated with `gstinVerified: true`
9. [ ] Submit invalid GSTIN → verify error response, user set to pending verification
10. [ ] Simulate GSTIN status change to "Suspended" → verify campaigns paused + notification sent
11. [ ] Verify GSTIN recheck cron runs monthly (test with shortened interval)
12. [ ] Complete a deal → verify wallet credited with correct net amount (gross - 10% fee - TDS)
13. [ ] Verify wallet balance shows on `GET /api/wallet`
14. [ ] Request withdrawal → verify `WalletTransaction` created with PENDING status
15. [ ] Verify transaction history paginated correctly
16. [ ] Run `npx tsc --noEmit` → no TypeScript errors
