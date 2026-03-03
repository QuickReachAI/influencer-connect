import bcrypt from "bcryptjs";

const hashedPassword = bcrypt.hashSync("Test1234", 12);

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000);

export const MOCK_IDS = {
  brandUser1: "b0000001-0000-0000-0000-000000000001",
  brandUser2: "b0000002-0000-0000-0000-000000000002",
  brandUser3: "b0000003-0000-0000-0000-000000000003",
  creatorUser1: "c0000001-0000-0000-0000-000000000001",
  creatorUser2: "c0000002-0000-0000-0000-000000000002",
  creatorUser3: "c0000003-0000-0000-0000-000000000003",
  adminUser: "a0000001-0000-0000-0000-000000000001",
  brandProfile1: "bp000001-0000-0000-0000-000000000001",
  brandProfile2: "bp000002-0000-0000-0000-000000000002",
  brandProfile3: "bp000003-0000-0000-0000-000000000003",
  creatorProfile1: "cp000001-0000-0000-0000-000000000001",
  creatorProfile2: "cp000002-0000-0000-0000-000000000002",
  creatorProfile3: "cp000003-0000-0000-0000-000000000003",
  deal1: "d0000001-0000-0000-0000-000000000001",
  deal2: "d0000002-0000-0000-0000-000000000002",
  deal3: "d0000003-0000-0000-0000-000000000003",
};

