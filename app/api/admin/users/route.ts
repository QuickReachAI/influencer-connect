import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { kycService } from "@/lib/services/kyc.service";
import { verifyAdmin, AuthError } from "@/lib/auth-helpers";

const banUserSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function GET(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const searchParams = request.nextUrl.searchParams;
        const role = searchParams.get('role');
        const kycStatus = searchParams.get('kycStatus');
        const isBannedParam = searchParams.get('isBanned');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));

        const where: any = {};

        if (role) {
            where.role = role;
        }
        if (kycStatus) {
            where.kycStatus = kycStatus;
        }
        if (isBannedParam !== null && isBannedParam !== undefined) {
            where.isBanned = isBannedParam === 'true';
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    kycStatus: true,
                    isBanned: true,
                    banReason: true,
                    bannedAt: true,
                    createdAt: true,
                    creatorProfile: true,
                    brandProfile: true,
                    _count: {
                        select: {
                            dealsAsCreator: true,
                            dealsAsBrand: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.user.count({ where })
        ]);

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const body = await request.json();
        const parsed = banUserSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        await kycService.banUser(parsed.data.userId, parsed.data.reason);

        return NextResponse.json({
            success: true,
            message: 'User banned successfully'
        });

    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        console.error('Ban user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
