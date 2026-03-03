import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/lib/services/chat.service";
import { chatMessageSchema } from "@/lib/validations";
import { chatLimiter } from "@/lib/rate-limit";

// Get chat history for a deal
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const userId = request.cookies.get('user_id')?.value;
        const { dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const messages = await chatService.getChatHistory(dealId, userId);

        return NextResponse.json({ messages });

    } catch (error) {
        console.error('Get chat history error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get messages' },
            { status: 500 }
        );
    }
}

// Send a chat message
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ dealId: string }> }
) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const { success } = await chatLimiter(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const userId = request.cookies.get('user_id')?.value;
        const { dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validation = chatMessageSchema.safeParse({ dealId, ...body });

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const message = await chatService.sendMessage(
            dealId,
            userId,
            validation.data.content
        );

        return NextResponse.json({
            success: true,
            message
        }, { status: 201 });

    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send message' },
            { status: 500 }
        );
    }
}
