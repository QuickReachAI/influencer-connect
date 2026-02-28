import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';

export async function GET(request: NextRequest) {
    try {
        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const user = await authService.getUserById(userId);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });

    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userId = request.cookies.get('user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const updatedProfile = await authService.updateProfile(userId, body);

        return NextResponse.json({
            success: true,
            profile: updatedProfile
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
