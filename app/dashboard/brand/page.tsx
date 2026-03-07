"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import Link from "next/link";
import { TrendingUp, FileText, Megaphone, Plus, IndianRupee, Clock, CheckCircle, Users } from "lucide-react";
import { sampleDeals, sampleInfluencers } from "@/data/sample-data";

const mockPosts = [
  { id: "post-1", title: "Summer Beauty Collection Launch", status: "ACTIVE", applicants: 12, budget: 50000, createdAt: "2026-02-20" },
  { id: "post-2", title: "Tech Product Review Series", status: "ACTIVE", applicants: 8, budget: 100000, createdAt: "2026-02-25" },
  { id: "post-3", title: "Fitness Challenge Campaign", status: "DRAFT", applicants: 0, budget: 30000, createdAt: "2026-02-28" },
];

export default function BrandDashboard() {
  const router = useRouter();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") { router.push("/auth/login"); return; }
    const cached = localStorage.getItem("brandProfileComplete");
    setProfileComplete(cached === "true");
  }, [router]);

  const brandDeals = sampleDeals.filter(deal => deal.brandId === "brand-1");
  const activeDeals = brandDeals.filter(deal => deal.status === "active").length;
  const pendingDeals = brandDeals.filter(deal => deal.status === "pending").length;
  const activePosts = mockPosts.filter(p => p.status === "ACTIVE").length;
  const totalApplicants = mockPosts.reduce((sum, p) => sum + p.applicants, 0);

  const createPostHref = profileComplete
    ? "/dashboard/brand/campaigns?create=true"
    : "/dashboard/brand/profile?complete=true";

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-fade-in" className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, GlowSkin Beauty!</h1>
            <p className="text-gray-500">Manage your posts and track creator collaborations</p>
          </div>
          <Link href={createPostHref}>
            <Button className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2">
              <Plus className="w-4 h-4" />
              Create New Post
            </Button>
          </Link>
        </AnimatedSection>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <AnimatedSection animation="animate-slide-up" delay={0}>
            <div className="rounded-xl bg-[#0E61FF] p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Active Posts</span>
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-white">{activePosts}</div>
              <p className="text-xs text-white/70 mt-1">Currently live</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={100}>
            <div className="rounded-xl bg-amber-500 p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Creator Applications</span>
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-white">{totalApplicants}</div>
              <p className="text-xs text-white/70 mt-1">Awaiting your review</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={200}>
            <div className="rounded-xl bg-emerald-600 p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Active Deals</span>
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-white">{activeDeals}</div>
              <p className="text-xs text-white/70 mt-1">In progress</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={300}>
            <div className="rounded-xl bg-gray-900 p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Pending Proposals</span>
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-white">{pendingDeals}</div>
              <p className="text-xs text-white/70 mt-1">Awaiting response</p>
            </div>
          </AnimatedSection>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Ongoing Posts */}
          <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900">Ongoing Posts</CardTitle>
                <CardDescription className="text-gray-500">Your active creator posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPosts.filter(p => p.status === "ACTIVE").map((post) => (
                    <div key={post.id} className="flex items-start justify-between border-b pb-4 last:border-0 rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-all">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{post.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {post.applicants} applicants
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {post.budget.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/brand/campaigns?post=${post.id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/brand/campaigns">
                  <Button variant="outline" className="w-full mt-4">View All Posts</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Ongoing Deals */}
          <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900">Ongoing Deals</CardTitle>
                <CardDescription className="text-gray-500">Active collaborations with creators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {brandDeals.slice(0, 3).map((deal) => {
                    const influencer = sampleInfluencers.find(inf => inf.id === deal.influencerId);
                    return (
                      <div key={deal.id} className="flex items-start justify-between border-b pb-4 last:border-0 rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-all">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{deal.title}</h4>
                          <p className="text-sm text-gray-500 mb-2">with {influencer?.name}</p>
                          <Badge
                            variant={
                              deal.status === "active" ? "success"
                                : deal.status === "pending" ? "warning"
                                  : "secondary"
                            }
                          >
                            {deal.status}
                          </Badge>
                        </div>
                        <Link href={`/dashboard/brand/deals/${deal.id}`}>
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <Link href="/dashboard/brand/deals">
                  <Button variant="outline" className="w-full mt-4">View All Deals</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
