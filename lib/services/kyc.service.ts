// @ts-nocheck
import prisma from '@/lib/prisma';
import crypto from 'crypto';

interface KYCVerificationRequest {
    userId: string;
    aadhaarNumber: string;
    panNumber: string;
    phone: string;
}

interface KYCVerificationResponse {
    success: boolean;
    providerId?: string;
    error?: string;
}

export class KYCService {
    /**
     * Hash sensitive data (Aadhaar/PAN) for privacy compliance
     */
    private async hashSensitiveData(data: string): Promise<string> {
        return crypto
            .createHash('sha256')
            .update(data + process.env.NEXTAUTH_SECRET)
            .digest('hex');
    }

    /**
     * Check if user is already banned using Aadhaar/PAN hash
     * This prevents banned users from creating new accounts
     */
    private async checkExistingBan(aadhaarHash: string, panHash: string): Promise<boolean> {
        const existingBan = await prisma.user.findFirst({
            where: {
                OR: [
                    { aadhaarHash },
                    { panHash }
                ],
                isBanned: true
            }
        });

        return !!existingBan;
    }

    /**
     * Call Gridlines API for KYC verification (PAN + Aadhaar)
     * Uses the same GSTIN_API_KEY used for KYB verification.
     * In dev without an API key, returns a mock success response.
     */
    private async callKYCProvider(request: {
        aadhaar: string;
        pan: string;
    }): Promise<KYCVerificationResponse> {
        // Mock in dev when no API key configured
        if (process.env.NODE_ENV === 'development' && !process.env.GSTIN_API_KEY) {
            return { success: true, providerId: `GRIDLINES_MOCK_${Date.now()}` };
        }

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GSTIN_API_KEY!}`,
        };

        try {
            // Step 1: Verify PAN
            const panRes = await fetch('https://api.gridlines.io/pan-api/fetch', {
                method: 'POST',
                headers,
                body: JSON.stringify({ pan_number: request.pan, consent: 'Y' }),
            });
            const panData = await panRes.json();
            if (!panRes.ok || panData.error) {
                return { success: false, error: panData.error?.message ?? 'PAN verification failed' };
            }

            // Step 2: Verify Aadhaar
            const aadhaarRes = await fetch('https://api.gridlines.io/aadhaar-api/verify', {
                method: 'POST',
                headers,
                body: JSON.stringify({ aadhaar_number: request.aadhaar, consent: 'Y' }),
            });
            const aadhaarData = await aadhaarRes.json();
            if (!aadhaarRes.ok || aadhaarData.error) {
                return { success: false, error: aadhaarData.error?.message ?? 'Aadhaar verification failed' };
            }

            return {
                success: true,
                providerId: panData.transaction_id ?? aadhaarData.transaction_id ?? `GRIDLINES_${Date.now()}`,
            };
        } catch (error) {
            return {
                success: false,
                error: 'KYC verification failed',
            };
        }
    }

    /**
     * Main verification method
     * Verifies user with Aadhaar/PAN and checks for existing bans
     */
    async verifyUser(request: KYCVerificationRequest): Promise<KYCVerificationResponse> {
        try {
            // 1. Hash sensitive data
            const aadhaarHash = await this.hashSensitiveData(request.aadhaarNumber);
            const panHash = await this.hashSensitiveData(request.panNumber);

            // 2. Check if already banned (lifetime ban enforcement)
            const isBanned = await this.checkExistingBan(aadhaarHash, panHash);

            if (isBanned) {
                throw new Error('User is permanently banned. Cannot create new account.');
            }

            // 3. Call KYC provider (Gridlines)
            const verification = await this.callKYCProvider({
                aadhaar: request.aadhaarNumber,
                pan: request.panNumber
            });

            if (!verification.success) {
                // Update user status to rejected
                await prisma.user.update({
                    where: { id: request.userId },
                    data: {
                        kycStatus: 'REJECTED',
                        aadhaarHash,
                        panHash
                    }
                });

                return {
                    success: false,
                    error: 'KYC verification failed. Please check your details.'
                };
            }

            // 4. Update user record with verified status
            await prisma.user.update({
                where: { id: request.userId },
                data: {
                    kycStatus: 'VERIFIED',
                    aadhaarHash,
                    panHash,
                    kycProviderId: verification.providerId
                }
            });

            // 5. Audit log
            await prisma.auditLog.create({
                data: {
                    entityType: 'user',
                    entityId: request.userId,
                    action: 'kyc_verified',
                    actorId: request.userId,
                    changes: {
                        status: 'VERIFIED',
                        providerId: verification.providerId
                    }
                }
            });

            return {
                success: true,
                providerId: verification.providerId
            };

        } catch (error) {
            console.error('KYC verification error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Verification failed'
            };
        }
    }

    /**
     * Lifetime ban enforcement
     * Bans user and prevents future account creation with same Aadhaar/PAN
     */
    async banUser(userId: string, reason: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                banReason: reason,
                bannedAt: new Date()
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'user',
                entityId: userId,
                action: 'user_banned',
                changes: {
                    reason,
                    bannedAt: new Date()
                }
            }
        });
    }

    /**
     * Check if user is KYC verified and not banned
     */
    async isUserVerified(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true, isBanned: true }
        });

        return user?.kycStatus === 'VERIFIED' && !user?.isBanned;
    }
}

export const kycService = new KYCService();
