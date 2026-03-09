import { NextRequest, NextResponse } from 'next/server';
import { socialEntityService } from '@/lib/services/social-entity.service';

/** GET /api/social-entities/:id/completion — Profile completion breakdown */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const score = await socialEntityService.recalculateCompletionScore(id);

    return NextResponse.json({ entityId: id, completionScore: score });
  } catch (error: any) {
    console.error('Get completion score error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
