"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { TrendingUp, Briefcase, FileText, MessageSquare } from "lucide-react";
import { sampleDeals, sampleBrands } from "@/data/sample-data";
import { AnimatedSection } from "@/components/ui/animated-section";

export default function InfluencerDashboard() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.push("/auth/login");
    }
  }, [router]);

  const influencerDeals = sampleDeals.filter(deal => deal.influencerId === "inf-1");
  const activeDeals = influencerDeals.filter(deal => deal.status === "active").length;
  const pendingDeals = influencerDeals.filter(deal => deal.status === "pending").length;
  const totalEarnings = influencerDeals
    .filter(deal => deal.status === "completed")
    .reduce((sum, deal) => sum + deal.compensation, 0);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <AnimatedSection animation="animate-blur-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, Sarah! 👋</h1>
            <p className="text-muted-foreground">Here's an overview of your collaborations</p>
          </div>
        </AnimatedSection>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <AnimatedSection animation="animate-pop" delay={0}>
            <Card className="shadow-md hover-lift bg-[hsl(var(--primary))] border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Active Deals</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white icon-hover-bounce" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{activeDeals}</div>
                <p className="text-xs text-white/70">In progress</p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-pop" delay={100}>
            <Card className="shadow-md hover-lift bg-[hsl(var(--coral))] border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Pending Offers</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white icon-hover-bounce" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{pendingDeals}</div>
                <p className="text-xs text-white/70">Awaiting your response</p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-pop" delay={200}>
            <Card className="shadow-md hover-lift bg-[hsl(var(--emerald))] border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Total Earnings</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white icon-hover-bounce" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-white/70">This year</p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-pop" delay={300}>
            <Card className="shadow-md hover-lift bg-[hsl(var(--sunflower))] border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">Messages</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white icon-hover-bounce" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">2</div>
                <p className="text-xs text-white/70">New messages</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* Recent Deals */}
        <div className="grid md:grid-cols-2 gap-6">
          <AnimatedSection animation="animate-slide-left" delay={400}>
            <Card className="shadow-md bg-white hover-glow">
              <CardHeader>
                <CardTitle>Recent Collaborations</CardTitle>
                <CardDescription>Your latest brand deals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {influencerDeals.slice(0, 3).map((deal) => {
                    const brand = sampleBrands.find(b => b.id === deal.brandId);
                    return (
                      <div key={deal.id} className="flex items-start justify-between border-b pb-4 last:border-0 hover-glow group rounded-lg p-2 -m-2 transition-all">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{deal.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">with {brand?.companyName}</p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                deal.status === "active" ? "default" :
                                deal.status === "pending" ? "secondary" :
                                "outline"
                              }
                            >
                              {deal.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ${deal.compensation.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/influencer/deals/${deal.id}`}>
                          <Button size="sm" variant="ghost" className="group-hover-scale">View</Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <Link href="/dashboard/influencer/deals">
                  <Button className="w-full mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white btn-animate">View All Deals</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Available Opportunities */}
          <AnimatedSection animation="animate-slide-right" delay={500}>
            <Card className="shadow-md bg-white hover-glow">
              <CardHeader>
                <CardTitle>Brand Opportunities</CardTitle>
                <CardDescription>Brands looking for creators like you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleBrands.slice(0, 3).map((brand) => (
                    <div key={brand.id} className="flex items-start justify-between border-b pb-4 last:border-0 hover-glow group rounded-lg p-2 -m-2 transition-all">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{brand.companyName}</h4>
                        <Badge variant="secondary" className="mb-2">{brand.industry}</Badge>
                        <p className="text-sm text-muted-foreground">{brand.budgetRange}</p>
                      </div>
                      <Link href={`/dashboard/influencer/brands/${brand.id}`}>
                        <Button size="sm" className="group-hover-scale">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/influencer/discover">
                  <Button className="w-full mt-4 bg-[hsl(var(--coral))] hover:bg-[hsl(var(--coral))]/90 text-white btn-animate">Discover More</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* Profile Highlights */}
        <AnimatedSection animation="animate-slide-up" delay={600} className="mt-6">
          <Card className="shadow-md bg-white hover-glow">
            <CardHeader>
              <CardTitle>Your Profile Stats</CardTitle>
              <CardDescription>Keep your profile updated to attract more brands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Instagram Followers</div>
                  <div className="text-2xl font-bold">245K</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Engagement Rate</div>
                  <div className="text-2xl font-bold">4.8%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Niche</div>
                  <div className="flex gap-2">
                    <Badge className="hover-pop">Beauty</Badge>
                    <Badge className="hover-pop">Skincare</Badge>
                  </div>
                </div>
              </div>
              <Link href="/dashboard/influencer/profile">
                <Button className="mt-4 bg-[hsl(var(--teal))] hover:bg-[hsl(var(--teal))]/90 text-white btn-animate">Edit Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Quick Actions */}
        <AnimatedSection animation="animate-bounce-in" delay={700} className="mt-6">
          <Card className="shadow-md bg-white hover-glow">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your collaborations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <Link href="/dashboard/influencer/discover">
                  <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white btn-animate group">
                    Find Brands <span className="group-hover-arrow ml-1">→</span>
                  </Button>
                </Link>
                <Link href="/dashboard/influencer/deals">
                  <Button className="bg-[hsl(var(--coral))] hover:bg-[hsl(var(--coral))]/90 text-white btn-animate group">
                    Review Offers <span className="group-hover-arrow ml-1">→</span>
                  </Button>
                </Link>
                <Link href="/dashboard/influencer/messages">
                  <Button className="bg-[hsl(var(--teal))] hover:bg-[hsl(var(--teal))]/90 text-white btn-animate group">
                    Check Messages <span className="group-hover-arrow ml-1">→</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
