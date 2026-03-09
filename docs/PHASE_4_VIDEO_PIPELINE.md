# Phase 4: Video Processing & Content Pipeline

## 1. Overview

Phase 4 adds resumable multipart upload for large video files, an FFmpeg-based video processing pipeline running on AWS Lambda via Inngest, dynamic watermarking, HLS packaging for secure playback, and a bounded revision cycle for content review.

**Delivers**: Multipart S3 upload, video transcode/watermark/HLS pipeline, secure streaming with presigned URLs, revision workflow with bounded cycles, clean render on final approval.

**Dependencies**: Phase 1 complete (VideoAsset, DealRevision, DealMilestone models), Phase 2 complete (deals with entities), Phase 3 complete (real-time notifications via Pusher for revision status updates).

---

## 2. Prerequisites

### npm packages to install

```bash
npm install tus-js-client hls.js @aws-sdk/client-s3 @aws-sdk/lib-storage
```

> Note: `@aws-sdk/client-s3` is already installed (used in `lib/services/file.service.ts:2`). `@aws-sdk/lib-storage` adds multipart upload support.

### Environment variables to add (`.env`)

```env
# Video Processing Lambda
VIDEO_LAMBDA_FUNCTION_NAME=quick-connects-video-processor
VIDEO_LAMBDA_REGION=ap-south-1     # Mumbai region

# S3 paths
S3_RAW_PREFIX=raw/
S3_PROCESSED_PREFIX=processed/

# HLS streaming
HLS_PRESIGNED_URL_EXPIRY=900       # 15 minutes
```

### Prior phase completion checks

- [ ] Phase 1 models exist: `VideoAsset`, `DealRevision`, `Deliverable` (with `videoAsset` relation)
- [ ] Phase 1 enums exist: `VideoAssetStatus`, `RevisionStatus`
- [ ] Deal model has `maxRevisions` and `currentRevision` fields
- [ ] Inngest serve endpoint running and accepting new functions

---

## 3. Schema Changes

No new schema changes. All models used in this phase were created in Phase 1.

---

## 4. Service Layer

### 4.1 File Service Modifications — `lib/services/file.service.ts`

Add multipart upload methods to the existing `FileService` class (after `getStorageStats()` at line 327).

```typescript
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { inngest } from '@/lib/inngest/client';

// Add these methods inside the FileService class:

/**
 * Initiate a multipart upload for large files.
 * Returns upload ID + presigned URLs for each part.
 * Client uploads parts directly to S3 (browser → S3).
 *
 * @param dealId - Deal this file belongs to
 * @param creatorId - Uploader's user ID
 * @param fileName - Original file name
 * @param fileSize - Total file size in bytes
 * @param fileType - MIME type (e.g., video/mp4)
 * @param partCount - Number of parts (calculated from fileSize / partSize)
 * @returns { uploadId, s3Key, parts: [{ partNumber, presignedUrl }] }
 */
async initiateMultipartUpload(
  dealId: string,
  creatorId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  partCount: number
): Promise<{
  uploadId: string;
  s3Key: string;
  parts: { partNumber: number; presignedUrl: string }[];
}> {
  const bucket = process.env.AWS_S3_BUCKET!;
  const s3Key = `${process.env.S3_RAW_PREFIX ?? 'raw/'}${dealId}/${Date.now()}_${fileName}`;

  // Create multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: fileType,
    ServerSideEncryption: 'AES256',
    Metadata: { dealId, creatorId },
  });

  const { UploadId } = await s3Client.send(createCommand);

  // Generate presigned URLs for each part
  const parts: { partNumber: number; presignedUrl: string }[] = [];
  for (let i = 1; i <= partCount; i++) {
    const uploadPartCommand = new UploadPartCommand({
      Bucket: bucket,
      Key: s3Key,
      UploadId,
      PartNumber: i,
    });
    const presignedUrl = await getSignedUrl(s3Client, uploadPartCommand, {
      expiresIn: 3600, // 1 hour per part
    });
    parts.push({ partNumber: i, presignedUrl });
  }

  // Track upload state in VideoAsset
  await prisma.videoAsset.create({
    data: {
      dealId,
      originalUrl: s3Key,
      status: 'UPLOADING',
      fileSize: BigInt(fileSize),
    },
  });

  return { uploadId: UploadId!, s3Key, parts };
}

/**
 * Complete a multipart upload after all parts are uploaded.
 * Creates a Deliverable record and emits video processing event.
 *
 * @param dealId - Deal this file belongs to
 * @param creatorId - Uploader's user ID
 * @param s3Key - S3 key from initiateMultipartUpload
 * @param uploadId - S3 multipart upload ID
 * @param parts - Array of { partNumber, etag } from client after each part upload
 */
async completeMultipartUpload(
  dealId: string,
  creatorId: string,
  s3Key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<{ deliverableId: string; videoAssetId: string }> {
  const bucket = process.env.AWS_S3_BUCKET!;

  // Complete the S3 multipart upload
  const completeCommand = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: s3Key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    },
  });

  await s3Client.send(completeCommand);

  // Create Deliverable record
  const deliverable = await prisma.deliverable.create({
    data: {
      dealId,
      fileName: s3Key.split('/').pop()!,
      fileSize: 0, // Updated by video pipeline
      fileType: 'video/mp4',
      s3Key,
      s3Bucket: bucket,
      uploadedBy: creatorId,
    },
  });

  // Link VideoAsset to Deliverable
  const videoAsset = await prisma.videoAsset.updateMany({
    where: { dealId, originalUrl: s3Key },
    data: {
      deliverableId: deliverable.id,
      status: 'PROCESSING',
    },
  });

  // Get the actual VideoAsset ID
  const asset = await prisma.videoAsset.findFirst({
    where: { dealId, originalUrl: s3Key },
  });

  // Emit video processing event
  await inngest.send({
    name: 'video/process',
    data: {
      dealId,
      deliverableId: deliverable.id,
      s3Key,
    },
  });

  return {
    deliverableId: deliverable.id,
    videoAssetId: asset!.id,
  };
}

/**
 * Abort a multipart upload (cleanup on failure).
 */
async abortMultipartUpload(s3Key: string, uploadId: string): Promise<void> {
  const bucket = process.env.AWS_S3_BUCKET!;
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: s3Key,
      UploadId: uploadId,
    })
  );
}
```

