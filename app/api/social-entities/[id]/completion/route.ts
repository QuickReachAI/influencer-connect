import { NextRequest, NextResponse } from 'next/server';
import { socialEntityService } from '@/lib/services/social-entity.service';
import { getAuthUserId } from '@/lib/auth-helpers';

/** GET /api/social-entities/:id/completion — Profile completion breakdown */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const score = await socialEntityService.recalculateCompletionScore(id);

    return NextResponse.json({ entityId: id, completionScore: score });
  } catch (error: any) {
    console.error('Get completion score error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
