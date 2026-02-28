import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatService } from "@/lib/services/chat.service";

// Get flagged messages (platform leakage attempts)
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
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const flaggedMessages = await chatService.getFlaggedMessages();

        return NextResponse.json({ flaggedMessages });

    } catch (error) {
        console.error('Get flagged messages error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Mark a flagged message as reviewed
export async function PUT(request: NextRequest) {
    try {
        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify admin role
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { messageId, action } = body; // action: 'dismiss' or 'warn' or 'ban'

        if (!messageId || !action) {
            return NextResponse.json(
                { error: 'messageId and action are required' },
                { status: 400 }
            );
        }

        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId },
            include: { deal: true }
        });

        if (!message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        // Audit log the review
        await prisma.auditLog.create({
            data: {
                entityType: 'chat',
                entityId: messageId,
                action: `flagged_message_${action}`,
                actorId: userId,
                changes: {
                    senderId: message.senderId,
                    dealId: message.dealId,
                    action
                }
            }
        });

        if (action === 'ban') {
            // Import kycService to ban the user
            const { kycService } = await import('@/lib/services/kyc.service');
            await kycService.banUser(
                message.senderId,
                `Banned for platform leakage attempt: ${message.flagReason}`
            );
        }

        return NextResponse.json({
            success: true,
            message: `Flagged message ${action} action completed`
        });

    } catch (error) {
        console.error('Review flagged message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