### 4.2 Revision Service — `lib/services/revision.service.ts` (NEW)

```typescript
import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';

export class RevisionService {
  /**
   * Create a revision request (brand requests changes).
   * Enforced by maxRevisions on the Deal model.
   * If currentRevision >= maxRevisions, throws error (brand must purchase extension).
   */
  async requestRevision(
    dealId: string,
    brandId: string,
    feedback: string
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    if (deal.currentRevision >= deal.maxRevisions) {
      throw new Error(
        `Maximum revisions (${deal.maxRevisions}) reached. Purchase a revision extension to continue.`
      );
    }

    const nextRevisionNumber = deal.currentRevision + 1;

    const [revision, updatedDeal] = await prisma.$transaction([
      prisma.dealRevision.create({
        data: {
          dealId,
          revisionNumber: nextRevisionNumber,
          feedback,
          status: 'REVISION_REQUESTED',
        },
      }),
      prisma.deal.update({
        where: { id: dealId },
        data: {
          currentRevision: nextRevisionNumber,
          status: 'REVISION_PENDING',
        },
      }),
    ]);

    return revision;
  }

  /**
   * Submit a revision (creator uploads revised content).
   * Links the new video upload to this revision.
   */
  async submitRevision(
    dealId: string,
    revisionId: string,
    creatorId: string,
    videoUrl: string
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.creatorId !== creatorId) {
      throw new Error('Deal not found or unauthorized');
    }

    return prisma.dealRevision.update({
      where: { id: revisionId },
      data: {
        videoUrl,
        status: 'PENDING', // Awaiting brand review
      },
    });
  }

  /**
   * Approve a revision (brand approves the latest draft).
   * On final approval: emits deal/deliverable-approved event
   * → triggers clean render + escrow release.
   */
  async approveRevision(
    dealId: string,
    revisionId: string,
    brandId: string
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    const revision = await prisma.dealRevision.update({
      where: { id: revisionId },
      data: { status: 'APPROVED' },
    });

    // Move deal forward
    await prisma.deal.update({
      where: { id: dealId },
      data: { status: 'DELIVERY_PENDING' },
    });

    // Trigger clean render (no watermark) + escrow release
    const videoAsset = await prisma.videoAsset.findFirst({
      where: { revisionId },
    });

    if (videoAsset) {
      await inngest.send({
        name: 'video/clean-render',
        data: { dealId, videoAssetId: videoAsset.id },
      });
    }

    // Also trigger escrow flow
    await inngest.send({
      name: 'deal/deliverable-approved',
      data: { dealId, revisionId },
    });

    return revision;
  }

  /** Get all revisions for a deal */
  async listRevisions(dealId: string): Promise<any[]> {
    return prisma.dealRevision.findMany({
      where: { dealId },
      include: { videoAsset: true },
      orderBy: { revisionNumber: 'asc' },
    });
  }

  /** Add revision extension (increases maxRevisions, additional fee) */
  async addRevisionExtension(
    dealId: string,
    brandId: string,
    additionalRevisions: number = 1
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    return prisma.deal.update({
      where: { id: dealId },
      data: {
        maxRevisions: { increment: additionalRevisions },
      },
    });
  }
}

export const revisionService = new RevisionService();
```

