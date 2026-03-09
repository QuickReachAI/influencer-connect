import { inngest } from '@/lib/inngest/client';
import { kybService } from '@/lib/services/kyb.service';

/**
 * Monthly cron: re-verify all verified GSTINs.
 * If filing status changes to Suspended/Cancelled,
 * pauses active campaigns and notifies brand.
 */
export const gstinRecheckFunction = inngest.createFunction(
  {
    id: 'gstin-monthly-recheck',
    name: 'Monthly GSTIN Re-verification',
  },
  { cron: '0 3 1 * *' }, // 3 AM IST on the 1st of each month
  async ({ step }) => {
    const result = await step.run('recheck-all-gstins', async () => {
      return kybService.recheckAll();
    });

    return result;
  }
);

/**
 * Event-triggered KYB retry with exponential backoff.
 * Fires when GSTIN API is unavailable during initial verification.
 * Max 3 retries: 60s, 120s, 240s delays.
 */
export const kybRetryFunction = inngest.createFunction(
  {
    id: 'kyb-retry-verification',
    name: 'KYB Retry Verification',
  },
  { event: 'kyb/retry-verification' },
  async ({ event, step }) => {
    const { brandProfileId, gstin, attempt } = event.data;

    if (attempt > 3) {
      return { status: 'max_retries_exceeded', brandProfileId };
    }

    // Exponential backoff: 2^attempt * 30 seconds
    const delayMs = Math.pow(2, attempt) * 30 * 1000;
    await step.sleep('backoff-wait', `${delayMs}ms`);

    const result = await step.run('retry-gstin-verification', async () => {
      return kybService.verifyGSTIN(brandProfileId, gstin);
    });

    // If still failing due to network, the verifyGSTIN method will fire
    // another kyb/retry-verification event with attempt+1
    return { status: result.valid ? 'verified' : 'retry_scheduled', result };
  }
);