export function getInitialMockData() {
  return {
    users: [
      {
        id: MOCK_IDS.brandUser1, email: "brand@test.com", password: hashedPassword,
        phone: "9876543210", role: "BRAND", kycStatus: "VERIFIED",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(30), updatedAt: now,
      },
      {
        id: MOCK_IDS.brandUser2, email: "marketing@fitlife.com", password: hashedPassword,
        phone: "9876543211", role: "BRAND", kycStatus: "VERIFIED",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(25), updatedAt: now,
      },
      {
        id: MOCK_IDS.brandUser3, email: "hello@techindia.com", password: hashedPassword,
        phone: "9876543212", role: "BRAND", kycStatus: "VERIFIED",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(20), updatedAt: now,
      },
      {
        id: MOCK_IDS.creatorUser1, email: "creator@test.com", password: hashedPassword,
        phone: "9123456780", role: "CREATOR", kycStatus: "VERIFIED",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(28), updatedAt: now,
      },
      {
        id: MOCK_IDS.creatorUser2, email: "rahul@creator.com", password: hashedPassword,
        phone: "9123456781", role: "CREATOR", kycStatus: "VERIFIED",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(22), updatedAt: now,
      },
      {
        id: MOCK_IDS.creatorUser3, email: "aisha@creator.com", password: hashedPassword,
        phone: "9123456782", role: "CREATOR", kycStatus: "PENDING",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(5), updatedAt: now,
      },
      {
        id: MOCK_IDS.adminUser, email: "admin@test.com", password: hashedPassword,
        phone: "9000000001", role: "ADMIN", kycStatus: "VERIFIED",
        isBanned: false, banReason: null, bannedAt: null,
        aadhaarHash: null, panHash: null, kycProviderId: null,
        createdAt: daysAgo(60), updatedAt: now,
      },
    ],
    creatorProfiles: [
      {
        id: MOCK_IDS.creatorProfile1, userId: MOCK_IDS.creatorUser1,
        name: "Priya Sharma", bio: "Beauty & lifestyle content creator with 500K+ followers across platforms. Authentic stories for Gen Z & millennial audiences.",
        avatar: "", minFollowers: 1000,
        socialPlatforms: [
          { platform: "Instagram", handle: "@priyasharma", followers: 520000, verified: true },
          { platform: "YouTube", handle: "PriyaSharmaVlogs", followers: 180000, verified: true },
        ],
        reliabilityScore: 4.8, totalDealsCompleted: 23, totalEarnings: 450000,
        createdAt: daysAgo(28), updatedAt: now,
      },
      {
        id: MOCK_IDS.creatorProfile2, userId: MOCK_IDS.creatorUser2,
        name: "Rahul Verma", bio: "Tech reviewer and gadget enthusiast. 300K+ subscribers on YouTube. Honest, in-depth reviews that drive purchase decisions.",
        avatar: "", minFollowers: 1000,
        socialPlatforms: [
          { platform: "YouTube", handle: "RahulTechReviews", followers: 320000, verified: true },
          { platform: "Twitter", handle: "@rahultech", followers: 95000, verified: true },
        ],
        reliabilityScore: 4.6, totalDealsCompleted: 15, totalEarnings: 280000,
        createdAt: daysAgo(22), updatedAt: now,
      },
      {
        id: MOCK_IDS.creatorProfile3, userId: MOCK_IDS.creatorUser3,
        name: "Aisha Khan", bio: "Fitness coach & wellness influencer. Helping people transform their health with practical, science-backed advice.",
        avatar: "", minFollowers: 1000,
        socialPlatforms: [
          { platform: "Instagram", handle: "@aishafitness", followers: 150000, verified: true },
          { platform: "YouTube", handle: "AishaKhanFit", followers: 45000, verified: false },
        ],
        reliabilityScore: 5.0, totalDealsCompleted: 0, totalEarnings: 0,
        createdAt: daysAgo(5), updatedAt: now,
      },
    ],
    brandProfiles: [
      {
        id: MOCK_IDS.brandProfile1, userId: MOCK_IDS.brandUser1,
        companyName: "GlowSkin Beauty", industry: "Beauty & Skincare",
        description: "India's fastest-growing D2C beauty brand. Clean, sustainable skincare loved by millions.",
        website: "https://glowskin.example.com", logo: "", companySize: "50-200",
        createdAt: daysAgo(30), updatedAt: now,
      },
      {
        id: MOCK_IDS.brandProfile2, userId: MOCK_IDS.brandUser2,
        companyName: "FitLife Nutrition", industry: "Health & Fitness",
        description: "Premium sports nutrition and supplements for the modern Indian athlete. FSSAI certified, lab tested.",
        website: "https://fitlife.example.com", logo: "", companySize: "20-50",
        createdAt: daysAgo(25), updatedAt: now,
      },
      {
        id: MOCK_IDS.brandProfile3, userId: MOCK_IDS.brandUser3,
        companyName: "TechIndia Gadgets", industry: "Technology",
        description: "Curated collection of innovative tech gadgets and accessories. Making cutting-edge tech accessible to every Indian.",
        website: "https://techindia.example.com", logo: "", companySize: "10-20",
        createdAt: daysAgo(20), updatedAt: now,
      },
    ],
    deals: [
      {
        id: MOCK_IDS.deal1, brandId: MOCK_IDS.brandUser1, creatorId: MOCK_IDS.creatorUser1,
        title: "GlowSkin Summer Campaign - Instagram Reels",
        description: "Create 3 Instagram Reels showcasing our new Summer Glow SPF50 sunscreen. Each reel should be 30-60 seconds, shot in natural lighting.",
        totalAmount: 50000, platformFee: 2500, creatorPayout: 47500,
        status: "SCRIPT_PENDING",
        scriptChecklist: [
          { item: "Reel 1: Product unboxing + first impressions", completed: false },
          { item: "Reel 2: Morning skincare routine featuring SPF50", completed: false },
          { item: "Reel 3: Beach day / outdoor application demo", completed: false },
        ],
        scriptApprovedAt: null, scriptApprovedBy: null,
        payment50Paid: false, payment50PaidAt: null, payment50TransactionId: null,
        payment100Paid: false, payment100PaidAt: null, payment100TransactionId: null,
        filesUploaded: false, filesUploadedAt: null,
        downloadLinkGenerated: false, downloadLinkExpiresAt: null,
        disputeRaised: false, disputeRaisedById: null, disputeReason: null,
        assignedMediatorId: null, mediationDecision: null,
        createdAt: daysAgo(7), updatedAt: now,
      },
      {
        id: MOCK_IDS.deal2, brandId: MOCK_IDS.brandUser1, creatorId: MOCK_IDS.creatorUser1,
        title: "GlowSkin Diwali Special - YouTube Video",
        description: "One 5-minute YouTube review of our festive gift set with honest opinion and demo.",
        totalAmount: 30000, platformFee: 1500, creatorPayout: 28500,
        status: "PRODUCTION",
        scriptChecklist: [
          { item: "Intro with product showcase", completed: true },
          { item: "Try-on and honest review", completed: true },
        ],
        scriptApprovedAt: daysAgo(3), scriptApprovedBy: MOCK_IDS.brandUser1,
        payment50Paid: true, payment50PaidAt: daysAgo(2), payment50TransactionId: "pay_mock_001",
        payment100Paid: false, payment100PaidAt: null, payment100TransactionId: null,
        filesUploaded: false, filesUploadedAt: null,
        downloadLinkGenerated: false, downloadLinkExpiresAt: null,
        disputeRaised: false, disputeRaisedById: null, disputeReason: null,
        assignedMediatorId: null, mediationDecision: null,
        createdAt: daysAgo(10), updatedAt: daysAgo(2),
      },
      {
        id: MOCK_IDS.deal3, brandId: MOCK_IDS.brandUser3, creatorId: MOCK_IDS.creatorUser2,
        title: "TechIndia Wireless Earbuds Review",
        description: "Detailed YouTube review of our new TWS earbuds — sound quality, ANC, battery life, and value comparison.",
        totalAmount: 25000, platformFee: 1250, creatorPayout: 23750,
        status: "COMPLETED",
        scriptChecklist: [
          { item: "Unboxing and design review", completed: true },
          { item: "Sound quality test with multiple genres", completed: true },
          { item: "ANC comparison with competitors", completed: true },
        ],
        scriptApprovedAt: daysAgo(15), scriptApprovedBy: MOCK_IDS.brandUser3,
        payment50Paid: true, payment50PaidAt: daysAgo(14), payment50TransactionId: "pay_mock_010",
        payment100Paid: true, payment100PaidAt: daysAgo(8), payment100TransactionId: "pay_mock_011",
        filesUploaded: true, filesUploadedAt: daysAgo(9),
        downloadLinkGenerated: true, downloadLinkExpiresAt: daysAgo(-21),
        disputeRaised: false, disputeRaisedById: null, disputeReason: null,
        assignedMediatorId: null, mediationDecision: null,
        createdAt: daysAgo(20), updatedAt: daysAgo(8),
      },
    ],
    chatMessages: [
      {
        id: "msg-0001", dealId: MOCK_IDS.deal1, senderId: MOCK_IDS.brandUser1,
        messageType: "TEXT", content: "Hi Priya! Excited to work with you on the Summer Glow campaign. I've added the script checklist — let me know if the brief makes sense.",
        metadata: null, flagged: false, flagReason: null, createdAt: daysAgo(6),
      },
      {
        id: "msg-0002", dealId: MOCK_IDS.deal1, senderId: MOCK_IDS.creatorUser1,
        messageType: "TEXT", content: "Hey! Thanks for choosing me. The brief looks great. I have a few ideas for Reel 2 — can I incorporate a before/after with the SPF?",
        metadata: null, flagged: false, flagReason: null, createdAt: daysAgo(6) ,
      },
      {
        id: "msg-0003", dealId: MOCK_IDS.deal1, senderId: MOCK_IDS.brandUser1,
        messageType: "TEXT", content: "Absolutely! A before/after would be perfect. Go for it. Once you're happy with the script outline, I'll approve and we can move to payment.",
        metadata: null, flagged: false, flagReason: null, createdAt: hoursAgo(48),
      },
      {
        id: "msg-0004", dealId: MOCK_IDS.deal2, senderId: MOCK_IDS.brandUser1,
        messageType: "TEXT", content: "Hi Priya, the script is approved! Payment of 50% has been made. You can start production whenever you're ready.",
        metadata: null, flagged: false, flagReason: null, createdAt: daysAgo(2),
      },
      {
        id: "msg-0005", dealId: MOCK_IDS.deal2, senderId: MOCK_IDS.creatorUser1,
        messageType: "TEXT", content: "Thank you! I'll start shooting this weekend. Expected delivery by next Wednesday.",
        metadata: null, flagged: false, flagReason: null, createdAt: daysAgo(2),
      },
      {
        id: "msg-0006", dealId: MOCK_IDS.deal3, senderId: MOCK_IDS.brandUser3,
        messageType: "TEXT", content: "Hi Rahul, great working with you! The review video was fantastic. Deal completed successfully.",
        metadata: null, flagged: false, flagReason: null, createdAt: daysAgo(8),
      },
    ],
    deliverables: [] as any[],
    escrowTransactions: [
      {
        id: "et-0001", dealId: MOCK_IDS.deal2, transactionType: "DEPOSIT_50",
        amount: 15000, status: "COMPLETED",
        razorpayOrderId: "order_mock_001", razorpayPaymentId: "pay_mock_001",
        createdAt: daysAgo(2),
      },
      {
        id: "et-0010", dealId: MOCK_IDS.deal3, transactionType: "DEPOSIT_50",
        amount: 12500, status: "COMPLETED",
        razorpayOrderId: "order_mock_010", razorpayPaymentId: "pay_mock_010",
        createdAt: daysAgo(14),
      },
      {
        id: "et-0011", dealId: MOCK_IDS.deal3, transactionType: "DEPOSIT_100",
        amount: 12500, status: "COMPLETED",
        razorpayOrderId: "order_mock_011", razorpayPaymentId: "pay_mock_011",
        createdAt: daysAgo(8),
      },
    ],
    auditLogs: [
      {
        id: "al-0001", entityType: "user", entityId: MOCK_IDS.brandUser1,
        action: "user_registered", actorId: MOCK_IDS.brandUser1,
        changes: { email: "brand@test.com", role: "BRAND" },
        ipAddress: null, userAgent: null, createdAt: daysAgo(30),
      },
      {
        id: "al-0002", entityType: "user", entityId: MOCK_IDS.creatorUser1,
        action: "user_registered", actorId: MOCK_IDS.creatorUser1,
        changes: { email: "creator@test.com", role: "CREATOR" },
        ipAddress: null, userAgent: null, createdAt: daysAgo(28),
      },
      {
        id: "al-0003", entityType: "deal", entityId: MOCK_IDS.deal1,
        action: "deal_created", actorId: MOCK_IDS.brandUser1,
        changes: { title: "GlowSkin Summer Campaign - Instagram Reels" },
        ipAddress: null, userAgent: null, createdAt: daysAgo(7),
      },
    ],
  };
}
