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
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-1.5 py-0.5 rounded-full">AI</span>
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
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-1.5 py-0.5 rounded-full">AI</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">{error || "This influencer profile doesn't exist."}</p>
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
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      {/* Public Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shadow-sm icon-hover-bounce">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-1.5 py-0.5 rounded-full">AI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-[hsl(var(--coral))] text-white hover:opacity-90 btn-animate">Join Free</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary animated-underline">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-primary animated-underline">Browse</Link>
          <span>/</span>
          <span className="text-foreground">{profile.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <AnimatedSection animation="animate-blur-in">
            <Card className="bg-white">
              <CardContent className="pt-6 text-center">
                <div className="w-28 h-28 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-5xl font-bold mx-auto mb-4 overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.name.charAt(0)
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
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
                <p className="text-muted-foreground text-sm mb-4">{profile.bio}</p>

                {profile.location && (
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap justify-center mb-6">
                  {profile.niches.map((niche, nicheIdx) => {
                    const nicheStyles = [
                      'bg-[hsl(var(--bg-coral))] text-[hsl(var(--coral))] border-[hsl(var(--coral)/0.3)]',
                      'bg-[hsl(var(--bg-teal))] text-[hsl(var(--teal))] border-[hsl(var(--teal)/0.3)]',
                      'bg-[hsl(var(--bg-sunflower))] text-[hsl(var(--sunflower))] border-[hsl(var(--sunflower)/0.3)]',
                      'bg-[hsl(var(--bg-rose))] text-[hsl(var(--rose))] border-[hsl(var(--rose)/0.3)]',
                    ];
                    return (
                      <Badge key={niche} variant="outline" className={`hover-pop ${nicheStyles[nicheIdx % nicheStyles.length]}`}>
                        {niche}
                      </Badge>
                    );
                  })}
                </div>

                <Link href="/auth/signup">
                  <Button className="w-full gap-2 bg-[hsl(var(--coral))] text-white hover:opacity-90 btn-animate group">
                    <Sparkles className="w-4 h-4" />
                    Sign Up to Collaborate
                    <ArrowRight className="w-4 h-4 group-hover-arrow" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Stats */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <AnimatedSection animation="animate-pop" delay={150}>
                  <div className="bg-[hsl(var(--bg-blue))] rounded-xl p-4">
                    <div className="text-2xl font-bold text-[hsl(var(--primary))]">{profile.engagementRate}%</div>
                    <div className="text-xs text-[hsl(var(--navy))] opacity-70">Engagement</div>
                  </div>
                  </AnimatedSection>
                  <AnimatedSection animation="animate-pop" delay={250}>
                  <div className="bg-[hsl(var(--bg-coral))] rounded-xl p-4">
                    <div className="text-2xl font-bold text-[hsl(var(--coral))]">{totalFollowers >= 1000000 ? `${(totalFollowers / 1000000).toFixed(1)}M` : totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : totalFollowers}</div>
                    <div className="text-xs text-[hsl(var(--navy))] opacity-70">Total Followers</div>
                  </div>
                  </AnimatedSection>
                  {profile.totalOrders !== undefined && (
                    <AnimatedSection animation="animate-pop" delay={350}>
                    <div className="bg-[hsl(var(--bg-teal))] rounded-xl p-4">
                      <div className="text-2xl font-bold text-[hsl(var(--teal))]">{profile.totalOrders}+</div>
                      <div className="text-xs text-[hsl(var(--navy))] opacity-70">Deals Completed</div>
                    </div>
                    </AnimatedSection>
                  )}
                  {profile.rating !== undefined && (
                    <AnimatedSection animation="animate-pop" delay={450}>
                    <div className="bg-[hsl(var(--bg-sunflower))] rounded-xl p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-[hsl(var(--sunflower))] text-[hsl(var(--sunflower))]" />
                        <span className="text-2xl font-bold text-[hsl(var(--sunflower))]">{profile.rating}</span>
                      </div>
                      <div className="text-xs text-[hsl(var(--navy))] opacity-70">
                        ({profile.reviewCount || 0} reviews)
                      </div>
                    </div>
                    </AnimatedSection>
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
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Social Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {profile.platforms.map((platform, pIdx) => (
                    <div key={platform.platform} className={`flex items-center justify-between p-4 rounded-lg border border-border hover-tilt ${['border-l-primary', 'border-l-coral', 'border-l-teal', 'border-l-rose'][pIdx % 4]}`}>
                      <div className="flex items-center gap-3">
                        {platformIcon(platform.platform)}
                        <div>
                          <p className="font-medium">{platform.platform}</p>
                          <p className="text-sm text-muted-foreground">{platform.handle}</p>
                        </div>
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

            {/* Portfolio */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <AnimatedSection animation="animate-slide-up" delay={300}>
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Past Collaborations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {profile.portfolio.map((item, idx) => (
                      <AnimatedSection key={item.id} animation="animate-flip-in" delay={350 + idx * 100}>
                      <div className="p-4 rounded-lg border border-border border-l-emerald hover-lift">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--bg-teal))] flex items-center justify-center text-[hsl(var(--teal))]">
                            <Award className="w-4 h-4" />
                          </div>
                          <p className="font-medium">{item.brandName}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">{item.date}</p>
                      </div>
                      </AnimatedSection>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </AnimatedSection>
            )}

            {/* CTA */}
            <AnimatedSection animation="animate-scale-in" delay={400}>
            <Card className="bg-[hsl(var(--bg-coral))] border-none">
              <CardContent className="py-8 text-center">
                <Sparkles className="w-10 h-10 text-[hsl(var(--coral))] mx-auto mb-3 icon-hover-wiggle" />
                <h2 className="text-xl font-bold mb-2 text-[hsl(var(--navy))]">Ready to Collaborate?</h2>
                <p className="text-[hsl(var(--navy))] opacity-70 mb-4">
                  Join QuickReach AI to start working with {profile.name} and thousands of other creators.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/auth/signup">
                    <Button size="lg" className="gap-2 bg-[hsl(var(--coral))] text-white hover:opacity-90 btn-animate group">
                      Get Started
                      <ArrowRight className="w-4 h-4 group-hover-arrow" />
                    </Button>
                  </Link>
                  <Link href="/browse">
                    <Button variant="outline" size="lg" className="border-[hsl(var(--coral)/0.3)] text-[hsl(var(--coral))] hover:bg-[hsl(var(--coral)/0.1)] btn-animate">
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
