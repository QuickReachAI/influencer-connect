"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sampleInfluencers } from "@/data/sample-data";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Search, MapPin, Instagram, Youtube, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function BrandDiscoverPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);

  const allNiches = Array.from(
    new Set(sampleInfluencers.flatMap((inf) => inf.niches))
  );

  const filteredInfluencers = sampleInfluencers.filter((influencer) => {
    const matchesSearch =
      searchTerm === "" ||
      influencer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      influencer.bio.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNiche =
      !selectedNiche || influencer.niches.includes(selectedNiche);

    return matchesSearch && matchesNiche;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Influencers</h1>
          <p className="text-gray-600">Find the perfect creators for your brand campaigns</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, niche, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Niche</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={selectedNiche === null ? "default" : "outline"}
                    onClick={() => setSelectedNiche(null)}
                  >
                    All
                  </Button>
                  {allNiches.map((niche) => (
                    <Button
                      key={niche}
                      size="sm"
                      variant={selectedNiche === niche ? "default" : "outline"}
                      onClick={() => setSelectedNiche(niche)}
                    >
                      {niche}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredInfluencers.length} influencer{filteredInfluencers.length !== 1 ? "s" : ""}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer) => (
            <Card key={influencer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {influencer.name.charAt(0)}
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {influencer.engagementRate}%
                  </Badge>
                </div>
                <CardTitle className="text-xl">{influencer.name}</CardTitle>
                <CardDescription className="line-clamp-2">{influencer.bio}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Niches */}
                <div>
                  <div className="flex gap-2 flex-wrap">
                    {influencer.niches.map((niche) => (
                      <Badge key={niche} variant="outline">
                        {niche}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {influencer.location}
                </div>

                {/* Social Stats */}
                <div className="space-y-2">
                  {influencer.platforms.map((platform) => (
                    <div key={platform.platform} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {platform.platform === "Instagram" && <Instagram className="w-4 h-4 text-pink-600" />}
                        {platform.platform === "YouTube" && <Youtube className="w-4 h-4 text-red-600" />}
                        <span>{platform.platform}</span>
                      </div>
                      <span className="font-medium">{formatNumber(platform.followers)}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">Starting from</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(influencer.rateCard.postPrice)}
                  </div>
                  <div className="text-xs text-gray-500">per post</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/brand/influencers/${influencer.id}`} className="flex-1">
                    <Button className="w-full">View Profile</Button>
                  </Link>
                  <Link href={`/dashboard/brand/deals/new?influencer=${influencer.id}`}>
                    <Button variant="outline">Propose Deal</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInfluencers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No influencers found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedNiche(null);
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
