import { Inngest } from 'inngest';

/**
 * Inngest client singleton.
 * All background jobs (escrow release, cron cleanup, campaign visibility,
 * notifications, video pipeline) use this client.
 */
export const inngest = new Inngest({
  id: 'influencer-connect',
});

// ---- Event type definitions ----

export type InngestEvents = {
  'deal/payment-completed': {
    data: {
      dealId: string;
    };
  };
  'deal/deliverable-approved': {
    data: {
      dealId: string;
      revisionId?: string;
    };
  };
  'deal/lock-expired': {
    data: {
      negotiationId: string;
    };
  };
  'campaign/published': {
    data: {
      campaignId: string;
    };
  };
  'video/process': {
    data: {
      dealId: string;
      deliverableId: string;
      s3Key: string;
    };
  };
  'video/clean-render': {
    data: {
      dealId: string;
      videoAssetId: string;
    };
  };
  'notification/send': {
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    };
  };
  'notification/batch-send': {
    data: {
      campaignId: string;
      type: string;
      title: string;
      message: string;
    };
  };
  'kyb/retry-verification': {
    data: {
      brandProfileId: string;
      gstin: string;
      attempt: number;
    };
  };
};
