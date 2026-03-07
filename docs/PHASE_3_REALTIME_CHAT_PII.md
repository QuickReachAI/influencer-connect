# Phase 3: Real-Time Chat & Enhanced PII Detection

## 1. Overview

Phase 3 replaces the polling-based chat with Pusher-powered real-time messaging and upgrades the basic keyword PII detection (`lib/services/chat.service.ts:3-57`) with a comprehensive regex engine supporting Indian-specific patterns, escalation tracking, and progressive enforcement.

**Delivers**: Real-time chat via Pusher, typing indicators, read receipts, comprehensive PII detection with Indian patterns (phone, UPI, Aadhaar, PAN, Hindi spelled numbers), Redis-backed escalation tracking, shadow blocking.

**Dependencies**: Phase 1 complete (PIIViolation, UserWarning models), Phase 2 complete (social entities used in chat context).

---

## 2. Prerequisites

### npm packages to install

```bash
npm install pusher pusher-js
```

### Environment variables to add (`.env`)

```env
# Pusher
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap2          # Asia Pacific (Mumbai) for Indian market

# Client-side (prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
```

### Prior phase completion checks

- [ ] Phase 1 models exist: `PIIViolation`, `UserWarning`, `ChatMessage` (with `piiViolations` relation)
- [ ] Redis available (Upstash, used for PII escalation tracking `ic:pii:{userId}`)
- [ ] Phase 2 complete (deals with entities, lock workflow)

---

## 3. Schema Changes

No new schema changes. All models used in this phase were created in Phase 1.

---

## 4. Service Layer

### 4.1 Pusher Server Singleton — `lib/pusher.ts` (NEW)

```typescript
import Pusher from 'pusher';

let _pusher: Pusher | null = null;

/**
 * Server-side Pusher singleton.
 * Channel naming convention:
 *   - private-deal-{dealId}  — Messages, typing, read receipts per deal
 *   - private-user-{userId}  — Notifications, online status per user
 *
 * Events:
 *   - new-message       — New chat message
 *   - typing-start      — User started typing
 *   - typing-stop       — User stopped typing
 *   - read-receipt       — Messages read
 *   - message-flagged    — PII violation detected
 *   - system-notification — System notification
 */
export function getPusher(): Pusher {
  if (!_pusher) {
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return _pusher;
}

/** Trigger event on a private deal channel */
export async function triggerDealEvent(
  dealId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await getPusher().trigger(`private-deal-${dealId}`, event, data);
}

/** Trigger event on a private user channel */
export async function triggerUserEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await getPusher().trigger(`private-user-${userId}`, event, data);
}
```

### 4.2 Pusher Client Hook — `lib/hooks/use-pusher.ts` (NEW)

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

function getPusherClient(): PusherClient {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      }
    );
  }
  return pusherInstance;
}

interface UsePusherOptions {
  /** Channel name (e.g., 'private-deal-{dealId}') */
  channel: string;
  /** Event to listen for (e.g., 'new-message') */
  event: string;
  /** Callback when event is received */
  onEvent: (data: any) => void;
  /** Whether to subscribe (default true) */
  enabled?: boolean;
}

/**
 * React hook for subscribing to Pusher channels.
 * Automatically subscribes/unsubscribes on mount/unmount.
 *
 * Usage:
 * ```tsx
 * usePusher({
 *   channel: `private-deal-${dealId}`,
 *   event: 'new-message',
 *   onEvent: (message) => setMessages(prev => [...prev, message]),
 * });
 * ```
 */
export function usePusher({ channel, event, onEvent, enabled = true }: UsePusherOptions) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const pusher = getPusherClient();
    const ch = pusher.subscribe(channel);

    const handler = (data: any) => callbackRef.current(data);
    ch.bind(event, handler);

    return () => {
      ch.unbind(event, handler);
      pusher.unsubscribe(channel);
    };
  }, [channel, event, enabled]);
}

/**
 * Hook for multiple events on the same channel.
 */
