// @ts-nocheck
import crypto from 'crypto';
import prisma from '@/lib/prisma';

type Platform = 'INSTAGRAM' | 'YOUTUBE';

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  platformUserId: string;
}

interface ProfileData {
  platformUserId: string;
  username: string;
  followerCount: number;
  mediaCount?: number;
}

const ENCRYPTION_KEY = () => {
  const key = process.env.OAUTH_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error('OAUTH_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
  return crypto.createHash('sha256').update(key).digest();
};

export class OAuthService {
  // ── Encryption ──────────────────────────────────────────

  encrypt(data: TokenData): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY(), iv);
    const json = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(blob: string): TokenData {
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  // ── CSRF State ──────────────────────────────────────────

  generateState(userId: string, platform: Platform): string {
    const payload = JSON.stringify({ userId, platform, ts: Date.now() });
    const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY()).update(payload).digest('hex');
    return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64url');
  }

  verifyState(state: string): { userId: string; platform: Platform } | null {
    try {
      const { payload, hmac } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      const expectedHmac = crypto.createHmac('sha256', ENCRYPTION_KEY()).update(payload).digest('hex');
      if (hmac !== expectedHmac) return null;
      const data = JSON.parse(payload);
      // 10-minute expiry
      if (Date.now() - data.ts > 10 * 60 * 1000) return null;
      return { userId: data.userId, platform: data.platform };
    } catch {
      return null;
    }
  }

  // ── Instagram OAuth ─────────────────────────────────────

  getInstagramAuthUrl(state: string): string {
    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`;
    const scope = 'instagram_basic,pages_show_list,pages_read_engagement';
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;
  }

  async exchangeInstagramCode(code: string): Promise<{ accessToken: string; userId: string }> {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`;

    // Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || 'Failed to exchange Instagram code');
    }

    // Exchange for long-lived token (60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedRes.json();

    const accessToken = longLivedData.access_token || tokenData.access_token;

    // Get Instagram Business Account ID via Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    let igUserId = '';

    if (pagesData.data?.length > 0) {
      const pageId = pagesData.data[0].id;
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
      );
      const igData = await igRes.json();
      igUserId = igData.instagram_business_account?.id || '';
    }

    return { accessToken, userId: igUserId || tokenData.user_id || 'unknown' };
  }

  async fetchInstagramProfile(accessToken: string, igUserId: string): Promise<ProfileData> {
    if (!igUserId || igUserId === 'unknown') {
      // Fallback: try /me endpoint for personal accounts
      const meRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`
      );
      const meData = await meRes.json();
      return {
        platformUserId: meData.id || 'unknown',
        username: meData.name || 'instagram_user',
        followerCount: 0,
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?fields=id,username,followers_count,media_count&access_token=${accessToken}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    return {
      platformUserId: data.id,
      username: data.username || 'instagram_user',
      followerCount: data.followers_count || 0,
      mediaCount: data.media_count || 0,
    };
  }

  async refreshInstagramToken(currentToken: string): Promise<string> {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${currentToken}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.access_token;
  }

  // ── YouTube OAuth ───────────────────────────────────────

  getYouTubeAuthUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`;
    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;
  }

  async exchangeYouTubeCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.error || 'Failed to exchange YouTube code');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
    };
  }

  async fetchYouTubeProfile(accessToken: string): Promise<ProfileData> {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Failed to fetch YouTube profile');

    const channel = data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found for this account');

    return {
      platformUserId: channel.id,
      username: channel.snippet?.title || 'youtube_channel',
      followerCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
      mediaCount: parseInt(channel.statistics?.videoCount || '0', 10),
    };
  }

  async refreshYouTubeToken(refreshToken: string): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || 'YouTube token refresh failed');
    return data.access_token;
  }

  // ── Connect / Disconnect ───────────────────────────────

  async connectAccount(
    userId: string,
    platform: Platform,
    handle: string,
    tokenData: TokenData,
    followerCount: number,
    tokenExpiresInDays: number
  ) {
    const encrypted = this.encrypt(tokenData);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + tokenExpiresInDays);

    return prisma.socialEntity.upsert({
      where: {
        masterId_platform_handle: {
          masterId: userId,
          platform,
          handle,
        },
      },
      update: {
        oauthTokenEncrypted: encrypted,
        tokenExpiresAt: expiresAt,
        isVerified: true,
        isActive: true,
        followerCount,
      },
      create: {
        masterId: userId,
        platform,
        handle,
        oauthTokenEncrypted: encrypted,
        tokenExpiresAt: expiresAt,
        isVerified: true,
        isActive: true,
        followerCount,
      },
    });
  }

  async disconnectAccount(entityId: string, userId: string) {
    const entity = await prisma.socialEntity.findUnique({ where: { id: entityId } });
    if (!entity || entity.masterId !== userId) {
      throw new Error('Entity not found or unauthorized');
    }

    return prisma.socialEntity.update({
      where: { id: entityId },
      data: {
        oauthTokenEncrypted: null,
        tokenExpiresAt: null,
        isVerified: false,
      },
    });
  }

  // ── Token Refresh ──────────────────────────────────────

  async refreshToken(entity: { id: string; platform: string; oauthTokenEncrypted: string | null }) {
    if (!entity.oauthTokenEncrypted) throw new Error('No token to refresh');

    const tokenData = this.decrypt(entity.oauthTokenEncrypted);
    let newAccessToken: string;
    let expiresInDays: number;

    if (entity.platform === 'INSTAGRAM') {
      newAccessToken = await this.refreshInstagramToken(tokenData.accessToken);
      expiresInDays = 60;
    } else if (entity.platform === 'YOUTUBE') {
      if (!tokenData.refreshToken) throw new Error('No refresh token available');
      newAccessToken = await this.refreshYouTubeToken(tokenData.refreshToken);
      expiresInDays = 365; // refresh tokens are permanent, access token lasts ~1hr but we refresh daily
    } else {
      throw new Error(`Unsupported platform: ${entity.platform}`);
    }

    const newTokenData: TokenData = {
      ...tokenData,
      accessToken: newAccessToken,
    };

    const encrypted = this.encrypt(newTokenData);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await prisma.socialEntity.update({
      where: { id: entity.id },
      data: {
        oauthTokenEncrypted: encrypted,
        tokenExpiresAt: expiresAt,
      },
    });
  }
}

export const oauthService = new OAuthService();
