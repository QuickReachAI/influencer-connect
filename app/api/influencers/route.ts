import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { apiLimiter } from "@/lib/rate-limit";

const querySchema = z.object({
    niche: z.string().max(100).optional(),
    platform: z.enum(["INSTAGRAM", "YOUTUBE", "FACEBOOK"]).optional(),
    search: z.string().max(200).optional(),
    minFollowers: z.coerce.number().int().min(0).optional(),
    maxFollowers: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(12),
});

export async function GET(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const { success } = await apiLimiter(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const searchParams = request.nextUrl.searchParams;
        const parsed = querySchema.safeParse({
            niche: searchParams.get("niche") ?? undefined,
            platform: searchParams.get("platform") ?? undefined,
            search: searchParams.get("search") ?? undefined,
            minFollowers: searchParams.get("minFollowers") ?? undefined,
            maxFollowers: searchParams.get("maxFollowers") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { niche, platform, search, minFollowers, maxFollowers, page, limit } = parsed.data;

        // Use SocialEntity table for discovery instead of CreatorProfile JSON
        const entityWhere: Prisma.SocialEntityWhereInput = {
            isActive: true,
            master: {
                kycStatus: "VERIFIED",
                isBanned: false,
            },
        };

        if (platform) {
            entityWhere.platform = platform;
        }
        if (niche) {
            entityWhere.niche = { has: niche };
        }
        if (minFollowers !== undefined) {
            entityWhere.followerCount = { ...(entityWhere.followerCount as any ?? {}), gte: minFollowers };
        }
        if (maxFollowers !== undefined) {
            entityWhere.followerCount = { ...(entityWhere.followerCount as any ?? {}), lte: maxFollowers };
        }
        if (search) {
            entityWhere.master = {
                ...(entityWhere.master as any),
                creatorProfile: { name: { contains: search, mode: "insensitive" } },
            };
        }

        const [entities, total] = await Promise.all([
            prisma.socialEntity.findMany({
                where: entityWhere,
                include: {
                    master: {
                        include: {
                            creatorProfile: true,
                        },
                        omit: { password: true },
                    },
                },
                orderBy: [
                    { completionScore: "desc" },
                    { rating: "desc" },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.socialEntity.count({ where: entityWhere }),
        ]);

        return NextResponse.json({
            influencers: entities,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get influencers error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
