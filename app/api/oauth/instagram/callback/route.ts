import { NextRequest, NextResponse } from 'next/server';
import { oauthService } from '@/lib/services/oauth.service';

export async function GET(request: NextRequest) {
  const profileUrl = new URL('/dashboard/influencer/profile', request.url);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      profileUrl.searchParams.set('oauth', 'error');
      profileUrl.searchParams.set('platform', 'instagram');
      profileUrl.searchParams.set('message', searchParams.get('error_description') || 'OAuth was denied');
      return NextResponse.redirect(profileUrl);
    }

    if (!code || !state) {
      profileUrl.searchParams.set('oauth', 'error');
      profileUrl.searchParams.set('platform', 'instagram');
      profileUrl.searchParams.set('message', 'Missing code or state parameter');
      return NextResponse.redirect(profileUrl);
    }

    const verified = oauthService.verifyState(state);
    if (!verified || verified.platform !== 'INSTAGRAM') {
      profileUrl.searchParams.set('oauth', 'error');
      profileUrl.searchParams.set('platform', 'instagram');
      profileUrl.searchParams.set('message', 'Invalid or expired OAuth state');
      return NextResponse.redirect(profileUrl);
    }

    const { accessToken, userId: igUserId } = await oauthService.exchangeInstagramCode(code);
    const profile = await oauthService.fetchInstagramProfile(accessToken, igUserId);

    await oauthService.connectAccount(
      verified.userId,
      'INSTAGRAM',
      profile.username,
      { accessToken, platformUserId: profile.platformUserId },
      profile.followerCount,
      60 // Instagram long-lived token: 60 days
    );

    profileUrl.searchParams.set('oauth', 'success');
    profileUrl.searchParams.set('platform', 'instagram');
    profileUrl.searchParams.set('message', `Connected @${profile.username} with ${profile.followerCount.toLocaleString()} followers`);
    return NextResponse.redirect(profileUrl);
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    profileUrl.searchParams.set('oauth', 'error');
    profileUrl.searchParams.set('platform', 'instagram');
    profileUrl.searchParams.set('message', error instanceof Error ? error.message : 'OAuth callback failed');
    return NextResponse.redirect(profileUrl);
  }
}
