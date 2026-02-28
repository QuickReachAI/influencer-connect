"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Star, Clock, CheckCircle2, Heart, Share2, Flag,
    Sparkles, Award, TrendingUp, MessageSquare, ChevronDown,
    ChevronUp, Instagram, Youtube, Twitter
} from "lucide-react";
import { sampleGigs, enhancedInfluencers, sampleReviews } from "@/data/enhanced-sample-data";
import { GigPackage } from "@/data/enhanced-types";

export default function GigDetailPage() {
    const params = useParams();
    const slug = params?.slug as string;

    const gig = sampleGigs.find(g => g.slug === slug);
    const influencer = gig ? enhancedInfluencers.find(inf => inf.id === gig.influencerId) : null;
    const gigReviews = gig ? sampleReviews.filter(r => r.gigId === gig.id) : [];

    const [selectedPackage, setSelectedPackage] = useState<"basic" | "standard" | "premium">("basic");
    const [showAllFAQs, setShowAllFAQs] = useState(false);

    if (!gig || !influencer) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Service Not Found</h1>
                    <p className="text-muted-foreground mb-6">The service you're looking for doesn't exist.</p>
                    <Link href="/browse">
                        <Button>Browse Services</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const currentPackage = gig.packages.find(p => p.tier === selectedPackage);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold gradient-text">InfluencerConnect</span>
                    </Link>
                    <nav className="flex items-center gap-3">
                        <Link href="/auth/login">
                            <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
                        </Link>
                        <Link href="/auth/signup">
                            <Button className="bg-primary hover:bg-primary-hover">Join</Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <Link href="/" className="hover:text-primary">Home</Link>
                    <span>/</span>
                    <Link href="/browse" className="hover:text-primary">Browse</Link>
                    <span>/</span>
                    <span className="text-foreground">{gig.title}</span>
                </nav>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Title & Seller Info */}
                        <div>
                            <h1 className="text-3xl font-bold mb-4">{gig.title}</h1>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-semibold">
                                        {influencer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <Link href={`/influencer/${influencer.id}`} className="font-semibold hover:text-primary">
                                            {influencer.name}
                                        </Link>
                                        <div className="flex items-center gap-2 text-sm">
                                            {influencer.level && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {influencer.level.replace('_', ' ')}
                                                </Badge>
                                            )}
                                            {influencer.verified && (
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 ml-auto">
                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{gig.rating}</span>
                                    <span className="text-muted-foreground">({gig.reviewCount})</span>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {gig.tags.map((tag) => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="relative h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                                    <p className="text-lg font-medium">Service Preview</p>
                                    <p className="text-sm text-muted-foreground">Professional content creation</p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2">
                                <Button size="sm" variant="secondary" className="bg-white/90 backdrop-blur">
                                    <Heart className="w-4 h-4 mr-2" />
                                    Save
                                </Button>
                                <Button size="sm" variant="secondary" className="bg-white/90 backdrop-blur">
                                    <Share2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* About This Service */}
                        <Card>
                            <CardHeader>
                                <CardTitle>About This Service</CardTitle>
                            </CardHeader>
                            <CardContent className="prose max-w-none">
                                <p className="text-muted-foreground whitespace-pre-line">{gig.description}</p>
                            </CardContent>
                        </Card>

                        {/* About The Seller */}
                        <Card>
                            <CardHeader>
                                <CardTitle>About The Seller</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-semibold">
                                        {influencer.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1">{influencer.name}</h3>
                                        <p className="text-sm text-muted-foreground mb-3">{influencer.bio}</p>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <div className="flex items-center gap-1 text-sm mb-1">
                                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="font-semibold">{influencer.rating}</span>
                                                    <span className="text-muted-foreground">({influencer.reviewCount} reviews)</span>
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Response time: </span>
                                                <span className="font-medium">{influencer.responseTime}</span>
                                            </div>
                                        </div>

                                        {/* Social Platforms */}
                                        <div className="space-y-2">
                                            {influencer.platforms.map((platform) => (
                                                <div key={platform.platform} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        {platform.platform === "Instagram" && <Instagram className="w-4 h-4" />}
                                                        {platform.platform === "YouTube" && <Youtube className="w-4 h-4" />}
                                                        {platform.platform === "TikTok" && <TrendingUp className="w-4 h-4" />}
                                                        <span>{platform.platform}</span>
                                                        {platform.verified && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                                    </div>
                                                    <span className="font-medium">{platform.followers.toLocaleString()} followers</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Link href={`/influencer/${influencer.id}`}>
                                    <Button variant="outline" className="w-full">View Full Profile</Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* FAQs */}
                        {gig.faqs.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Frequently Asked Questions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {gig.faqs.slice(0, showAllFAQs ? undefined : 3).map((faq) => (
                                            <div key={faq.id} className="border-b last:border-0 pb-4 last:pb-0">
                                                <h4 className="font-semibold mb-2">{faq.question}</h4>
                                                <p className="text-muted-foreground text-sm">{faq.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {gig.faqs.length > 3 && (
                                        <Button
                                            variant="ghost"
                                            className="w-full mt-4"
                                            onClick={() => setShowAllFAQs(!showAllFAQs)}
                                        >
                                            {showAllFAQs ? (
                                                <>Show Less <ChevronUp className="w-4 h-4 ml-2" /></>
                                            ) : (
                                                <>Show More <ChevronDown className="w-4 h-4 ml-2" /></>
                                            )}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Reviews */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Reviews ({gig.reviewCount})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {gigReviews.map((review) => (
                                        <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                                                    {review.reviewerName.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold">{review.reviewerName}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mb-2">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${i < review.rating
                                                                        ? 'fill-yellow-400 text-yellow-400'
                                                                        : 'text-gray-300'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-muted-foreground text-sm mb-3">{review.comment}</p>

                                                    {review.sellerResponse && (
                                                        <div className="bg-gray-50 rounded-lg p-4 mt-3">
                                                            <p className="font-semibold text-sm mb-1">Seller's Response:</p>
                                                            <p className="text-sm text-muted-foreground">{review.sellerResponse.content}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Package Selection */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex gap-2">
                                        {(["basic", "standard", "premium"] as const).map((tier) => (
                                            <button
                                                key={tier}
                                                onClick={() => setSelectedPackage(tier)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedPackage === tier
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </CardHeader>

                                {currentPackage && (
                                    <CardContent>
                                        <div className="mb-6">
                                            <h3 className="font-semibold text-lg mb-2">{currentPackage.name}</h3>
                                            <p className="text-sm text-muted-foreground mb-4">{currentPackage.description}</p>

                                            <div className="flex items-baseline gap-2 mb-4">
                                                <span className="text-3xl font-bold text-primary">
                                                    ${currentPackage.price.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm mb-6">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{currentPackage.deliveryDays} days delivery</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className="w-4 h-4" />
                                                    <span>
                                                        {currentPackage.revisions === "unlimited"
                                                            ? "Unlimited"
                                                            : currentPackage.revisions} revisions
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-6">
                                                {currentPackage.features.map((feature, index) => (
                                                    <div key={index} className="flex items-start gap-2 text-sm">
                                                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <Link href={`/order/${gig.id}?package=${selectedPackage}`}>
                                                <Button className="w-full bg-primary hover:bg-primary-hover btn-animate mb-3">
                                                    Continue (${currentPackage.price.toLocaleString()})
                                                </Button>
                                            </Link>

                                            <Button variant="outline" className="w-full">
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Contact Seller
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            {/* Additional Info */}
                            <Card className="mt-4">
                                <CardContent className="pt-6">
                                    <div className="space-y-4 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Orders in queue</span>
                                            <span className="font-medium">{gig.ordersInQueue}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Engagement rate</span>
                                            <span className="font-medium">{influencer.engagementRate}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Total orders</span>
                                            <span className="font-medium">{influencer.totalOrders}+</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
