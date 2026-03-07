import prisma from '@/lib/prisma';
import Razorpay from 'razorpay';
import { inngest } from '@/lib/inngest/client';

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

        // TODO: Send notification to creator
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

        // TODO: Send notification to brand
        // "Creator has delivered files. Please review and complete payment."
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
     * Release funds to creator after T+2 window
     * Deducts 10% TDS and 5% platform fee
     */
    async releaseFundsToCreator(dealId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: { creator: { include: { creatorProfile: true } } }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Calculate TDS (10% for professional services in India)
        const creatorPayout = Number(deal.creatorPayout);
        const tdsAmount = creatorPayout * 0.10;
        const netPayout = creatorPayout - tdsAmount;

        // TODO: Transfer to creator via Razorpay Route/Transfer API
        // const transfer = await razorpay.transfers.create({
        //   account: creator.razorpayAccountId,
        //   amount: Math.round(netPayout * 100),
        //   currency: 'INR',
        //   notes: { dealId, tds: tdsAmount }
        // });

        // Record transaction
        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'RELEASE_TO_CREATOR',
                amount: netPayout,
                status: 'COMPLETED'
            }
        });

        // Update deal status
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                status: 'COMPLETED'
            }
        });

        // Update creator stats
        await prisma.creatorProfile.update({
            where: { userId: deal.creatorId },
            data: {
                totalDealsCompleted: { increment: 1 },
                totalEarnings: { increment: netPayout }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deal',
                entityId: dealId,
                action: 'funds_released_to_creator',
                changes: {
                    amount: netPayout,
                    tds: tdsAmount,
                    status: 'COMPLETED'
                }
            }
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

        // TODO: Process refund via Razorpay
        // const refund = await razorpay.payments.refund(paymentId, {
        //   amount: Math.round(totalPaid * 100)
        // });

        // Record transaction
        await prisma.escrowTransaction.create({
            data: {
                dealId,
                transactionType: 'REFUND_TO_BRAND',
                amount: totalPaid,
                status: 'COMPLETED'
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
