import { NextRequest, NextResponse } from "next/server";
import { fileService } from "@/lib/services/file.service";
import { getAuthUserId } from '@/lib/auth-helpers';

// Get download link for a file
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = getAuthUserId(request);
        const { id: fileId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const downloadUrl = await fileService.generateSecureDownloadLink(fileId, userId);

        return NextResponse.json({
            success: true,
            downloadUrl,
            expiresIn: '24 hours'
        });

    } catch (error) {
        console.error('Get download link error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate link' },
            { status: 500 }
        );
    }
}
