/**
 * Backfill script: Migrate existing data to Phase 1 models
 *
 * - Reads CreatorProfile.socialPlatforms JSON and upserts SocialEntity records
 * - Creates Wallet for every user that doesn't have one
 *
 * Usage:  npx tsx prisma/backfill-phase1.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const PLATFORM_MAP: Record<string, string> = {
  instagram: "INSTAGRAM",
  youtube: "YOUTUBE",
  facebook: "FACEBOOK",
};

interface SocialPlatformEntry {
  platform: string;
  handle: string;
  followers?: number;
  verified?: boolean;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("=== Phase 1 Backfill Start ===\n");

  // -------------------------------------------------------
  // 1. Migrate CreatorProfile.socialPlatforms → SocialEntity
  // -------------------------------------------------------
  const profiles = await prisma.creatorProfile.findMany({
    include: { user: true },
  });

  let entitiesCreated = 0;
  let entitiesSkipped = 0;

  for (const profile of profiles) {
    const platforms = profile.socialPlatforms as SocialPlatformEntry[] | null;
    if (!platforms || !Array.isArray(platforms)) {
      console.log(`  [skip] ${profile.name} — no socialPlatforms data`);
      continue;
    }

    for (const entry of platforms) {
      const mapped = PLATFORM_MAP[entry.platform.toLowerCase()];
      if (!mapped) {
        console.log(
          `  [skip] Unknown platform "${entry.platform}" for ${profile.name}`
        );
        entitiesSkipped++;
        continue;
      }

      const platform = mapped as "INSTAGRAM" | "YOUTUBE" | "FACEBOOK";

      await prisma.socialEntity.upsert({
        where: {
          masterId_platform_handle: {
            masterId: profile.userId,
            platform,
            handle: entry.handle,
          },
        },
        update: {
          followerCount: entry.followers ?? 0,
          isVerified: entry.verified ?? false,
        },
        create: {
          masterId: profile.userId,
          platform,
          handle: entry.handle,
          followerCount: entry.followers ?? 0,
          isVerified: entry.verified ?? false,
          niche: [],
          categories: [],
        },
      });

      entitiesCreated++;
      console.log(
        `  [upsert] ${platform} ${entry.handle} → user ${profile.userId}`
      );
    }
  }

  console.log(
    `\nSocialEntity: ${entitiesCreated} upserted, ${entitiesSkipped} skipped\n`
  );

  // -------------------------------------------------------
  // 2. Create Wallet for every user that lacks one
  // -------------------------------------------------------
  const usersWithoutWallet = await prisma.user.findMany({
    where: { wallet: null },
    select: { id: true, email: true },
  });

  for (const user of usersWithoutWallet) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    console.log(`  [wallet] Created for ${user.email}`);
  }

  console.log(
    `\nWallets: ${usersWithoutWallet.length} created\n`
  );

  // -------------------------------------------------------
  // Summary
  // -------------------------------------------------------
  console.log("=== Phase 1 Backfill Complete ===");
  console.log(`  Social entities upserted: ${entitiesCreated}`);
  console.log(`  Social entities skipped:  ${entitiesSkipped}`);
  console.log(`  Wallets created:          ${usersWithoutWallet.length}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
