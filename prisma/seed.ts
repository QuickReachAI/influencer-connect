// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding database...\n");

  const password = await bcrypt.hash("Test1234", 12);

  // --- Brand User ---
  const brand = await prisma.user.upsert({
    where: { email: "brand@test.com" },
    update: {},
    create: {
      email: "brand@test.com",
      password,
      phone: "9876543210",
      role: "BRAND",
      kycStatus: "VERIFIED",
      brandProfile: {
        create: {
          companyName: "GlowSkin Beauty",
          industry: "Beauty & Skincare",
          description:
            "India's fastest-growing D2C beauty brand. We create clean, sustainable skincare products loved by millions.",
          website: "https://glowskin.example.com",
          logo: "",
          companySize: "50-200",
        },
      },
    },
    include: { brandProfile: true },
  });

  console.log(`Brand created:    ${brand.email}  (id: ${brand.id})`);

  // --- Influencer User ---
  const influencer = await prisma.user.upsert({
    where: { email: "creator@test.com" },
    update: {},
    create: {
      email: "creator@test.com",
      password,
      phone: "9123456780",
      role: "CREATOR",
      kycStatus: "VERIFIED",
      creatorProfile: {
        create: {
          name: "Priya Sharma",
          bio: "Beauty & lifestyle content creator with 500K+ followers across platforms. I help brands tell authentic stories that resonate with Gen Z and millennial audiences in India.",
          avatar: "",
          socialPlatforms: [
            {
              platform: "Instagram",
              handle: "@priyasharma",
              followers: 520000,
              verified: true,
            },
            {
              platform: "YouTube",
              handle: "PriyaSharmaVlogs",
              followers: 180000,
              verified: true,
            },
          ],
          reliabilityScore: 4.8,
          totalDealsCompleted: 23,
          totalEarnings: 450000,
        },
      },
    },
    include: { creatorProfile: true },
  });

  console.log(`Creator created:  ${influencer.email}  (id: ${influencer.id})`);

  // --- Admin User ---
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      password,
      phone: "9000000001",
      role: "ADMIN",
      kycStatus: "VERIFIED",
    },
  });

  console.log(`Admin created:    ${admin.email}  (id: ${admin.id})`);

  // --- Sample Deal between Brand and Creator ---
  const deal = await prisma.deal.create({
    data: {
      brandId: brand.id,
      creatorId: influencer.id,
      title: "GlowSkin Summer Campaign - Instagram Reels",
      description:
        "Create 3 Instagram Reels showcasing our new Summer Glow SPF50 sunscreen. Each reel should be 30-60 seconds, shot in natural lighting, highlighting product texture and application.",
      totalAmount: 50000,
      platformFee: 0,
      creatorPayout: 50000,
      status: "SCRIPT_PENDING",
      scriptChecklist: [
        { item: "Reel 1: Product unboxing + first impressions", completed: false },
        { item: "Reel 2: Morning skincare routine featuring SPF50", completed: false },
        { item: "Reel 3: Beach day / outdoor application demo", completed: false },
      ],
    },
  });

  console.log(`\nSample deal created: "${deal.title}" (id: ${deal.id})`);

  // --- Sample Chat Messages ---
  await prisma.chatMessage.createMany({
    data: [
      {
        dealId: deal.id,
        senderId: brand.id,
        messageType: "TEXT",
        content: "Hi Priya! Excited to work with you on the Summer Glow campaign. I've added the script checklist — let me know if the brief makes sense.",
      },
      {
        dealId: deal.id,
        senderId: influencer.id,
        messageType: "TEXT",
        content: "Hey! Thanks for choosing me. The brief looks great. I have a few ideas for Reel 2 — can I incorporate a before/after with the SPF?",
      },
      {
        dealId: deal.id,
        senderId: brand.id,
        messageType: "TEXT",
        content: "Absolutely! A before/after would be perfect. Go for it. Once you're happy with the script outline, I'll approve and we can move to payment.",
      },
    ],
  });

  console.log("Sample chat messages created (3 messages)\n");

  // --- Phase 1: Seed SocialEntities ---
  const entity1 = await prisma.socialEntity.upsert({
    where: {
      masterId_platform_handle: {
        masterId: influencer.id,
        platform: "INSTAGRAM",
        handle: "@priyasharma",
      },
    },
    update: {},
    create: {
      masterId: influencer.id,
      platform: "INSTAGRAM",
      handle: "@priyasharma",
      followerCount: 520000,
      engagementRate: 4.2,
      rating: 4.8,
      totalDeals: 23,
      isVerified: true,
      niche: ["beauty", "lifestyle"],
      categories: ["skincare", "fashion"],
    },
  });

  const entity2 = await prisma.socialEntity.upsert({
    where: {
      masterId_platform_handle: {
        masterId: influencer.id,
        platform: "YOUTUBE",
        handle: "PriyaSharmaVlogs",
      },
    },
    update: {},
    create: {
      masterId: influencer.id,
      platform: "YOUTUBE",
      handle: "PriyaSharmaVlogs",
      followerCount: 180000,
      engagementRate: 3.8,
      rating: 4.5,
      totalDeals: 8,
      isVerified: true,
      niche: ["beauty", "vlogs"],
      categories: ["skincare", "tutorials"],
    },
  });

  console.log(
    `Social entities created: ${entity1.handle}, ${entity2.handle}`
  );

  // --- Phase 1: Seed Wallets ---
  for (const user of [brand, influencer, admin]) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  console.log("Wallets created for all users");

  // --- Phase 1: Seed Sample Campaign ---
  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.brandProfile!.id,
      title: "Summer Glow SPF50 Launch Campaign",
      description:
        "Looking for beauty creators to showcase our new Summer Glow SPF50 sunscreen. We need engaging Instagram Reels and YouTube Shorts demonstrating product application and benefits.",
      niche: ["beauty", "skincare"],
      minFollowers: 10000,
      maxFollowers: 1000000,
      contentFormat: ["REEL", "SHORT"],
      budget: 200000,
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  console.log(`Sample campaign created: "${campaign.title}"\n`);

  console.log("========================================");
  console.log("  SEED COMPLETE - LOGIN CREDENTIALS");
  console.log("========================================");
  console.log("");
  console.log("  Brand Login:");
  console.log("    Email:    brand@test.com");
  console.log("    Password: Test1234");
  console.log("");
  console.log("  Creator Login:");
  console.log("    Email:    creator@test.com");
  console.log("    Password: Test1234");
  console.log("");
  console.log("  Admin Login:");
  console.log("    Email:    admin@test.com");
  console.log("    Password: Test1234");
  console.log("");
  console.log("========================================");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
