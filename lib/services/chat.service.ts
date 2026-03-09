// @ts-nocheck
import prisma from '@/lib/prisma';
import { piiService, type PIIScanResult } from './pii.service';
import { triggerDealEvent } from '@/lib/pusher';
import { notificationService } from './notification.service';

export class ChatService {
    /**
     * Send a chat message
     * Integrates PII detection, Pusher real-time delivery, and progressive enforcement
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
            where: { id: dealId },
        });
        if (!deal) throw new Error('Deal not found');
        if (deal.brandId !== senderId && deal.creatorId !== senderId) {
            throw new Error('Unauthorized');
        }

        // --- PII scan (replaces old detectForbiddenContent) ---
        const piiResult: PIIScanResult = await piiService.scan(content, senderId);

        // Determine what content to store/deliver
        let storedContent = content;
        let flagged = false;
        let flagReason: string | null = null;

        if (piiResult.hasPII || piiResult.hasPlatformLeakage) {
            flagged = true;
            flagReason = piiResult.violations
                .map((v) => v.description)
                .concat(piiResult.leakageKeywords.map((k) => `Platform keyword: ${k}`))
                .join('; ');

            // If action is REDACTED or higher, store redacted version
            if (piiResult.action === 'REDACTED' || piiResult.action === 'SHADOW_BLOCKED') {
                storedContent = piiResult.redactedContent;
            }
        }

        // Shadow block: save message but don't deliver to recipient
        const shadowBlocked = piiResult.action === 'SHADOW_BLOCKED';

        // Create message
        const message = await prisma.chatMessage.create({
            data: {
                dealId,
                senderId,
                messageType,
                content: storedContent,
                metadata,
                flagged,
                flagReason,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        creatorProfile: { select: { name: true, avatar: true } },
                        brandProfile: { select: { companyName: true, logo: true } },
                    },
                },
            },
        });

        // Record PII violations
        if (piiResult.hasPII) {
            for (const violation of piiResult.violations) {
                await piiService.recordViolation(senderId, message.id, {
                    type: violation.type,
                    severity: violation.severity,
                    originalContent: content,
                    redactedContent: piiResult.redactedContent,
                }, piiResult.action);
            }
        }

        // --- Pusher: Real-time delivery ---
        if (!shadowBlocked) {
            await triggerDealEvent(dealId, 'new-message', {
                id: message.id,
                dealId,
                senderId,
                content: storedContent,
                messageType,
                metadata,
                flagged,
                createdAt: message.createdAt,
                sender: message.sender,
            });
        }

        // Send warning if PII detected
        if (flagged && piiResult.action === 'WARNED') {
            await this.sendSystemMessage(
                dealId,
                'Warning: Sharing personal information or attempting to communicate outside the platform is prohibited.'
            );
            await triggerDealEvent(dealId, 'message-flagged', {
                userId: senderId,
                action: piiResult.action,
                violationCount: piiResult.violationCount + 1,
            });
        }

        // Notify admins for HIGH/CRITICAL severity
        if (piiResult.violations.some((v) => v.severity === 'HIGH' || v.severity === 'CRITICAL')) {
            await this.notifyAdminsOfLeakageAttempt(dealId, senderId, content, flagReason!);
        }

        // Audit log for flagged messages
        if (flagged) {
            await prisma.auditLog.create({
                data: {
                    entityType: 'chat',
                    entityId: message.id,
                    action: 'pii_violation',
                    actorId: senderId,
                    changes: {
                        action: piiResult.action,
                        violationCount: piiResult.violationCount + 1,
                        types: piiResult.violations.map((v) => v.type),
                    },
                },
            });
        }

        return message;
    }

    /**
     * Send system message (automated)
     */
    private async sendSystemMessage(dealId: string, content: string): Promise<void> {
        const message = await prisma.chatMessage.create({
            data: {
                dealId,
                senderId: 'system',
                messageType: 'SYSTEM',
                content,
            },
        });

        // Also broadcast system messages via Pusher
        await triggerDealEvent(dealId, 'new-message', {
            id: message.id,
            dealId,
            senderId: 'system',
            content,
            messageType: 'SYSTEM',
            createdAt: message.createdAt,
            sender: null,
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
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
        });

        // Notify all admins of PII leakage attempt
        await Promise.all(
            admins.map((admin) =>
                notificationService.send({
                    userId: admin.id,
                    type: 'PII_WARNING',
                    title: 'PII Leakage Attempt Detected',
                    message: `User attempted to share restricted information in deal ${dealId}. Reason: ${reason}`,
                    data: { dealId, userId, reason, contentPreview: content.substring(0, 100) },
                })
            )
        );
    }

    /**
     * Get chat history for a deal
     */
    async getChatHistory(dealId: string, userId: string): Promise<any[]> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
        });

        if (!deal) throw new Error('Deal not found');
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
                        creatorProfile: { select: { name: true, avatar: true } },
                        brandProfile: { select: { companyName: true, logo: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
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
            orderBy: { createdAt: 'asc' },
        });

        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: `conversation_locked_${milestone}`,
                changes: {
                    milestone,
                    messageCount: messages.length,
                    snapshot: messages.map((m: any) => ({
                        id: m.id,
                        senderId: m.senderId,
                        content: m.content,
                        createdAt: m.createdAt,
                    })),
                },
            },
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
                        creator: { select: { email: true, creatorProfile: true } },
                    },
                },
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
}

export const chatService = new ChatService();
