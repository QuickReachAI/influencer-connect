import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { kycService } from "@/lib/services/kyc.service";

// Get all users (admin only)
export async function GET(request: NextRequest) {
    try {
        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify admin role
        const admin = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const role = searchParams.get('role');
        const kycStatus = searchParams.get('kycStatus');
        const isBanned = searchParams.get('isBanned');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const where: any = {};

        if (role) {
            where.role = role;
        }
        if (kycStatus) {
            where.kycStatus = kycStatus;
        }
        if (isBanned !== null) {
            where.isBanned = isBanned === 'true';
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
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Ban a user
export async function POST(request: NextRequest) {
    try {
        const adminId = request.cookies.get('user_id')?.value;

        if (!adminId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify admin role
        const admin = await prisma.user.findUnique({
            where: { id: adminId }
        });

        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { userId, reason } = body;

        if (!userId || !reason) {
            return NextResponse.json(
                { error: 'userId and reason are required' },
                { status: 400 }
            );
        }

        await kycService.banUser(userId, reason);

        return NextResponse.json({
            success: true,
            message: 'User banned successfully'
        });

    } catch (error) {
        console.error('Ban user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
