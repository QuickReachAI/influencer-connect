import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { escrowService } from "@/lib/services/escrow.service";
import { taxService } from "@/lib/services/tax.service";

// Initiate payment (50% or 100%)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = request.cookies.get('user_id')?.value;
        const { id: dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Only brand can make payments
        if (deal.brandId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { phase } = body; // '50' or '100'

        let order;

        if (phase === '50') {
            // First 50% payment
            if (deal.status !== 'SCRIPT_APPROVED') {
                return NextResponse.json(
                    { error: 'Script must be approved before payment' },
                    { status: 400 }
                );
            }

            order = await escrowService.initiateFirstPayment(dealId, userId);
        } else if (phase === '100') {
            // Final 50% payment
            if (!deal.filesUploaded) {
                return NextResponse.json(
                    { error: 'Creator must upload files before final payment' },
                    { status: 400 }
                );
            }

            if (!deal.payment50Paid) {
                return NextResponse.json(
                    { error: 'First payment must be completed' },
                    { status: 400 }
                );
            }

            order = await escrowService.initiateFinalPayment(dealId, userId);
        } else {
            return NextResponse.json(
                { error: 'Invalid payment phase' },
                { status: 400 }
            );
        }

        // Calculate tax breakdown for display
        const taxes = taxService.calculateTaxes(Number(deal.totalAmount));

        return NextResponse.json({
            success: true,
            order,
            taxes,
            message: `Payment order created for ${phase}%`
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle payment confirmation/webhook
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: dealId } = await params;
        const body = await request.json();
        const { razorpayPaymentId, razorpayOrderId, phase } = body;

        if (!razorpayPaymentId || !razorpayOrderId) {
            return NextResponse.json(
                { error: 'Payment details required' },
                { status: 400 }
            );
        }

        // TODO: Verify payment signature with Razorpay in production
        // const isValid = verifyRazorpaySignature(body);

        if (phase === '50') {
            await escrowService.handleFirstPaymentSuccess(
                dealId,
                razorpayPaymentId,
                razorpayOrderId
            );
        } else if (phase === '100') {
            await escrowService.handleFinalPaymentSuccess(
                dealId,
                razorpayPaymentId,
                razorpayOrderId
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Payment confirmed'
        });

    } catch (error) {
        console.error('Payment confirmation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get payment/tax details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = request.cookies.get('user_id')?.value;
        const { id: dealId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                escrowTransactions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        // Verify user has access
        if (deal.brandId !== userId && deal.creatorId !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }

        const taxes = taxService.calculateTaxes(Number(deal.totalAmount));

        return NextResponse.json({
            deal: {
                id: deal.id,
                totalAmount: deal.totalAmount,
                platformFee: deal.platformFee,
                creatorPayout: deal.creatorPayout,
                payment50Paid: deal.payment50Paid,
                payment50PaidAt: deal.payment50PaidAt,
                payment100Paid: deal.payment100Paid,
                payment100PaidAt: deal.payment100PaidAt
            },
            taxes,
            transactions: deal.escrowTransactions
        });

    } catch (error) {
        console.error('Get payment details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
