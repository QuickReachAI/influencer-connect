"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  ArrowLeft, Instagram, Youtube, TrendingUp, MapPin,
  Star, Award, FileText, AlertTriangle, ExternalLink
} from "lucide-react";

interface InfluencerProfile {
  id: string;
  name: string;
  bio: string;
  avatar?: string;
  niches: string[];
  platforms: Array<{
    platform: string;
    handle: string;
    followers: number;
    verified?: boolean;
  }>;
  location: string;
  engagementRate: number;
  rateCard: {
    postPrice: number;
    storyPrice: number;
    videoPrice: number;
    reelPrice?: number;
  };
  portfolio: Array<{
    id: string;
    brandName: string;
    description: string;
    date: string;
  }>;
  level?: string;
  totalOrders?: number;
  rating?: number;
  reviewCount?: number;
  responseTime?: string;
  verified?: boolean;
  reliabilityScore?: number;
}

const platformIcon = (platform: string) => {
  switch (platform) {
    case "Instagram": return <Instagram className="w-4 h-4" />;
    case "YouTube": return <Youtube className="w-4 h-4" />;
    default: return <TrendingUp className="w-4 h-4" />;
  }
};

export default function ViewInfluencerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const influencerId = params?.id as string;

  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/influencers");
      if (!res.ok) throw new Error("Failed to fetch influencers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.influencers || [];
      const found = list.find((inf: any) => inf.id === influencerId);
      if (!found) throw new Error("Influencer not found");
      setProfile(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [influencerId]);

  useEffect(() => {
    if (influencerId) fetchProfile();
  }, [influencerId, fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="skeleton h-6 w-36 mb-6 rounded" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="skeleton h-80 rounded-xl" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="skeleton h-40 rounded-xl" />
              <div className="skeleton h-48 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">{error || "Influencer not found"}</p>
              <Link href="/dashboard/brand/discover">
                <Button>Back to Discover</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalFollowers = profile.platforms.reduce((sum, p) => sum + p.followers, 0);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard/brand/discover" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors animated-underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Discover
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <AnimatedSection animation="animate-blur-in">
            <Card className="hover-glow">
              <CardContent className="pt-6 text-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold mx-auto mb-4">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    profile.name.charAt(0)
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
                {profile.verified && (
                  <Badge variant="default" className="mb-2 gap-1">
                    <Star className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {profile.level && (
                  <Badge variant="secondary" className="ml-1 mb-2">
                    {profile.level.replace("_", " ")}
                  </Badge>
                )}
                <p className="text-muted-foreground text-sm mb-4">{profile.bio}</p>

                {profile.location && (
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap justify-center mb-4">
                  {profile.niches.map((niche) => (
                    <Badge key={niche} variant="outline">{niche}</Badge>
                  ))}
                </div>

                <Link href={`/dashboard/brand/deals/new?creatorId=${profile.id}`}>
                  <Button className="w-full gap-2 btn-animate">
                    <FileText className="w-4 h-4" />
                    Propose Deal
                  </Button>
                </Link>
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Stats */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="hover-glow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{profile.engagementRate}%</div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{totalFollowers >= 1000000 ? `${(totalFollowers / 1000000).toFixed(1)}M` : totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : totalFollowers}</div>
                    <div className="text-xs text-muted-foreground">Total Followers</div>
                  </div>
                  {profile.totalOrders !== undefined && (
                    <div>
                      <div className="text-2xl font-bold">{profile.totalOrders}</div>
                      <div className="text-xs text-muted-foreground">Deals Done</div>
                    </div>
                  )}
                  {profile.reliabilityScore !== undefined && (
                    <div>
                      <div className="text-2xl font-bold text-primary">{profile.reliabilityScore}%</div>
                      <div className="text-xs text-muted-foreground">Reliability</div>
                    </div>
                  )}
                  {profile.rating !== undefined && (
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />
                        <span className="text-2xl font-bold">{profile.rating}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rating ({profile.reviewCount || 0})
                      </div>
                    </div>
                  )}
                  {profile.responseTime && (
                    <div>
                      <div className="text-lg font-bold">{profile.responseTime}</div>
                      <div className="text-xs text-muted-foreground">Avg. Response</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Social Platforms */}
            <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card className="hover-glow">
              <CardHeader>
                <CardTitle>Social Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.platforms.map((platform) => (
                    <div key={platform.platform} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        {platformIcon(platform.platform)}
                        <div>
                          <p className="font-medium">{platform.platform}</p>
                          <p className="text-sm text-muted-foreground">{platform.handle}</p>
                        </div>
                        {platform.verified && (
                          <Badge variant="default" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{platform.followers.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">followers</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            </AnimatedSection>

            {/* Rate Card */}
            <AnimatedSection animation="animate-slide-up" delay={300}>
            <Card className="hover-glow">
              <CardHeader>
                <CardTitle>Rate Card</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Post</p>
                    <p className="text-2xl font-bold text-primary">${profile.rateCard.postPrice.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Story</p>
                    <p className="text-2xl font-bold text-primary">${profile.rateCard.storyPrice.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Video</p>
                    <p className="text-2xl font-bold text-primary">${profile.rateCard.videoPrice.toLocaleString()}</p>
                  </div>
                  {profile.rateCard.reelPrice && (
                    <div className="rounded-lg border border-border p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Reel</p>
                      <p className="text-2xl font-bold text-primary">${profile.rateCard.reelPrice.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            </AnimatedSection>

            {/* Portfolio */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <AnimatedSection animation="animate-slide-up" delay={400}>
              <Card className="hover-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.portfolio.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{item.brandName}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </AnimatedSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
