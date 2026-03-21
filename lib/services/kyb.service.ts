import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';
import { notificationService } from './notification.service';

interface GSTINVerificationResult {
  valid: boolean;
  businessName?: string;
  registeredAddress?: string;
  filingStatus?: string;
  error?: string;
}

export class KYBService {
  /**
   * Verify a brand's GSTIN via Gridlines/HyperVerge API.
   * On success: sets gstinVerified=true, stores business details.
   * Awards "Verified Brand" badge.
   */
  async verifyGSTIN(
    brandProfileId: string,
    gstin: string
  ): Promise<GSTINVerificationResult> {
    // If external GSTIN API is not configured, save GSTIN as pending verification
    if (!process.env.GSTIN_API_URL || !process.env.GSTIN_API_KEY) {
      await prisma.brandProfile.update({
        where: { id: brandProfileId },
        data: {
          gstin,
          gstinVerified: false,
          gstStatusLastChecked: new Date(),
        },
      });

      return { valid: true, filingStatus: 'PENDING' };
    }

    // Call GSTIN verification API with outage handling
    let response: Response;
    let data: any;

    try {
      response = await fetch(process.env.GSTIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GSTIN_API_KEY}`,
        },
        body: JSON.stringify({ gstin }),
      });
      data = await response.json();
    } catch (networkError) {
      // API outage: save GSTIN as pending, schedule retry
      console.error(`GSTIN API outage for brand ${brandProfileId}:`, networkError);

      await prisma.brandProfile.update({
        where: { id: brandProfileId },
        data: { gstin, gstinVerified: false },
      });

      await inngest.send({
        name: 'kyb/retry-verification',
        data: { brandProfileId, gstin, attempt: 1 },
      });

      return { valid: true, filingStatus: 'PENDING' };
    }

    // Log the verification attempt
    await prisma.gSTStatusLog.create({
      data: {
        brandProfileId,
        previousStatus: null,
        newStatus: data.filingStatus ?? 'UNKNOWN',
        rawResponse: data,
      },
    });

    if (!response.ok || data.error) {
      return { valid: false, error: data.error ?? 'Verification failed' };
    }

    // Update BrandProfile with verified GST details
    await prisma.brandProfile.update({
      where: { id: brandProfileId },
      data: {
        gstin,
        gstinVerified: true,
        gstinVerifiedAt: new Date(),
        registeredAddress: data.registeredAddress,
        filingStatus: data.filingStatus,
        gstStatusLastChecked: new Date(),
      },
    });

    // Get brand's userId for notification
    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
      select: { userId: true },
    });

    if (brand) {
      await notificationService.send({
        userId: brand.userId,
        type: 'KYC_VERIFIED',
        title: 'Brand Verified',
        message: 'Your GSTIN has been verified. You now have the "Verified Brand" badge.',
        data: { gstin, businessName: data.businessName },
      });
    }

    return {
      valid: true,
      businessName: data.businessName,
      registeredAddress: data.registeredAddress,
      filingStatus: data.filingStatus,
    };
  }

  /**
   * Monthly re-verification of all verified GSTINs.
   * If filing status changes to Suspended/Cancelled:
   * - Pause active campaigns
   * - Notify brand
   */
  async recheckAll(): Promise<{ checked: number; flagged: number }> {
    const verifiedBrands = await prisma.brandProfile.findMany({
      where: { gstinVerified: true, gstin: { not: null } },
    });

    let flagged = 0;

    for (const brand of verifiedBrands) {
      try {
        const response = await fetch(process.env.GSTIN_API_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GSTIN_API_KEY!}`,
          },
          body: JSON.stringify({ gstin: brand.gstin }),
        });

        const data = await response.json();

        // Log status change
        await prisma.gSTStatusLog.create({
          data: {
            brandProfileId: brand.id,
            previousStatus: brand.filingStatus,
            newStatus: data.filingStatus ?? 'UNKNOWN',
            rawResponse: data,
          },
        });

        // Check for status degradation
        const dangerousStatuses = ['Suspended', 'Cancelled', 'Inactive'];
        if (dangerousStatuses.includes(data.filingStatus)) {
          flagged++;

          // Update brand profile
          await prisma.brandProfile.update({
            where: { id: brand.id },
            data: {
              gstinVerified: false,
              filingStatus: data.filingStatus,
              gstStatusLastChecked: new Date(),
            },
          });

          // Pause all active campaigns
          await prisma.campaign.updateMany({
            where: { brandId: brand.id, status: 'ACTIVE' },
            data: { status: 'PAUSED' },
          });

          // Notify brand
          await notificationService.send({
            userId: brand.userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Identity Risk Alert',
            message: `Your GSTIN status has changed to ${data.filingStatus}. Active campaigns have been paused. Please contact support.`,
            data: { gstin: brand.gstin, newStatus: data.filingStatus },
          });
        } else {
          // Update last checked timestamp
          await prisma.brandProfile.update({
            where: { id: brand.id },
            data: {
              filingStatus: data.filingStatus,
              gstStatusLastChecked: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(`GSTIN recheck failed for brand ${brand.id}:`, error);
      }
    }

    return { checked: verifiedBrands.length, flagged };
  }
}

export const kybService = new KYBService();
