// @ts-nocheck
import prisma from '@/lib/prisma';

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
