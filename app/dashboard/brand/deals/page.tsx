"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Deals</h1>
            <p className="text-gray-600">Manage your influencer collaborations</p>
          </div>
          <Link href="/dashboard/brand/discover">
            <Button>Create New Deal</Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({brandDeals.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending ({brandDeals.filter(d => d.status === "pending").length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
          >
            Active ({brandDeals.filter(d => d.status === "active").length})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
          >
            Completed ({brandDeals.filter(d => d.status === "completed").length})
          </Button>
        </div>

        {/* Deals List */}
        <div className="space-y-4">
          {filteredDeals.map((deal) => {
            const influencer = sampleInfluencers.find(inf => inf.id === deal.influencerId);

            return (
              <Card key={deal.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{deal.title}</h3>
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

                      <p className="text-gray-600 mb-4">{deal.description}</p>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600">Influencer</div>
                          <div className="font-medium">{influencer?.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Compensation</div>
                          <div className="font-medium text-purple-600">
                            {formatCurrency(deal.compensation)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Timeline</div>
                          <div className="font-medium">{deal.timeline}</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm text-gray-600 mb-2">Deliverables:</div>
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
                      <Link href={`/dashboard/brand/deals/${deal.id}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                      <Link href={`/dashboard/brand/messages?deal=${deal.id}`}>
                        <Button variant="ghost" size="sm">Message</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredDeals.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No {filter !== "all" ? filter : ""} deals found.</p>
              <Link href="/dashboard/brand/discover">
                <Button>Find Influencers</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
