"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, Globe, MessageSquare,
  AlertTriangle, CheckCircle, MapPin, Users, Briefcase
} from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

interface BrandData {
  id: string;
  companyName: string;
  industry: string;
  description: string;
  website: string;
  logo?: string;
  location?: string;
  companySize?: string;
  createdAt?: string;
  user?: {
    id: string;
    email: string;
    kycStatus: string;
  };
}

export default function ViewBrandProfilePage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params?.id as string;

  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchBrand = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands?search=&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch brands");
      const data = await res.json();
      const brands = data.brands || [];
      const found = brands.find((b: any) => b.user?.id === brandId || b.id === brandId);
      if (!found) throw new Error("Brand not found");
      setBrand(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    if (brandId) fetchBrand();
  }, [brandId, fetchBrand]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
          <div className="skeleton h-6 w-36 mb-6 rounded" />
          <div className="skeleton h-80 rounded-xl mb-6" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-white shadow-md animate-slide-up">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Brand Not Found</h2>
              <p className="text-muted-foreground mb-4">{error || "Brand not found"}</p>
              <Link href="/dashboard/influencer/discover">
                <Button>Back to Discover</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
        <Link href="/dashboard/influencer/discover" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Discover
        </Link>

        {/* Brand Header */}
        <AnimatedSection animation="animate-slide-up" delay={0} className="mb-6">
        <Card className="bg-white shadow-md hover-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{brand.companyName}</h1>
                  {brand.user?.kycStatus === "VERIFIED" && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {brand.industry && (
                  <Badge variant="outline" className="mb-3">{brand.industry}</Badge>
                )}

                <p className="text-muted-foreground mb-4">{brand.description}</p>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {brand.website && (
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                      <Globe className="w-4 h-4" />
                      {brand.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {brand.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {brand.location}
                    </span>
                  )}
                  {brand.companySize && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {brand.companySize}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>

        {/* Company Details */}
        <AnimatedSection animation="animate-slide-left" delay={100} className="mb-6">
        <Card className="bg-white shadow-md hover-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              About the Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{brand.description}</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-1">Industry</p>
                <p className="font-medium">{brand.industry || "Not specified"}</p>
              </div>
              {brand.companySize && (
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Company Size</p>
                  <p className="font-medium">{brand.companySize}</p>
                </div>
              )}
              {brand.createdAt && (
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                  <p className="font-medium">{new Date(brand.createdAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>

        {/* Actions */}
        <AnimatedSection animation="animate-bounce-in" delay={200}>
        <Card className="bg-white shadow-md hover-glow">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="gap-2 flex-1 btn-animate group">
                <MessageSquare className="w-4 h-4 group-hover-bounce" />
                Send Message <span className="group-hover-arrow ml-1">→</span>
              </Button>
              <Link href="/dashboard/influencer/discover" className="flex-1">
                <Button variant="outline" className="w-full btn-animate">Browse More Brands</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
