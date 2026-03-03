"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sampleDeals, sampleBrands } from "@/data/sample-data";
import { formatCurrency } from "@/lib/utils";
import { FileText, Clock, CheckCircle, XCircle, Check, X } from "lucide-react";
import Link from "next/link";
import { AnimatedSection } from "@/components/ui/animated-section";

export default function InfluencerDealsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");

  const influencerDeals = sampleDeals.filter(deal => deal.influencerId === "inf-1");

  const filteredDeals = filter === "all"
    ? influencerDeals
    : influencerDeals.filter(deal => deal.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "active":
        return <FileText className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <AnimatedSection animation="animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900">My Deals</h1>
              <p className="text-gray-500">Manage your brand collaborations</p>
            </div>
            <Link href="/dashboard/influencer/discover">
              <Button className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white btn-premium">
                Find Brands →
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            className={filter === "all" ? "bg-gray-900 text-white hover:bg-gray-900/90" : ""}
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({influencerDeals.length})
          </Button>
          <Button
            className={filter === "pending" ? "bg-amber-500 text-white hover:bg-amber-500/90" : ""}
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending ({influencerDeals.filter(d => d.status === "pending").length})
          </Button>
          <Button
            className={filter === "active" ? "bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90" : ""}
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
          >
            Active ({influencerDeals.filter(d => d.status === "active").length})
          </Button>
          <Button
            className={filter === "completed" ? "bg-emerald-600 text-white hover:bg-emerald-600/90" : ""}
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
          >
            Completed ({influencerDeals.filter(d => d.status === "completed").length})
          </Button>
        </div>

        {/* Deals List */}
        <div className="space-y-4">
          {filteredDeals.map((deal, index) => {
            const brand = sampleBrands.find(b => b.id === deal.brandId);

            return (
              <AnimatedSection key={deal.id} animation="animate-slide-up" delay={index * 100}>
                <Card className="shadow-md hover-lift group bg-white">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{deal.title}</h3>
                          <Badge
                            variant={
                              deal.status === "active" ? "default" :
                              deal.status === "pending" ? "secondary" :
                              deal.status === "completed" ? "outline" :
                              "destructive"
                            }
                            className="gap-1"
                          >
                            {getStatusIcon(deal.status)}
                            {deal.status}
                          </Badge>
                        </div>

                        <p className="text-gray-500 mb-4">{deal.description}</p>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-500">Brand</div>
                            <div className="font-medium text-gray-900">{brand?.companyName}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Compensation</div>
                            <div className="font-medium text-emerald-600">
                              {formatCurrency(deal.compensation)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Timeline</div>
                            <div className="font-medium text-gray-900">{deal.timeline}</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-gray-500 mb-2">Deliverables:</div>
                          <div className="flex gap-2 flex-wrap">
                            {deal.deliverables.map((deliverable, idx) => (
                              <Badge key={idx} variant="outline">
                                {deliverable}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Created: {new Date(deal.createdAt).toLocaleDateString()} •
                          Updated: {new Date(deal.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {deal.status === "pending" && (
                          <>
                            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-600/90 text-white btn-premium">
                              <Check className="w-4 h-4" />
                              Accept
                            </Button>
                            <Button size="sm" className="gap-1 bg-red-600 hover:bg-red-600/90 text-white btn-premium">
                              <X className="w-4 h-4" />
                              Decline
                            </Button>
                          </>
                        )}
                        <Link href={`/dashboard/influencer/deals/${deal.id}`}>
                          <Button size="sm" className="w-full bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white btn-premium">View Details</Button>
                        </Link>
                        <Link href={`/dashboard/influencer/messages?deal=${deal.id}`}>
                          <Button size="sm" className="w-full bg-gray-900 hover:bg-gray-900/90 text-white btn-premium">Message</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            );
          })}
        </div>

        {filteredDeals.length === 0 && (
          <AnimatedSection animation="animate-fade-in">
            <Card className="shadow-md bg-white">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">No {filter !== "all" ? filter : ""} deals found.</p>
                <Link href="/dashboard/influencer/discover">
                  <Button className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white btn-premium">Find Brands</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
