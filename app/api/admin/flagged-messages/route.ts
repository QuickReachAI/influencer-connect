import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { chatService } from "@/lib/services/chat.service";
import { kycService } from "@/lib/services/kyc.service";
import { verifyAdmin, AuthError } from "@/lib/auth-helpers";

const reviewFlaggedMessageSchema = z.object({
    messageId: z.string().uuid("Invalid message ID"),
    action: z.enum(['dismiss', 'warn', 'ban'] as const, {
        message: "Action must be one of: dismiss, warn, ban",
    }),
});

export async function GET(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const flaggedMessages = await chatService.getFlaggedMessages();

        return NextResponse.json({ flaggedMessages });

    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        console.error('Get flagged messages error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const adminId = await verifyAdmin(request);

        const body = await request.json();
        const parsed = reviewFlaggedMessageSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { messageId, action } = parsed.data;

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

        await prisma.auditLog.create({
            data: {
                entityType: 'chat',
                entityId: messageId,
                action: `flagged_message_${action}`,
                actorId: adminId,
                changes: {
                    senderId: message.senderId,
                    dealId: message.dealId,
                    action
                }
            }
        });

        if (action === 'ban') {
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
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        console.error('Review flagged message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
