import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { notificationService } from '@/lib/services/notification.service';

/** GET /api/notifications/unread-count — Badge counter */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const count = await notificationService.getUnreadCount(userId);
  return NextResponse.json({ count });
}
