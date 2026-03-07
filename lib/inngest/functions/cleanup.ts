import { inngest } from '@/lib/inngest/client';
import { fileService } from '@/lib/services/file.service';

/**
 * Daily cron: clean up expired deliverable files.
 * Replaces manual cron setup — runs via Inngest scheduler.
 */
export const fileCleanupFunction = inngest.createFunction(
  {
    id: 'file-cleanup',
    name: 'Daily File Cleanup',
  },
  { cron: '0 2 * * *' }, // 2 AM IST daily
  async ({ step }) => {
    const deletedCount = await step.run('cleanup-expired-files', async () => {
      return await fileService.cleanupExpiredFiles();
    });

    return { deletedCount };
  }
);
