// @ts-nocheck
import prisma from '@/lib/prisma';
import Razorpay from 'razorpay';
import { inngest } from '@/lib/inngest/client';
import { walletService } from './wallet.service';
import { notificationService } from './notification.service';

let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
    if (!_razorpay) {
        _razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
    }
    return _razorpay;
}

interface PaymentOrder {
    id: string;
    amount: string | number;
    currency: string;
    receipt?: string;
}

export class EscrowService {
    /**
     * Phase 1: Initiate 50% payment
     * Brand pays 50% to start production
     */
    async initiateFirstPayment(dealId: string, brandId: string): Promise<PaymentOrder> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { brand: true, creator: true }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        if (deal.brandId !== brandId) {
            throw new Error('Unauthorized');
        }

        if (deal.status !== 'SCRIPT_APPROVED') {
            throw new Error('Script must be approved before payment');
        }

        // Calculate 50% amount
        const amount50 = Number(deal.totalAmount) * 0.5;

        // Create Razorpay order
        const order = await getRazorpay().orders.create({
            amount: Math.round(amount50 * 100), // Convert to paise
            currency: 'INR',
            receipt: `deal_${dealId}_50`,
            notes: {
                dealId,
                phase: '50%',
                brandId,
                creatorId: deal.creatorId
            }
        });

