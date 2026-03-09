import prisma from '@/lib/prisma';
import { inngest } from '@/lib/inngest/client';

export class RevisionService {
  /**
   * Create a revision request (brand requests changes).
   * Enforced by maxRevisions on the Deal model.
   */
  async requestRevision(
    dealId: string,
    brandId: string,
    feedback: string
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    if (deal.currentRevision >= deal.maxRevisions) {
      throw new Error(
        `Maximum revisions (${deal.maxRevisions}) reached. Purchase a revision extension to continue.`
      );
    }

    const nextRevisionNumber = deal.currentRevision + 1;

    const [revision] = await prisma.$transaction([
      prisma.dealRevision.create({
        data: {
          dealId,
          revisionNumber: nextRevisionNumber,
          feedback,
          status: 'REVISION_REQUESTED',
        },
      }),
      prisma.deal.update({
        where: { id: dealId },
        data: {
          currentRevision: nextRevisionNumber,
          status: 'REVISION_PENDING',
        },
      }),
    ]);

    return revision;
  }

  /**
   * Submit a revision (creator uploads revised content).
   * Links the new video upload to this revision.
   */
  async submitRevision(
    dealId: string,
    revisionId: string,
    creatorId: string,
    videoUrl: string
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.creatorId !== creatorId) {
      throw new Error('Deal not found or unauthorized');
    }

    return prisma.dealRevision.update({
      where: { id: revisionId },
      data: {
        videoUrl,
        status: 'PENDING',
      },
    });
  }

  /**
   * Approve a revision (brand approves the latest draft).
   * On final approval: emits deal/deliverable-approved event
   * which triggers clean render + escrow release.
   */
  async approveRevision(
    dealId: string,
    revisionId: string,
    brandId: string
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    const revision = await prisma.dealRevision.update({
      where: { id: revisionId },
      data: { status: 'APPROVED' },
    });

    // Move deal forward
    await prisma.deal.update({
      where: { id: dealId },
      data: { status: 'DELIVERY_PENDING' },
    });

    // Trigger clean render (no watermark) + escrow release
    const videoAsset = await prisma.videoAsset.findFirst({
      where: { revisionId },
    });

    if (videoAsset) {
      await inngest.send({
        name: 'video/clean-render',
        data: { dealId, videoAssetId: videoAsset.id },
      });
    }

    // Trigger escrow flow
    await inngest.send({
      name: 'deal/deliverable-approved',
      data: { dealId, revisionId },
    });

    return revision;
  }

  /** Get all revisions for a deal */
  async listRevisions(dealId: string): Promise<any[]> {
    return prisma.dealRevision.findMany({
      where: { dealId },
      include: { videoAsset: true },
      orderBy: { revisionNumber: 'asc' },
    });
  }

  /** Add revision extension (increases maxRevisions, additional fee) */
  async addRevisionExtension(
    dealId: string,
    brandId: string,
    additionalRevisions: number = 1
  ): Promise<any> {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.brandId !== brandId) {
      throw new Error('Deal not found or unauthorized');
    }

    return prisma.deal.update({
      where: { id: dealId },
      data: {
        maxRevisions: { increment: additionalRevisions },
      },
    });
  }
}

export const revisionService = new RevisionService();
