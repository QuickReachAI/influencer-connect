import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { notificationService } from '@/lib/services/notification.service';
import { notificationPreferenceSchema } from '@/lib/validations';

/** GET /api/notifications/preferences — Get preferences */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const preferences = await notificationService.getPreferences(userId);
  return NextResponse.json(preferences);
}

/** PUT /api/notifications/preferences — Update preferences */
export async function PUT(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = notificationPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const pref = await notificationService.updatePreference(
    userId,
    parsed.data.type as any,
    {
      email: parsed.data.email,
      push: parsed.data.push,
      inApp: parsed.data.inApp,
    }
  );

  return NextResponse.json(pref);
}
