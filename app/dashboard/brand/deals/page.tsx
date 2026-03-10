"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { useAuth } from "@/lib/hooks/use-auth";
import { getDealStatusGroup, getDealStatusLabel, getDealStatusBadgeVariant } from "@/lib/utils/deal-status";
import { formatINR, formatDate } from "@/lib/utils/format";
import { FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface DealData {
  id: string;
  title: string;
  description?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    creatorProfile?: { name: string; avatar?: string } | null;
  };
  _count: { deliverables: number; chatMessages: number };
}

type FilterGroup = "all" | "pending" | "active" | "completed" | "cancelled";

export default function BrandDealsPage() {
  const { user, loading: authLoading } = useAuth("brand");
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [deals, setDeals] = useState<DealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchDeals() {
      try {
        const res = await fetch("/api/deals");
        if (!res.ok) throw new Error("Failed to load deals");
        const data = await res.json();
        setDeals(data.deals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, [user]);

  const filteredDeals = filter === "all"
    ? deals
    : deals.filter(d => getDealStatusGroup(d.status) === filter);

  const countByGroup = (group: FilterGroup) =>
    group === "all" ? deals.length : deals.filter(d => getDealStatusGroup(d.status) === group).length;

  const getStatusIcon = (status: string) => {
    const group = getDealStatusGroup(status);
    switch (group) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "active": return <FileText className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

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
        <AnimatedSection animation="animate-fade-in" className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Deals</h1>
            <p className="text-gray-500">Track and manage your creator collaborations. Deals are created when you and a creator agree terms via chat on your posts.</p>
          </div>
        </AnimatedSection>

        {/* Filter Tabs */}
        <AnimatedSection animation="animate-fade-in" delay={100} className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "active", "completed", "cancelled"] as FilterGroup[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90" : ""}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({countByGroup(f)})
            </Button>
          ))}
        </AnimatedSection>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Deals List */}
            <div className="space-y-4">
              {filteredDeals.map((deal, index) => (
                <AnimatedSection key={deal.id} animation="animate-slide-up" delay={index * 100}>
                  <Card className="shadow-md card-interactive group">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{deal.title}</h3>
                            <Badge
                              variant={getDealStatusBadgeVariant(deal.status)}
                              className="gap-1"
                            >
                              {getStatusIcon(deal.status)}
                              {getDealStatusLabel(deal.status)}
                            </Badge>
                          </div>

                          {deal.description && (
                            <p className="text-gray-500 mb-4">{deal.description}</p>
                          )}

                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <div className="text-sm text-gray-500">Creator</div>
                              <div className="font-medium text-gray-900">
                                {deal.creator?.creatorProfile?.name || "Creator"}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Compensation</div>
                              <div className="font-medium text-[#0E61FF]">
                                {formatINR(Number(deal.totalAmount))}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Deliverables</div>
                              <div className="font-medium text-gray-900">
                                {deal._count?.deliverables || 0} items
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500">
                            Created: {formatDate(deal.createdAt)} •
                            Updated: {formatDate(deal.updatedAt)}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-0 sm:ml-4">
                          <Link href={`/dashboard/brand/deals/${deal.id}`}>
                            <Button variant="outline" size="sm" className="transition-smooth">View Details</Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>

            {filteredDeals.length === 0 && (
              <AnimatedSection animation="animate-fade-in">
                <Card className="shadow-md">
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500 mb-4">No {filter !== "all" ? filter : ""} deals found.</p>
                    <Link href="/dashboard/brand/campaigns">
                      <Button className="bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90 transition-smooth">Go to Posts</Button>
                    </Link>
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}
