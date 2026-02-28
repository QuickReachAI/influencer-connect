export type UserRole = "brand" | "influencer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  createdAt?: string;
  verified?: boolean;
}

export interface Brand {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  description: string;
  website: string;
  logo?: string;
  budgetRange: string;
  requirements: string[];
  pastCampaigns: Campaign[];
  location?: string;
  companySize?: string;
  verified?: boolean;
}

export interface Influencer {
  id: string;
  userId: string;
  name: string;
  bio: string;
  avatar?: string;
  niches: string[];
  platforms: SocialPlatform[];
  location: string;
  engagementRate: number;
  rateCard: {
    postPrice: number;
    storyPrice: number;
    videoPrice: number;
    reelPrice?: number;
  };
  portfolio: PortfolioItem[];
  languages?: string[];
  responseTime?: string;
  verified?: boolean;
  level?: "new" | "level_1" | "level_2" | "top_rated";
  totalOrders?: number;
  rating?: number;
  reviewCount?: number;
}

export interface SocialPlatform {
  platform: "Instagram" | "YouTube" | "TikTok" | "Twitter" | "Facebook" | "LinkedIn";
  handle: string;
  followers: number;
  verified?: boolean;
}

export interface PortfolioItem {
  id: string;
  brandName: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  date: string;
  metrics?: {
    views?: number;
    engagement?: number;
    conversions?: number;
  };
}

export interface Campaign {
  id: string;
  brandName: string;
  description: string;
  imageUrl?: string;
  results: string;
}

export interface Deal {
  id: string;
  brandId: string;
  influencerId: string;
  status: "pending" | "active" | "completed" | "rejected";
  title: string;
  description: string;
  deliverables: string[];
  compensation: number;
  timeline: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  dealId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
}
