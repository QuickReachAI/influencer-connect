import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { fileService } from '@/lib/services/file.service';
import { apiLimiter } from '@/lib/rate-limit';
import { initiateUploadSchema } from '@/lib/validations';

/**
 * POST /api/files/initiate-upload
 * Body: { dealId, fileName, fileSize, fileType }
 * Returns: { path, signedUrl, token }
 */
export async function POST(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = await apiLimiter(userId);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = initiateUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dealId, fileName, fileSize, fileType } = parsed.data;

  try {
    const result = await fileService.initiateMultipartUpload(
      dealId,
      userId,
      fileName,
      fileSize,
      fileType
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload initiation failed' },
      { status: 500 }
    );
  }
}
