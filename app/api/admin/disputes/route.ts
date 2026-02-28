import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mediationService } from "@/lib/services/mediation.service";

// Get all active disputes
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

        const mediatorId = request.nextUrl.searchParams.get('mediatorId');

        const disputes = await mediationService.getActiveDisputes(
            mediatorId || undefined
        );

        return NextResponse.json({ disputes });

    } catch (error) {
        console.error('Get disputes error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
