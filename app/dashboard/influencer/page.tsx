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
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, Sarah! 👋</h1>
          <p className="text-gray-600">Here's an overview of your collaborations</p>
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
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingDeals}</div>
              <p className="text-xs text-muted-foreground">Awaiting your response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This year</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">New messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deals */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Collaborations</CardTitle>
              <CardDescription>Your latest brand deals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {influencerDeals.slice(0, 3).map((deal) => {
                  const brand = sampleBrands.find(b => b.id === deal.brandId);
                  return (
                    <div key={deal.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{deal.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">with {brand?.companyName}</p>
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
                          <span className="text-sm text-gray-600">
                            ${deal.compensation.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/influencer/deals/${deal.id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
              <Link href="/dashboard/influencer/deals">
                <Button variant="outline" className="w-full mt-4">View All Deals</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Available Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Opportunities</CardTitle>
              <CardDescription>Brands looking for creators like you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleBrands.slice(0, 3).map((brand) => (
                  <div key={brand.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{brand.companyName}</h4>
                      <Badge variant="secondary" className="mb-2">{brand.industry}</Badge>
                      <p className="text-sm text-gray-600">{brand.budgetRange}</p>
                    </div>
                    <Link href={`/dashboard/influencer/brands/${brand.id}`}>
                      <Button size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/influencer/discover">
                <Button variant="outline" className="w-full mt-4">Discover More</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Profile Highlights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Profile Stats</CardTitle>
            <CardDescription>Keep your profile updated to attract more brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Instagram Followers</div>
                <div className="text-2xl font-bold">245K</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Engagement Rate</div>
                <div className="text-2xl font-bold">4.8%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Niche</div>
                <div className="flex gap-2">
                  <Badge>Beauty</Badge>
                  <Badge>Skincare</Badge>
                </div>
              </div>
            </div>
            <Link href="/dashboard/influencer/profile">
              <Button variant="outline" className="mt-4">Edit Profile</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your collaborations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Link href="/dashboard/influencer/discover">
                <Button>Find Brands</Button>
              </Link>
              <Link href="/dashboard/influencer/deals">
                <Button variant="outline">Review Offers</Button>
              </Link>
              <Link href="/dashboard/influencer/messages">
                <Button variant="outline">Check Messages</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
