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
            s3Bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables',
            storageType: 'supabase',
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
