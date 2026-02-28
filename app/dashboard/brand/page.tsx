"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, GlowSkin Beauty! 👋</h1>
          <p className="text-gray-600">Here's what's happening with your influencer campaigns</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeDeals}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Proposals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingDeals}</div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Influencers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sampleInfluencers.length}</div>
              <p className="text-xs text-muted-foreground">Available to connect</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">New messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deals */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>Your latest collaborations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brandDeals.slice(0, 3).map((deal) => {
                  const influencer = sampleInfluencers.find(inf => inf.id === deal.influencerId);
                  return (
                    <div key={deal.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{deal.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">with {influencer?.name}</p>
                        <Badge
                          variant={
                            deal.status === "active" ? "default" :
                            deal.status === "pending" ? "secondary" :
                            "outline"
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

          {/* Recommended Influencers */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Influencers</CardTitle>
              <CardDescription>Perfect matches for your brand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleInfluencers.slice(0, 3).map((influencer) => (
                  <div key={influencer.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{influencer.name}</h4>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {influencer.niches.slice(0, 2).map((niche) => (
                          <Badge key={niche} variant="secondary">{niche}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">
                        {influencer.platforms[0].followers.toLocaleString()} followers
                      </p>
                    </div>
                    <Link href={`/dashboard/brand/discover?influencer=${influencer.id}`}>
                      <Button size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/brand/discover">
                <Button variant="outline" className="w-full mt-4">Discover More</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your next campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Link href="/dashboard/brand/discover">
                <Button>Find Influencers</Button>
              </Link>
              <Link href="/dashboard/brand/deals">
                <Button variant="outline">View Proposals</Button>
              </Link>
              <Link href="/dashboard/brand/messages">
                <Button variant="outline">Check Messages</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
