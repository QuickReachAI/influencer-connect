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
