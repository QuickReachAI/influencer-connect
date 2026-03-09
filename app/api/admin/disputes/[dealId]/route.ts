import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, AuthError } from '@/lib/auth-helpers';
import { adminService } from '@/lib/services/admin.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    await verifyAdmin(request);

    const { dealId } = await params;
    const context = await adminService.getDisputeContext(dealId);

    if (!context) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(context);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Dispute context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
