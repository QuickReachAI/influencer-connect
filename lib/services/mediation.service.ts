// @ts-nocheck
import prisma from '@/lib/prisma';
import { escrowService } from './escrow.service';
import { kycService } from './kyc.service';
import { notificationService } from './notification.service';
import { walletService } from './wallet.service';

type MediationDecision = 'FAVOR_CREATOR' | 'FAVOR_BRAND' | 'PARTIAL';

export class MediationService {
    /**
     * Raise a dispute
     * Triggered when brand/creator cannot agree on deliverables
     */
    async raiseDispute(
        dealId: string,
        raisedBy: string,
        reason: string
    ): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                brand: true,
                creator: true
            }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Verify user is part of the deal
        if (deal.brandId !== raisedBy && deal.creatorId !== raisedBy) {
            throw new Error('Unauthorized');
        }

        // Update deal status
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: 'DISPUTED',
                disputeRaised: true,
                disputeRaisedById: raisedBy,
                disputeReason: reason
            }
        });

        // Assign to available mediator
        const mediator = await this.assignMediator();

        await prisma.deal.update({
            where: { id: dealId },
            data: {
                assignedMediatorId: mediator.id
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'dispute_raised',
                actorId: raisedBy,
                changes: {
                    reason,
                    mediatorId: mediator.id,
                    status: 'DISPUTED'
                }
            }
        });

        // Notify mediator of new dispute assignment
        await notificationService.send({
            userId: mediator.id,
            type: 'DISPUTE_RAISED',
            title: 'New Dispute Assigned',
            message: `A new dispute has been assigned to you for deal "${deal.title || dealId}". Reason: ${reason}`,
            data: { dealId, reason },
        });
    }

    /**
     * Assign a mediator to a dispute
     * In production, this would use a round-robin or workload-based system
     */
    private async assignMediator(): Promise<any> {
        // Get all admin users (mediators)
        const mediators = await prisma.user.findMany({
            where: { role: 'ADMIN', isBanned: false }
        });

        if (mediators.length === 0) {
            throw new Error('No mediators available');
        }

        // Simple round-robin: assign to mediator with fewest active disputes
        const mediatorWithCounts = await Promise.all(
            mediators.map(async (m: any) => ({
                ...m,
                activeDisputes: await prisma.deal.count({
                    where: {
                        assignedMediatorId: m.id,
                        status: 'DISPUTED'
                    }
                })
            }))
        );

        // Sort by active disputes (ascending)
        mediatorWithCounts.sort((a: any, b: any) => a.activeDisputes - b.activeDisputes);

        return mediatorWithCounts[0];
    }

    /**
     * Resolve dispute with human decision
     * This is the core "Human-in-the-Loop" mediation
     */
    async resolveDispute(
        dealId: string,
        mediatorId: string,
        decision: MediationDecision,
        notes: string
    ): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                brand: true,
                creator: { include: { creatorProfile: true } },
                chatMessages: { orderBy: { createdAt: 'asc' } },
                deliverables: true
            }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Verify mediator is assigned
        if (deal.assignedMediatorId !== mediatorId) {
            throw new Error('Unauthorized mediator');
        }

        // Execute decision
        switch (decision) {
            case 'FAVOR_CREATOR':
                await this.handleFavorCreator(deal, notes);
                break;

            case 'FAVOR_BRAND':
                await this.handleFavorBrand(deal, notes);
                break;

            case 'PARTIAL':
                // Partial resolution requires custom handling
                // In production, this would allow mediator to specify split percentage
                await this.handlePartialResolution(deal, notes);
                break;
        }

        // Update deal
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: 'COMPLETED',
                mediationDecision: `${decision}: ${notes}`
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'dispute_resolved',
                actorId: mediatorId,
                changes: {
                    decision,
                    notes,
                    chatHistory: deal.chatMessages.length,
                    deliverables: deal.deliverables.length
                }
            }
        });
    }

    /**
     * Handle decision favoring creator
     * - Release 100% of escrow to creator
     * - Ban brand if verified malicious
     */
    private async handleFavorCreator(deal: any, notes: string): Promise<void> {
        // Release all funds to creator
        await escrowService.releaseFundsToCreator(deal.id);

        // If brand refused payment maliciously, apply lifetime ban
        if (notes.toLowerCase().includes('malicious') ||
            notes.toLowerCase().includes('refused payment')) {
            await kycService.banUser(
                deal.brandId,
                `Refused payment for valid work. Mediation decision: ${notes}`
            );
        }

        // Notify creator: funds released
        await notificationService.send({
            userId: deal.creatorId,
            type: 'DISPUTE_RESOLVED',
            title: 'Dispute Resolved in Your Favor',
            message: `The dispute for "${deal.title}" has been resolved in your favor. Funds have been released to your wallet.`,
            data: { dealId: deal.id, decision: 'FAVOR_CREATOR', notes },
        });

        // Notify brand: dispute resolved against them
        await notificationService.send({
            userId: deal.brandId,
            type: 'DISPUTE_RESOLVED',
            title: 'Dispute Resolved',
            message: `The dispute for "${deal.title}" has been resolved in favor of the creator. Notes: ${notes}`,
            data: { dealId: deal.id, decision: 'FAVOR_CREATOR', notes },
        });
    }

    /**
     * Handle decision favoring brand
     * - Refund 100% to brand
     * - Penalize creator reliability score
     */
    private async handleFavorBrand(deal: any, notes: string): Promise<void> {
        // Refund to brand
        await escrowService.refundToBrand(deal.id);

        // Penalize creator reliability score
        const currentScore = Number(deal.creator.creatorProfile.reliabilityScore);
        const newScore = Math.max(0, currentScore - 1.0);

        await prisma.creatorProfile.update({
            where: { userId: deal.creatorId },
            data: {
                reliabilityScore: newScore
            }
        });

        // If score drops below 2.0, warn creator
        if (newScore < 2.0) {
            await notificationService.send({
                userId: deal.creatorId,
                type: 'PII_WARNING',
                title: 'Low Reliability Score Warning',
                message: `Your reliability score has dropped to ${newScore.toFixed(1)}. Continued disputes may result in account suspension.`,
                data: { reliabilityScore: newScore, dealId: deal.id },
            });
        }

        // Notify both parties of resolution
        await notificationService.send({
            userId: deal.creatorId,
            type: 'DISPUTE_RESOLVED',
            title: 'Dispute Resolved Against You',
            message: `The dispute for "${deal.title}" has been resolved in favor of the brand. A refund has been issued. Notes: ${notes}`,
            data: { dealId: deal.id, decision: 'FAVOR_BRAND', notes },
        });

        await notificationService.send({
            userId: deal.brandId,
            type: 'DISPUTE_RESOLVED',
            title: 'Dispute Resolved in Your Favor',
            message: `The dispute for "${deal.title}" has been resolved in your favor. A refund is being processed.`,
            data: { dealId: deal.id, decision: 'FAVOR_BRAND', notes },
        });
    }

    /**
     * Handle partial resolution
     * Mediator can specify custom split
     */
    private async handlePartialResolution(deal: any, notes: string): Promise<void> {
        const totalAmount = Number(deal.totalAmount);

        // Parse split from notes (e.g. "60/40 split" means 60% to creator, 40% to brand)
        let creatorPercent = 50;
        const splitMatch = notes.match(/(\d+)\s*\/\s*(\d+)/);
        if (splitMatch) {
            creatorPercent = parseInt(splitMatch[1], 10);
            const sum = creatorPercent + parseInt(splitMatch[2], 10);
            if (sum !== 100) {
                creatorPercent = 50; // Invalid split, default to 50/50
            }
        }
        const brandPercent = 100 - creatorPercent;

        const creatorShare = totalAmount * (creatorPercent / 100);
        const brandShare = totalAmount * (brandPercent / 100);
        const platformFee = creatorShare * 0.10; // 10% platform fee on creator's share
        const creatorPayout = creatorShare - platformFee;

        // Credit creator's wallet (net of platform fee)
        await walletService.credit(
            deal.creatorId,
            creatorPayout,
            deal.id,
            `Partial resolution: ${creatorPercent}% of ₹${totalAmount} (Fee: ₹${platformFee.toFixed(2)})`
        );

        // Record brand refund as escrow transaction
        await prisma.escrowTransaction.create({
            data: {
                dealId: deal.id,
                transactionType: 'REFUND_TO_BRAND',
                amount: brandShare,
                status: 'COMPLETED',
            },
        });

        // Record platform fee
        await prisma.escrowTransaction.create({
            data: {
                dealId: deal.id,
                transactionType: 'PLATFORM_FEE',
                amount: platformFee,
                status: 'COMPLETED',
            },
        });

        // Notify both parties
        await notificationService.send({
            userId: deal.creatorId,
            type: 'DISPUTE_RESOLVED',
            title: 'Dispute Partially Resolved',
            message: `The dispute for "${deal.title}" has been partially resolved. You received ${creatorPercent}% (₹${creatorPayout.toFixed(2)} after fees).`,
            data: { dealId: deal.id, decision: 'PARTIAL', creatorPercent, creatorPayout, notes },
        });

        await notificationService.send({
            userId: deal.brandId,
            type: 'DISPUTE_RESOLVED',
            title: 'Dispute Partially Resolved',
            message: `The dispute for "${deal.title}" has been partially resolved. You will receive a ${brandPercent}% refund (₹${brandShare.toFixed(2)}).`,
            data: { dealId: deal.id, decision: 'PARTIAL', brandPercent, brandShare, notes },
        });
    }

    /**
     * Get all active disputes for admin dashboard
     */
    async getActiveDisputes(mediatorId?: string): Promise<any[]> {
        const where: any = {
            status: 'DISPUTED'
        };

        if (mediatorId) {
            where.assignedMediatorId = mediatorId;
        }

        return await prisma.deal.findMany({
            where,
            include: {
                brand: {
                    select: {
                        id: true,
                        email: true,
                        brandProfile: { select: { companyName: true } }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        email: true,
                        creatorProfile: { select: { name: true, reliabilityScore: true } }
                    }
                },
                chatMessages: {
                    orderBy: { createdAt: 'asc' }
                },
                deliverables: true,
                assignedMediator: {
                    select: { id: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    /**
     * Get dispute resolution statistics
     */
    async getDisputeStats(): Promise<any> {
        const total = await prisma.deal.count({
            where: { disputeRaised: true }
        });

        const resolved = await prisma.deal.count({
            where: {
                disputeRaised: true,
                status: 'COMPLETED'
            }
        });

        const active = await prisma.deal.count({
            where: { status: 'DISPUTED' }
        });

        // Get resolution breakdown
        const resolutions = await prisma.deal.findMany({
            where: {
                disputeRaised: true,
                status: 'COMPLETED',
                mediationDecision: { not: null }
            },
            select: { mediationDecision: true }
        });

        const favorCreator = resolutions.filter((r: any) =>
            r.mediationDecision?.startsWith('FAVOR_CREATOR')
        ).length;

        const favorBrand = resolutions.filter((r: any) =>
            r.mediationDecision?.startsWith('FAVOR_BRAND')
        ).length;

        const partial = resolutions.filter((r: any) =>
            r.mediationDecision?.startsWith('PARTIAL')
        ).length;

        return {
            total,
            resolved,
            active,
            resolutionBreakdown: {
                favorCreator,
                favorBrand,
                partial
            },
            resolutionRate: total > 0 ? (resolved / total * 100).toFixed(2) + '%' : '0%'
        };
    }
}

export const mediationService = new MediationService();
