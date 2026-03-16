"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import Link from "next/link";
import { TrendingUp, FileText, Megaphone, Plus, IndianRupee, Clock, CheckCircle, Users, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { getDealStatusGroup, getDealStatusLabel, getDealStatusBadgeVariant } from "@/lib/utils/deal-status";
import { formatINR, formatDate } from "@/lib/utils/format";

interface DealData {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  creator: {
    creatorProfile?: { name: string } | null;
  };
}

interface CampaignData {
  id: string;
  title: string;
  status: string;
  budget: number;
  createdAt: string;
  _count: { applications: number };
}

export default function BrandDashboard() {
  const { user, loading: authLoading } = useAuth("brand");
  const [deals, setDeals] = useState<DealData[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [dealsRes, campaignsRes] = await Promise.all([
          fetch("/api/deals"),
          fetch("/api/campaigns"),
        ]);

        if (!dealsRes.ok || !campaignsRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const [dealsData, campaignsData] = await Promise.all([
          dealsRes.json(),
          campaignsRes.json(),
        ]);

        setDeals(dealsData.deals || []);
        setCampaigns(campaignsData.campaigns || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const profileComplete = !!user?.brandProfile?.companyName;
  const companyName = user?.brandProfile?.companyName || "Your Brand";

  const activeDeals = deals.filter(d => getDealStatusGroup(d.status) === "active").length;
  const pendingDeals = deals.filter(d => getDealStatusGroup(d.status) === "pending").length;
  const activePosts = campaigns.filter(c => c.status === "ACTIVE").length;
  const totalApplicants = campaigns.reduce((sum, c) => sum + (c._count?.applications || 0), 0);

  const createPostHref = profileComplete
    ? "/dashboard/brand/campaigns?create=true"
    : "/dashboard/brand/profile?complete=true";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-fade-in" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {companyName}!</h1>
            <p className="text-gray-500">Your posts, your creators, your dashboard — all in one place</p>
          </div>
          <Link href={createPostHref}>
            <Button className="w-full sm:w-auto bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2">
              <Plus className="w-4 h-4" />
              Create New Post
            </Button>
          </Link>
        </AnimatedSection>

        {/* KYC Banner */}
        {user && user.kycStatus !== "VERIFIED" && (
          <AnimatedSection animation="animate-slide-up" className="mb-6">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Quick KYC check to unlock everything</p>
                    <p className="text-xs text-amber-600">Verify your identity so you can create posts and lock deals with creators.</p>
                  </div>
                </div>
                <Link href="/dashboard/brand/profile">
                  <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          <AnimatedSection animation="animate-slide-up" delay={0}>
            <div className="rounded-xl bg-[#0E61FF] p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Active Posts</span>
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">{loading ? "–" : activePosts}</div>
              <p className="text-xs text-white/70 mt-1">Currently live</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={100}>
            <div className="rounded-xl bg-amber-500 p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Creator Applications</span>
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">{loading ? "–" : totalApplicants}</div>
              <p className="text-xs text-white/70 mt-1">Awaiting your review</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={200}>
            <div className="rounded-xl bg-emerald-600 p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Active Deals</span>
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">{loading ? "–" : activeDeals}</div>
              <p className="text-xs text-white/70 mt-1">In progress</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={300}>
            <div className="rounded-xl bg-gray-900 p-6 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/90">Pending Proposals</span>
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">{loading ? "–" : pendingDeals}</div>
              <p className="text-xs text-white/70 mt-1">Awaiting response</p>
            </div>
          </AnimatedSection>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Ongoing Posts */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl text-gray-900">Ongoing Posts</CardTitle>
                  <CardDescription className="text-gray-500">Your active creator posts</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns.filter(c => c.status === "ACTIVE").length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No active posts yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.filter(c => c.status === "ACTIVE").slice(0, 3).map((campaign) => (
                        <div key={campaign.id} className="flex flex-wrap items-start justify-between border-b pb-4 last:border-0 rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-all">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{campaign.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {campaign._count?.applications || 0} applicants
                              </span>
                              <span className="flex items-center gap-1">
                                <IndianRupee className="w-3.5 h-3.5" />
                                {Number(campaign.budget).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                          <Link href={`/dashboard/brand/campaigns?post=${campaign.id}`}>
                            <Button size="sm" variant="ghost">View</Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
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
                  <CardTitle className="text-lg sm:text-xl text-gray-900">Ongoing Deals</CardTitle>
                  <CardDescription className="text-gray-500">Active collaborations with creators</CardDescription>
                </CardHeader>
                <CardContent>
                  {deals.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No deals yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {deals.slice(0, 3).map((deal) => (
                        <div key={deal.id} className="flex flex-wrap items-start justify-between border-b pb-4 last:border-0 rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-all">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{deal.title}</h4>
                            <p className="text-sm text-gray-500 mb-2">with {deal.creator?.creatorProfile?.name || "Creator"}</p>
                            <Badge variant={getDealStatusBadgeVariant(deal.status)}>
                              {getDealStatusLabel(deal.status)}
                            </Badge>
                          </div>
                          <Link href={`/dashboard/brand/deals/${deal.id}`}>
                            <Button size="sm" variant="ghost">View</Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/dashboard/brand/deals">
                    <Button variant="outline" className="w-full mt-4">View All Deals</Button>
                  </Link>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        )}
      </div>
    </div>
  );
}
