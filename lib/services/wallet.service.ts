// @ts-nocheck
import prisma from '@/lib/prisma';
import Razorpay from 'razorpay';

let _razorpayX: Razorpay | null = null;

function getRazorpayX(): Razorpay {
    if (!_razorpayX) {
        _razorpayX = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
    }
    return _razorpayX;
}

export class WalletService {
  /**
   * Get or create wallet for a user.
   * Every user gets a wallet on first access.
   */
  async getOrCreateWallet(userId: string) {
    return prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Credit wallet (called by escrow release in Phase 5).
   * Net amount = gross - platformFee (10%) - TDS (1%/2%).
   * Fee breakdown stays in EscrowTransaction; Wallet records net credit.
   */
  async credit(
    userId: string,
    amount: number,
    dealId: string,
    description?: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    return prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount,
          dealId,
          description: description ?? `Payout for deal ${dealId}`,
          status: 'COMPLETED',
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
          lastTransactionAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Debit wallet (for refunds, chargebacks).
   */
  async debit(
    userId: string,
    amount: number,
    dealId: string,
    description?: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < amount) {
      throw new Error('Insufficient wallet balance');
    }

    return prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          dealId,
          description: description ?? `Debit for deal ${dealId}`,
          status: 'COMPLETED',
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          lastTransactionAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Request withdrawal to bank account.
   * Actual payout processed via Razorpay Payout API (Phase 5).
   */
  async withdraw(
    userId: string,
    amount: number,
    description?: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < amount) {
      throw new Error('Insufficient wallet balance');
    }

    return prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount,
          description: description ?? 'Withdrawal to bank account',
          status: 'PENDING', // Becomes COMPLETED after Razorpay confirms
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          lastTransactionAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Process a withdrawal request via Razorpay Payout API.
   * Flow:
   * 1. User requests withdrawal -> WalletTransaction created with PENDING status
   * 2. This method processes via Razorpay Payout API
   * 3. On success -> update transaction to COMPLETED, update totalWithdrawn
   * 4. On failure -> refund balance, update transaction to FAILED
   */
  async processWithdrawal(
    transactionId: string,
    bankDetails: {
      accountNumber: string;
      ifsc: string;
      beneficiaryName: string;
    }
  ): Promise<void> {
    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: { include: { user: true } } },
    });

    if (!transaction || transaction.status !== 'PENDING') {
      throw new Error('Transaction not found or not pending');
    }

    try {
      // Create Razorpay Payout via RazorpayX API
      const razorpay = getRazorpayX();
      const payout = await (razorpay as any).payouts.create({
        account_number: process.env.RAZORPAY_PAYOUT_ACCOUNT_NUMBER!,
        fund_account: {
          account_type: 'bank_account',
          bank_account: {
            name: bankDetails.beneficiaryName,
            ifsc: bankDetails.ifsc,
            account_number: bankDetails.accountNumber,
          },
        },
        amount: Math.round(Number(transaction.amount) * 100),
        currency: 'INR',
        mode: 'NEFT',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: transactionId,
      });

      // Update transaction with Razorpay payout ID
      await prisma.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          bankTransactionId: payout.id,
        },
      });

      // Update wallet totalWithdrawn
      await prisma.wallet.update({
        where: { id: transaction.walletId },
        data: {
          totalWithdrawn: { increment: Number(transaction.amount) },
        },
      });
    } catch (error) {
      // Refund on failure
      await prisma.$transaction([
        prisma.walletTransaction.update({
          where: { id: transactionId },
          data: { status: 'FAILED' },
        }),
        prisma.wallet.update({
          where: { id: transaction.walletId },
          data: {
            balance: { increment: Number(transaction.amount) },
          },
        }),
      ]);

      throw error;
    }
  }

  /** Get paginated transaction history */
  async getTransactions(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return { transactions, total };
  }
}

export const walletService = new WalletService();
