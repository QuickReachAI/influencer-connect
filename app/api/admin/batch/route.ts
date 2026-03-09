import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, AuthError } from '@/lib/auth-helpers';
import { adminService } from '@/lib/services/admin.service';
import { batchActionSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const adminId = await verifyAdmin(request);

    const body = await request.json();
    const parsed = batchActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.action === 'ban_users') {
      const result = await adminService.batchBanUsers(data.userIds, data.reason, adminId);
      return NextResponse.json(result);
    }

    if (data.action === 'update_applications') {
      const result = await adminService.batchUpdateApplications(
        data.applicationIds,
        data.status,
        data.brandProfileId
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Batch action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
