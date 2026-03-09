-- ============================================================
-- Influencer Connect — Comprehensive Test Seed Data
-- Run in Supabase SQL Editor → New Query → Paste → Run
-- ============================================================
-- All accounts use password: Test1234
-- ============================================================

-- ============================================================
-- STEP 1: CLEANUP old test data (safe to re-run)
-- ============================================================
DO $$
DECLARE
  _user_ids TEXT[];
  _bp_ids TEXT[];
  _deal_ids TEXT[];
  _camp_ids TEXT[];
  _wallet_ids TEXT[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO _user_ids
  FROM "User"
  WHERE email IN (
    'brand@test.com', 'brand1@test.com', 'brand2@test.com', 'brand3@test.com', 'brand4@test.com',
    'creator@test.com', 'creator1@test.com', 'creator2@test.com', 'creator3@test.com', 'creator4@test.com', 'creator5@test.com',
    'admin@test.com'
  );

  IF array_length(_user_ids, 1) IS NULL THEN
    RAISE NOTICE 'No existing test data to clean up.';
    RETURN;
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO _bp_ids FROM "BrandProfile" WHERE "userId" = ANY(_user_ids);
  SELECT COALESCE(array_agg(id), '{}') INTO _deal_ids FROM "Deal" WHERE "brandId" = ANY(_user_ids) OR "creatorId" = ANY(_user_ids);
  SELECT COALESCE(array_agg(id), '{}') INTO _camp_ids FROM "Campaign" WHERE "brandId" = ANY(_bp_ids);
  SELECT COALESCE(array_agg(id), '{}') INTO _wallet_ids FROM "Wallet" WHERE "userId" = ANY(_user_ids);

  -- Deal dependencies
  DELETE FROM "PIIViolation" WHERE "chatMessageId" IN (SELECT id FROM "ChatMessage" WHERE "dealId" = ANY(_deal_ids));
  DELETE FROM "VideoAsset" WHERE "dealId" = ANY(_deal_ids);
  DELETE FROM "DealRevision" WHERE "dealId" = ANY(_deal_ids);
  DELETE FROM "DealMilestone" WHERE "dealId" = ANY(_deal_ids);
  DELETE FROM "Deliverable" WHERE "dealId" = ANY(_deal_ids);
  DELETE FROM "ChatMessage" WHERE "dealId" = ANY(_deal_ids);
  DELETE FROM "EscrowTransaction" WHERE "dealId" = ANY(_deal_ids);
  DELETE FROM "ExclusiveNegotiation" WHERE "dealId" = ANY(_deal_ids);

  -- Campaign dependencies
  DELETE FROM "CampaignApplication" WHERE "campaignId" = ANY(_camp_ids);

  -- Wallet dependencies
  DELETE FROM "WalletTransaction" WHERE "walletId" = ANY(_wallet_ids);

  -- Remaining user dependencies
  DELETE FROM "Deal" WHERE id = ANY(_deal_ids);
  DELETE FROM "Campaign" WHERE id = ANY(_camp_ids);
  DELETE FROM "PIIViolation" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "UserWarning" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "Notification" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "NotificationPreference" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "AuditLog" WHERE "actorId" = ANY(_user_ids);
  DELETE FROM "CampaignApplication" WHERE "applicantId" = ANY(_user_ids);
  DELETE FROM "SocialEntity" WHERE "masterId" = ANY(_user_ids);
  DELETE FROM "Wallet" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "BrandProfile" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "CreatorProfile" WHERE "userId" = ANY(_user_ids);
  DELETE FROM "User" WHERE id = ANY(_user_ids);

  RAISE NOTICE 'Cleaned up % existing test users.', array_length(_user_ids, 1);
END $$;

-- ============================================================
-- STEP 2: INSERT all test data
-- ============================================================
DO $$
DECLARE
  -- Pre-computed bcryptjs hash for "Test1234" (12 rounds)
  pwd TEXT := '$2b$12$qMHfVAI0naJsFpAlyQGoj.9ysqRkTyUHaGefPGVTowTSx/QHdJwGe';

  -- User IDs (TEXT, not UUID — Prisma stores IDs as TEXT)
  b1 TEXT := gen_random_uuid()::TEXT;
  b2 TEXT := gen_random_uuid()::TEXT;
  b3 TEXT := gen_random_uuid()::TEXT;
  b4 TEXT := gen_random_uuid()::TEXT;
  c1 TEXT := gen_random_uuid()::TEXT;
  c2 TEXT := gen_random_uuid()::TEXT;
  c3 TEXT := gen_random_uuid()::TEXT;
  c4 TEXT := gen_random_uuid()::TEXT;
  c5 TEXT := gen_random_uuid()::TEXT;
  a1 TEXT := gen_random_uuid()::TEXT;

  -- Brand Profile IDs
  bp1 TEXT := gen_random_uuid()::TEXT;
  bp2 TEXT := gen_random_uuid()::TEXT;
  bp3 TEXT := gen_random_uuid()::TEXT;
  bp4 TEXT := gen_random_uuid()::TEXT;

  -- Creator Profile IDs
  cp1 TEXT := gen_random_uuid()::TEXT;
  cp2 TEXT := gen_random_uuid()::TEXT;
  cp3 TEXT := gen_random_uuid()::TEXT;
  cp4 TEXT := gen_random_uuid()::TEXT;
  cp5 TEXT := gen_random_uuid()::TEXT;

  -- Social Entity IDs
  se_c1_ig TEXT := gen_random_uuid()::TEXT;
  se_c1_yt TEXT := gen_random_uuid()::TEXT;
  se_c2_yt TEXT := gen_random_uuid()::TEXT;
  se_c3_ig TEXT := gen_random_uuid()::TEXT;
  se_c5_ig TEXT := gen_random_uuid()::TEXT;

  -- Wallet IDs
  w_b1 TEXT := gen_random_uuid()::TEXT;
  w_b2 TEXT := gen_random_uuid()::TEXT;
  w_b3 TEXT := gen_random_uuid()::TEXT;
  w_b4 TEXT := gen_random_uuid()::TEXT;
  w_c1 TEXT := gen_random_uuid()::TEXT;
  w_c2 TEXT := gen_random_uuid()::TEXT;
  w_c3 TEXT := gen_random_uuid()::TEXT;
  w_c4 TEXT := gen_random_uuid()::TEXT;
  w_c5 TEXT := gen_random_uuid()::TEXT;
  w_a1 TEXT := gen_random_uuid()::TEXT;

  -- Campaign IDs
  camp1 TEXT := gen_random_uuid()::TEXT;
  camp2 TEXT := gen_random_uuid()::TEXT;
  camp3 TEXT := gen_random_uuid()::TEXT;

  -- Deal IDs
  d1 TEXT := gen_random_uuid()::TEXT;
  d2 TEXT := gen_random_uuid()::TEXT;
  d3 TEXT := gen_random_uuid()::TEXT;

BEGIN

  -- ========================================================
  -- USERS (4 brands + 5 creators + 1 admin = 10)
  -- ========================================================
  INSERT INTO "User" (id, email, password, phone, role, "kycStatus", "updatedAt")
  VALUES
    (b1, 'brand1@test.com',   pwd, '9876543210', 'BRAND',   'VERIFIED', NOW()),
    (b2, 'brand2@test.com',   pwd, '9876543211', 'BRAND',   'VERIFIED', NOW()),
    (b3, 'brand3@test.com',   pwd, '9876543212', 'BRAND',   'PENDING',  NOW()),
    (b4, 'brand4@test.com',   pwd, '9876543213', 'BRAND',   'REJECTED', NOW()),
    (c1, 'creator1@test.com', pwd, '9123456780', 'CREATOR', 'VERIFIED', NOW()),
    (c2, 'creator2@test.com', pwd, '9123456781', 'CREATOR', 'VERIFIED', NOW()),
    (c3, 'creator3@test.com', pwd, '9123456782', 'CREATOR', 'VERIFIED', NOW()),
    (c4, 'creator4@test.com', pwd, '9123456783', 'CREATOR', 'PENDING',  NOW()),
    (c5, 'creator5@test.com', pwd, '9123456784', 'CREATOR', 'VERIFIED', NOW()),
    (a1, 'admin@test.com',    pwd, '9000000001', 'ADMIN',   'VERIFIED', NOW());

  -- ========================================================
  -- BRAND PROFILES
  -- ========================================================
  INSERT INTO "BrandProfile" (
    id, "userId", "companyName", industry, description, website,
    logo, "companySize", gstin, "gstinVerified", "gstinVerifiedAt",
    "registeredAddress", "filingStatus", "updatedAt"
  ) VALUES
    (bp1, b1, 'GlowSkin Beauty', 'Beauty & Skincare',
     'India''s fastest-growing D2C beauty brand. Clean, sustainable skincare loved by millions.',
     'https://glowskin.example.com', '', '50-200',
     '27AABCG1234F1Z5', true, NOW() - INTERVAL '30 days',
     'Mumbai, Maharashtra', 'Active', NOW()),
    (bp2, b2, 'UrbanFit India', 'Fitness & Sports',
     'Premium fitness gear and supplements for the modern Indian athlete.',
     'https://urbanfit.example.com', '', '10-50',
     NULL, false, NULL, NULL, NULL, NOW()),
    (bp3, b3, 'NewBrand Co', 'Technology',
     NULL, NULL, NULL, NULL,
     NULL, false, NULL, NULL, NULL, NOW()),
    (bp4, b4, 'Rejected Brand LLC', 'Finance',
     'Financial services company with comprehensive investment solutions.',
     'https://rejectedbrand.example.com', '', '200-500',
     NULL, false, NULL, NULL, NULL, NOW());

  -- ========================================================
  -- CREATOR PROFILES
  -- ========================================================
  INSERT INTO "CreatorProfile" (
    id, "userId", name, bio, avatar, "socialPlatforms",
    "reliabilityScore", "totalDealsCompleted", "totalEarnings", "updatedAt"
  ) VALUES
    (cp1, c1, 'Priya Sharma',
     'Beauty & lifestyle content creator with 500K+ followers. I help brands tell authentic stories that resonate with Gen Z and millennials in India.',
     '',
     '[{"platform":"Instagram","handle":"@priyasharma","followers":520000,"verified":true},{"platform":"YouTube","handle":"PriyaSharmaVlogs","followers":180000,"verified":true}]'::jsonb,
     4.8, 23, 450000, NOW()),
    (cp2, c2, 'Arjun Tech Reviews',
     'India''s go-to tech reviewer. Honest, detailed reviews of the latest gadgets and smartphones.',
     '',
     '[{"platform":"YouTube","handle":"ArjunTechReviews","followers":1200000,"verified":true}]'::jsonb,
     4.5, 12, 320000, NOW()),
    (cp3, c3, 'Meera''s Kitchen',
     'Home chef and food content creator. I make Indian cooking fun, easy, and healthy!',
     '',
     '[{"platform":"Instagram","handle":"@meeraskitchen","followers":85000,"verified":true}]'::jsonb,
     4.0, 5, 75000, NOW()),
    (cp4, c4, 'New Creator',
     NULL, NULL, '[]'::jsonb,
     5.0, 0, 0, NOW()),
    (cp5, c5, 'Rahul Vlogs',
     'Daily vlogs about life in Bangalore. Lifestyle, food, and travel content.',
     '',
     '[{"platform":"Instagram","handle":"@rahulvlogs","followers":15000,"verified":false}]'::jsonb,
     2.5, 3, 25000, NOW());

  -- ========================================================
  -- SOCIAL ENTITIES (5 entities across 4 creators)
  -- ========================================================
  INSERT INTO "SocialEntity" (
    id, "masterId", platform, handle, "followerCount", "engagementRate",
    rating, "totalDeals", "completionScore", "isVerified",
    niche, categories, "updatedAt"
  ) VALUES
    (se_c1_ig, c1, 'INSTAGRAM', '@priyasharma',    520000, 4.20, 4.80, 23, 96.00, true,
     ARRAY['beauty','lifestyle'], ARRAY['skincare','fashion'], NOW()),
    (se_c1_yt, c1, 'YOUTUBE',   'PriyaSharmaVlogs', 180000, 3.80, 4.50,  8, 92.00, true,
     ARRAY['beauty','vlogs'], ARRAY['skincare','tutorials'], NOW()),
    (se_c2_yt, c2, 'YOUTUBE',   'ArjunTechReviews', 1200000, 5.10, 4.50, 12, 94.00, true,
     ARRAY['tech','gadgets'], ARRAY['smartphones','laptops'], NOW()),
    (se_c3_ig, c3, 'INSTAGRAM', '@meeraskitchen',    85000, 6.50, 4.00,  5, 88.00, true,
     ARRAY['food','cooking'], ARRAY['recipes','healthy-eating'], NOW()),
    (se_c5_ig, c5, 'INSTAGRAM', '@rahulvlogs',       15000, 1.20, 2.50,  3, 60.00, false,
     ARRAY['lifestyle'], ARRAY['vlogs','travel'], NOW());

  -- ========================================================
  -- WALLETS (1 per user = 10)
  -- ========================================================
  INSERT INTO "Wallet" (id, "userId", balance, "totalEarned", "totalWithdrawn", "lastTransactionAt", "updatedAt")
  VALUES
    (w_b1, b1,      0,     0,     0, NULL, NOW()),
    (w_b2, b2,      0,     0,     0, NULL, NOW()),
    (w_b3, b3,      0,     0,     0, NULL, NOW()),
    (w_b4, b4,      0,     0,     0, NULL, NOW()),
    (w_c1, c1,  47500, 95000, 47500, NOW() - INTERVAL '1 day',  NOW()),
    (w_c2, c2, 320000,320000,     0, NULL, NOW()),
    (w_c3, c3,  75000, 75000,     0, NULL, NOW()),
    (w_c4, c4,      0,     0,     0, NULL, NOW()),
    (w_c5, c5,  25000, 25000,     0, NULL, NOW()),
    (w_a1, a1,      0,     0,     0, NULL, NOW());

  -- ========================================================
  -- CAMPAIGNS (3)
  -- ========================================================
  INSERT INTO "Campaign" (
    id, "brandId", title, description, niche,
    "minFollowers", "maxFollowers", "contentFormat",
    budget, status, "publishedAt", "createdAt", "updatedAt"
  ) VALUES
    (camp1, bp1,
     'Summer Glow SPF50 Launch Campaign',
     'Looking for beauty creators to showcase our new Summer Glow SPF50 sunscreen. We need engaging Reels and Shorts demonstrating product application and benefits.',
     ARRAY['beauty','skincare'], 10000, 1000000,
     ARRAY['REEL','SHORT']::"ContentFormat"[],
     200000, 'ACTIVE', NOW() - INTERVAL '7 days',
     NOW() - INTERVAL '8 days', NOW()),
    (camp2, bp1,
     'Diwali Collection Promo',
     'Promote our upcoming Diwali festive collection. Looking for creators who can create aspirational beauty content with a festive vibe.',
     ARRAY['beauty','fashion'], 50000, 5000000,
     ARRAY['REEL','VIDEO','CAROUSEL']::"ContentFormat"[],
     500000, 'DRAFT', NULL,
     NOW() - INTERVAL '2 days', NOW()),
    (camp3, bp2,
     'Fitness Influencer Collab',
     'Looking for fitness enthusiasts to promote our new protein supplements and workout gear. Show real workouts and honest reviews.',
     ARRAY['fitness','health'], 5000, 500000,
     ARRAY['REEL','POST']::"ContentFormat"[],
     150000, 'ACTIVE', NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '6 days', NOW());

  -- ========================================================
  -- DEALS (3)
  -- ========================================================

  -- D1: B1 <-> C1, SCRIPT_PENDING (linked to Camp1)
  INSERT INTO "Deal" (
    id, "brandId", "creatorId", "entityId", "campaignId",
    title, description, "totalAmount", "platformFee", "creatorPayout",
    status, "maxRevisions", "scriptChecklist",
    "createdAt", "updatedAt"
  ) VALUES (
    d1, b1, c1, se_c1_ig, camp1,
    'GlowSkin Summer Campaign - Instagram Reels',
    'Create 3 Instagram Reels showcasing our new Summer Glow SPF50 sunscreen. Each reel should be 30-60 seconds, shot in natural lighting.',
    50000, 2500, 47500,
    'SCRIPT_PENDING', 2,
    '[{"item":"Reel 1: Product unboxing + first impressions","completed":false},{"item":"Reel 2: Morning skincare routine featuring SPF50","completed":false},{"item":"Reel 3: Beach day / outdoor application demo","completed":false}]'::jsonb,
    NOW() - INTERVAL '3 hours', NOW()
  );

  -- D2: B1 <-> C2, LOCKED (exclusive negotiation)
  INSERT INTO "Deal" (
    id, "brandId", "creatorId", "entityId",
    title, description, "totalAmount", "platformFee", "creatorPayout",
    status, "maxRevisions",
    "createdAt", "updatedAt"
  ) VALUES (
    d2, b1, c2, se_c2_yt,
    'Tech Review: GlowSkin Smart Skincare Device',
    'In-depth YouTube review of our new smart skincare device with AI skin analysis.',
    80000, 4000, 76000,
    'LOCKED', 3,
    NOW() - INTERVAL '1 hour', NOW()
  );

  -- D3: B2 <-> C1, COMPLETED (full happy path)
  INSERT INTO "Deal" (
    id, "brandId", "creatorId", "entityId",
    title, description, "totalAmount", "platformFee", "creatorPayout",
    status, "maxRevisions", "currentRevision",
    "payment50Paid", "payment50PaidAt",
    "payment100Paid", "payment100PaidAt",
    "filesUploaded", "filesUploadedAt",
    "createdAt", "updatedAt"
  ) VALUES (
    d3, b2, c1, se_c1_ig,
    'UrbanFit Protein Shake Review',
    'Instagram Reel reviewing our new mango-flavored protein shake.',
    45000, 2250, 42750,
    'COMPLETED', 2, 1,
    true, NOW() - INTERVAL '10 days',
    true, NOW() - INTERVAL '3 days',
    true, NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '14 days', NOW()
  );

  -- ========================================================
  -- EXCLUSIVE NEGOTIATION (D2 locked for 72h)
  -- ========================================================
  INSERT INTO "ExclusiveNegotiation" (id, "dealId", "entityId", "expiresAt")
  VALUES (gen_random_uuid()::TEXT, d2, se_c2_yt, NOW() + INTERVAL '72 hours');

  -- ========================================================
  -- CAMPAIGN APPLICATIONS (C3 applied to B2's Fitness campaign)
  -- ========================================================
  INSERT INTO "CampaignApplication" (
    id, "campaignId", "entityId", "applicantId",
    "creatorMessage", "proposedRate", status
  ) VALUES (
    gen_random_uuid()::TEXT, camp3, se_c3_ig, c3,
    'I''d love to create recipe content with a fitness twist! My audience loves healthy meal preps and I can showcase your protein supplements in cooking videos.',
    30000, 'PENDING'
  );

  -- ========================================================
  -- CHAT MESSAGES
  -- ========================================================

  -- D1: 3 messages (brand <-> creator about script)
  INSERT INTO "ChatMessage" (id, "dealId", "senderId", "messageType", content, "createdAt")
  VALUES
    (gen_random_uuid()::TEXT, d1, b1, 'TEXT',
     'Hi Priya! Excited to work with you on the Summer Glow campaign. I''ve added the script checklist — let me know if the brief makes sense.',
     NOW() - INTERVAL '2 hours 30 minutes'),
    (gen_random_uuid()::TEXT, d1, c1, 'TEXT',
     'Hey! Thanks for choosing me. The brief looks great. I have a few ideas for Reel 2 — can I incorporate a before/after with the SPF?',
     NOW() - INTERVAL '2 hours 15 minutes'),
    (gen_random_uuid()::TEXT, d1, b1, 'TEXT',
     'Absolutely! A before/after would be perfect. Go for it. Once you''re happy with the script outline, I''ll approve and we can move to payment.',
     NOW() - INTERVAL '2 hours');

  -- D2: 1 message (initial greeting)
  INSERT INTO "ChatMessage" (id, "dealId", "senderId", "messageType", content, "createdAt")
  VALUES
    (gen_random_uuid()::TEXT, d2, b1, 'TEXT',
     'Hi Arjun! Big fan of your reviews. We''d love you to review our new smart skincare device. Let me know if the deal terms work for you.',
     NOW() - INTERVAL '45 minutes');

  -- D3: 2 messages (completed deal wrap-up)
  INSERT INTO "ChatMessage" (id, "dealId", "senderId", "messageType", content, "createdAt")
  VALUES
    (gen_random_uuid()::TEXT, d3, b2, 'TEXT',
     'Great work on the protein shake reel, Priya! The engagement numbers are amazing. Final payment is on its way.',
     NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::TEXT, d3, c1, 'TEXT',
     'Thank you! It was fun to make. Let me know if you need anything else for future campaigns!',
     NOW() - INTERVAL '2 days 23 hours');

  -- ========================================================
  -- ESCROW TRANSACTIONS for D3 (completed deal)
  -- ========================================================
  INSERT INTO "EscrowTransaction" (id, "dealId", "transactionType", amount, status, "createdAt")
  VALUES
    (gen_random_uuid()::TEXT, d3, 'DEPOSIT_50',          22500, 'COMPLETED', NOW() - INTERVAL '10 days'),
    (gen_random_uuid()::TEXT, d3, 'DEPOSIT_100',         22500, 'COMPLETED', NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::TEXT, d3, 'RELEASE_TO_CREATOR',  42750, 'COMPLETED', NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::TEXT, d3, 'PLATFORM_FEE',         2250, 'COMPLETED', NOW() - INTERVAL '3 days');

  -- ========================================================
  -- WALLET TRANSACTIONS for C1
  -- ========================================================
  INSERT INTO "WalletTransaction" (id, "walletId", type, amount, "dealId", description, status, "createdAt")
  VALUES
    (gen_random_uuid()::TEXT, w_c1, 'CREDIT',     47500, d3,
     'Payout for UrbanFit Protein Shake Review', 'COMPLETED', NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::TEXT, w_c1, 'WITHDRAWAL', 47500, NULL,
     'Bank withdrawal to HDFC ****1234', 'COMPLETED', NOW() - INTERVAL '1 day');

  -- ========================================================
  -- NOTIFICATIONS (5 sample)
  -- ========================================================
  INSERT INTO "Notification" (id, "userId", type, title, message, read, "createdAt")
  VALUES
    (gen_random_uuid()::TEXT, c1, 'DEAL_CREATED',
     'New Deal', 'You have a new deal: GlowSkin Summer Campaign - Instagram Reels',
     false, NOW() - INTERVAL '3 hours'),
    (gen_random_uuid()::TEXT, c1, 'PAYMENT_RECEIVED',
     'Payment Received', 'You received ₹42,750 for UrbanFit Protein Shake Review',
     true, NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::TEXT, b1, 'APPLICATION_RECEIVED',
     'New Application', 'A creator has applied to your Summer Glow SPF50 Launch Campaign',
     false, NOW() - INTERVAL '1 hour'),
    (gen_random_uuid()::TEXT, c2, 'DEAL_STATUS_CHANGED',
     'Deal Locked', 'Your deal "Tech Review: GlowSkin Smart Skincare Device" has been locked for exclusive negotiation',
     false, NOW() - INTERVAL '45 minutes'),
    (gen_random_uuid()::TEXT, a1, 'SYSTEM_ANNOUNCEMENT',
     'Welcome', 'Welcome to the Influencer Connect admin panel',
     true, NOW() - INTERVAL '7 days');

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  SEED COMPLETE — 10 TEST ACCOUNTS CREATED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  BRANDS:';
  RAISE NOTICE '    brand1@test.com  — Verified, GSTIN, campaigns + deals';
  RAISE NOTICE '    brand2@test.com  — Verified, no GSTIN, 1 campaign + completed deal';
  RAISE NOTICE '    brand3@test.com  — Pending KYC, partial profile';
  RAISE NOTICE '    brand4@test.com  — Rejected KYC, complete profile';
  RAISE NOTICE '';
  RAISE NOTICE '  CREATORS:';
  RAISE NOTICE '    creator1@test.com — Verified, 2 entities, wallet ₹47,500, 2 deals';
  RAISE NOTICE '    creator2@test.com — Verified, 1.2M YT, locked deal';
  RAISE NOTICE '    creator3@test.com — Verified, applied to campaign';
  RAISE NOTICE '    creator4@test.com — Pending KYC, no entities';
  RAISE NOTICE '    creator5@test.com — Verified, low rating (2.5)';
  RAISE NOTICE '';
  RAISE NOTICE '  ADMIN:';
  RAISE NOTICE '    admin@test.com';
  RAISE NOTICE '';
  RAISE NOTICE '  Password for all: Test1234';
  RAISE NOTICE '================================================';

END $$;

-- ============================================================
-- STEP 3: Verify — show created accounts
-- ============================================================
SELECT
  email,
  role,
  "kycStatus" AS kyc,
  phone
FROM "User"
WHERE email IN (
  'brand1@test.com', 'brand2@test.com', 'brand3@test.com', 'brand4@test.com',
  'creator1@test.com', 'creator2@test.com', 'creator3@test.com', 'creator4@test.com', 'creator5@test.com',
  'admin@test.com'
)
ORDER BY role, email;
