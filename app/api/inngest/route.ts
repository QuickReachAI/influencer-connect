import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { escrowReleaseFunction } from '@/lib/inngest/functions/escrow-release';
import { fileCleanupFunction } from '@/lib/inngest/functions/cleanup';
import { campaignVisibilityFunction } from '@/lib/inngest/functions/campaign-visibility';
import { dealLockCleanupFunction } from '@/lib/inngest/functions/deal-locks';
import { videoPipelineFunction } from '@/lib/inngest/functions/video-pipeline';
import { videoCleanRenderFunction } from '@/lib/inngest/functions/video-clean-render';
import { notificationEmailFunction, notificationBatchFunction } from '@/lib/inngest/functions/notifications';
import { gstinRecheckFunction, kybRetryFunction } from '@/lib/inngest/functions/gstin-recheck';
import { oauthRefreshFunction } from '@/lib/inngest/functions/oauth-refresh';
import { inactivityCheckFunction } from '@/lib/inngest/functions/inactivity-check';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    escrowReleaseFunction,
    fileCleanupFunction,
    campaignVisibilityFunction,
    dealLockCleanupFunction,
    videoPipelineFunction,
    videoCleanRenderFunction,
    notificationEmailFunction,
    notificationBatchFunction,
    gstinRecheckFunction,
    kybRetryFunction,
    oauthRefreshFunction,
    inactivityCheckFunction,
  ],
});
