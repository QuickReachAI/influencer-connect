import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatService } from "@/lib/services/chat.service";

export async function POST(
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

        // Only brand can approve script
        if (deal.brandId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (deal.status !== 'DRAFT' && deal.status !== 'SCRIPT_PENDING') {
            return NextResponse.json(
                { error: 'Script can only be approved in draft or pending status' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { approved, notes } = body;

        if (approved) {
            // Approve script and move to payment pending
            await prisma.deal.update({
                where: { id: dealId },
                data: {
                    status: 'SCRIPT_APPROVED',
                    scriptApprovedAt: new Date(),
                    scriptApprovedBy: userId
                }
            });

            // Lock conversation history at this milestone
            await chatService.lockConversation(dealId, 'script_approved');

            // Send system message
            await chatService.sendMessage(
                dealId,
                'system',
                '✅ Script has been approved. Brand can now proceed with 50% payment.',
                'SYSTEM'
            );
        } else {
            // Request revisions
            await prisma.deal.update({
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

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: approved ? 'script_approved' : 'script_revision_requested',
                actorId: userId,
                changes: { approved, notes }
            }
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
