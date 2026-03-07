// @ts-nocheck
import prisma from '@/lib/prisma';

interface TaxCalculation {
    grossAmount: number;
    platformFee: number;
    gstOnPlatformFee: number;
    tds: number;
    netCreatorPayout: number;
    totalBrandPays: number;
}

interface Invoice {
    invoiceNumber: string;
    dealId: string;
    brandName: string;
    creatorName: string;
    dealTitle: string;
    grossAmount: number;
    platformFee: number;
    gstOnPlatformFee: number;
    tds: number;
    netCreatorPayout: number;
    generatedAt: Date;
}

export class TaxService {
    private readonly PLATFORM_FEE_RATE = 0.05; // 5%
    private readonly GST_RATE = 0.18; // 18% GST on platform services
    private readonly TDS_RATE = 0.10; // 10% TDS for professional services (Section 194J)

    /**
     * Calculate all taxes for a deal
     */
    calculateTaxes(grossAmount: number): TaxCalculation {
        // Platform fee (5% of gross amount)
        const platformFee = grossAmount * this.PLATFORM_FEE_RATE;

        // GST on platform fee (18%)
        const gstOnPlatformFee = platformFee * this.GST_RATE;

        // Creator's gross payout (95% of deal amount)
        const creatorGross = grossAmount - platformFee;

        // TDS deduction (10% of creator's gross)
        const tds = creatorGross * this.TDS_RATE;

        // Net payout to creator after TDS
        const netCreatorPayout = creatorGross - tds;

        // Total brand pays (deal amount)
        const totalBrandPays = grossAmount;

        return {
            grossAmount,
            platformFee,
            gstOnPlatformFee,
            tds,
            netCreatorPayout,
            totalBrandPays
        };
    }

    /**
     * Generate invoice for a completed deal
     */
    async generateInvoice(dealId: string): Promise<Invoice> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                brand: {
                    include: { brandProfile: true }
                },
                creator: {
                    include: { creatorProfile: true }
                }
            }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        const taxes = this.calculateTaxes(Number(deal.totalAmount));

        const invoice: Invoice = {
            invoiceNumber: `INV-${Date.now()}-${dealId.slice(0, 8)}`,
            dealId,
            brandName: deal.brand.brandProfile?.companyName || deal.brand.email,
            creatorName: deal.creator.creatorProfile?.name || deal.creator.email,
            dealTitle: deal.title,
            ...taxes,
            generatedAt: new Date()
        };

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'invoice',
                entityId: invoice.invoiceNumber,
                action: 'invoice_generated',
                changes: JSON.parse(JSON.stringify(invoice))
            }
        });

        return invoice;
    }

    /**
     * Calculate TDS for a given amount
     */
    calculateTDS(amount: number): number {
        return amount * this.TDS_RATE;
    }

    /**
     * Calculate GST for a given amount
     */
    calculateGST(amount: number): number {
        return amount * this.GST_RATE;
    }

    /**
     * Calculate platform fee for a deal
     */
    calculatePlatformFee(dealAmount: number): number {
        return dealAmount * this.PLATFORM_FEE_RATE;
    }

    /**
     * Generate TDS certificate data (Form 16A)
     */
    async generateTDSCertificate(userId: string, financialYear: string): Promise<any> {
        // Get all completed deals for the creator in the financial year
        const startDate = new Date(`${financialYear.split('-')[0]}-04-01`);
        const endDate = new Date(`${financialYear.split('-')[1]}-03-31`);

        const deals = await prisma.deal.findMany({
            where: {
                creatorId: userId,
                status: 'COMPLETED',
                payment100PaidAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const totalEarnings = deals.reduce((sum: number, deal: any) =>
            sum + Number(deal.creatorPayout), 0
        );

        const totalTDS = this.calculateTDS(totalEarnings);

        return {
            certificateNumber: `TDS-${financialYear}-${userId.slice(0, 8)}`,
            financialYear,
            userId,
            totalDeals: deals.length,
            totalEarnings,
            totalTDS,
            quarterWise: this.calculateQuarterWiseTDS(deals),
            generatedAt: new Date()
        };
    }

    /**
     * Calculate quarter-wise TDS breakdown
     */
    private calculateQuarterWiseTDS(deals: any[]): any {
        const quarters = {
            Q1: { earnings: 0, tds: 0 }, // Apr-Jun
            Q2: { earnings: 0, tds: 0 }, // Jul-Sep
            Q3: { earnings: 0, tds: 0 }, // Oct-Dec
            Q4: { earnings: 0, tds: 0 }  // Jan-Mar
        };

        for (const deal of deals) {
            const month = new Date(deal.payment100PaidAt).getMonth();
            const amount = Number(deal.creatorPayout);
            const tds = this.calculateTDS(amount);

            if (month >= 3 && month <= 5) { // Apr-Jun
                quarters.Q1.earnings += amount;
                quarters.Q1.tds += tds;
            } else if (month >= 6 && month <= 8) { // Jul-Sep
                quarters.Q2.earnings += amount;
                quarters.Q2.tds += tds;
            } else if (month >= 9 && month <= 11) { // Oct-Dec
                quarters.Q3.earnings += amount;
                quarters.Q3.tds += tds;
            } else { // Jan-Mar
                quarters.Q4.earnings += amount;
                quarters.Q4.tds += tds;
            }
        }

        return quarters;
    }

    /**
     * Get tax summary for admin dashboard
     */
    async getTaxSummary(startDate: Date, endDate: Date): Promise<any> {
        const completedDeals = await prisma.deal.findMany({
            where: {
                status: 'COMPLETED',
                payment100PaidAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const totalGross = completedDeals.reduce((sum: number, deal: any) =>
            sum + Number(deal.totalAmount), 0
        );

        const totalPlatformFee = completedDeals.reduce((sum: number, deal: any) =>
            sum + Number(deal.platformFee), 0
        );

        const totalGST = this.calculateGST(totalPlatformFee);
        const totalTDS = this.calculateTDS(totalGross - totalPlatformFee);

        return {
            period: { startDate, endDate },
            totalDeals: completedDeals.length,
            totalGross,
            totalPlatformFee,
            totalGST,
            totalTDS,
            netPlatformRevenue: totalPlatformFee + totalGST,
            totalCreatorPayouts: totalGross - totalPlatformFee - totalTDS
        };
    }
}

export const taxService = new TaxService();
