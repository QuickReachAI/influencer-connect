import { rateLimit } from '@/lib/rate-limit';

interface ApifyInstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  profilePicUrl: string;
  isVerified: boolean;
}

export interface InstagramLookupResult {
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profilePicUrl: string;
  isVerified: boolean;
}

const APIFY_ACTOR_ID = 'apify~instagram-profile-scraper';
const APIFY_BASE_URL = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items`;

// 5 lookups per user per 10 minutes — prevents abuse during profile setup
export const apifyLimiter = rateLimit({ maxRequests: 5, windowMs: 10 * 60 * 1000 });

// Global limiter: 30 lookups per minute across all users (protects Apify quota)
export const apifyGlobalLimiter = rateLimit({ maxRequests: 30, windowMs: 60 * 1000 });

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not configured');
  return token;
}

function sanitizeHandle(raw: string): string {
  let handle = raw.trim();
  if (handle.startsWith('@')) handle = handle.slice(1);
  // Strip full URL to just username
  const urlMatch = handle.match(/instagram\.com\/([^/?#]+)/);
  if (urlMatch) handle = urlMatch[1];
  handle = handle.toLowerCase().replace(/[^a-z0-9._]/g, '');
  if (!handle || handle.length > 30) {
    throw new Error('Invalid Instagram handle');
  }
  return handle;
}

// ── YouTube Channel Lookup ──────────────────────────────────────────────

export interface YouTubeLookupResult {
  channelName: string;
  handle: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
}

const APIFY_YOUTUBE_ACTOR_ID = 'grow_media~youtube-channel-scraper';
const APIFY_YOUTUBE_BASE_URL = `https://api.apify.com/v2/acts/${APIFY_YOUTUBE_ACTOR_ID}/run-sync-get-dataset-items`;

function sanitizeYouTubeInput(raw: string): { channelUrl: string; handle: string } {
  let input = raw.trim();

  // Already a full YouTube URL
  if (input.includes('youtube.com/') || input.includes('youtu.be/')) {
    const match = input.match(/youtube\.com\/(?:channel\/|c\/|@)([^/?#]+)/);
    if (match) {
      const handle = match[1];
      return { channelUrl: `https://www.youtube.com/@${handle}`, handle };
    }
    throw new Error('Invalid YouTube URL format');
  }

  // Strip @ prefix
  if (input.startsWith('@')) input = input.slice(1);
  input = input.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!input || input.length < 2) {
    throw new Error('Invalid YouTube channel handle');
  }

  return { channelUrl: `https://www.youtube.com/@${input}`, handle: input };
}

export async function lookupYouTubeChannel(rawInput: string): Promise<YouTubeLookupResult> {
  const { channelUrl, handle } = sanitizeYouTubeInput(rawInput);
  const token = getApifyToken();

  const res = await fetch(`${APIFY_YOUTUBE_BASE_URL}?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelUrls: [channelUrl] }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Apify YouTube API error:', res.status, text);
    throw new Error('Failed to fetch YouTube channel. Please try again later.');
  }

  const data = await res.json();

  if (!data || data.length === 0) {
    throw new Error('YouTube channel not found. Check the handle and try again.');
  }

  const item = data[0];

  // Debug: log raw response to confirm field names
  console.log('Apify YouTube raw response:', JSON.stringify(item, null, 2));

  // Handle both flat dot-keys and nested object formats
  const subscribers =
    item['aboutChannelInfo.numberOfSubscribers']
    ?? item.aboutChannelInfo?.numberOfSubscribers
    ?? item.numberOfSubscribers
    ?? item.subscriberCount
    ?? item.subscribersCount
    ?? 0;

  const videos =
    item['aboutChannelInfo.channelTotalVideos']
    ?? item.aboutChannelInfo?.channelTotalVideos
    ?? item.numberOfVideos
    ?? item.videoCount
    ?? 0;

  const views =
    item['aboutChannelInfo.channelTotalViews']
    ?? item.aboutChannelInfo?.channelTotalViews
    ?? item.totalViews
    ?? 0;

  return {
    channelName: item.channelName || item.name || handle,
    handle,
    subscriberCount: typeof subscribers === 'string' ? parseInt(subscribers, 10) || 0 : subscribers,
    videoCount: typeof videos === 'string' ? parseInt(videos, 10) || 0 : videos,
    totalViews: typeof views === 'string' ? parseInt(views, 10) || 0 : views,
  };
}

// ── Instagram Profile Lookup ────────────────────────────────────────────

export async function lookupInstagramProfile(rawHandle: string): Promise<InstagramLookupResult> {
  const handle = sanitizeHandle(rawHandle);
  const token = getApifyToken();

  const res = await fetch(`${APIFY_BASE_URL}?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernames: [handle],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Apify API error:', res.status, text);
    throw new Error('Failed to fetch Instagram profile. Please try again later.');
  }

  const data: ApifyInstagramProfile[] = await res.json();

  if (!data || data.length === 0) {
    throw new Error(`Instagram profile "@${handle}" not found. Check the handle and try again.`);
  }

  const profile = data[0];
  return {
    username: profile.username || handle,
    fullName: profile.fullName || '',
    bio: profile.biography || '',
    followerCount: profile.followersCount ?? 0,
    followingCount: profile.followsCount ?? 0,
    postCount: profile.postsCount ?? 0,
    profilePicUrl: profile.profilePicUrl || '',
    isVerified: profile.isVerified ?? false,
  };
}
