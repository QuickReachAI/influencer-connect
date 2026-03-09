import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { socialEntityService } from '@/lib/services/social-entity.service';
import { socialEntityCreateSchema } from '@/lib/validations';

/** GET /api/social-entities — List creator's entities */
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entities = await socialEntityService.listByUser(userId);
    return NextResponse.json({ entities });
  } catch (error: any) {
    console.error('List social entities error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/social-entities — Add social entity (creator only) */
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'CREATOR') {
      return NextResponse.json({ error: 'Only creators can add entities' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = socialEntityCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const entity = await socialEntityService.create({
      masterId: userId,
      ...parsed.data,
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (error: any) {
    console.error('Create social entity error:', error);
    const status = error.message?.includes('linked to another') ? 409 : 400;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}
