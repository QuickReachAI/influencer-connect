interface Brand {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  description: string;
  website: string;
  budgetRange: string;
  requirements: string[];
  pastCampaigns: { id: string; brandName: string; description: string; results: string }[];
}

interface Influencer {
  id: string;
  userId: string;
  name: string;
  bio: string;
  niches: string[];
  platforms: { platform: string; handle: string; followers: number }[];
  location: string;
  engagementRate: number;
  rateCard: { postPrice: number; storyPrice: number; videoPrice: number };
  portfolio: { id: string; brandName: string; description: string; date: string }[];
}

interface Deal {
  id: string;
  brandId: string;
  influencerId: string;
  status: string;
  title: string;
  description: string;
  deliverables: string[];
  compensation: number;
  timeline: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  dealId: string;
  senderId: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

export const sampleBrands: Brand[] = [
  {
    id: "brand-1",
    userId: "user-brand-1",
    companyName: "GlowSkin Beauty",
    industry: "Beauty & Skincare",
    description: "Premium organic skincare brand focused on clean beauty and sustainable ingredients.",
    website: "https://glowskin.example.com",
    budgetRange: "$5K - $20K",
    requirements: ["Instagram Posts", "Story Series", "Product Reviews"],
    pastCampaigns: [
      {
        id: "c1",
        brandName: "GlowSkin Beauty",
        description: "Summer skincare campaign with 15 influencers",
        results: "2.5M impressions, 45K engagement"
      }
    ]
  },
  {
    id: "brand-2",
    userId: "user-brand-2",
    companyName: "TechNova",
    industry: "Technology",
    description: "Innovative tech gadgets and smart home devices for modern living.",
    website: "https://technova.example.com",
    budgetRange: "$10K - $50K",
    requirements: ["YouTube Reviews", "Unboxing Videos", "Tech Tutorials"],
    pastCampaigns: [
      {
        id: "c2",
        brandName: "TechNova",
        description: "Smart home device launch campaign",
        results: "5M views, 120K product page visits"
      }
    ]
  },
  {
    id: "brand-3",
    userId: "user-brand-3",
    companyName: "FitLife Nutrition",
    industry: "Health & Fitness",
    description: "Plant-based protein supplements and nutrition products for active lifestyles.",
    website: "https://fitlife.example.com",
    budgetRange: "$3K - $15K",
    requirements: ["Fitness Content", "Recipe Videos", "Transformation Stories"],
    pastCampaigns: []
  },
  {
    id: "brand-4",
    userId: "user-brand-4",
    companyName: "Urban Threads",
    industry: "Fashion",
    description: "Sustainable streetwear brand with ethically sourced materials.",
    website: "https://urbanthreads.example.com",
    budgetRange: "$8K - $30K",
    requirements: ["Fashion Lookbooks", "Style Videos", "Brand Storytelling"],
    pastCampaigns: [
      {
        id: "c3",
        brandName: "Urban Threads",
        description: "Fall collection launch with lifestyle influencers",
        results: "3M impressions, 60K website visits"
      }
    ]
  },
  {
    id: "brand-5",
    userId: "user-brand-5",
    companyName: "Foodie Haven",
    industry: "Food & Beverage",
    description: "Artisanal food subscription boxes featuring global cuisine.",
    website: "https://foodiehaven.example.com",
    budgetRange: "$2K - $10K",
    requirements: ["Recipe Content", "Unboxing Videos", "Taste Tests"],
    pastCampaigns: []
  }
];

export const sampleInfluencers: Influencer[] = [
  {
    id: "inf-1",
    userId: "user-inf-1",
    name: "Sarah Chen",
    bio: "Beauty & lifestyle creator sharing skincare tips and honest product reviews. Clean beauty advocate.",
    niches: ["Beauty", "Skincare", "Lifestyle"],
    platforms: [
      { platform: "Instagram", handle: "@sarahchen", followers: 245000 },
      { platform: "TikTok", handle: "@sarahchen", followers: 180000 }
    ],
    location: "Los Angeles, CA",
    engagementRate: 4.8,
    rateCard: {
      postPrice: 2500,
      storyPrice: 800,
      videoPrice: 4000
    },
    portfolio: [
      {
        id: "p1",
        brandName: "Clean & Pure",
        description: "30-day skincare routine series",
        date: "2025-11"
      }
    ]
  },
  {
    id: "inf-2",
    userId: "user-inf-2",
    name: "Marcus Tech",
    bio: "Tech reviewer and gadget enthusiast. Unbiased reviews of the latest tech products.",
    niches: ["Technology", "Gadgets", "Reviews"],
    platforms: [
      { platform: "YouTube", handle: "@marcustech", followers: 580000 },
      { platform: "Instagram", handle: "@marcustech", followers: 120000 }
    ],
    location: "San Francisco, CA",
    engagementRate: 6.2,
    rateCard: {
      postPrice: 3500,
      storyPrice: 1000,
      videoPrice: 8000
    },
    portfolio: [
      {
        id: "p2",
        brandName: "SmartHome Pro",
        description: "Smart home setup tutorial series",
        date: "2025-12"
      }
    ]
  },
  {
    id: "inf-3",
    userId: "user-inf-3",
    name: "Emma Fitness",
    bio: "Certified personal trainer & nutrition coach. Helping you achieve your fitness goals naturally.",
    niches: ["Fitness", "Health", "Nutrition"],
    platforms: [
      { platform: "Instagram", handle: "@emmafitness", followers: 420000 },
      { platform: "YouTube", handle: "@emmafitness", followers: 310000 }
    ],
    location: "Miami, FL",
    engagementRate: 5.5,
    rateCard: {
      postPrice: 3000,
      storyPrice: 900,
      videoPrice: 5500
    },
    portfolio: [
      {
        id: "p3",
        brandName: "PowerFuel",
        description: "12-week transformation program featuring supplements",
        date: "2025-10"
      }
    ]
  },
  {
    id: "inf-4",
    userId: "user-inf-4",
    name: "Alex Style",
    bio: "Fashion stylist and content creator. Sustainable fashion advocate & vintage lover.",
    niches: ["Fashion", "Style", "Sustainability"],
    platforms: [
      { platform: "Instagram", handle: "@alexstyle", followers: 380000 },
      { platform: "TikTok", handle: "@alexstyle", followers: 520000 }
    ],
    location: "New York, NY",
    engagementRate: 5.1,
    rateCard: {
      postPrice: 2800,
      storyPrice: 850,
      videoPrice: 4500
    },
    portfolio: [
      {
        id: "p4",
        brandName: "EcoWear",
        description: "Sustainable wardrobe capsule collection showcase",
        date: "2025-11"
      }
    ]
  },
  {
    id: "inf-5",
    userId: "user-inf-5",
    name: "Chef Maria",
    bio: "Professional chef & food content creator. Sharing easy recipes and culinary adventures.",
    niches: ["Food", "Cooking", "Recipes"],
    platforms: [
      { platform: "Instagram", handle: "@chefmaria", followers: 290000 },
      { platform: "YouTube", handle: "@chefmaria", followers: 450000 }
    ],
    location: "Chicago, IL",
    engagementRate: 6.8,
    rateCard: {
      postPrice: 2200,
      storyPrice: 700,
      videoPrice: 4200
    },
    portfolio: [
      {
        id: "p5",
        brandName: "Gourmet Basics",
        description: "Recipe series featuring kitchen tools",
        date: "2025-12"
      }
    ]
  },
  {
    id: "inf-6",
    userId: "user-inf-6",
    name: "David Wellness",
    bio: "Holistic health coach focusing on mental wellness and mindful living.",
    niches: ["Wellness", "Mental Health", "Lifestyle"],
    platforms: [
      { platform: "Instagram", handle: "@davidwellness", followers: 195000 },
      { platform: "TikTok", handle: "@davidwellness", followers: 280000 }
    ],
    location: "Austin, TX",
    engagementRate: 5.9,
    rateCard: {
      postPrice: 1800,
      storyPrice: 600,
      videoPrice: 3200
    },
    portfolio: []
  },
  {
    id: "inf-7",
    userId: "user-inf-7",
    name: "Sophia Travel",
    bio: "Adventure seeker & travel photographer capturing stories from around the world.",
    niches: ["Travel", "Photography", "Adventure"],
    platforms: [
      { platform: "Instagram", handle: "@sophiatravel", followers: 510000 },
      { platform: "YouTube", handle: "@sophiatravel", followers: 220000 }
    ],
    location: "Seattle, WA",
    engagementRate: 4.5,
    rateCard: {
      postPrice: 3200,
      storyPrice: 950,
      videoPrice: 6000
    },
    portfolio: [
      {
        id: "p6",
        brandName: "WanderGear",
        description: "Travel gear review across 5 countries",
        date: "2025-09"
      }
    ]
  },
  {
    id: "inf-8",
    userId: "user-inf-8",
    name: "Ryan Gaming",
    bio: "Professional gamer & gaming content creator. Tips, tricks, and entertainment.",
    niches: ["Gaming", "Entertainment", "Technology"],
    platforms: [
      { platform: "YouTube", handle: "@ryangaming", followers: 890000 },
      { platform: "TikTok", handle: "@ryangaming", followers: 650000 }
    ],
    location: "Los Angeles, CA",
    engagementRate: 7.2,
    rateCard: {
      postPrice: 4000,
      storyPrice: 1200,
      videoPrice: 9000
    },
    portfolio: [
      {
        id: "p7",
        brandName: "GameGear Pro",
        description: "Gaming peripheral review series",
        date: "2025-12"
      }
    ]
  }
];

export const sampleDeals: Deal[] = [
  {
    id: "deal-1",
    brandId: "brand-1",
    influencerId: "inf-1",
    status: "active",
    title: "Spring Skincare Campaign",
    description: "Create content featuring our new vitamin C serum line. Looking for authentic reviews and skincare routine integration.",
    deliverables: [
      "2 Instagram feed posts",
      "4 Instagram stories",
      "1 Reel showcasing morning routine"
    ],
    compensation: 5500,
    timeline: "2 weeks",
    createdAt: "2026-01-10",
    updatedAt: "2026-01-12"
  },
  {
    id: "deal-2",
    brandId: "brand-2",
    influencerId: "inf-2",
    status: "pending",
    title: "Smart Home Hub Review",
    description: "Comprehensive review of our new smart home hub with setup tutorial and integration demos.",
    deliverables: [
      "1 YouTube review video (10-15 min)",
      "1 Instagram post",
      "Setup guide in description"
    ],
    compensation: 8500,
    timeline: "3 weeks",
    createdAt: "2026-01-15",
    updatedAt: "2026-01-15"
  },
  {
    id: "deal-3",
    brandId: "brand-3",
    influencerId: "inf-3",
    status: "completed",
    title: "Protein Supplement Launch",
    description: "30-day fitness challenge featuring our plant-based protein powder.",
    deliverables: [
      "Weekly progress posts (4 total)",
      "Recipe video using the product",
      "Before/after story highlight"
    ],
    compensation: 6000,
    timeline: "1 month",
    createdAt: "2025-12-01",
    updatedAt: "2026-01-05"
  },
  {
    id: "deal-4",
    brandId: "brand-4",
    influencerId: "inf-4",
    status: "pending",
    title: "Sustainable Fashion Lookbook",
    description: "Showcase our spring collection with focus on sustainable materials and styling tips.",
    deliverables: [
      "3 styled outfit posts",
      "1 TikTok styling video",
      "Behind-the-scenes stories"
    ],
    compensation: 4500,
    timeline: "2 weeks",
    createdAt: "2026-01-18",
    updatedAt: "2026-01-18"
  },
  {
    id: "deal-5",
    brandId: "brand-5",
    influencerId: "inf-5",
    status: "active",
    title: "Subscription Box Unboxing",
    description: "Monthly unboxing and recipe creation using items from our subscription box.",
    deliverables: [
      "1 YouTube unboxing video",
      "2 recipe videos using box ingredients",
      "Instagram carousel post"
    ],
    compensation: 4200,
    timeline: "Ongoing monthly",
    createdAt: "2026-01-08",
    updatedAt: "2026-01-10"
  }
];

export const sampleMessages: Message[] = [
  {
    id: "msg-1",
    dealId: "deal-1",
    senderId: "user-brand-1",
    senderRole: "brand",
    content: "Hi Sarah! We're excited to work with you on this campaign. The vitamin C serum has gotten amazing feedback and we think your audience would love it.",
    timestamp: "2026-01-10T10:30:00Z"
  },
  {
    id: "msg-2",
    dealId: "deal-1",
    senderId: "user-inf-1",
    senderRole: "influencer",
    content: "Thank you! I'm excited too. I've been following your brand and love your commitment to clean ingredients. Can you send over the product details?",
    timestamp: "2026-01-10T14:20:00Z"
  },
  {
    id: "msg-3",
    dealId: "deal-1",
    senderId: "user-brand-1",
    senderRole: "brand",
    content: "Absolutely! I'll email you the product info and samples should arrive by Friday. Looking forward to seeing your creative take on this!",
    timestamp: "2026-01-11T09:15:00Z"
  },
  {
    id: "msg-4",
    dealId: "deal-2",
    senderId: "user-brand-2",
    senderRole: "brand",
    content: "Hi Marcus! We're launching our new smart home hub next month and would love your expert review. Are you available for this collaboration?",
    timestamp: "2026-01-15T11:00:00Z"
  },
  {
    id: "msg-5",
    dealId: "deal-5",
    senderId: "user-inf-5",
    senderRole: "influencer",
    content: "Just received this month's box - the ingredients look amazing! I'm thinking of creating a fusion recipe. What do you think?",
    timestamp: "2026-01-17T16:45:00Z"
  },
  {
    id: "msg-6",
    dealId: "deal-5",
    senderId: "user-brand-5",
    senderRole: "brand",
    content: "That sounds perfect! Fusion recipes always perform well. Can't wait to see what you create!",
    timestamp: "2026-01-17T17:30:00Z"
  }
];
