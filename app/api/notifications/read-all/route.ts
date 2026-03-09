import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { notificationService } from '@/lib/services/notification.service';

/** PUT /api/notifications/read-all — Mark all as read */
export async function PUT(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await notificationService.markAllRead(userId);
  return NextResponse.json({ success: true });
}
