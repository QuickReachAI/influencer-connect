"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  FileText,
  MessageSquare,
  Search,
  IndianRupee,
  Briefcase,
  Clock,
  LinkIcon,
} from "lucide-react";
import { sampleDeals, sampleInfluencers } from "@/data/sample-data";

export default function InfluencerDashboard() {
  const router = useRouter();
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.push("/auth/login");
      return;
    }

    // Profile completion check — nav banner handles the UI prompt
    localStorage.getItem("infProfileComplete");

    try {
      const raw = localStorage.getItem("infEntities");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setConnectedPlatforms(parsed.map((e: { platform?: string }) => e.platform || "Unknown"));
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [router]);

  const influencerDeals = sampleDeals.filter(
    (deal) => deal.influencerId === "inf-1"
  );

  const activeDealsCount = influencerDeals.filter(
    (d) => d.status === "active"
  ).length;

  const totalEarnings = influencerDeals
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + d.compensation, 0);

  const activeOrPendingDeals = influencerDeals
    .filter((d) => d.status === "active" || d.status === "pending")
    .slice(0, 3);

  const statusColor: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <AnimatedSection animation="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 text-gray-900">
              Welcome back, Sarah!
            </h1>
            <p className="text-gray-500">
              Here&apos;s an overview of your collaborations and earnings
            </p>
          </div>
        </AnimatedSection>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AnimatedSection animation="animate-slide-up" delay={0}>
            <Card className="shadow-sm hover:shadow-md transition-shadow border-none bg-[#0E61FF]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">
                  Active Deals
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {activeDealsCount}
                </div>
                <p className="text-xs text-white/70 mt-1">In progress</p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={80}>
            <Card className="shadow-sm hover:shadow-md transition-shadow border-none bg-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">
                  Pending Proposals
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">3</div>
                <p className="text-xs text-white/70 mt-1">Awaiting response</p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={160}>
            <Card className="shadow-sm hover:shadow-md transition-shadow border-none bg-emerald-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">
                  Total Earnings
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ₹{totalEarnings.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-white/70 mt-1">Lifetime</p>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-slide-up" delay={240}>
            <Card className="shadow-sm hover:shadow-md transition-shadow border-none bg-purple-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">
                  Active Conversations
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">5</div>
                <p className="text-xs text-white/70 mt-1">Ongoing chats</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* Quick Actions Row */}
        <AnimatedSection animation="animate-slide-up" delay={320}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href="/dashboard/influencer/discover" className="group">
              <Card className="shadow-sm hover:shadow-md transition-all border-none bg-blue-50 group-hover:bg-blue-100">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="w-12 h-12 rounded-xl bg-[#0E61FF] flex items-center justify-center shrink-0">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Discover Posts
                    </h3>
                    <p className="text-sm text-gray-500">
                      Find brand opportunities
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/influencer/conversations" className="group">
              <Card className="shadow-sm hover:shadow-md transition-all border-none bg-purple-50 group-hover:bg-purple-100">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      My Conversations
                    </h3>
                    <p className="text-sm text-gray-500">
                      Chat with brands
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/influencer/deals" className="group">
              <Card className="shadow-sm hover:shadow-md transition-all border-none bg-emerald-50 group-hover:bg-emerald-100">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">View Deals</h3>
                    <p className="text-sm text-gray-500">
                      Manage collaborations
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </AnimatedSection>

        {/* Active Deals Section */}
        <AnimatedSection animation="animate-slide-up" delay={400}>
          <Card className="shadow-sm bg-white mb-8">
            <CardHeader>
              <CardTitle className="text-gray-900">Active Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {activeOrPendingDeals.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">
                  No active or pending deals right now.
                </p>
              ) : (
                <div className="space-y-4">
                  {activeOrPendingDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {deal.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge
                            className={`text-xs border ${statusColor[deal.status] || "bg-gray-100 text-gray-600"}`}
                          >
                            {deal.status.charAt(0).toUpperCase() +
                              deal.status.slice(1)}
                          </Badge>
                          <span className="text-sm font-medium text-gray-700">
                            ₹{deal.compensation.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <Link href="/dashboard/influencer/deals">
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-4 shrink-0"
                        >
                          View Deal
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Connected Accounts Preview */}
        <AnimatedSection animation="animate-slide-up" delay={500}>
          <Card className="shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">
                Connected Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectedPlatforms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {connectedPlatforms.map((platform, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      <LinkIcon className="h-3 w-3 mr-1.5" />
                      {platform}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    No accounts connected yet. Link your social profiles to
                    attract more brands.
                  </p>
                  <Link href="/dashboard/influencer/profile">
                    <Button
                      size="sm"
                      className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white ml-4 shrink-0"
                    >
                      Connect Accounts
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