        // Record in escrow transactions
        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'DEPOSIT_50',
                amount: amount50,
                razorpayOrderId: order.id,
                status: 'PENDING'
            }
        });

        // Update deal status
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: 'PAYMENT_50_PENDING'
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'payment_50_initiated',
                actorId: brandId,
                changes: {
                    amount: amount50,
                    orderId: order.id
                }
            }
        });

        return order;
    }

    /**
     * Handle successful 50% payment webhook from Razorpay
     */
    async handleFirstPaymentSuccess(
        dealId: string,
        razorpayPaymentId: string,
        razorpayOrderId: string
    ): Promise<void> {
        // Update escrow transaction
        await prisma.escrowTransaction.updateMany({
            where: {
                dealId,
                transactionType: 'DEPOSIT_50',
                razorpayOrderId
            },
            data: {
                status: 'COMPLETED',
                razorpayPaymentId
            }
        });

        // Update deal
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                payment50Paid: true,
                payment50PaidAt: new Date(),
                payment50TransactionId: razorpayPaymentId,
                status: 'PRODUCTION'
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'payment_50_completed',
                changes: {
                    paymentId: razorpayPaymentId,
                    status: 'PRODUCTION'
                }
            }
        });

        // Notify creator of payment
        const deal50 = await prisma.deal.findUnique({ where: { id: dealId } });
        if (deal50) {
            const amount50 = Number(deal50.totalAmount) * 0.5;
            await notificationService.send({
                userId: deal50.creatorId,
                type: 'PAYMENT_RECEIVED',
                title: 'First Payment Received',
                message: `Brand has paid 50% (₹${amount50.toLocaleString('en-IN')}) for "${deal50.title}". Production can now begin.`,
                data: { dealId, amount: amount50, phase: '50%' },
            });
        }
    }

    /**
     * Triggered when creator uploads files
     * Automatically notifies brand to pay remaining 50%
     */
    async handleFileUploadTrigger(dealId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { brand: true, creator: true }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Update deal status
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: 'PAYMENT_100_PENDING',
                filesUploaded: true,
                filesUploadedAt: new Date()
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'files_uploaded',
                actorId: deal.creatorId,
                changes: {
                    status: 'PAYMENT_100_PENDING'
                }
            }
        });

        // Notify brand to complete payment
        await notificationService.send({
            userId: deal.brandId,
            type: 'PAYMENT_REQUIRED',
            title: 'Files Delivered — Payment Required',
            message: `Creator has delivered files for "${deal.title}". Please review and complete the remaining payment.`,
            data: { dealId },
        });
    }

    /**
     * Phase 2: Initiate final 50% payment
     */
    async initiateFinalPayment(dealId: string, brandId: string): Promise<PaymentOrder> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        if (deal.brandId !== brandId) {
            throw new Error('Unauthorized');
        }

        if (!deal.filesUploaded) {
            throw new Error('Creator must upload files first');
        }

        // Calculate remaining 50%
        const amount50 = Number(deal.totalAmount) * 0.5;

        // Create Razorpay order
        const order = await getRazorpay().orders.create({
            amount: Math.round(amount50 * 100), // Paise
            currency: 'INR',
            receipt: `deal_${dealId}_100`,
            notes: {
                dealId,
                phase: '100%',
                brandId,
                creatorId: deal.creatorId
            }
        });

        // Record in escrow
        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'DEPOSIT_100',
                amount: amount50,
                razorpayOrderId: order.id,
                status: 'PENDING'
            }
        });

        return order;
    }

    /**
     * Handle successful final payment and release funds to creator
     * Applies T+2 inspection window and TDS deduction
     */
    async handleFinalPaymentSuccess(
        dealId: string,
        razorpayPaymentId: string,
        razorpayOrderId: string
    ): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { creator: { include: { creatorProfile: true } } }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Update escrow transaction
        await prisma.escrowTransaction.updateMany({
            where: {
                dealId,
                transactionType: 'DEPOSIT_100',
                razorpayOrderId
            },
            data: {
                status: 'COMPLETED',
                razorpayPaymentId
            }
        });

        // Update deal
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                payment100Paid: true,
                payment100PaidAt: new Date(),
                payment100TransactionId: razorpayPaymentId,
                downloadLinkGenerated: true,
                downloadLinkExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }
        });

        // Schedule T+2 payout via Inngest (durable, restart-safe)
        await inngest.send({
            name: 'deal/payment-completed',
            data: { dealId },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'payment_100_completed',
                changes: {
                    paymentId: razorpayPaymentId,
                    payoutScheduled: 'T+2'
                }
            }
        });
    }

    /**
     * Release funds to creator after T+2 window.
     * Credits creator's WALLET (not direct bank transfer).
     * Net amount = gross - platformFee (10%) - TDS (1%/2%).
     */
    async releaseFundsToCreator(dealId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { creator: { include: { creatorProfile: true } } }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        const totalAmount = Number(deal.totalAmount);
        const platformFee = totalAmount * 0.10;  // 10% platform fee
        const tdsRate = totalAmount > 5000000 ? 0.02 : 0.01; // 2% if > 50L, else 1%
        const tdsAmount = totalAmount * tdsRate;
        const netPayout = totalAmount - platformFee - tdsAmount;

        // Record escrow transactions (gross -> net breakdown)
        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'RELEASE_TO_CREATOR',
                amount: netPayout,
                status: 'COMPLETED',
            },
        });

        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'PLATFORM_FEE',
                amount: platformFee,
                status: 'COMPLETED',
            },
        });

        // Credit creator's WALLET
        await walletService.credit(
            deal.creatorId,
            netPayout,
            dealId,
            `Payout: ${deal.title} (Gross: ₹${totalAmount}, Fee: ₹${platformFee}, TDS: ₹${tdsAmount})`
        );

        // Update deal status
        await prisma.deal.update({
            where: { id: dealId },
            data: { status: 'COMPLETED' },
        });

        // Update creator stats
        await prisma.creatorProfile.update({
            where: { userId: deal.creatorId },
            data: {
                totalDealsCompleted: { increment: 1 },
                totalEarnings: { increment: netPayout },
            },
        });

        // Send notification to creator
        await notificationService.send({
            userId: deal.creatorId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            message: `₹${netPayout.toLocaleString('en-IN')} has been credited to your wallet for "${deal.title}"`,
            data: {
                dealId,
                grossAmount: totalAmount,
                platformFee,
                tdsAmount,
                netPayout,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'funds_released_to_wallet',
                changes: {
                    grossAmount: totalAmount,
                    platformFee,
                    tdsAmount,
                    netPayout,
                    status: 'COMPLETED',
                },
            },
        });
    }

    /**
     * Refund to brand (in case of dispute resolution favoring brand)
     */
    async refundToBrand(dealId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        const totalPaid = (deal.payment50Paid ? Number(deal.totalAmount) * 0.5 : 0) +
            (deal.payment100Paid ? Number(deal.totalAmount) * 0.5 : 0);

        // Process refund via Razorpay for each completed payment
        const completedPayments = await prisma.escrowTransaction.findMany({
            where: {
                dealId,
                status: 'COMPLETED',
                transactionType: { in: ['DEPOSIT_50', 'DEPOSIT_100'] },
                razorpayPaymentId: { not: null },
            },
        });

        const razorpayRefundIds: string[] = [];
        for (const payment of completedPayments) {
            try {
                const refund = await getRazorpay().payments.refund(payment.razorpayPaymentId!, {
                    amount: Math.round(Number(payment.amount) * 100),
                });
                razorpayRefundIds.push(refund.id);
            } catch (error) {
                await prisma.auditLog.create({
                    data: {
                        entityType: 'deal',
                        entityId: dealId,
                        action: 'razorpay_refund_failed',
                        changes: {
                            paymentId: payment.razorpayPaymentId,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        },
                    },
                });
                throw error;
            }
        }

        // Record refund transaction
        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'REFUND_TO_BRAND',
                amount: totalPaid,
                status: 'COMPLETED',
                razorpayPaymentId: razorpayRefundIds.join(','),
            }
        });

        // Update deal
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: 'CANCELLED'
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'refund_to_brand',
                changes: {
                    amount: totalPaid,
                    status: 'CANCELLED'
                }
            }
        });
    }
}

export const escrowService = new EscrowService();
