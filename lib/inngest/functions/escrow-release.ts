import { inngest } from '@/lib/inngest/client';
import { escrowService } from '@/lib/services/escrow.service';

/**
 * Reliable T+2 escrow release.
 * Replaces the unsafe `setTimeout(48h)` in escrow.service.ts:282.
 * Uses Inngest step.sleep for durable, restart-safe delays.
 *
 * Trigger: 'deal/payment-completed' event
 * Behavior: Sleep for ESCROW_RELEASE_DELAY (default 48h), then release funds.
 */
export const escrowReleaseFunction = inngest.createFunction(
  {
    id: 'escrow-release',
    name: 'T+2 Escrow Release',
    retries: 3,
  },
  { event: 'deal/payment-completed' },
  async ({ event, step }) => {
    const { dealId } = event.data;

    // Durable sleep — survives server restarts
    // Set ESCROW_RELEASE_DELAY=30s in .env.test for fast iteration
    await step.sleep(
      'wait-for-inspection-window',
      process.env.ESCROW_RELEASE_DELAY ?? '48h'
    );

    // Release funds to creator wallet
    await step.run('release-funds', async () => {
      await escrowService.releaseFundsToCreator(dealId);
    });

    return { dealId, status: 'released' };
  }
);