---

## 5. API Routes

### 5.1 `app/api/files/initiate-upload/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileService } from '@/lib/services/file.service';
import { apiLimiter } from '@/lib/rate-limit';

const PART_SIZE = 10 * 1024 * 1024; // 10MB per part

/**
 * POST /api/files/initiate-upload
 * Body: { dealId, fileName, fileSize, fileType }
 * Returns: { uploadId, s3Key, parts: [{ partNumber, presignedUrl }] }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = await apiLimiter(session.user.id);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { dealId, fileName, fileSize, fileType } = await request.json();

  if (!dealId || !fileName || !fileSize || !fileType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const partCount = Math.ceil(fileSize / PART_SIZE);

  const result = await fileService.initiateMultipartUpload(
    dealId,
    session.user.id,
    fileName,
    fileSize,
    fileType,
    partCount
  );

  return NextResponse.json(result, { status: 201 });
}
```

### 5.2 `app/api/files/complete-upload/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileService } from '@/lib/services/file.service';

/**
 * POST /api/files/complete-upload
 * Body: { dealId, s3Key, uploadId, parts: [{ partNumber, etag }] }
 * Returns: { deliverableId, videoAssetId }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId, s3Key, uploadId, parts } = await request.json();

  if (!dealId || !s3Key || !uploadId || !parts?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await fileService.completeMultipartUpload(
    dealId,
    session.user.id,
    s3Key,
    uploadId,
    parts
  );

  return NextResponse.json(result, { status: 201 });
}
```

### 5.3 `app/api/files/[id]/stream/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '@/lib/prisma';

// Reuse S3 client from file.service.ts
import { S3Client } from '@aws-sdk/client-s3';
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * GET /api/files/:id/stream
 * Returns a short-lived (15min) presigned URL for HLS manifest.
 * Client uses hls.js to play. No direct S3 URLs exposed to frontend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  if (deal.brandId !== session.user.id && deal.creatorId !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Determine which URL to serve
  // Brand sees watermarked version until final approval
  // After approval, brand gets clean version for download
  const s3Key = videoAsset.status === 'APPROVED' && videoAsset.cleanUrl
    ? videoAsset.cleanUrl
    : videoAsset.hlsUrl ?? videoAsset.watermarkedUrl ?? videoAsset.originalUrl;

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: s3Key,
  });

  const expirySeconds = parseInt(process.env.HLS_PRESIGNED_URL_EXPIRY ?? '900');
  const streamUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expirySeconds,
  });

  return NextResponse.json({
    streamUrl,
    expiresIn: expirySeconds,
    status: videoAsset.status,
    duration: videoAsset.duration,
    resolution: videoAsset.resolution,
  });
}
```

### 5.4 `app/api/deals/[id]/revisions/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revisionService } from '@/lib/services/revision.service';
import { dealRevisionSchema } from '@/lib/validations';

/** GET /api/deals/:id/revisions — List all revisions for a deal */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const revisions = await revisionService.listRevisions(id);
  return NextResponse.json(revisions);
}

/** POST /api/deals/:id/revisions — Brand requests a revision */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Only brands can request revisions' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = dealRevisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const revision = await revisionService.requestRevision(
    id,
    session.user.id,
    parsed.data.feedback
  );

  return NextResponse.json(revision, { status: 201 });
}
```

### 5.5 `app/api/deals/[id]/revisions/[revisionId]/review/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revisionService } from '@/lib/services/revision.service';

