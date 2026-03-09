import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/lib/services/oauth.service';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
      const url = new URL('/dashboard/influencer/profile', request.url);
      url.searchParams.set('oauth', 'error');
      url.searchParams.set('platform', 'instagram');
      url.searchParams.set('message', 'Instagram OAuth not configured. Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET.');
      return NextResponse.redirect(url);
    }

    const state = oauthService.generateState(userId, 'INSTAGRAM');
    const authUrl = oauthService.getInstagramAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram OAuth initiate error:', error);
    const url = new URL('/dashboard/influencer/profile', request.url);
    url.searchParams.set('oauth', 'error');
    url.searchParams.set('platform', 'instagram');
    url.searchParams.set('message', 'Failed to initiate Instagram OAuth');
    return NextResponse.redirect(url);
  }
}
