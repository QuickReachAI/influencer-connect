-- Phase 1 GIN indexes for array column discovery queries
-- Run manually after `prisma migrate dev` since Prisma doesn't support GIN indexes natively.

CREATE INDEX IF NOT EXISTS "SocialEntity_niche_gin" ON "SocialEntity" USING GIN ("niche");
CREATE INDEX IF NOT EXISTS "Campaign_niche_gin" ON "Campaign" USING GIN ("niche");

-- Partial unique index: only one active exclusive negotiation per entity at a time
CREATE UNIQUE INDEX IF NOT EXISTS "ExclusiveNegotiation_entityId_active"
  ON "ExclusiveNegotiation" ("entityId") WHERE "isActive" = true;
