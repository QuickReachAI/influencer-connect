import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fileService } from "@/lib/services/file.service";
import { apiLimiter } from "@/lib/rate-limit";

// Upload file for a deal
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

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const dealId = formData.get('dealId') as string;

        if (!file || !dealId) {
            return NextResponse.json(
                { error: 'File and dealId are required' },
                { status: 400 }
            );
        }

        // Verify user is the creator for this deal
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        if (deal.creatorId !== userId) {
            return NextResponse.json(
                { error: 'Only creator can upload deliverables' },
                { status: 403 }
            );
        }

        const deliverable = await fileService.uploadDeliverable(dealId, userId, file);

        return NextResponse.json({
            success: true,
            deliverable
        }, { status: 201 });

    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}

// Get files for a deal
export async function GET(request: NextRequest) {
    try {
        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const dealId = request.nextUrl.searchParams.get('dealId');

        if (!dealId) {
            return NextResponse.json(
                { error: 'dealId is required' },
                { status: 400 }
            );
        }

        const deliverables = await fileService.getDeliverables(dealId, userId);

        return NextResponse.json({ deliverables });

    } catch (error) {
        console.error('Get files error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get files' },
            { status: 500 }
        );
    }
}
