import Pusher from 'pusher';

let _pusher: Pusher | null = null;

/**
 * Server-side Pusher singleton.
 * Channel naming convention:
 *   - private-deal-{dealId}  — Messages, typing, read receipts per deal
 *   - private-user-{userId}  — Notifications, online status per user
 *
 * Events:
 *   - new-message       — New chat message
 *   - typing-start      — User started typing
 *   - typing-stop       — User stopped typing
 *   - read-receipt       — Messages read
 *   - message-flagged    — PII violation detected
 *   - system-notification — System notification
 */
export function getPusher(): Pusher {
  if (!_pusher) {
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return _pusher;
}

/** Trigger event on a private deal channel */
export async function triggerDealEvent(
  dealId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await getPusher().trigger(`private-deal-${dealId}`, event, data);
}

/** Trigger event on a private user channel */
export async function triggerUserEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await getPusher().trigger(`private-user-${userId}`, event, data);
}
