"use client";

import { useEffect, useState } from "react";
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
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { getDealStatusGroup, getDealStatusLabel, getDealStatusColor } from "@/lib/utils/deal-status";
import { formatINR } from "@/lib/utils/format";

interface DealData {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
  _count: { chatMessages: number };
}

interface SocialEntity {
  id: string;
  platform: string;
  handle: string;
  followerCount: number;
}

export default function InfluencerDashboard() {
  const { user, loading: authLoading } = useAuth("influencer");
  const [deals, setDeals] = useState<DealData[]>([]);
  const [entities, setEntities] = useState<SocialEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [dealsRes, entitiesRes] = await Promise.all([
          fetch("/api/deals"),
          fetch("/api/social-entities"),
        ]);

        if (dealsRes.ok) {
          const d = await dealsRes.json();
          setDeals(d.deals || []);
        }
        if (entitiesRes.ok) {
          const e = await entitiesRes.json();
          const list = e.entities ?? (Array.isArray(e) ? e : []);
          setEntities(list);
        }
      } catch {
        // silently fail — dashboard shows empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const displayName = user?.creatorProfile?.name || "Creator";

  const activeDealsCount = deals.filter(d => getDealStatusGroup(d.status) === "active").length;
  const pendingCount = deals.filter(d => getDealStatusGroup(d.status) === "pending").length;
  const totalEarnings = deals
    .filter(d => d.status === "COMPLETED")
    .reduce((sum, d) => sum + Number(d.totalAmount), 0);
  const activeConversations = deals.filter(d => (d._count?.chatMessages || 0) > 0).length;

  const activeOrPendingDeals = deals
    .filter(d => {
      const g = getDealStatusGroup(d.status);
      return g === "active" || g === "pending";
    })
    .slice(0, 3);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <AnimatedSection animation="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900">
              Welcome back, {displayName}!
            </h1>
            <p className="text-gray-500">
              Here&apos;s what&apos;s happening with your collabs and earnings
            </p>
          </div>
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
                    <p className="text-xs text-amber-600">Verify your identity so you can start accepting deals and getting paid.</p>
                  </div>
                </div>
                <Link href="/dashboard/influencer/profile">
                  <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
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
                  {loading ? "–" : activeDealsCount}
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
                <div className="text-2xl font-bold text-white">
                  {loading ? "–" : pendingCount}
                </div>
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
                  {loading ? "–" : formatINR(totalEarnings)}
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
                <div className="text-2xl font-bold text-white">
                  {loading ? "–" : activeConversations}
                </div>
                <p className="text-xs text-white/70 mt-1">Ongoing chats</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* Quick Actions Row */}
        <AnimatedSection animation="animate-slide-up" delay={320}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-8">
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
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : activeOrPendingDeals.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">
                  No deals cooking right now — go discover some brand posts!
                </p>
              ) : (
                <div className="space-y-4">
                  {activeOrPendingDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {deal.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge
                            className={`text-xs border ${getDealStatusColor(deal.status)}`}
                          >
                            {getDealStatusLabel(deal.status)}
                          </Badge>
                          <span className="text-sm font-medium text-gray-700">
                            {formatINR(Number(deal.totalAmount))}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/influencer/deals`} className="w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto sm:ml-4 shrink-0"
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
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : entities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {entities.map((entity) => (
                    <Badge
                      key={entity.id}
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      <LinkIcon className="h-3 w-3 mr-1.5" />
                      {entity.platform} — @{entity.handle}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="text-sm text-gray-500">
                    No socials linked yet — connect your profiles to get on brands&apos; radar.
                  </p>
                  <Link href="/dashboard/influencer/profile">
                    <Button
                      size="sm"
                      className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white shrink-0"
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
