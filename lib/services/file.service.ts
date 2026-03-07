// @ts-nocheck
import prisma from '@/lib/prisma';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { escrowService } from './escrow.service';

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

interface FileValidation {
    valid: boolean;
    error?: string;
}

export class FileService {
    private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    private readonly ALLOWED_TYPES = [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'image/jpeg',
        'image/png',
        'application/pdf'
    ];

    /**
     * Validate uploaded file
     */
    private validateFile(file: File): FileValidation {
        // Check file size
        if (file.size > this.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: 'File size exceeds 500MB limit'
            };
        }

        // Check file type
        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid file type. Only videos, images, and PDFs allowed.'
            };
        }

        return { valid: true };
    }

    /**
     * Upload deliverable file to S3
     * Triggers automatic payment notification to brand
     */
    async uploadDeliverable(
        dealId: string,
        creatorId: string,
        file: File
    ): Promise<{ id: string; fileName: string }> {
        // Verify deal ownership
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        if (deal.creatorId !== creatorId) {
            throw new Error('Unauthorized');
        }

        if (!deal.payment50Paid) {
            throw new Error('Brand must pay 50% before file upload');
        }

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Generate S3 key
        const timestamp = Date.now();
        const s3Key = `deals/${dealId}/${timestamp}_${file.name}`;
        const bucket = process.env.AWS_S3_BUCKET!;

        // Upload to S3
        const buffer = await file.arrayBuffer();
        await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: Buffer.from(buffer),
            ContentType: file.type,
            ServerSideEncryption: 'AES256',
            Metadata: {
                dealId,
                creatorId,
                uploadedAt: new Date().toISOString()
            }
        }));

        // Record in database
        const deliverable = await prisma.deliverable.create({
            data: {
                dealId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                s3Key,
                s3Bucket: bucket,
                uploadedBy: creatorId
            }
        });

        // Trigger payment notification (automatic)
        await escrowService.handleFileUploadTrigger(dealId);

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deliverable',
                entityId: deliverable.id,
                action: 'file_uploaded',
                actorId: creatorId,
                changes: {
                    fileName: file.name,
                    fileSize: file.size,
                    s3Key
                }
            }
        });

        return {
            id: deliverable.id,
            fileName: file.name
        };
    }

    /**
     * Generate secure download link for brand
     * Only available after 100% payment
     */
    async generateSecureDownloadLink(
        deliverableId: string,
        userId: string
    ): Promise<string> {
        const deliverable = await prisma.deliverable.findUnique({
            where: { id: deliverableId },
            include: { deal: true }
        });

        if (!deliverable) {
            throw new Error('File not found');
        }

        // Verify user is the brand
        if (deliverable.deal.brandId !== userId) {
            throw new Error('Unauthorized');
        }

        // Verify payment completed
        if (!deliverable.deal.payment100Paid) {
            throw new Error('Payment required to download files');
        }

        // Check if file expired
        if (deliverable.expiresAt < new Date()) {
            throw new Error('File has expired (30-day retention policy)');
        }

        // Generate signed URL (valid for 24 hours)
        const command = new GetObjectCommand({
            Bucket: deliverable.s3Bucket,
            Key: deliverable.s3Key
        });

        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 86400 // 24 hours
        });

        // Track download
        await prisma.deliverable.update({
            where: { id: deliverableId },
            data: {
                downloadCount: { increment: 1 }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'deliverable',
                entityId: deliverableId,
                action: 'file_downloaded',
                actorId: userId,
                changes: {
                    fileName: deliverable.fileName,
                    downloadCount: deliverable.downloadCount + 1
                }
            }
        });

        return signedUrl;
    }

    /**
     * Get all deliverables for a deal
     */
    async getDeliverables(dealId: string, userId: string): Promise<any[]> {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        // Verify user is part of the deal
        if (deal.brandId !== userId && deal.creatorId !== userId) {
            throw new Error('Unauthorized');
        }

        const deliverables = await prisma.deliverable.findMany({
            where: {
                dealId,
                deletedAt: null
            },
            orderBy: {
                uploadedAt: 'desc'
            }
        });

        return deliverables.map((d: any) => ({
            id: d.id,
            fileName: d.fileName,
            fileSize: d.fileSize,
            fileType: d.fileType,
            uploadedAt: d.uploadedAt,
            downloadCount: d.downloadCount,
            expiresAt: d.expiresAt,
            canDownload: deal.payment100Paid && d.expiresAt > new Date()
        }));
    }

    /**
     * Cleanup expired files (Cron job - runs daily)
     * Deletes files older than 30 days
     */
    async cleanupExpiredFiles(): Promise<number> {
        const expired = await prisma.deliverable.findMany({
            where: {
                expiresAt: { lt: new Date() },
                deletedAt: null
            }
        });

        let deletedCount = 0;

        for (const file of expired) {
            try {
                // Delete from S3
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: file.s3Bucket,
                    Key: file.s3Key
                }));

                // Mark as deleted in database
                await prisma.deliverable.update({
                    where: { id: file.id },
                    data: { deletedAt: new Date() }
                });

                deletedCount++;

                // Audit log
                await prisma.auditLog.create({
                    data: {
                        entityType: 'deliverable',
                        entityId: file.id,
                        action: 'file_deleted_retention_policy',
                        changes: {
                            fileName: file.fileName,
                            expiresAt: file.expiresAt
                        }
                    }
                });
            } catch (error) {
                console.error(`Failed to delete file ${file.id}:`, error);
            }
        }

        return deletedCount;
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: bigint;
        expiringSoon: number;
    }> {
        const stats = await prisma.deliverable.aggregate({
            where: { deletedAt: null },
            _count: true,
            _sum: { fileSize: true }
        });

        const expiringSoon = await prisma.deliverable.count({
            where: {
                deletedAt: null,
                expiresAt: {
                    lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                }
            }
        });

        return {
            totalFiles: stats._count,
            totalSize: stats._sum.fileSize || BigInt(0),
            expiringSoon
        };
    }
}

export const fileService = new FileService();
