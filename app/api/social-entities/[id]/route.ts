import { NextRequest, NextResponse } from 'next/server';
import { socialEntityService } from '@/lib/services/social-entity.service';
import { socialEntityUpdateSchema } from '@/lib/validations';
import { getAuthUserId } from '@/lib/auth-helpers';

/** GET /api/social-entities/:id — Entity details */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const entity = await socialEntityService.getById(id, userId);
    return NextResponse.json(entity);
  } catch (error: any) {
    console.error('Get social entity error:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}

/** PATCH /api/social-entities/:id — Update entity profile */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = socialEntityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const entity = await socialEntityService.update(id, userId, parsed.data);
    return NextResponse.json(entity);
  } catch (error: any) {
    console.error('Update social entity error:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}

/** DELETE /api/social-entities/:id — Deactivate entity */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await socialEntityService.deactivate(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Deactivate social entity error:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}
