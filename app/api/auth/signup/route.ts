import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';
import { signupSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body
        const validation = signupSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const result = await authService.signup(validation.data);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            user: result.user,
            message: 'Registration successful. Please complete KYC verification.'
        });

    } catch (error) {
        console.error('Signup API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