/**
 * POST /api/deals/:id/revisions/:revisionId/review
 * Body: { action: 'approve' | 'request_revision', feedback?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'BRAND') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id, revisionId } = await params;
  const { action, feedback } = await request.json();

  if (action === 'approve') {
    const result = await revisionService.approveRevision(id, revisionId, session.user.id);
    return NextResponse.json(result);
  }

  if (action === 'request_revision' && feedback) {
    const result = await revisionService.requestRevision(id, session.user.id, feedback);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```

---

## 6. Inngest Functions

### 6.1 Video Pipeline — `lib/inngest/functions/video-pipeline.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.VIDEO_LAMBDA_REGION ?? 'ap-south-1',
});

/**
 * Multi-step video processing pipeline.
 * Triggered by 'video/process' event after multipart upload completes.
 *
 * Steps:
 * 1. Validate & extract metadata (duration, resolution, codec)
 * 2. Transcode to H.264/AAC 1080p (Lambda + FFmpeg)
 * 3. Apply dynamic watermark (brand name + date, repositions every 10s)
 * 4. Generate HLS segments (6s segments)
 * 5. Upload processed files to S3 /processed/{dealId}/
 * 6. Update DB status → READY
 */
export const videoPipelineFunction = inngest.createFunction(
  {
    id: 'video-pipeline',
    name: 'Video Processing Pipeline',
    retries: 2,
  },
  { event: 'video/process' },
  async ({ event, step }) => {
    const { dealId, deliverableId, s3Key } = event.data;

    // Step 1: Validate & extract metadata
    const metadata = await step.run('validate-metadata', async () => {
      const result = await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'validate',
            s3Bucket: process.env.AWS_S3_BUCKET!,
            s3Key,
          }),
        })
      );

      const payload = JSON.parse(
        new TextDecoder().decode(result.Payload)
      );

      if (payload.error) throw new Error(payload.error);

      // Update VideoAsset with metadata
      await prisma.videoAsset.updateMany({
        where: { dealId, originalUrl: s3Key },
        data: {
          duration: payload.duration,
          resolution: payload.resolution,
          codec: payload.codec,
          fileSize: BigInt(payload.fileSize),
        },
      });

      return payload;
    });

    // Step 2: Transcode to H.264/AAC 1080p
    const transcodedKey = await step.run('transcode', async () => {
      const outputKey = `${process.env.S3_PROCESSED_PREFIX ?? 'processed/'}${dealId}/transcoded.mp4`;

      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'transcode',
            s3Bucket: process.env.AWS_S3_BUCKET!,
            inputKey: s3Key,
            outputKey,
            // FFmpeg command equivalent:
            // ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23
            //   -c:a aac -b:a 128k -movflags +faststart -vf scale=-2:1080 output.mp4
          }),
        })
      );

      await prisma.videoAsset.updateMany({
        where: { dealId, originalUrl: s3Key },
        data: { status: 'WATERMARKING' },
      });

      return outputKey;
    });

    // Step 3: Apply dynamic watermark
    const watermarkedKey = await step.run('watermark', async () => {
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: { brand: { include: { brandProfile: true } } },
      });

      const brandName = deal?.brand?.brandProfile?.companyName ?? 'DRAFT';
      const outputKey = `${process.env.S3_PROCESSED_PREFIX ?? 'processed/'}${dealId}/watermarked.mp4`;

      // FFmpeg drawtext expression — cycles through 4 corner positions every 10s:
      // Position 0 (0-10s): top-left
      // Position 1 (10-20s): top-right
      // Position 2 (20-30s): bottom-right
      // Position 3 (30-40s): bottom-left
      // Then repeats
      const watermarkConfig = {
        brandName,
        date: new Date().toISOString().split('T')[0],
        text: `${brandName} - DRAFT ONLY - ${new Date().toISOString().split('T')[0]}`,
        // FFmpeg drawtext filter:
        // drawtext=text='BRAND - DRAFT ONLY - 2024-01-15':
        //   x='if(lt(mod(t\\,40)\\,10)\\,10\\,if(lt(mod(t\\,40)\\,20)\\,W-tw-10\\,if(lt(mod(t\\,40)\\,30)\\,W-tw-10\\,10)))':
        //   y='if(lt(mod(t\\,40)\\,10)\\,10\\,if(lt(mod(t\\,40)\\,20)\\,10\\,if(lt(mod(t\\,40)\\,30)\\,H-th-10\\,H-th-10)))':
        //   fontsize=24:fontcolor=white@0.5:borderw=1:bordercolor=black@0.3
      };

      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'watermark',
            s3Bucket: process.env.AWS_S3_BUCKET!,
            inputKey: transcodedKey,
            outputKey,
            watermarkConfig,
          }),
        })
      );

      await prisma.videoAsset.updateMany({
        where: { dealId, originalUrl: s3Key },
        data: {
          watermarkedUrl: outputKey,
          watermarkConfig,
          status: 'PACKAGING',
        },
      });

      return outputKey;
    });

    // Step 4: Generate HLS segments
    const hlsKey = await step.run('generate-hls', async () => {
      const outputPrefix = `${process.env.S3_PROCESSED_PREFIX ?? 'processed/'}${dealId}/hls/`;

      // FFmpeg HLS command:
      // ffmpeg -i watermarked.mp4 -c:v copy -c:a copy
      //   -hls_time 6 -hls_list_size 0
      //   -hls_segment_filename 'segment_%03d.ts' playlist.m3u8

      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'hls',
            s3Bucket: process.env.AWS_S3_BUCKET!,
            inputKey: watermarkedKey,
            outputPrefix,
          }),
        })
      );

      return `${outputPrefix}playlist.m3u8`;
    });

    // Step 5: Update DB status → READY
    await step.run('finalize', async () => {
      await prisma.videoAsset.updateMany({
        where: { dealId, originalUrl: s3Key },
        data: {
          hlsUrl: hlsKey,
          status: 'READY',
        },
      });

      // Update deliverable file size from metadata
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { fileSize: BigInt(metadata.fileSize) },
      });
    });

    return {
      dealId,
      deliverableId,
      status: 'READY',
      hlsUrl: hlsKey,
    };
  }
);
```

### 6.2 Clean Render — `lib/inngest/functions/video-clean-render.ts` (NEW)

```typescript
import { inngest } from '@/lib/inngest/client';
import prisma from '@/lib/prisma';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: process.env.VIDEO_LAMBDA_REGION ?? 'ap-south-1',
});

