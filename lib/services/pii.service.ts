import prisma from '@/lib/prisma';
import { Redis } from '@upstash/redis';
import type { PIIDetectedType, PIISeverity, PIIAction } from '@prisma/client';

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  try {
    _redis = Redis.fromEnv();
    return _redis;
  } catch {
    return null;
  }
}

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

// Platform leakage keywords
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
   */
  async scan(content: string, userId: string): Promise<PIIScanResult> {
    const violations: PIIScanResult['violations'] = [];
    let redactedContent = content;

    // 1. Regex PII detection
    for (const pattern of PII_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.regex.lastIndex = 0;
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        violations.push({
          type: pattern.type,
          severity: pattern.severity,
          match: match[0],
          description: pattern.description,
        });
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
    const r = getRedis();
    if (r) {
      const key = `ic:pii:${userId}`;
      await r.incr(key);
      await r.expire(key, 90 * 24 * 60 * 60);
    }
  }

  /** Get current violation count from Redis */
  private async getViolationCount(userId: string): Promise<number> {
    const r = getRedis();
    if (!r) return 0;
    const count = await r.get<number>(`ic:pii:${userId}`);
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
