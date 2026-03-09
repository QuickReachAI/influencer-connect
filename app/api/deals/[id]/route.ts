import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dealUpdateSchema } from "@/lib/validations";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = request.cookies.get('user_id')?.value;
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
                        phone: true,
                        brandProfile: true
                    }
                },
                creator: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        creatorProfile: true
                    }
                },
                deliverables: {
                    where: { deletedAt: null },
                    orderBy: { uploadedAt: 'desc' }
                },
                escrowTransactions: {
                    orderBy: { createdAt: 'desc' }
                },
                chatMessages: {
                    take: 50,
                    orderBy: { createdAt: 'desc' }
                },
                assignedMediator: {
                    select: { id: true, email: true }
                },
                entity: true,
                campaign: true,
                milestones: { orderBy: { sortOrder: 'asc' } },
                revisions: { orderBy: { revisionNumber: 'desc' } },
                exclusiveNegotiations: { where: { isActive: true } }
            }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Verify user has access to this deal
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user?.role !== 'ADMIN' && deal.brandId !== userId && deal.creatorId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json({ deal });

    } catch (error) {
        console.error('Get deal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = request.cookies.get('user_id')?.value;
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

        // Only brand can update deal (and only in DRAFT status)
        if (deal.brandId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (deal.status !== 'DRAFT') {
            return NextResponse.json(
                { error: 'Deal can only be edited in draft status' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const validation = dealUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: validation.data
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'deal_updated',
                actorId: userId,
                changes: validation.data
            }
        });

        return NextResponse.json({
            success: true,
            deal: updatedDeal
        });

    } catch (error) {
        console.error('Update deal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = request.cookies.get('user_id')?.value;
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

        if (deal.brandId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Can only cancel deals that haven't had payments
        if (deal.payment50Paid) {
            return NextResponse.json(
                { error: 'Cannot cancel deal after payment has been made' },
                { status: 400 }
            );
        }

        await prisma.deal.update({
            where: { id: dealId },
            data: { status: 'CANCELLED' }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'deal_cancelled',
                actorId: userId
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Deal cancelled'
        });

    } catch (error) {
        console.error('Cancel deal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
