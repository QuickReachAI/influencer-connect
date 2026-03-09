import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { kybService } from '@/lib/services/kyb.service';
import { kybSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';

/** POST /api/auth/kyb — Submit GSTIN for verification */
export async function POST(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is a brand with a profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { brandProfile: true },
  });

  if (!user || user.role !== 'BRAND' || !user.brandProfile) {
    return NextResponse.json({ error: 'Only brands with a profile can verify GSTIN' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = kybSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await kybService.verifyGSTIN(
      user.brandProfile.id,
      parsed.data.gstin
    );

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
