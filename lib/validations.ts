import { z } from "zod";

// Auth Validation
export const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    phone: z.string()
        .length(10, "Phone number must be 10 digits")
        .regex(/^\d+$/, "Phone number must contain only digits"),
    role: z.enum(["CREATOR", "BRAND"]),
    // Creator-specific fields
    name: z.string().min(2).optional(),
    bio: z.string().optional(),
    socialPlatforms: z.array(z.object({
        platform: z.string(),
        handle: z.string(),
        followers: z.number(),
        verified: z.boolean().default(false)
    })).optional(),
    // Brand-specific fields
    companyName: z.string().min(2).optional(),
    industry: z.string().optional(),
    description: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
});

// Brand Profile Validation
export const brandProfileSchema = z.object({
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    industry: z.string().min(1, "Please select an industry"),
    description: z.string().min(50, "Description must be at least 50 characters").max(1000, "Description must be less than 1000 characters"),
    website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
    location: z.string().min(2, "Please enter your location"),
    companySize: z.string().min(1, "Please select company size"),
    budgetRange: z.string().min(1, "Please select a budget range"),
});

// Influencer Profile Validation
export const influencerProfileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must be less than 500 characters"),
    location: z.string().min(2, "Please enter your location"),
    niches: z.array(z.string()).min(1, "Please select at least one niche").max(5, "Maximum 5 niches allowed"),
    languages: z.array(z.string()).min(1, "Please select at least one language"),
});

// Social Platform Validation
export const socialPlatformSchema = z.object({
    platform: z.enum(["Instagram", "YouTube", "TikTok", "Twitter", "Facebook", "LinkedIn"]),
    handle: z.string().min(1, "Handle is required"),
    followers: z.number().min(0, "Followers must be a positive number"),
});

// Gig Creation Validation
export const gigSchema = z.object({
    title: z.string()
        .min(10, "Title must be at least 10 characters")
        .max(80, "Title must be less than 80 characters"),
    category: z.string().min(1, "Please select a category"),
    subcategory: z.string().min(1, "Please select a subcategory"),
    description: z.string()
        .min(100, "Description must be at least 100 characters")
        .max(2000, "Description must be less than 2000 characters"),
    tags: z.array(z.string()).min(1, "Add at least one tag").max(5, "Maximum 5 tags allowed"),
    requirements: z.array(z.string()).optional(),
});

// Gig Package Validation
export const gigPackageSchema = z.object({
    tier: z.enum(["basic", "standard", "premium"]),
    name: z.string().min(3, "Package name is required"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    price: z.number().min(5, "Minimum price is $5").max(10000, "Maximum price is $10,000"),
    deliveryDays: z.number().min(1, "Minimum delivery time is 1 day").max(90, "Maximum delivery time is 90 days"),
    revisions: z.union([z.number().min(0), z.literal("unlimited")]),
    features: z.array(z.string()).min(1, "Add at least one feature"),
});

// Order Creation Validation
export const orderSchema = z.object({
    gigId: z.string().min(1, "Gig ID is required"),
    packageTier: z.enum(["basic", "standard", "premium"]),
    requirements: z.array(z.object({
        question: z.string(),
        answer: z.string().min(1, "This field is required"),
    })),
});

// Review Validation
export const reviewSchema = z.object({
    rating: z.number().min(1, "Please select a rating").max(5, "Maximum rating is 5"),
    comment: z.string()
        .min(20, "Review must be at least 20 characters")
        .max(500, "Review must be less than 500 characters"),
});

// Message Validation
export const messageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty").max(2000, "Message is too long"),
});

// Deal Proposal Validation
export const dealProposalSchema = z.object({
    title: z.string().min(10, "Title must be at least 10 characters"),
    description: z.string().min(50, "Description must be at least 50 characters"),
    deliverables: z.array(z.string()).min(1, "Add at least one deliverable"),
    compensation: z.number().min(100, "Minimum compensation is $100"),
    timeline: z.string().min(1, "Please specify a timeline"),
});

