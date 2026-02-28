import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';
import { loginSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body
        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const result = await authService.login(validation.data);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 401 }
            );
        }

        // In production, set HTTP-only cookie with JWT token
        const response = NextResponse.json({
            success: true,
            user: result.user
        });

        // Set session cookie (in production, use proper JWT)
        response.cookies.set('user_id', result.user!.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;

    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
