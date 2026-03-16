import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatService } from "@/lib/services/chat.service";
import { scriptApprovalSchema } from "@/lib/validations";
import { getAuthUserId } from '@/lib/auth-helpers';

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

        if (deal.brandId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (deal.status !== 'SCRIPT_PENDING') {
            return NextResponse.json(
                { error: `Cannot approve script in '${deal.status}' status. Deal must be in SCRIPT_PENDING status.` },
                { status: 409 }
            );
        }

        const body = await request.json();
        const parsed = scriptApprovalSchema.safeParse({ ...body, dealId });

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { approved, notes } = parsed.data;

        await prisma.$transaction(async (tx: any) => {
            if (approved) {
                await tx.deal.update({
                    where: { id: dealId },
                    data: {
                        status: 'SCRIPT_APPROVED',
                        scriptApprovedAt: new Date(),
                        scriptApprovedBy: userId
                    }
                });

                await chatService.lockConversation(dealId, 'script_approved');

                await chatService.sendMessage(
                    dealId,
                    'system',
                    '✅ Script has been approved. Brand can now proceed with 50% payment.',
                    'SYSTEM'
                );
            } else {
                await tx.deal.update({
                    where: { id: dealId },
                    data: { status: 'SCRIPT_PENDING' }
                });

                if (notes) {
                    await chatService.sendMessage(
                        dealId,
                        'system',
                        `📝 Script revision requested: ${notes}`,
                        'SYSTEM'
                    );
                }
            }

            await tx.auditLog.create({
                data: {
                    entityType: 'deal',
                    entityId: dealId,
                    action: approved ? 'script_approved' : 'script_revision_requested',
                    actorId: userId,
                    changes: { approved, notes }
                }
            });
        });

        return NextResponse.json({
            success: true,
            message: approved ? 'Script approved' : 'Revision requested'
        });

    } catch (error) {
        console.error('Script approval error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
