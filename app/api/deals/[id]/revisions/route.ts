import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { revisionService } from '@/lib/services/revision.service';
import { dealRevisionSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';

/** GET /api/deals/:id/revisions — List all revisions for a deal */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify user is part of the deal
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || (deal.brandId !== userId && deal.creatorId !== userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const revisions = await revisionService.listRevisions(id);
  return NextResponse.json(revisions);
}

/** POST /api/deals/:id/revisions — Brand requests a revision */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is the brand on this deal
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.brandId !== userId) {
    return NextResponse.json({ error: 'Only the brand can request revisions' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = dealRevisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const revision = await revisionService.requestRevision(
      id,
      userId,
      parsed.data.feedback
    );
    return NextResponse.json(revision, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request revision' },
      { status: 400 }
    );
  }
}
