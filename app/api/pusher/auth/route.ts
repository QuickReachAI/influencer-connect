import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth-helpers';
import { getPusher } from '@/lib/pusher';
import prisma from '@/lib/prisma';

/**
 * POST /api/pusher/auth — Authenticate private Pusher channels.
 * Verifies user has access to the requested channel.
 *
 * Channel naming:
 *   - private-deal-{dealId}: User must be brand or creator on the deal
 *   - private-user-{userId}: User must own the userId
 */
export async function POST(request: NextRequest) {
  const userId = getUserIdFromCookies(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id')!;
  const channel = params.get('channel_name')!;

  // Validate channel access
  if (channel.startsWith('private-deal-')) {
    const dealId = channel.replace('private-deal-', '');
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });

    if (!deal || (deal.brandId !== userId && deal.creatorId !== userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (channel.startsWith('private-user-')) {
    const channelUserId = channel.replace('private-user-', '');
    if (channelUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  }

  const auth = getPusher().authorizeChannel(socketId, channel);
  return NextResponse.json(auth);
}
