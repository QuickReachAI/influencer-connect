// @ts-nocheck
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { escrowService } from './escrow.service';
import { inngest } from '@/lib/inngest/client';

// Initialize Supabase client (server-side: service role key bypasses RLS)
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'deliverables';

interface FileValidation {
    valid: boolean;
    error?: string;
}

export class FileService {
    // 50 MB — Supabase free tier limit (Pro tier supports 5 GB)
    private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;
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
        if (file.size > this.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: 'File size exceeds 50MB limit'
            };
        }

        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid file type. Only videos, images, and PDFs allowed.'
            };
        }

        return { valid: true };
    }

    /**
     * Upload deliverable file to Supabase Storage.
     * Triggers automatic payment notification to brand.
     */
    async uploadDeliverable(
        dealId: string,
        creatorId: string,
        file: File
    ): Promise<{ id: string; fileName: string }> {
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

        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Generate storage path (reuses s3Key DB field)
        const timestamp = Date.now();
        const storagePath = `deals/${dealId}/${timestamp}_${file.name}`;

        // Upload to Supabase Storage
        const buffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, Buffer.from(buffer), {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Record in database (s3Key/s3Bucket fields store Supabase path/bucket)
        const deliverable = await prisma.deliverable.create({
            data: {
                dealId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                s3Key: storagePath,
                s3Bucket: BUCKET,
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
                    s3Key: storagePath
                }
            }
        });

        return {
            id: deliverable.id,
            fileName: file.name
        };
    }

    /**
     * Generate secure download link for brand.
     * Only available after 100% payment.
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

        if (deliverable.deal.brandId !== userId) {
            throw new Error('Unauthorized');
        }

        if (!deliverable.deal.payment100Paid) {
            throw new Error('Payment required to download files');
        }

        if (deliverable.expiresAt < new Date()) {
            throw new Error('File has expired (30-day retention policy)');
        }

        // Generate signed URL (valid for 24 hours)
        const { data, error } = await supabase.storage
            .from(deliverable.s3Bucket)
            .createSignedUrl(deliverable.s3Key, 86400);

        if (error || !data) {
            throw new Error(`Failed to generate download link: ${error?.message}`);
        }

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

        return data.signedUrl;
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
     * Cleanup expired files (Cron job - runs daily).
     * Deletes files older than 30 days.
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
                // Delete from Supabase Storage
                const { error } = await supabase.storage
                    .from(file.s3Bucket)
                    .remove([file.s3Key]);

                if (error) {
                    console.error(`Supabase delete error for ${file.id}:`, error.message);
                    continue;
                }

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
                    lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        return {
            totalFiles: stats._count,
            totalSize: stats._sum.fileSize || BigInt(0),
            expiringSoon
        };
    }

    // ========================================================================
    // PHASE 4 — UPLOAD SUPPORT (Supabase signed upload URLs)
    // ========================================================================

    /**
     * Initiate an upload for large files.
     * Returns a signed upload URL. Client uploads directly to Supabase.
     * For files >6 MB, client should use tus-js-client for resumable uploads.
     */
    async initiateMultipartUpload(
        dealId: string,
        creatorId: string,
        fileName: string,
        fileSize: number,
        fileType: string
    ): Promise<{
        path: string;
        signedUrl: string;
        token: string;
    }> {
        const storagePath = `${process.env.S3_RAW_PREFIX ?? 'raw/'}${dealId}/${Date.now()}_${fileName}`;

        // Create a signed upload URL
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUploadUrl(storagePath);

        if (error || !data) {
            throw new Error(`Failed to create upload URL: ${error?.message}`);
        }

        // Track upload state in VideoAsset
        await prisma.videoAsset.create({
            data: {
                dealId,
                originalUrl: storagePath,
                status: 'UPLOADING',
                fileSize: BigInt(fileSize),
            },
        });

        return {
            path: storagePath,
            signedUrl: data.signedUrl,
            token: data.token,
        };
    }

    /**
     * Complete an upload after the file has been uploaded via signed URL.
     * Creates a Deliverable record and emits video processing event.
     */
    async completeMultipartUpload(
        dealId: string,
        creatorId: string,
        path: string,
        token: string
    ): Promise<{ deliverableId: string; videoAssetId: string }> {
        // Create Deliverable record
        const deliverable = await prisma.deliverable.create({
            data: {
                dealId,
                fileName: path.split('/').pop()!,
                fileSize: 0,
                fileType: 'video/mp4',
                s3Key: path,
                s3Bucket: BUCKET,
                uploadedBy: creatorId,
            },
        });

        // Link VideoAsset to Deliverable
        await prisma.videoAsset.updateMany({
            where: { dealId, originalUrl: path },
            data: {
                deliverableId: deliverable.id,
                status: 'PROCESSING',
            },
        });

        // Get the actual VideoAsset ID
        const asset = await prisma.videoAsset.findFirst({
            where: { dealId, originalUrl: path },
        });

        // Emit video processing event
        await inngest.send({
            name: 'video/process',
            data: {
                dealId,
                deliverableId: deliverable.id,
                s3Key: path,
            },
        });

        return {
            deliverableId: deliverable.id,
            videoAssetId: asset!.id,
        };
    }

    /**
     * Abort an upload (cleanup on failure).
     * Deletes the partial file from Supabase Storage.
     */
    async abortMultipartUpload(path: string): Promise<void> {
        await supabase.storage
            .from(BUCKET)
            .remove([path]);
    }
}

export const fileService = new FileService();
