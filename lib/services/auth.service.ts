import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { UserRole, KYCStatus } from '@prisma/client';

interface SignupRequest {
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    // Creator-specific
    name?: string;
    bio?: string;
    socialPlatforms?: Array<{
        platform: string;
        handle: string;
        followers: number;
        verified: boolean;
    }>;
    // Brand-specific
    companyName?: string;
    industry?: string;
    description?: string;
    website?: string;
}

interface LoginRequest {
    email: string;
    password: string;
}

interface AuthResponse {
    success: boolean;
    user?: {
        id: string;
        email: string;
        role: UserRole;
        kycStatus: KYCStatus;
        isBanned: boolean;
    };
    error?: string;
}

export class AuthService {
    private readonly SALT_ROUNDS = 12;

    /**
     * Register a new user
     */
    async signup(request: SignupRequest): Promise<AuthResponse> {
        try {
            // Check if email already exists
            const existingEmail = await prisma.user.findUnique({
                where: { email: request.email }
            });

            if (existingEmail) {
                return { success: false, error: 'Email already registered' };
            }

            // Check if phone already exists
            const existingPhone = await prisma.user.findUnique({
                where: { phone: request.phone }
            });

            if (existingPhone) {
                return { success: false, error: 'Phone number already registered' };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(request.password, this.SALT_ROUNDS);

            // Create user with profile in a transaction
            const user = await prisma.$transaction(async (tx: any) => {
                // Create base user
                const newUser = await tx.user.create({
                    data: {
                        email: request.email,
                        password: hashedPassword,
                        phone: request.phone,
                        role: request.role,
                        kycStatus: 'PENDING'
                    }
                });

                // Create role-specific profile
                if (request.role === 'CREATOR') {
                    await tx.creatorProfile.create({
                        data: {
                            userId: newUser.id,
                            name: request.name || 'Creator',
                            bio: request.bio,
                            socialPlatforms: request.socialPlatforms || []
                        }
                    });
                } else if (request.role === 'BRAND') {
                    await tx.brandProfile.create({
                        data: {
                            userId: newUser.id,
                            companyName: request.companyName || 'Company',
                            industry: request.industry || 'General',
                            description: request.description,
                            website: request.website
                        }
                    });
                }

                return newUser;
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    entityType: 'user',
                    entityId: user.id,
                    action: 'user_registered',
                    actorId: user.id,
                    changes: {
                        email: user.email,
                        role: user.role
                    }
                }
            });

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    kycStatus: user.kycStatus,
                    isBanned: user.isBanned
                }
            };

        } catch (error) {
            console.error('Signup error:', error);
            return {
                success: false,
                error: 'Registration failed. Please try again.'
            };
        }
    }

    /**
     * Login user
     */
    async login(request: LoginRequest): Promise<AuthResponse> {
        try {
            const user = await prisma.user.findUnique({
                where: { email: request.email }
            });

            if (!user) {
                return { success: false, error: 'Invalid email or password' };
            }

            // Check if user is banned
            if (user.isBanned) {
                return {
                    success: false,
                    error: `Account permanently banned. Reason: ${user.banReason}`
                };
            }

            // Verify password
            const isValid = await bcrypt.compare(request.password, user.password);

            if (!isValid) {
                return { success: false, error: 'Invalid email or password' };
            }

            // Audit log
            await prisma.auditLog.create({
                data: {
                    entityType: 'user',
                    entityId: user.id,
                    action: 'user_login',
                    actorId: user.id
                }
            });

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    kycStatus: user.kycStatus,
                    isBanned: user.isBanned
                }
            };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<any> {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                phone: true,
                kycStatus: true,
                isBanned: true,
                createdAt: true,
                creatorProfile: true,
                brandProfile: true
            }
        });
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: any): Promise<any> {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.role === 'CREATOR') {
            return await prisma.creatorProfile.update({
                where: { userId },
                data: {
                    name: data.name,
                    bio: data.bio,
                    avatar: data.avatar,
                    socialPlatforms: data.socialPlatforms
                }
            });
        } else if (user.role === 'BRAND') {
            return await prisma.brandProfile.update({
                where: { userId },
                data: {
                    companyName: data.companyName,
                    industry: data.industry,
                    description: data.description,
                    website: data.website,
                    logo: data.logo
                }
            });
        }
    }

    /**
     * Check if email is available
     */
    async isEmailAvailable(email: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        return !user;
    }

    /**
     * Check if phone is available
     */
    async isPhoneAvailable(phone: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { phone }
        });
        return !user;
    }
}

export const authService = new AuthService();
