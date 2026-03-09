import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/lib/services/oauth.service';

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { entityId } = await request.json();
    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    await oauthService.disconnectAccount(entityId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('YouTube disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