// Search & Filter Validation
export const searchFiltersSchema = z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    deliveryTime: z.array(z.number()).optional(),
    rating: z.number().min(0).max(5).optional(),
    sellerLevel: z.array(z.string()).optional(),
    sortBy: z.enum(["relevance", "price_low", "price_high", "rating", "newest"]).optional(),
});

// Contact Form Validation
export const contactSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    subject: z.string().min(5, "Subject must be at least 5 characters"),
    message: z.string().min(20, "Message must be at least 20 characters").max(1000, "Message must be less than 1000 characters"),
});

// KYC Validation (India-specific)
export const kycSchema = z.object({
    aadhaarNumber: z.string()
        .length(12, "Aadhaar number must be 12 digits")
        .regex(/^\d+$/, "Aadhaar number must contain only digits"),
    panNumber: z.string()
        .length(10, "PAN number must be 10 characters")
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
    phone: z.string()
        .length(10, "Phone number must be 10 digits")
        .regex(/^\d+$/, "Phone number must contain only digits"),
});

// Deal Creation Validation
export const dealCreateSchema = z.object({
    creatorId: z.string().uuid("Invalid creator ID"),
    title: z.string().min(10, "Title must be at least 10 characters").max(200, "Title must be less than 200 characters"),
    description: z.string().min(50, "Description must be at least 50 characters").max(2000, "Description must be less than 2000 characters"),
    totalAmount: z.number().min(1000, "Minimum deal amount is ₹1,000").max(10000000, "Maximum deal amount is ₹1,00,00,000"),
    scriptChecklist: z.array(z.object({
        item: z.string(),
        completed: z.boolean().default(false)
    })).optional(),
});

// Deal Update Validation
export const dealUpdateSchema = z.object({
    title: z.string().min(10).max(200).optional(),
    description: z.string().min(50).max(2000).optional(),
    scriptChecklist: z.array(z.object({
        item: z.string(),
        completed: z.boolean()
    })).optional(),
});

// Script Approval Validation
export const scriptApprovalSchema = z.object({
    dealId: z.string().uuid("Invalid deal ID"),
    approved: z.boolean(),
    notes: z.string().max(500).optional(),
});

// Dispute Validation
export const disputeSchema = z.object({
    dealId: z.string().uuid("Invalid deal ID"),
    reason: z.string().min(20, "Please provide a detailed reason (at least 20 characters)").max(1000),
});

// Dispute Resolution Validation
export const disputeResolutionSchema = z.object({
    dealId: z.string().uuid("Invalid deal ID"),
    decision: z.enum(["FAVOR_CREATOR", "FAVOR_BRAND", "PARTIAL"]),
    notes: z.string().min(20, "Please provide detailed notes").max(2000),
});

// Chat Message Validation
export const chatMessageSchema = z.object({
    dealId: z.string().uuid("Invalid deal ID"),
    content: z.string().min(1, "Message cannot be empty").max(2000, "Message is too long"),
});

// File Upload Validation
export const fileUploadSchema = z.object({
    dealId: z.string().uuid("Invalid deal ID"),
    fileName: z.string().min(1, "File name is required"),
    fileSize: z.number().max(500 * 1024 * 1024, "File size exceeds 500MB limit"),
    fileType: z.enum([
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "image/jpeg",
        "image/png",
        "application/pdf"
    ], { message: "Invalid file type" }),
});

// Type exports for TypeScript
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type BrandProfileInput = z.infer<typeof brandProfileSchema>;
export type InfluencerProfileInput = z.infer<typeof influencerProfileSchema>;
export type GigInput = z.infer<typeof gigSchema>;
export type GigPackageInput = z.infer<typeof gigPackageSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type DealProposalInput = z.infer<typeof dealProposalSchema>;
export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type KYCInput = z.infer<typeof kycSchema>;
export type DealCreateInput = z.infer<typeof dealCreateSchema>;
export type DealUpdateInput = z.infer<typeof dealUpdateSchema>;
export type ScriptApprovalInput = z.infer<typeof scriptApprovalSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type DisputeResolutionInput = z.infer<typeof disputeResolutionSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
