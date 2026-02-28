import prisma from '@/lib/prisma';

const FORBIDDEN_KEYWORDS = [
    'whatsapp', 'wa', 'email', 'gmail', 'yahoo', 'phone', 'number', 'call',
    'outside', 'offline', 'direct payment', 'bank transfer', 'upi', 'paytm',
    'gpay', 'phonepe', 'cash', 'meet', 'zoom', 'telegram', 'instagram dm',
    'facebook', 'linkedin', 'twitter', 'contact me at'
];

interface FlagResult {
    detected: boolean;
    reason?: string;
}

export class ChatService {
    /**
     * Detect forbidden keywords that indicate platform leakage attempts
     */
    private detectForbiddenContent(content: string): FlagResult {
        const lowerContent = content.toLowerCase();

        // Check for forbidden keywords
        for (const keyword of FORBIDDEN_KEYWORDS) {
            if (lowerContent.includes(keyword)) {
                return {
                    detected: true,
                    reason: `Forbidden keyword detected: "${keyword}"`
                };
            }
        }

        // Regex for phone numbers (10 digits)
        if (/\d{10}/.test(content)) {
            return {
                detected: true,
                reason: 'Phone number detected'
            };
        }

        // Regex for email addresses
        if (/\S+@\S+\.\S+/.test(content)) {
            return {
                detected: true,
                reason: 'Email address detected'
            };
        }

        // Regex for URLs
        if (/(https?:\/\/|www\.)\S+/i.test(content)) {
            return {
                detected: true,
                reason: 'External URL detected'
            };
        }

        return { detected: false };
    }

    /**
     * Send a chat message
     * Automatically detects and flags forbidden content
     */
    async sendMessage(
        dealId: string,
        senderId: string,
        content: string,
        messageType: 'TEXT' | 'FILE' | 'SYSTEM' = 'TEXT',
        metadata?: any
    ): Promise<any> {
        // Verify user is part of the deal
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        if (deal.brandId !== senderId && deal.creatorId !== senderId) {
            throw new Error('Unauthorized');
        }

        // Detect forbidden content
        const flagged = this.detectForbiddenContent(content);

        // Create message
        const message = await prisma.chatMessage.create({
            data: {
                dealId,
                senderId,
                messageType,
                content,
                metadata,
                flagged: flagged.detected,
                flagReason: flagged.reason
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        creatorProfile: {
                            select: { name: true, avatar: true }
                        },
                        brandProfile: {
                            select: { companyName: true, logo: true }
                        }
                    }
                }
            }
        });

        if (flagged.detected) {
            // Warn user
            await this.sendSystemMessage(
                dealId,
                '⚠️ Warning: Attempting to communicate outside the platform is prohibited and may result in account suspension.'
            );

            // Notify admins
            await this.notifyAdminsOfLeakageAttempt(dealId, senderId, content, flagged.reason!);

            // Audit log
            await prisma.auditLog.create({
                data: {
                    entityType: 'chat',
                    entityId: message.id,
                    action: 'platform_leakage_attempt',
                    actorId: senderId,
                    changes: {
                        reason: flagged.reason,
                        content: content.substring(0, 100) // First 100 chars
                    }
                }
            });
        }

        return message;
    }

    /**
     * Send system message (automated)
     */
    private async sendSystemMessage(dealId: string, content: string): Promise<void> {
        await prisma.chatMessage.create({
            data: {
                dealId,
                senderId: 'system', // Special system user
                messageType: 'SYSTEM',
                content
            }
        });
    }

    /**
     * Notify admins of platform leakage attempt
     */
    private async notifyAdminsOfLeakageAttempt(
        dealId: string,
        userId: string,
        content: string,
        reason: string
    ): Promise<void> {
        // Get all admin users
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });

        // TODO: Send email/notification to admins
        console.log(`[ADMIN ALERT] Platform leakage attempt:`, {
            dealId,
            userId,
            reason,
            content: content.substring(0, 100)
        });
    }

    /**
     * Get chat history for a deal
     */
    async getChatHistory(dealId: string, userId: string): Promise<any[]> {
        // Verify user is part of the deal
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        if (deal.brandId !== userId && deal.creatorId !== userId) {
            throw new Error('Unauthorized');
        }

        const messages = await prisma.chatMessage.findMany({
            where: { dealId },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        creatorProfile: {
                            select: { name: true, avatar: true }
                        },
                        brandProfile: {
                            select: { companyName: true, logo: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return messages;
    }

    /**
     * Lock conversation history (when script is approved)
     * Creates immutable snapshot for dispute resolution
     */
    async lockConversation(dealId: string, milestone: string): Promise<void> {
        const messages = await prisma.chatMessage.findMany({
            where: { dealId },
            orderBy: { createdAt: 'asc' }
        });

        // Audit log with snapshot
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: `conversation_locked_${milestone}`,
                changes: {
                    milestone,
                    messageCount: messages.length,
                    snapshot: messages.map(m => ({
                        id: m.id,
                        senderId: m.senderId,
                        content: m.content,
                        createdAt: m.createdAt
                    }))
                }
            }
        });
    }

    /**
     * Get flagged messages for admin review
     */
    async getFlaggedMessages(): Promise<any[]> {
        return await prisma.chatMessage.findMany({
            where: { flagged: true },
            include: {
                deal: {
                    include: {
                        brand: { select: { email: true, brandProfile: true } },
                        creator: { select: { email: true, creatorProfile: true } }
                    }
                },
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }
}

export const chatService = new ChatService();
