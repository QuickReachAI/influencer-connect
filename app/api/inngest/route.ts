import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { escrowReleaseFunction } from '@/lib/inngest/functions/escrow-release';
import { fileCleanupFunction } from '@/lib/inngest/functions/cleanup';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    escrowReleaseFunction,
    fileCleanupFunction,
  ],
});
