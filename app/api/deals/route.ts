import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dealCreateSchema } from "@/lib/validations";
import { kycService } from "@/lib/services/kyc.service";
import { apiLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
    try {
        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get("status");
        const role = searchParams.get("role"); // 'brand' or 'creator'

        // Build query based on user role
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const where: any = {};

        if (user.role === 'BRAND') {
            where.brandId = userId;
        } else if (user.role === 'CREATOR') {
            where.creatorId = userId;
        } else if (user.role === 'ADMIN') {
            // Admins can see all deals
            if (role === 'brand' && searchParams.get('userId')) {
                where.brandId = searchParams.get('userId');
            } else if (role === 'creator' && searchParams.get('userId')) {
                where.creatorId = searchParams.get('userId');
            }
        }

        if (status) {
            where.status = status;
        }

        const deals = await prisma.deal.findMany({
            where,
            include: {
                brand: {
                    select: {
                        id: true,
                        email: true,
                        brandProfile: { select: { companyName: true, logo: true } }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        email: true,
                        creatorProfile: { select: { name: true, avatar: true, reliabilityScore: true } }
                    }
                },
                _count: {
                    select: { deliverables: true, chatMessages: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ deals });

    } catch (error) {
        console.error('Get deals error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const { success } = await apiLimiter(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify KYC status
        const isVerified = await kycService.isUserVerified(userId);
        if (!isVerified) {
            return NextResponse.json(
                { error: 'KYC verification required to create deals' },
                { status: 403 }
            );
        }

        // Verify user is a brand
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'BRAND') {
            return NextResponse.json(
                { error: 'Only brands can create deals' },
                { status: 403 }
            );
        }

        const body = await request.json();

        // Validate request
        const validation = dealCreateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { creatorId, title, description, totalAmount, scriptChecklist } = validation.data;

        // Verify creator exists and is verified
        const creatorVerified = await kycService.isUserVerified(creatorId);
        if (!creatorVerified) {
            return NextResponse.json(
                { error: 'Selected creator is not KYC verified' },
                { status: 400 }
            );
        }

        // Calculate fees
        const platformFee = totalAmount * 0.05;
        const creatorPayout = totalAmount * 0.95;

        const deal = await prisma.deal.create({
            data: {
                brandId: userId,
                creatorId,
                title,
                description,
                totalAmount,
                platformFee,
                creatorPayout,
                scriptChecklist: scriptChecklist || [],
                status: 'DRAFT'
            },
            include: {
                brand: {
                    select: {
                        email: true,
                        brandProfile: { select: { companyName: true } }
                    }
                },
                creator: {
                    select: {
                        email: true,
                        creatorProfile: { select: { name: true } }
                    }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: deal.id,
                action: 'deal_created',
                actorId: userId,
                changes: {
                    title,
                    totalAmount,
                    creatorId
                }
            }
        });

        return NextResponse.json({
            success: true,
            deal
        }, { status: 201 });

    } catch (error) {
        console.error('Create deal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
