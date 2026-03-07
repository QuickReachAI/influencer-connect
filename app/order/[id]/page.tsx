"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Zap, Clock, CheckCircle2, DollarSign,
  AlertTriangle, Loader2, TrendingUp, ShieldCheck, FileText
} from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

interface GigPackage {
  tier: string;
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number | string;
  features: string[];
}

interface GigData {
  id: string;
  title: string;
  slug: string;
  influencerId: string;
  packages: GigPackage[];
  requirements: string[];
}

interface InfluencerData {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
}

function OrderPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gigId = params?.id as string;
  const selectedTier = searchParams?.get("package") || "basic";

  const [gig, setGig] = useState<GigData | null>(null);
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<Record<string, string>>({});

  const fetchGigData = useCallback(async () => {
    try {
      const { sampleGigs, enhancedInfluencers } = await import("@/data/enhanced-sample-data");
      const foundGig = sampleGigs.find((g) => g.id === gigId);
      if (!foundGig) throw new Error("Service not found");
      setGig({
        id: foundGig.id,
        title: foundGig.title,
        slug: foundGig.slug,
        influencerId: foundGig.influencerId,
        packages: foundGig.packages,
        requirements: foundGig.requirements,
      });

      const foundInfluencer = enhancedInfluencers.find((inf) => inf.id === foundGig.influencerId);
      if (foundInfluencer) {
        setInfluencer({
          id: foundInfluencer.id,
          name: foundInfluencer.name,
          avatar: foundInfluencer.avatar,
          rating: foundInfluencer.rating,
          reviewCount: foundInfluencer.reviewCount,
        });
      }

      const reqs: Record<string, string> = {};
      foundGig.requirements.forEach((r, idx) => {
        reqs[`req-${idx}`] = "";
      });
      setRequirements(reqs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [gigId]);

  useEffect(() => {
    fetchGigData();
  }, [fetchGigData]);

  const currentPackage = gig?.packages.find((p) => p.tier === selectedTier) || gig?.packages[0];
  const price = currentPackage?.price || 0;
  const platformFee = price * 0.05;
  const total = price + platformFee;

  const handleConfirmOrder = async () => {
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");

    if (!userId || !userRole) {
      router.push(`/auth/login?redirect=/order/${gigId}?package=${selectedTier}`);
      return;
    }

    if (userRole !== "brand") {
      setError("Only brands can place orders");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: gig?.influencerId,
          title: `Order: ${gig?.title} (${currentPackage?.name})`,
          description: Object.entries(requirements)
            .map(([key, val], idx) => `${gig?.requirements[idx] || key}: ${val}`)
            .filter((r) => r.trim())
            .join("\n"),
          totalAmount: price,
          scriptChecklist: currentPackage?.features || [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create order");
      }

      const data = await res.json();
      router.push(`/dashboard/brand/deals/${data.deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const headerMarkup = (
    <header className="border-b-2 border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0E61FF] rounded-lg flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Influencer<span className="text-[#0E61FF]">Connect</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="hidden sm:inline-flex text-gray-600">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button>Join</Button>
          </Link>
        </nav>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {headerMarkup}
        <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
          <div className="skeleton h-6 w-36 mb-6 rounded" />
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="skeleton h-32 rounded-xl" />
              <div className="skeleton h-64 rounded-xl" />
            </div>
            <div className="lg:col-span-2">
              <div className="skeleton h-80 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !gig) {
    return (
      <div className="min-h-screen bg-gray-50">
        {headerMarkup}
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Service Not Found</h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <Link href="/browse">
                <Button>Browse Services</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!gig || !currentPackage) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {headerMarkup}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/browse" className="hover:text-[#0E61FF] transition-colors">Browse</Link>
          <span>/</span>
          <Link href={`/gig/${gig.slug}`} className="hover:text-[#0E61FF] transition-colors">{gig.title}</Link>
          <span>/</span>
          <span className="text-gray-900">Order</span>
        </nav>

        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="py-3 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>×</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <AnimatedSection animation="animate-slide-up" delay={0}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="w-5 h-5 text-[#0E61FF]" />
                  Package: {currentPackage.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">{currentPackage.description}</p>
                <div className="flex items-center gap-6 text-sm mb-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-[#0E61FF]" />
                    <span>{currentPackage.deliveryDays} days delivery</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>{currentPackage.revisions === "unlimited" ? "Unlimited" : currentPackage.revisions} revisions</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {currentPackage.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Provide details so the creator can deliver exactly what you need.
                </p>
                {gig.requirements.map((req, idx) => (
                  <div key={idx}>
                    <label className="text-sm font-medium mb-1.5 block text-gray-700">{req}</label>
                    <textarea
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E61FF] focus-visible:border-[#0E61FF] min-h-[80px] resize-y"
                      placeholder="Your answer..."
                      value={requirements[`req-${idx}`] || ""}
                      onChange={(e) => setRequirements({ ...requirements, [`req-${idx}`]: e.target.value })}
                    />
                  </div>
                ))}
                {gig.requirements.length === 0 && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-gray-700">Additional Details</label>
                    <textarea
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E61FF] focus-visible:border-[#0E61FF] min-h-[100px] resize-y"
                      placeholder="Describe what you need..."
                      value={requirements["custom"] || ""}
                      onChange={(e) => setRequirements({ ...requirements, custom: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            </AnimatedSection>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              <AnimatedSection animation="animate-slide-up" delay={200}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <DollarSign className="w-5 h-5 text-[#0E61FF]" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {influencer && (
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <div className="w-10 h-10 rounded-full bg-[#0E61FF] flex items-center justify-center text-white font-semibold">
                        {influencer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{influencer.name}</p>
                        {influencer.rating && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="flex items-center gap-0.5">
                              <span className="text-yellow-500">★</span>
                              {influencer.rating}
                            </span>
                            <span>({influencer.reviewCount})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>{currentPackage.name} package</span>
                      <span className="font-medium">${price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Platform fee (5%)</span>
                      <span>${platformFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-base text-gray-900">
                      <span>Total</span>
                      <span className="text-[#0E61FF]">${total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 flex items-center gap-1 pt-2">
                    <ShieldCheck className="w-3 h-3" />
                    50% upfront, 50% on delivery
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleConfirmOrder}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Confirm & Pay 50% (${(total / 2).toLocaleString()})
                      </>
                    )}
                  </Button>
                  <Link href={`/gig/${gig.slug}`} className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Service
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
              </AnimatedSection>

              <AnimatedSection animation="animate-fade-in" delay={300}>
              <Card className="bg-blue-50 border-0">
                <CardContent className="py-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0E61FF]" />
                      <span className="text-gray-700">Secure escrow payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-gray-700">Money-back guarantee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0E61FF]" />
                      <span className="text-gray-700">{currentPackage.deliveryDays}-day delivery</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="skeleton h-8 w-32 rounded" /></div>}>
      <OrderPageContent />
    </Suspense>
  );
}
