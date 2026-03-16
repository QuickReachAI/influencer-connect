import { NextRequest, NextResponse } from 'next/server';
import { lookupInstagramProfile, apifyLimiter, apifyGlobalLimiter } from '@/lib/services/apify.service';
import { getAuthUserId } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const handle = body.handle;
    if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
      return NextResponse.json({ error: 'Instagram handle is required' }, { status: 400 });
    }

    // Per-user rate limit
    const userLimit = await apifyLimiter(`apify:user:${userId}`);
    if (!userLimit.success) {
      return NextResponse.json(
        { error: 'Too many lookups. Please wait a few minutes before trying again.', retryAfter: Math.ceil((userLimit.reset - Date.now()) / 1000) },
        { status: 429 }
      );
    }

    // Global rate limit (protect Apify quota)
    const globalLimit = await apifyGlobalLimiter('apify:global');
    if (!globalLimit.success) {
      return NextResponse.json(
        { error: 'Service is busy. Please try again in a moment.', retryAfter: Math.ceil((globalLimit.reset - Date.now()) / 1000) },
        { status: 429 }
      );
    }

    const profile = await lookupInstagramProfile(handle);

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Instagram lookup error:', error);
    const message = error.message || 'Failed to look up Instagram profile';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
