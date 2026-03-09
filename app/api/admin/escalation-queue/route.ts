import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, AuthError } from '@/lib/auth-helpers';
import { adminService } from '@/lib/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const data = await adminService.getEscalationQueue();

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Escalation queue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
