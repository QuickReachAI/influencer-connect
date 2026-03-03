"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { sampleDeals, sampleInfluencers } from "@/data/sample-data";
import { formatCurrency } from "@/lib/utils";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function BrandDealsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");

  const brandDeals = sampleDeals.filter(deal => deal.brandId === "brand-1");

  const filteredDeals = filter === "all"
    ? brandDeals
    : brandDeals.filter(deal => deal.status === filter);

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
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-blur-in" className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Deals</h1>
            <p className="text-muted-foreground">Manage your influencer collaborations</p>
          </div>
          <Link href="/dashboard/brand/discover">
            <Button className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 btn-animate">Create New Deal</Button>
          </Link>
        </AnimatedSection>

        {/* Filter Tabs */}
        <AnimatedSection animation="animate-fade-in" delay={100} className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="btn-press"
          >
            All ({brandDeals.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
            className="btn-press"
          >
            Pending ({brandDeals.filter(d => d.status === "pending").length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            className="btn-press"
          >
            Active ({brandDeals.filter(d => d.status === "active").length})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            className="btn-press"
          >
            Completed ({brandDeals.filter(d => d.status === "completed").length})
          </Button>
        </AnimatedSection>

        {/* Deals List */}
        <div className="space-y-4">
          {filteredDeals.map((deal, index) => {
            const influencer = sampleInfluencers.find(inf => inf.id === deal.influencerId);

            return (
              <AnimatedSection key={deal.id} animation="animate-slide-up" delay={index * 100}>
                <Card className="shadow-md hover-tilt group">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{deal.title}</h3>
                          <Badge
                            className={`gap-1 hover-pop ${
                              deal.status === "active"
                                ? "bg-[hsl(var(--emerald))] text-white hover:bg-[hsl(var(--emerald))]"
                                : deal.status === "pending"
                                  ? "bg-[hsl(var(--sunflower))] text-white hover:bg-[hsl(var(--sunflower))]"
                                  : deal.status === "completed"
                                    ? "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]"
                                    : "bg-[hsl(var(--rose))] text-white hover:bg-[hsl(var(--rose))]"
                            }`}
                          >
                            {getStatusIcon(deal.status)}
                            {deal.status}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-4">{deal.description}</p>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Influencer</div>
                            <div className="font-medium">{influencer?.name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Compensation</div>
                            <div className="font-medium text-[hsl(var(--coral))]">
                              {formatCurrency(deal.compensation)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Timeline</div>
                            <div className="font-medium">{deal.timeline}</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm text-muted-foreground mb-2">Deliverables:</div>
                          <div className="flex gap-2 flex-wrap">
                            {deal.deliverables.map((deliverable, idx) => (
                              <Badge key={idx} className="bg-[hsl(var(--teal))]/15 text-[hsl(var(--teal))] hover:bg-[hsl(var(--teal))]/20 hover-pop">
                                {deliverable}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(deal.createdAt).toLocaleDateString()} •
                          Updated: {new Date(deal.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Link href={`/dashboard/brand/deals/${deal.id}`}>
                          <Button variant="outline" size="sm" className="btn-animate">View Details</Button>
                        </Link>
                        <Link href={`/dashboard/brand/messages?deal=${deal.id}`}>
                          <Button variant="ghost" size="sm" className="btn-animate">Message</Button>
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
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No {filter !== "all" ? filter : ""} deals found.</p>
                <Link href="/dashboard/brand/discover">
                  <Button className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 btn-animate">Find Influencers</Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
