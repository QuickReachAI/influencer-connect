import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mediationService } from "@/lib/services/mediation.service";
import { disputeSchema, disputeResolutionSchema } from "@/lib/validations";
import { getAuthUserId } from '@/lib/auth-helpers';

// Raise a dispute
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = getAuthUserId(request);
        const { id: dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Only brand or creator can raise dispute
        if (deal.brandId !== userId && deal.creatorId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Cannot raise dispute if already in dispute
        if (deal.status === 'DISPUTED') {
            return NextResponse.json(
                { error: 'Deal is already in dispute' },
                { status: 400 }
            );
        }

        // Cannot raise dispute if deal is completed or cancelled
        if (deal.status === 'COMPLETED' || deal.status === 'CANCELLED') {
            return NextResponse.json(
                { error: 'Cannot dispute completed or cancelled deal' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const validation = disputeSchema.safeParse({ dealId, ...body });

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        await mediationService.raiseDispute(dealId, userId, validation.data.reason);

        return NextResponse.json({
            success: true,
            message: 'Dispute raised successfully. A mediator will be assigned shortly.'
        });

    } catch (error) {
        console.error('Raise dispute error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Resolve dispute (admin/mediator only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = getAuthUserId(request);
        const { id: dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify user is admin
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only admins can resolve disputes' },
                { status: 403 }
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        if (deal.status !== 'DISPUTED') {
            return NextResponse.json(
                { error: 'Deal is not in dispute' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const validation = disputeResolutionSchema.safeParse({ dealId, ...body });

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        await mediationService.resolveDispute(
            dealId,
            userId,
            validation.data.decision,
            validation.data.notes
        );

        return NextResponse.json({
            success: true,
            message: 'Dispute resolved successfully'
        });

    } catch (error) {
        console.error('Resolve dispute error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get dispute details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = getAuthUserId(request);
        const { id: dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                brand: {
                    select: {
                        id: true,
                        email: true,
                        brandProfile: { select: { companyName: true } }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        email: true,
                        creatorProfile: { select: { name: true, reliabilityScore: true } }
                    }
                },
                chatMessages: {
                    orderBy: { createdAt: 'asc' }
                },
                deliverables: {
                    where: { deletedAt: null }
                },
                assignedMediator: {
                    select: { id: true, email: true }
                }
            }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Verify user has access
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user?.role !== 'ADMIN' && deal.brandId !== userId && deal.creatorId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json({
            dispute: {
                dealId: deal.id,
                status: deal.status,
                disputeRaised: deal.disputeRaised,
                disputeReason: deal.disputeReason,
                mediator: deal.assignedMediator,
                mediationDecision: deal.mediationDecision,
                brand: deal.brand,
                creator: deal.creator,
                chatHistory: deal.chatMessages,
                deliverables: deal.deliverables
            }
        });

    } catch (error) {
        console.error('Get dispute error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
