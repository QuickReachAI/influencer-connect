import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { notificationService } from '@/lib/services/notification.service';

/** PUT /api/notifications/:id/read — Mark as read */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await notificationService.markRead(id, userId);
  return NextResponse.json({ success: true });
}
