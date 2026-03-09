import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables';

/**
 * GET /api/files/:id/stream
 * Returns a short-lived (15min) signed URL for HLS manifest.
 * Client uses hls.js to play. No direct storage URLs exposed to frontend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromCookies(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const videoAsset = await prisma.videoAsset.findUnique({
    where: { id },
    include: { deal: true },
  });

  if (!videoAsset) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Verify user is part of the deal
  const deal = videoAsset.deal;
  if (deal.brandId !== userId && deal.creatorId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Determine which URL to serve
  // Brand sees watermarked version until final approval
  // After approval, brand gets clean version for download
  const s3Key = videoAsset.status === 'APPROVED' && videoAsset.cleanUrl
    ? videoAsset.cleanUrl
    : videoAsset.hlsUrl ?? videoAsset.watermarkedUrl ?? videoAsset.originalUrl;

  const expirySeconds = parseInt(process.env.HLS_PRESIGNED_URL_EXPIRY ?? '900');

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(s3Key, expirySeconds);

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to generate stream URL' }, { status: 500 });
  }

  return NextResponse.json({
    streamUrl: data.signedUrl,
    expiresIn: expirySeconds,
    status: videoAsset.status,
    duration: videoAsset.duration,
    resolution: videoAsset.resolution,
  });
}
