import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mediationService } from "@/lib/services/mediation.service";
import { fileService } from "@/lib/services/file.service";
import { taxService } from "@/lib/services/tax.service";
import { verifyAdmin, AuthError } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const searchParams = request.nextUrl.searchParams;
        const periodRaw = parseInt(searchParams.get('period') || '30');
        const period = Number.isFinite(periodRaw) && periodRaw > 0 ? periodRaw : 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        const [
            userStats,
            dealStats,
            revenueStats,
            disputeStats,
            storageStats,
            recentActivity
        ] = await Promise.all([
            Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { role: 'CREATOR' } }),
                prisma.user.count({ where: { role: 'BRAND' } }),
                prisma.user.count({ where: { kycStatus: 'VERIFIED' } }),
                prisma.user.count({ where: { isBanned: true } }),
                prisma.user.count({
                    where: { createdAt: { gte: startDate } }
                })
            ]),

            Promise.all([
                prisma.deal.count(),
                prisma.deal.count({ where: { status: 'COMPLETED' } }),
                prisma.deal.count({ where: { status: 'DISPUTED' } }),
                prisma.deal.count({
                    where: { createdAt: { gte: startDate } }
                }),
                prisma.deal.aggregate({
                    _sum: { totalAmount: true },
                    where: { status: 'COMPLETED' }
                })
            ]),

            taxService.getTaxSummary(startDate, new Date()),

            mediationService.getDisputeStats(),

            fileService.getStorageStats(),

            prisma.auditLog.findMany({
                where: {
                    action: {
                        in: ['deal_created', 'payment_50_completed', 'payment_100_completed', 'dispute_raised', 'user_banned']
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    actor: {
                        select: { email: true, role: true }
                    }
                }
            })
        ]);

        return NextResponse.json({
            users: {
                total: userStats[0],
                creators: userStats[1],
                brands: userStats[2],
                verified: userStats[3],
                banned: userStats[4],
                newThisPeriod: userStats[5]
            },
            deals: {
                total: dealStats[0],
                completed: dealStats[1],
                disputed: dealStats[2],
                newThisPeriod: dealStats[3],
                totalValue: dealStats[4]._sum.totalAmount || 0
            },
            revenue: revenueStats,
            disputes: disputeStats,
            storage: {
                totalFiles: storageStats.totalFiles,
                totalSize: storageStats.totalSize.toString(),
                expiringSoon: storageStats.expiringSoon
            },
            recentActivity
        });

    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        console.error('Get stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