export function usePusherChannel(channel: string, handlers: Record<string, (data: any) => void>) {
  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(channel);

    for (const [event, handler] of Object.entries(handlers)) {
      ch.bind(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        ch.unbind(event, handler);
      }
      pusher.unsubscribe(channel);
    };
  }, [channel]);
}

/**
 * Hook to trigger typing indicator.
 * Returns { startTyping, stopTyping } functions.
 */
export function useTypingIndicator(dealId: string) {
  const triggerTyping = useCallback(
    async (action: 'start' | 'stop') => {
      await fetch(`/api/chat/${dealId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    },
    [dealId]
  );

  return {
    startTyping: () => triggerTyping('start'),
    stopTyping: () => triggerTyping('stop'),
  };
}
```

### 4.3 PII Detection Service — `lib/services/pii.service.ts` (NEW)

Replaces the basic keyword matching in `lib/services/chat.service.ts:3-57`.

```typescript
import prisma from '@/lib/prisma';
import { Redis } from '@upstash/redis';
import type { PIIDetectedType, PIISeverity, PIIAction } from '@prisma/client';

const redis = Redis.fromEnv();

// ---- Indian-Specific PII Patterns ----

interface PIIPattern {
  type: PIIDetectedType;
  regex: RegExp;
  severity: PIISeverity;
  description: string;
}

const PII_PATTERNS: PIIPattern[] = [
  // Indian mobile number: +91 prefix optional, starts with 6-9
  {
    type: 'PHONE_NUMBER',
    regex: /(?:\+91[\s-]?)?[6-9]\d{9}/g,
    severity: 'HIGH',
    description: 'Indian mobile number',
  },
  // Email address
  {
    type: 'EMAIL_ADDRESS',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: 'HIGH',
    description: 'Email address',
  },
  // Aadhaar number: starts with 2-9, 12 digits with optional separators
  {
    type: 'AADHAAR_NUMBER',
    regex: /[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}/g,
    severity: 'CRITICAL',
    description: 'Aadhaar number',
  },
  // PAN number: ABCDE1234F format
  {
    type: 'PAN_NUMBER',
    regex: /[A-Z]{5}\d{4}[A-Z]/g,
    severity: 'CRITICAL',
    description: 'PAN number',
  },
  // UPI ID: handle@bank
  {
    type: 'UPI_ID',
    regex: /[a-zA-Z0-9._-]+@(?:okaxis|okhdfcbank|okicici|oksbi|ybl|paytm|gpay|phonepe|upi|apl|axisbank|icici|sbi|hdfcbank|ibl|federal|kotak|indus|rbl|idbi|citi|hsbc|sc|jio|slice|fi|jupiter|fam|tapicici|postbank|dbs|dcb|kvb|csb|pnb|boi|bob|unionbank|canara|iob|cub|tmb|karur)/gi,
    severity: 'HIGH',
    description: 'UPI ID',
  },
  // External URLs
  {
    type: 'EXTERNAL_URL',
    regex: /(https?:\/\/|www\.)[^\s]+/gi,
    severity: 'MEDIUM',
    description: 'External URL',
  },
  // Social handle patterns (@username style)
  {
    type: 'SOCIAL_HANDLE',
    regex: /@[a-zA-Z0-9_.]{3,30}/g,
    severity: 'LOW',
    description: 'Social media handle',
  },
  // English spelled-out numbers (7+ consecutive number words = likely phone)
  {
    type: 'PHONE_NUMBER',
    regex: /(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine)){6,}/gi,
    severity: 'HIGH',
    description: 'Spelled-out phone number (English)',
  },
  // Hindi spelled-out numbers
  {
    type: 'PHONE_NUMBER',
    regex: /(?:ek|do|teen|char|panch|cheh|saat|aath|nau|shunya)(?:\s+(?:ek|do|teen|char|panch|cheh|saat|aath|nau|shunya)){6,}/gi,
    severity: 'HIGH',
    description: 'Spelled-out phone number (Hindi)',
  },
  // Bank account number (9-18 digit sequences)
  {
    type: 'BANK_ACCOUNT',
    regex: /\b\d{9,18}\b/g,
    severity: 'HIGH',
    description: 'Potential bank account number',
  },
];

// Platform leakage keywords (extends the existing FORBIDDEN_KEYWORDS from chat.service.ts:3-8)
const PLATFORM_LEAKAGE_KEYWORDS = [
  'whatsapp', 'telegram', 'signal', 'dm me', 'call me',
  'text me', 'message me on', 'reach me at', 'my number',
  'my email', 'send me', 'contact me', 'outside the platform',
  'direct payment', 'bank transfer', 'google pay', 'phone pe',
  'bhim', 'neft', 'rtgs', 'imps', 'cash app',
];

export interface PIIScanResult {
  hasPII: boolean;
  violations: {
    type: PIIDetectedType;
    severity: PIISeverity;
    match: string;
    description: string;
  }[];
  hasPlatformLeakage: boolean;
  leakageKeywords: string[];
  /** Content with PII replaced by [REDACTED] */
  redactedContent: string;
  /** Action to take based on escalation level */
  action: PIIAction;
  /** Current violation count for this user */
  violationCount: number;
}

export class PIIService {
  /**
   * Scan message content for PII and platform leakage.
   * Runs synchronously (~2-5ms for regex matching).
   * Escalation level fetched from Redis `ic:pii:{userId}`.
   *
   * Replaces: chat.service.ts:3-57 (detectForbiddenContent)
   */
  async scan(content: string, userId: string): Promise<PIIScanResult> {
    const violations: PIIScanResult['violations'] = [];
    let redactedContent = content;

    // 1. Regex PII detection
    for (const pattern of PII_PATTERNS) {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        violations.push({
          type: pattern.type,
          severity: pattern.severity,
          match: match[0],
          description: pattern.description,
        });
        // Redact in content
        redactedContent = redactedContent.replace(match[0], '[REDACTED]');
      }
    }

    // 2. Platform leakage keyword detection
    const lowerContent = content.toLowerCase();
    const leakageKeywords = PLATFORM_LEAKAGE_KEYWORDS.filter((kw) =>
      lowerContent.includes(kw)
    );

    // 3. Determine escalation level from Redis
    const violationCount = await this.getViolationCount(userId);
    const action = this.determineAction(violationCount);

    return {
      hasPII: violations.length > 0,
      violations,
      hasPlatformLeakage: leakageKeywords.length > 0,
      leakageKeywords,
      redactedContent,
      action,
      violationCount,
    };
  }

  /**
   * Record a PII violation in the database and increment Redis counter.
   *
   * Escalation thresholds:
   * - 1st: WARNED (soft warning toast)
   * - 3rd: REDACTED (PII replaced with [REDACTED] in recipient view)
   * - 5th: SHADOW_BLOCKED (sender sees sent, recipient never receives)
   * - 10th: BLOCKED (auto-ban)
   */
  async recordViolation(
    userId: string,
    chatMessageId: string | null,
    violation: {
      type: PIIDetectedType;
      severity: PIISeverity;
      originalContent: string;
      redactedContent: string;
    },
    action: PIIAction
  ): Promise<void> {
    // Store in PIIViolation table
    await prisma.pIIViolation.create({
      data: {
        userId,
        chatMessageId,
        detectedType: violation.type,
        originalContent: violation.originalContent,
        redactedContent: violation.redactedContent,
        severity: violation.severity,
        actionTaken: action,
      },
    });

    // Upsert UserWarning counter
    await prisma.userWarning.upsert({
      where: {
        userId_warningType: { userId, warningType: 'PII_LEAK' },
      },
      create: {
        userId,
        warningType: 'PII_LEAK',
        count: 1,
        shadowBlocked: action === 'SHADOW_BLOCKED',
        shadowBlockedAt: action === 'SHADOW_BLOCKED' ? new Date() : null,
      },
      update: {
        count: { increment: 1 },
        lastWarningAt: new Date(),
        shadowBlocked: action === 'SHADOW_BLOCKED' ? true : undefined,
        shadowBlockedAt: action === 'SHADOW_BLOCKED' ? new Date() : undefined,
      },
    });

    // Increment Redis counter (TTL 90 days)
    const key = `ic:pii:${userId}`;
    await redis.incr(key);
    await redis.expire(key, 90 * 24 * 60 * 60); // 90 days
  }

  /** Get current violation count from Redis */
  private async getViolationCount(userId: string): Promise<number> {
    const count = await redis.get<number>(`ic:pii:${userId}`);
    return count ?? 0;
  }

  /**
   * Determine enforcement action based on violation count.
   * - 0: WARNED
   * - >= 3: REDACTED
   * - >= 5: SHADOW_BLOCKED
   * - >= 10: BLOCKED
   */
  private determineAction(count: number): PIIAction {
    if (count >= 10) return 'BLOCKED';
    if (count >= 5) return 'SHADOW_BLOCKED';
    if (count >= 3) return 'REDACTED';
    return 'WARNED';
  }

  /** Check if a user is currently shadow-blocked */
  async isShadowBlocked(userId: string): Promise<boolean> {
    const warning = await prisma.userWarning.findUnique({
      where: { userId_warningType: { userId, warningType: 'PII_LEAK' } },
    });
    return warning?.shadowBlocked ?? false;
  }
}

export const piiService = new PIIService();
```

### 4.4 Chat Service Modifications — `lib/services/chat.service.ts`

Replace the existing `detectForbiddenContent` method (lines 3-57) and integrate Pusher + PII service.

#### Remove: Lines 3-8 (FORBIDDEN_KEYWORDS array)

```typescript
// DELETE: const FORBIDDEN_KEYWORDS = [...] (lines 3-8)
```

#### Remove: Lines 15-57 (detectForbiddenContent method)

```typescript
// DELETE: private detectForbiddenContent(content: string): FlagResult { ... }
```

#### Add imports at top of file:

```typescript
import { piiService, type PIIScanResult } from './pii.service';
import { triggerDealEvent } from '@/lib/pusher';
```

#### Modify `sendMessage` method (starting at line 63):

Replace the PII detection and Pusher integration in the `sendMessage` method body:

```typescript
async sendMessage(
  dealId: string,
  senderId: string,
  content: string,
  messageType: 'TEXT' | 'FILE' | 'SYSTEM' = 'TEXT',
  metadata?: any
): Promise<any> {
  // Verify user is part of the deal
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  });
  if (!deal) throw new Error('Deal not found');
  if (deal.brandId !== senderId && deal.creatorId !== senderId) {
    throw new Error('Unauthorized');
  }

  // --- PII scan (replaces detectForbiddenContent) ---
  const piiResult: PIIScanResult = await piiService.scan(content, senderId);

  // Determine what content to store/deliver
  let storedContent = content;
  let flagged = false;
  let flagReason: string | null = null;

  if (piiResult.hasPII || piiResult.hasPlatformLeakage) {
    flagged = true;
    flagReason = piiResult.violations
      .map((v) => v.description)
      .concat(piiResult.leakageKeywords.map((k) => `Platform keyword: ${k}`))
      .join('; ');

    // If action is REDACTED or higher, store redacted version
    if (piiResult.action === 'REDACTED' || piiResult.action === 'SHADOW_BLOCKED') {
      storedContent = piiResult.redactedContent;
    }
  }

  // Shadow block: save message but don't deliver to recipient
  const shadowBlocked = piiResult.action === 'SHADOW_BLOCKED';

  // Create message
  const message = await prisma.chatMessage.create({
    data: {
      dealId,
      senderId,
      messageType,
      content: storedContent,
      metadata,
      flagged,
      flagReason,
    },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          creatorProfile: { select: { name: true, avatar: true } },
          brandProfile: { select: { companyName: true, logo: true } },
        },
      },
    },
  });

  // Record PII violations
  if (piiResult.hasPII) {
    for (const violation of piiResult.violations) {
      await piiService.recordViolation(senderId, message.id, {
        type: violation.type,
        severity: violation.severity,
        originalContent: content,
        redactedContent: piiResult.redactedContent,
      }, piiResult.action);
    }
  }

  // --- Pusher: Real-time delivery ---
  if (!shadowBlocked) {
    await triggerDealEvent(dealId, 'new-message', {
      id: message.id,
      dealId,
      senderId,
      content: storedContent,
      messageType,
      metadata,
      flagged,
      createdAt: message.createdAt,
      sender: message.sender,
    });
  }

  // Send warning if PII detected
  if (flagged && piiResult.action === 'WARNED') {
    await this.sendSystemMessage(
      dealId,
      '⚠️ Warning: Sharing personal information or attempting to communicate outside the platform is prohibited.'
    );
    // Trigger warning via Pusher
    await triggerDealEvent(dealId, 'message-flagged', {
      userId: senderId,
      action: piiResult.action,
      violationCount: piiResult.violationCount + 1,
    });
  }

  // Notify admins for HIGH/CRITICAL severity
  if (piiResult.violations.some((v) => v.severity === 'HIGH' || v.severity === 'CRITICAL')) {
    await this.notifyAdminsOfLeakageAttempt(dealId, senderId, content, flagReason!);
  }

  // Audit log for flagged messages
  if (flagged) {
    await prisma.auditLog.create({
      data: {
        entityType: 'chat',
        entityId: message.id,
        action: 'pii_violation',
        actorId: senderId,
        changes: {
          action: piiResult.action,
          violationCount: piiResult.violationCount + 1,
          types: piiResult.violations.map((v) => v.type),
        },
      },
    });
  }

  return message;
}
```

---

## 5. API Routes

### 5.1 Pusher Auth — `app/api/pusher/auth/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPusher } from '@/lib/pusher';
import prisma from '@/lib/prisma';

/**
 * POST /api/pusher/auth — Authenticate private Pusher channels.
 * Verifies user has access to the requested channel.
 *
 * Channel naming:
 *   - private-deal-{dealId}: User must be brand or creator on the deal
 *   - private-user-{userId}: User must own the userId
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id')!;
  const channel = params.get('channel_name')!;

  // Validate channel access
  if (channel.startsWith('private-deal-')) {
    const dealId = channel.replace('private-deal-', '');
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });

    if (!deal || (deal.brandId !== session.user.id && deal.creatorId !== session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (channel.startsWith('private-user-')) {
    const userId = channel.replace('private-user-', '');
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  }

  const auth = getPusher().authorizeChannel(socketId, channel);
  return NextResponse.json(auth);
}
```

### 5.2 Typing Indicator — `app/api/chat/[dealId]/typing/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { triggerDealEvent } from '@/lib/pusher';
import { chatLimiter } from '@/lib/rate-limit';

/**
 * POST /api/chat/:dealId/typing — Trigger typing indicator
 * Body: { action: 'start' | 'stop' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = await chatLimiter(session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { dealId } = await params;
  const { action } = await request.json();

  await triggerDealEvent(dealId, action === 'start' ? 'typing-start' : 'typing-stop', {
    userId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
```

### 5.3 Read Receipts — `app/api/chat/[dealId]/read/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { triggerDealEvent } from '@/lib/pusher';

/**
 * POST /api/chat/:dealId/read — Mark messages as read + trigger receipt
 * Body: { lastReadMessageId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId } = await params;
  const { lastReadMessageId } = await request.json();

  await triggerDealEvent(dealId, 'read-receipt', {
    userId: session.user.id,
    lastReadMessageId,
    readAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
```

---

## 6. Inngest Functions

No new Inngest functions in Phase 3. PII escalation is handled synchronously in the PII service with Redis counters. Auto-ban at 10 violations can be added as an Inngest event handler if async processing is preferred.

---

## 7. Validation Schemas

Add to `lib/validations.ts`:

```typescript
// Phase 3 — Chat Typing/Read
export const typingSchema = z.object({
  action: z.enum(['start', 'stop']),
});

export const readReceiptSchema = z.object({
  lastReadMessageId: z.string().uuid(),
});
```

---

## 8. Frontend Changes

### 8.1 Brand Messages Page — `app/dashboard/brand/messages/page.tsx`

Replace `setInterval` polling with Pusher subscription:

```typescript
// REMOVE: The setInterval polling pattern
// clearInterval / setInterval(..., 3000) for fetching messages

// ADD: Pusher subscription
import { usePusher, usePusherChannel, useTypingIndicator } from '@/lib/hooks/use-pusher';

// In the component:
const [messages, setMessages] = useState<Message[]>([]);
const [isTyping, setIsTyping] = useState(false);

// Subscribe to real-time messages
usePusher({
  channel: `private-deal-${dealId}`,
  event: 'new-message',
  onEvent: (message) => {
    setMessages((prev) => [...prev, message]);
  },
});

// Subscribe to typing indicators
usePusherChannel(`private-deal-${dealId}`, {
  'typing-start': (data) => {
    if (data.userId !== currentUserId) setIsTyping(true);
  },
  'typing-stop': (data) => {
    if (data.userId !== currentUserId) setIsTyping(false);
  },
  'read-receipt': (data) => {
    // Update message read status
  },
  'message-flagged': (data) => {
    // Show PII warning toast
  },
});

// Typing indicator
const { startTyping, stopTyping } = useTypingIndicator(dealId);
```

### 8.2 Creator Messages Page — `app/dashboard/influencer/messages/page.tsx`

Same Pusher integration as brand messages page (section 8.1).

### 8.3 Admin Flagged Messages — `app/dashboard/admin/flagged-messages/page.tsx`

Enhance to show PII violation details:

- Show `PIIDetectedType` badge (PHONE, EMAIL, AADHAAR, etc.)
- Show `PIISeverity` level (color-coded)
- Show `PIIAction` taken (WARNED, REDACTED, SHADOW_BLOCKED)
- Show user's total violation count from `UserWarning`
- "Undo Redaction" button for admin review of original content
- "Un-Shadow-Block" button to reset user's warning count

---

## 9. Migration & Seed

No additional migrations. The `PIIViolation` and `UserWarning` tables were created in Phase 1.

---

## 10. Verification Checklist

1. [ ] Send a message → verify it appears in real-time on the other user's screen (no page refresh needed)
2. [ ] Send a phone number (e.g., "9876543210") → verify soft warning toast appears
3. [ ] Send an Aadhaar number → verify CRITICAL severity flagged
4. [ ] Send a UPI ID (e.g., "user@okaxis") → verify HIGH severity flagged
5. [ ] Send "one two three four five six seven eight nine zero" → verify spelled-out number detected
6. [ ] Send "ek do teen char panch cheh saat aath nau shunya" → verify Hindi spelled-out number detected
7. [ ] Send 3 violations → verify messages show [REDACTED] content to recipient
8. [ ] Send 5 violations → verify shadow block (sender sees "sent", recipient doesn't receive)
9. [ ] Verify typing indicator: user A types → user B sees "typing..." indicator
10. [ ] Verify read receipts: user B reads message → user A sees read status
11. [ ] Verify Pusher auth: try to subscribe to a deal channel you're not part of → get 403
12. [ ] Verify `ic:pii:{userId}` Redis key exists with correct count after violations
13. [ ] Admin dashboard: verify flagged messages show PII type, severity, and action taken
14. [ ] Run `npx tsc --noEmit` → no TypeScript errors
15. [ ] Load test: open 10 browser tabs with same deal chat → verify all receive messages in real-time
