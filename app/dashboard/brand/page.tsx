"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import Link from "next/link";
import { TrendingUp, Users, FileText, MessageSquare } from "lucide-react";
import { sampleDeals, sampleInfluencers } from "@/data/sample-data";

export default function BrandDashboard() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") {
      router.push("/auth/login");
    }
  }, [router]);

  const brandDeals = sampleDeals.filter(deal => deal.brandId === "brand-1");
  const activeDeals = brandDeals.filter(deal => deal.status === "active").length;
  const pendingDeals = brandDeals.filter(deal => deal.status === "pending").length;

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-blur-in" className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, GlowSkin Beauty! 👋</h1>
          <p className="text-muted-foreground">Here's what's happening with your influencer campaigns</p>
        </AnimatedSection>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <AnimatedSection animation="animate-pop" delay={0}>
            <div className="rounded-xl bg-[hsl(var(--primary))] p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Active Deals</span>
                <FileText className="h-5 w-5 text-white icon-hover-bounce" />
              </div>
              <div className="text-3xl font-bold text-white">{activeDeals}</div>
              <p className="text-xs text-white/70 mt-1">Currently running</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-pop" delay={100}>
            <div className="rounded-xl bg-[hsl(var(--coral))] p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Pending Proposals</span>
                <TrendingUp className="h-5 w-5 text-white icon-hover-bounce" />
              </div>
              <div className="text-3xl font-bold text-white">{pendingDeals}</div>
              <p className="text-xs text-white/70 mt-1">Awaiting response</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-pop" delay={200}>
            <div className="rounded-xl bg-[hsl(var(--emerald))] p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Total Influencers</span>
                <Users className="h-5 w-5 text-white icon-hover-bounce" />
              </div>
              <div className="text-3xl font-bold text-white">{sampleInfluencers.length}</div>
              <p className="text-xs text-white/70 mt-1">Available to connect</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-pop" delay={300}>
            <div className="rounded-xl bg-[hsl(var(--sunflower))] p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Messages</span>
                <MessageSquare className="h-5 w-5 text-white icon-hover-bounce" />
              </div>
              <div className="text-3xl font-bold text-white">3</div>
              <p className="text-xs text-white/70 mt-1">New messages</p>
            </div>
          </AnimatedSection>
        </div>

        {/* Recent Deals */}
        <div className="grid md:grid-cols-2 gap-6">
          <AnimatedSection animation="animate-slide-left" delay={100}>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recent Deals</CardTitle>
                <CardDescription>Your latest collaborations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {brandDeals.slice(0, 3).map((deal) => {
                    const influencer = sampleInfluencers.find(inf => inf.id === deal.influencerId);
                    return (
                      <div key={deal.id} className="flex items-start justify-between border-b pb-4 last:border-0 hover-glow group rounded-lg p-2 -mx-2">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{deal.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">with {influencer?.name}</p>
                          <Badge
                            className={
                              deal.status === "active"
                                ? "bg-[hsl(var(--emerald))] text-white hover:bg-[hsl(var(--emerald))]"
                                : deal.status === "pending"
                                  ? "bg-[hsl(var(--sunflower))] text-white hover:bg-[hsl(var(--sunflower))]"
                                  : "bg-[hsl(var(--muted))] text-[hsl(var(--navy))]"
                            }
                          >
                            {deal.status}
                          </Badge>
                        </div>
                        <Link href={`/dashboard/brand/deals/${deal.id}`}>
                          <Button size="sm" variant="ghost" className="group-hover-arrow">View</Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <Link href="/dashboard/brand/deals">
                  <Button variant="outline" className="w-full mt-4 btn-animate">View All Deals</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Recommended Influencers */}
          <AnimatedSection animation="animate-slide-right" delay={200}>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recommended Influencers</CardTitle>
                <CardDescription>Perfect matches for your brand</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleInfluencers.slice(0, 3).map((influencer) => (
                    <div key={influencer.id} className="flex items-start justify-between border-b pb-4 last:border-0 hover-glow group rounded-lg p-2 -mx-2">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{influencer.name}</h4>
                        <div className="flex gap-2 flex-wrap mb-2">
                          {influencer.niches.slice(0, 2).map((niche) => (
                            <Badge key={niche} className="bg-[hsl(var(--teal))]/15 text-[hsl(var(--teal))] hover:bg-[hsl(var(--teal))]/20">{niche}</Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {influencer.platforms[0].followers.toLocaleString()} followers
                        </p>
                      </div>
                      <Link href={`/dashboard/brand/discover?influencer=${influencer.id}`}>
                        <Button size="sm" className="group-hover-arrow">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/brand/discover">
                  <Button variant="outline" className="w-full mt-4 btn-animate">Discover More</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* Quick Actions */}
        <AnimatedSection animation="animate-flip-in" delay={300} className="mt-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your next campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <Link href="/dashboard/brand/discover">
                  <Button className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 btn-animate group">Find Influencers <span className="group-hover-arrow ml-1">→</span></Button>
                </Link>
                <Link href="/dashboard/brand/deals">
                  <Button className="bg-[hsl(var(--coral))] text-white hover:bg-[hsl(var(--coral))]/90 btn-animate group">View Proposals <span className="group-hover-arrow ml-1">→</span></Button>
                </Link>
                <Link href="/dashboard/brand/messages">
                  <Button variant="outline" className="btn-animate group">Check Messages <span className="group-hover-arrow ml-1">→</span></Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
