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
 * 5. Update DB status -> READY
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
            s3Bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables',
            storageType: 'supabase',
            s3Key,
          }),
        })
      );

      const payload = JSON.parse(
        new TextDecoder().decode(result.Payload!)
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
            s3Bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables',
            storageType: 'supabase',
            inputKey: s3Key,
            outputKey,
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

      const watermarkConfig = {
        brandName,
        date: new Date().toISOString().split('T')[0],
        text: `${brandName} - DRAFT ONLY - ${new Date().toISOString().split('T')[0]}`,
      };

      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'watermark',
            s3Bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables',
            storageType: 'supabase',
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

      await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.VIDEO_LAMBDA_FUNCTION_NAME!,
          Payload: JSON.stringify({
            action: 'hls',
            s3Bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables',
            storageType: 'supabase',
            inputKey: watermarkedKey,
            outputPrefix,
          }),
        })
      );

      return `${outputPrefix}playlist.m3u8`;
    });

    // Step 5: Update DB status -> READY
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
