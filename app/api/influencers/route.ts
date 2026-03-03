import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { apiLimiter } from "@/lib/rate-limit";

const querySchema = z.object({
    niche: z.string().max(100).optional(),
    search: z.string().max(200).optional(),
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
            search: searchParams.get("search") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { niche, search, page, limit } = parsed.data;

        const where: Prisma.CreatorProfileWhereInput = {
            user: {
                kycStatus: "VERIFIED",
                isBanned: false,
            },
        };

        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }

        if (niche) {
            where.socialPlatforms = {
                path: ["$[*].platform"],
                string_contains: niche,
            } as any;
        }

        const [influencers, total] = await Promise.all([
            prisma.creatorProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            kycStatus: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { totalDealsCompleted: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.creatorProfile.count({ where }),
        ]);

        return NextResponse.json({
            influencers,
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
