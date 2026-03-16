import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/lib/services/oauth.service';
import { getAuthUserId } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const url = new URL('/dashboard/influencer/profile', request.url);
      url.searchParams.set('oauth', 'error');
      url.searchParams.set('platform', 'youtube');
      url.searchParams.set('message', 'YouTube OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      return NextResponse.redirect(url);
    }

    const state = oauthService.generateState(userId, 'YOUTUBE');
    const authUrl = oauthService.getYouTubeAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('YouTube OAuth initiate error:', error);
    const url = new URL('/dashboard/influencer/profile', request.url);
    url.searchParams.set('oauth', 'error');
    url.searchParams.set('platform', 'youtube');
    url.searchParams.set('message', 'Failed to initiate YouTube OAuth');
    return NextResponse.redirect(url);
  }
}