/**
 * Re-transcode from raw source without watermark on final approval.
 * Triggered by 'video/clean-render' event.
 * Output: /processed/{dealId}/clean/final.mp4
 */
export const videoCleanRenderFunction = inngest.createFunction(
  {
    id: 'video-clean-render',
    name: 'Clean Video Render (No Watermark)',
    retries: 2,
  },
  { event: 'video/clean-render' },
  async ({ event, step }) => {
    const { dealId, videoAssetId } = event.data;

    const videoAsset = await step.run('get-asset', async () => {
      return prisma.videoAsset.findUniqueOrThrow({
        where: { id: videoAssetId },
      });
    });

    const cleanKey = await step.run('clean-transcode', async () => {
      const outputKey = `${process.env.S3_PROCESSED_PREFIX ?? 'processed/'}${dealId}/clean/final.mp4`;

      // Transcode from original raw source (no watermark)
      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'transcode',
            s3Bucket: process.env.AWS_S3_BUCKET!,
            inputKey: videoAsset.originalUrl,
            outputKey,
          }),
        })
      );

      return outputKey;
    });

    await step.run('update-asset', async () => {
      await prisma.videoAsset.update({
        where: { id: videoAssetId },
        data: {
          cleanUrl: cleanKey,
          status: 'APPROVED',
        },
      });
    });

    return { dealId, videoAssetId, cleanUrl: cleanKey };
  }
);
```

**Register in `app/api/inngest/route.ts`**: Add both `videoPipelineFunction` and `videoCleanRenderFunction` to the `functions` array.

---

## 7. Validation Schemas

Already added in Phase 1 (`dealRevisionSchema`). Add multipart upload validation:

```typescript
// Add to lib/validations.ts

export const initiateUploadSchema = z.object({
  dealId: z.string().uuid(),
  fileName: z.string().min(1),
  fileSize: z.number().min(1).max(500 * 1024 * 1024), // Max 500MB
  fileType: z.enum(['video/mp4', 'video/quicktime', 'video/x-msvideo']),
});

export const completeUploadSchema = z.object({
  dealId: z.string().uuid(),
  s3Key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(z.object({
    partNumber: z.number().min(1),
    etag: z.string().min(1),
  })).min(1),
});

export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
```

---

## 8. Frontend Changes

### 8.1 Video Upload Component

Create a resumable upload UI using `tus-js-client`:

- **Drag-and-drop upload area** with progress bar per part
- **Resume on reconnect** — `tus-js-client` handles retry automatically
- **Status indicators**: Uploading → Processing → Watermarking → Packaging → Ready

### 8.2 Video Player Component

Create a secure video player using `hls.js`:

```typescript
// components/video-player.tsx
import Hls from 'hls.js';

