import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { fileService } from '@/lib/services/file.service';
import { completeUploadSchema } from '@/lib/validations';

/**
 * POST /api/files/complete-upload
 * Body: { dealId, path, token }
 * Returns: { deliverableId, videoAssetId }
 */
export async function POST(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = completeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dealId, path, token } = parsed.data;

  try {
    const result = await fileService.completeMultipartUpload(
      dealId,
      userId,
      path,
      token
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload completion failed' },
      { status: 500 }
    );
  }
}
