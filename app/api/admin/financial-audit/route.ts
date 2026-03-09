import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, AuthError } from '@/lib/auth-helpers';
import { adminService } from '@/lib/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      userId: searchParams.get('userId') || undefined,
      dealId: searchParams.get('dealId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20,
    };

    const data = await adminService.getFinancialAudit(filters);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Financial audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