// 1. Fetch presigned URL from /api/files/{id}/stream
// 2. Initialize hls.js with the URL
// 3. Player automatically handles segment loading via presigned URLs
// 4. No direct S3 URLs exposed in the browser
```

### 8.3 Revision Workflow UI

- **Brand view**: "Request Revision" button (disabled if `currentRevision >= maxRevisions`)
- **Creator view**: Feedback display + re-upload area for revised content
- **Revision counter**: Shows `{currentRevision} / {maxRevisions}` with "Add Extension" button
- **Final approval**: "Approve Final" button triggers clean render + escrow

### 8.4 S3 Lifecycle Rules

Configure via AWS Console or Terraform:

```json
{
  "Rules": [
    {
      "ID": "raw-to-glacier",
      "Filter": { "Prefix": "raw/" },
      "Transitions": [
        { "Days": 7, "StorageClass": "GLACIER" }
      ],
      "Expiration": { "Days": 30 },
      "Status": "Enabled"
    },
    {
      "ID": "processed-cleanup",
      "Filter": { "Prefix": "processed/" },
      "Expiration": { "Days": 60 },
      "Status": "Enabled"
    }
  ]
}
```

---

## 9. Migration & Seed

No additional migrations. All models created in Phase 1.

### Lambda Docker Container

Packaging notes for FFmpeg Lambda:

```dockerfile
# Dockerfile for video processing Lambda
FROM public.ecr.aws/lambda/nodejs:20

# Install FFmpeg
RUN yum install -y tar xz && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | \
    tar -xJ --strip-components=1 -C /usr/local/bin/ && \
    chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

COPY index.mjs ${LAMBDA_TASK_ROOT}/
CMD ["index.handler"]
```

Push to ECR and create Lambda function with:
- Memory: 3072 MB
- Timeout: 300 seconds (5 minutes)
- Ephemeral storage: 10240 MB (10 GB)

---

## 10. Verification Checklist

1. [ ] Initiate multipart upload → verify presigned URLs returned for each part
2. [ ] Upload all parts to S3 → verify ETags returned
3. [ ] Complete multipart upload → verify Deliverable + VideoAsset created
4. [ ] Verify Inngest dashboard shows video-pipeline function triggered
5. [ ] Check video processing steps complete: validate → transcode → watermark → HLS → READY
6. [ ] Verify watermark appears at 4 different positions during playback
7. [ ] Verify HLS playback works via `/api/files/{id}/stream` presigned URL
8. [ ] Verify presigned URLs expire after 15 minutes
9. [ ] Test resumable upload: kill connection mid-upload → verify resume works
10. [ ] Request revision → verify `currentRevision` increments, status → REVISION_PENDING
11. [ ] Try revision beyond `maxRevisions` → verify error thrown
12. [ ] Approve final revision → verify clean render triggers (no watermark)
13. [ ] Verify clean version available for download after approval
14. [ ] Verify S3 lifecycle rules configured for raw/ and processed/ prefixes
15. [ ] Run `npx tsc --noEmit` → no TypeScript errors

---

## 11. Setup Guide

### 11.1 Environment Variables

Add to `.env`:

```env
VIDEO_LAMBDA_FUNCTION_NAME=quick-connects-video-processor
VIDEO_LAMBDA_REGION=ap-south-1
S3_RAW_PREFIX=raw/
S3_PROCESSED_PREFIX=processed/
HLS_PRESIGNED_URL_EXPIRY=900
```

Existing AWS vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`) must already be set from the MVP.

### 11.2 Lambda Setup (Required for Video Processing)

1. Build the Docker image from the Dockerfile in section 9
2. Push to ECR: `aws ecr create-repository --repository-name quick-connects-video-processor`
3. Create Lambda function with: Memory 3072MB, Timeout 300s, Ephemeral storage 10GB
4. Grant Lambda read/write access to your S3 bucket

### 11.3 S3 Lifecycle Rules

Configure via AWS Console:
- `raw/` prefix: Transition to Glacier after 7 days, delete after 30 days
- `processed/` prefix: Delete after 60 days

### 11.4 Prerequisites Check

- Phase 1 models: `VideoAsset`, `DealRevision`, `Deliverable` exist in DB
- Phase 1 enums: `VideoAssetStatus`, `RevisionStatus` exist
- Deal model has `maxRevisions` and `currentRevision` fields
- Inngest serve endpoint running with 6 functions registered
