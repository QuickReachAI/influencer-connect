"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Instagram, Youtube, TrendingUp, MapPin,
  Star, Award, Users, Sparkles, CheckCircle2, AlertTriangle, Zap, ArrowRight
} from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

interface PublicInfluencer {
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
}

const platformIcon = (platform: string) => {
  switch (platform) {
    case "Instagram": return <Instagram className="w-5 h-5" />;
    case "YouTube": return <Youtube className="w-5 h-5" />;
    default: return <TrendingUp className="w-5 h-5" />;
  }
};

export default function PublicInfluencerProfilePage() {
  const params = useParams();
  const influencerId = params?.id as string;

  const [profile, setProfile] = useState<PublicInfluencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/influencers");
      if (!res.ok) throw new Error("Failed to fetch");
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
      <div className="min-h-screen bg-gray-50">
        <header className="border-b-2 border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#0E61FF] rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Influencer<span className="text-[#0E61FF]">Connect</span></span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="skeleton h-6 w-36 mb-6 rounded" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="skeleton h-96 rounded-xl" />
            <div className="lg:col-span-2 space-y-6">
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b-2 border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#0E61FF] rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Influencer<span className="text-[#0E61FF]">Connect</span></span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Profile Not Found</h2>
              <p className="text-gray-500 mb-4">{error || "This influencer profile doesn't exist."}</p>
              <Link href="/browse">
                <Button>Browse Creators</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalFollowers = profile.platforms.reduce((sum, p) => sum + p.followers, 0);

  return (
    <div className="min-h-screen bg-gray-50">
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
              <Button>Join Free</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#0E61FF] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-[#0E61FF] transition-colors">Browse</Link>
          <span>/</span>
          <span className="text-gray-900">{profile.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <AnimatedSection animation="animate-slide-up">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-28 h-28 rounded-full bg-[#0E61FF] flex items-center justify-center text-white text-5xl font-bold mx-auto mb-4 overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.name.charAt(0)
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-1 text-gray-900">{profile.name}</h1>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {profile.verified && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                  {profile.level && (
                    <Badge variant="secondary">{profile.level.replace("_", " ")}</Badge>
                  )}
                </div>
                <p className="text-gray-500 text-sm mb-4">{profile.bio}</p>

                {profile.location && (
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap justify-center mb-6">
                  {profile.niches.map((niche) => (
                    <Badge key={niche} variant="info">
                      {niche}
                    </Badge>
                  ))}
                </div>

                <Link href="/auth/signup">
                  <Button className="w-full gap-2">
                    <Sparkles className="w-4 h-4" />
                    Sign Up to Collaborate
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-[#0E61FF]">{profile.engagementRate}%</div>
                    <div className="text-xs text-gray-500">Engagement</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-gray-900">{totalFollowers >= 1000000 ? `${(totalFollowers / 1000000).toFixed(1)}M` : totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : totalFollowers}</div>
                    <div className="text-xs text-gray-500">Total Followers</div>
                  </div>
                  {profile.totalOrders !== undefined && (
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-600">{profile.totalOrders}+</div>
                      <div className="text-xs text-gray-500">Deals Completed</div>
                    </div>
                  )}
                  {profile.rating !== undefined && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold text-amber-600">{profile.rating}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ({profile.reviewCount || 0} reviews)
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Social Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {profile.platforms.map((platform) => (
                    <div key={platform.platform} className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-[#0E61FF] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="text-[#0E61FF]">{platformIcon(platform.platform)}</div>
                        <div>
                          <p className="font-medium text-gray-900">{platform.platform}</p>
                          <p className="text-sm text-gray-500">{platform.handle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{platform.followers.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">followers</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>

            {profile.portfolio && profile.portfolio.length > 0 && (
              <AnimatedSection animation="animate-slide-up" delay={300}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Award className="w-5 h-5 text-[#0E61FF]" />
                    Past Collaborations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {profile.portfolio.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl border-2 border-gray-100 hover-lift">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0E61FF]">
                            <Award className="w-4 h-4" />
                          </div>
                          <p className="font-medium text-gray-900">{item.brandName}</p>
                        </div>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        <p className="text-xs text-gray-400 mt-2">{item.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </AnimatedSection>
            )}

            <AnimatedSection animation="animate-slide-up" delay={400}>
            <Card className="bg-[#0E61FF] border-0">
              <CardContent className="py-8 text-center">
                <Sparkles className="w-10 h-10 text-white/80 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-2 text-white">Ready to Collaborate?</h2>
                <p className="text-white/70 mb-4">
                  Join QuickConnects to start working with {profile.name} and thousands of other creators.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/auth/signup">
                    <Button size="lg" className="gap-2 bg-white text-[#0E61FF] hover:bg-gray-100">
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/browse">
                    <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                      Browse More
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </div>
  );
}
