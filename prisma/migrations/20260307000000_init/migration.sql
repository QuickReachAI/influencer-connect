-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'BRAND', 'ADMIN');

-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('REEL', 'SHORT', 'VIDEO', 'POST', 'STORY', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DealMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "VideoAssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'WATERMARKING', 'PACKAGING', 'READY', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'WITHDRAWAL', 'REFUND');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEAL_CREATED', 'DEAL_STATUS_CHANGED', 'PAYMENT_RECEIVED', 'PAYMENT_REQUIRED', 'SCRIPT_APPROVED', 'REVISION_REQUESTED', 'DELIVERY_UPLOADED', 'DISPUTE_RAISED', 'DISPUTE_RESOLVED', 'CAMPAIGN_PUBLISHED', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'WALLET_CREDIT', 'WALLET_WITHDRAWAL', 'KYC_VERIFIED', 'PII_WARNING', 'SYSTEM_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "PIIDetectedType" AS ENUM ('PHONE_NUMBER', 'EMAIL_ADDRESS', 'AADHAAR_NUMBER', 'PAN_NUMBER', 'BANK_ACCOUNT', 'UPI_ID', 'EXTERNAL_URL', 'SOCIAL_HANDLE');

-- CreateEnum
CREATE TYPE "PIISeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PIIAction" AS ENUM ('WARNED', 'REDACTED', 'BLOCKED', 'SHADOW_BLOCKED');

-- CreateEnum
CREATE TYPE "WarningType" AS ENUM ('PII_LEAK', 'PLATFORM_LEAKAGE', 'ABUSIVE_CONTENT', 'SPAM', 'FRAUD_ATTEMPT');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'LOCKED', 'SCRIPT_PENDING', 'SCRIPT_APPROVED', 'PAYMENT_50_PENDING', 'PRODUCTION', 'DELIVERY_PENDING', 'REVISION_PENDING', 'PAYMENT_100_PENDING', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT_50', 'DEPOSIT_100', 'RELEASE_TO_CREATOR', 'REFUND_TO_BRAND', 'PLATFORM_FEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'FILE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT NOT NULL,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycProviderId" TEXT,
    "aadhaarHash" TEXT,
    "panHash" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "minFollowers" INTEGER NOT NULL DEFAULT 1000,
    "socialPlatforms" JSONB NOT NULL,
    "reliabilityScore" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "totalDealsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "companySize" TEXT,
    "gstin" TEXT,
    "gstinVerified" BOOLEAN NOT NULL DEFAULT false,
    "gstinVerifiedAt" TIMESTAMP(3),
    "registeredAddress" TEXT,
    "filingStatus" TEXT,
    "gstStatusLastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialEntity" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "completionScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "oauthTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "audienceDemographics" JSONB,
    "niche" TEXT[],
    "categories" TEXT[],
    "portfolioItems" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "entityId" TEXT,
    "campaignId" TEXT,
    "maxRevisions" INTEGER NOT NULL DEFAULT 2,
    "currentRevision" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "creatorPayout" DECIMAL(10,2) NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "scriptChecklist" JSONB,
    "scriptApprovedAt" TIMESTAMP(3),
    "scriptApprovedBy" TEXT,
    "payment50Paid" BOOLEAN NOT NULL DEFAULT false,
    "payment50PaidAt" TIMESTAMP(3),
    "payment50TransactionId" TEXT,
    "payment100Paid" BOOLEAN NOT NULL DEFAULT false,
    "payment100PaidAt" TIMESTAMP(3),
    "payment100TransactionId" TEXT,
    "filesUploaded" BOOLEAN NOT NULL DEFAULT false,
    "filesUploadedAt" TIMESTAMP(3),
    "downloadLinkGenerated" BOOLEAN NOT NULL DEFAULT false,
    "downloadLinkExpiresAt" TIMESTAMP(3),
    "disputeRaised" BOOLEAN NOT NULL DEFAULT false,
    "disputeRaisedById" TEXT,
    "disputeReason" TEXT,
    "assignedMediatorId" TEXT,
    "mediationDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "niche" TEXT[],
    "minFollowers" INTEGER NOT NULL DEFAULT 0,
    "maxFollowers" INTEGER NOT NULL DEFAULT 999999999,
    "contentFormat" "ContentFormat"[],
    "duration" TEXT,
    "ownershipTransfer" BOOLEAN NOT NULL DEFAULT false,
    "budget" DECIMAL(12,2) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "visibilityTier" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignApplication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "creatorMessage" TEXT,
    "proposedRate" DECIMAL(10,2),
    "status" "CampaignApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealMilestone" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DealMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DealMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealRevision" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "feedback" TEXT,
    "videoUrl" TEXT,
    "watermarkedUrl" TEXT,
    "cleanUrl" TEXT,
    "status" "RevisionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExclusiveNegotiation" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "ExclusiveNegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastTransactionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dealId" TEXT,
    "description" TEXT,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "bankTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileType" TEXT,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "revisionId" TEXT,
    "deliverableId" TEXT,
    "originalUrl" TEXT NOT NULL,
    "watermarkedUrl" TEXT,
    "cleanUrl" TEXT,
    "hlsUrl" TEXT,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "resolution" TEXT,
    "fileSize" BIGINT,
    "codec" TEXT,
    "watermarkConfig" JSONB,
    "drmKeyId" TEXT,
    "status" "VideoAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSTStatusLog" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawResponse" JSONB,

    CONSTRAINT "GSTStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PIIViolation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatMessageId" TEXT,
    "detectedType" "PIIDetectedType" NOT NULL,
    "originalContent" TEXT NOT NULL,
    "redactedContent" TEXT,
    "severity" "PIISeverity" NOT NULL,
    "actionTaken" "PIIAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PIIViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warningType" "WarningType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastWarningAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shadowBlocked" BOOLEAN NOT NULL DEFAULT false,
    "shadowBlockedAt" TIMESTAMP(3),

    CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_aadhaarHash_key" ON "User"("aadhaarHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_panHash_key" ON "User"("panHash");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_kycStatus_idx" ON "User"("kycStatus");

-- CreateIndex
CREATE INDEX "User_isBanned_idx" ON "User"("isBanned");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorProfile_userId_idx" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorProfile_reliabilityScore_idx" ON "CreatorProfile"("reliabilityScore");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_gstin_key" ON "BrandProfile"("gstin");

-- CreateIndex
CREATE INDEX "BrandProfile_userId_idx" ON "BrandProfile"("userId");

-- CreateIndex
CREATE INDEX "SocialEntity_platform_followerCount_idx" ON "SocialEntity"("platform", "followerCount");

-- CreateIndex
CREATE INDEX "SocialEntity_platform_engagementRate_idx" ON "SocialEntity"("platform", "engagementRate");

-- CreateIndex
CREATE INDEX "SocialEntity_rating_idx" ON "SocialEntity"("rating");

-- CreateIndex
CREATE INDEX "SocialEntity_masterId_idx" ON "SocialEntity"("masterId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialEntity_masterId_platform_handle_key" ON "SocialEntity"("masterId", "platform", "handle");

-- CreateIndex
CREATE INDEX "Deal_brandId_idx" ON "Deal"("brandId");

-- CreateIndex
CREATE INDEX "Deal_creatorId_idx" ON "Deal"("creatorId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_createdAt_idx" ON "Deal"("createdAt");

-- CreateIndex
CREATE INDEX "Deal_entityId_idx" ON "Deal"("entityId");

-- CreateIndex
CREATE INDEX "Deal_campaignId_idx" ON "Deal"("campaignId");

-- CreateIndex
CREATE INDEX "Deal_brandId_status_idx" ON "Deal"("brandId", "status");

-- CreateIndex
CREATE INDEX "Deal_creatorId_status_idx" ON "Deal"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Deal_payment100PaidAt_idx" ON "Deal"("payment100PaidAt");

-- CreateIndex
CREATE INDEX "EscrowTransaction_dealId_idx" ON "EscrowTransaction"("dealId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");

-- CreateIndex
CREATE INDEX "Campaign_status_publishedAt_idx" ON "Campaign"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Campaign_minFollowers_maxFollowers_idx" ON "Campaign"("minFollowers", "maxFollowers");

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- CreateIndex
CREATE INDEX "CampaignApplication_campaignId_status_idx" ON "CampaignApplication"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignApplication_applicantId_idx" ON "CampaignApplication"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignApplication_campaignId_entityId_key" ON "CampaignApplication"("campaignId", "entityId");

-- CreateIndex
CREATE INDEX "DealMilestone_dealId_sortOrder_idx" ON "DealMilestone"("dealId", "sortOrder");

-- CreateIndex
CREATE INDEX "DealRevision_dealId_idx" ON "DealRevision"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "DealRevision_dealId_revisionNumber_key" ON "DealRevision"("dealId", "revisionNumber");

-- CreateIndex
CREATE INDEX "ExclusiveNegotiation_entityId_isActive_idx" ON "ExclusiveNegotiation"("entityId", "isActive");

-- CreateIndex
CREATE INDEX "ExclusiveNegotiation_expiresAt_idx" ON "ExclusiveNegotiation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_dealId_idx" ON "WalletTransaction"("dealId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE INDEX "Deliverable_dealId_idx" ON "Deliverable"("dealId");

-- CreateIndex
CREATE INDEX "Deliverable_expiresAt_idx" ON "Deliverable"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_revisionId_key" ON "VideoAsset"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_deliverableId_key" ON "VideoAsset"("deliverableId");

-- CreateIndex
CREATE INDEX "VideoAsset_dealId_idx" ON "VideoAsset"("dealId");

-- CreateIndex
CREATE INDEX "VideoAsset_status_idx" ON "VideoAsset"("status");

-- CreateIndex
CREATE INDEX "ChatMessage_dealId_idx" ON "ChatMessage"("dealId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_flagged_idx" ON "ChatMessage"("flagged");

-- CreateIndex
CREATE INDEX "ChatMessage_dealId_createdAt_idx" ON "ChatMessage"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "GSTStatusLog_brandProfileId_checkedAt_idx" ON "GSTStatusLog"("brandProfileId", "checkedAt");

-- CreateIndex
CREATE INDEX "PIIViolation_userId_createdAt_idx" ON "PIIViolation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PIIViolation_chatMessageId_idx" ON "PIIViolation"("chatMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWarning_userId_warningType_key" ON "UserWarning"("userId", "warningType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialEntity" ADD CONSTRAINT "SocialEntity_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "SocialEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_disputeRaisedById_fkey" FOREIGN KEY ("disputeRaisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedMediatorId_fkey" FOREIGN KEY ("assignedMediatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "SocialEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMilestone" ADD CONSTRAINT "DealMilestone_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealRevision" ADD CONSTRAINT "DealRevision_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusiveNegotiation" ADD CONSTRAINT "ExclusiveNegotiation_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusiveNegotiation" ADD CONSTRAINT "ExclusiveNegotiation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "SocialEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DealRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTStatusLog" ADD CONSTRAINT "GSTStatusLog_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PIIViolation" ADD CONSTRAINT "PIIViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PIIViolation" ADD CONSTRAINT "PIIViolation_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- GIN INDEXES (for array column discovery queries)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "SocialEntity_niche_gin" ON "SocialEntity" USING GIN ("niche");
CREATE INDEX IF NOT EXISTS "Campaign_niche_gin" ON "Campaign" USING GIN ("niche");

-- Partial unique index: only one active exclusive negotiation per entity at a time
CREATE UNIQUE INDEX IF NOT EXISTS "ExclusiveNegotiation_entityId_active"
  ON "ExclusiveNegotiation" ("entityId") WHERE "isActive" = true;
