import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';

const creatorUpdateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
    socialPlatforms: z.array(z.object({
        platform: z.string(),
        handle: z.string(),
        followers: z.number().min(0),
        verified: z.boolean().default(false),
    })).optional(),
}).strict();

const brandUpdateSchema = z.object({
    companyName: z.string().min(2).max(200).optional(),
    industry: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    website: z.string().url().optional().or(z.literal('')),
    logo: z.string().url().optional(),
}).strict();

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

        const user = await authService.getUserById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const body = await request.json();

        const schema = user.role === 'CREATOR' ? creatorUpdateSchema : brandUpdateSchema;
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const updatedProfile = await authService.updateProfile(userId, parsed.data);

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
