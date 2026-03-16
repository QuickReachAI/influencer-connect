import { NextRequest, NextResponse } from 'next/server';
import { kycService } from '@/lib/services/kyc.service';
import { kycSchema } from '@/lib/validations';
import { authLimiter } from '@/lib/rate-limit';
import { getAuthUserId } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const { success } = await authLimiter(ip);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const userId = getAuthUserId(request);

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate request body
        const validation = kycSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const result = await kycService.verifyUser({
            userId,
            aadhaarNumber: validation.data.aadhaarNumber,
            panNumber: validation.data.panNumber,
            phone: validation.data.phone
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'KYC verification successful'
        });

    } catch (error) {
        console.error('KYC API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = getAuthUserId(request);

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const isVerified = await kycService.isUserVerified(userId);

        return NextResponse.json({
            verified: isVerified
        });

    } catch (error) {
        console.error('KYC check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
