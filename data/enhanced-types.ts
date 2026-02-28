// Enhanced type definitions for Fiverr-like marketplace

export type UserRole = "brand" | "influencer";
export type GigStatus = "active" | "paused" | "draft";
export type OrderStatus = "pending" | "in_progress" | "delivered" | "completed" | "cancelled" | "revision_requested";
export type PackageTier = "basic" | "standard" | "premium";

// User Types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  createdAt: string;
  verified: boolean;
}

// Brand Types
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
  location: string;
  companySize: string;
  verified: boolean;
}

// Influencer Types
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
  rateCard: RateCard;
  portfolio: PortfolioItem[];
  languages: string[];
  responseTime: string; // e.g., "1 hour", "24 hours"
  verified: boolean;
  level: "new" | "level_1" | "level_2" | "top_rated";
  totalOrders: number;
  rating: number;
  reviewCount: number;
}

export interface SocialPlatform {
  platform: "Instagram" | "YouTube" | "TikTok" | "Twitter" | "Facebook" | "LinkedIn";
  handle: string;
  followers: number;
  verified?: boolean;
}

export interface RateCard {
  postPrice: number;
  storyPrice: number;
  videoPrice: number;
  reelPrice?: number;
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
  budget?: number;
  duration?: string;
}

// Gig System (Fiverr-style)
export interface Gig {
  id: string;
  influencerId: string;
  title: string;
  slug: string;
  category: string;
  subcategory: string;
  description: string;
  packages: GigPackage[];
  gallery: GigMedia[];
  tags: string[];
  faqs: FAQ[];
  requirements: string[];
  status: GigStatus;
  rating: number;
  reviewCount: number;
  ordersInQueue: number;
  createdAt: string;
  updatedAt: string;
}

export interface GigPackage {
  tier: PackageTier;
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number | "unlimited";
  features: string[];
}

export interface GigMedia {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  caption?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

// Category System
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

// Order System
export interface Order {
  id: string;
  gigId: string;
  brandId: string;
  influencerId: string;
  packageTier: PackageTier;
  status: OrderStatus;
  price: number;
  requirements: OrderRequirement[];
  deliverables: Deliverable[];
  createdAt: string;
  updatedAt: string;
  deliveryDate: string;
  completedAt?: string;
}

export interface OrderRequirement {
  id: string;
  question: string;
  answer: string;
}

export interface Deliverable {
  id: string;
  type: "file" | "link" | "text";
  content: string;
  uploadedAt: string;
}

// Review System
export interface Review {
  id: string;
  orderId: string;
  gigId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
  sellerResponse?: SellerResponse;
}

export interface SellerResponse {
  content: string;
  createdAt: string;
}

// Deal System (existing, enhanced)
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

// Message System
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  attachments?: MessageAttachment[];
  timestamp: string;
  read: boolean;
}

export interface MessageAttachment {
  id: string;
  type: "image" | "file" | "link";
  url: string;
  name: string;
  size?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  orderId?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// Filter & Search Types
export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  deliveryTime?: number[];
  rating?: number;
  sellerLevel?: string[];
  sortBy?: "relevance" | "price_low" | "price_high" | "rating" | "newest";
}

// Analytics Types
export interface AnalyticsData {
  totalEarnings: number;
  totalOrders: number;
  activeOrders: number;
  completionRate: number;
  averageRating: number;
  responseTime: string;
  earningsThisMonth: number;
  ordersThisMonth: number;
  earningsChart: ChartDataPoint[];
  ordersChart: ChartDataPoint[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
}
