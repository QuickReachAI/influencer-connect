"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
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
        <AnimatedSection animation="animate-fade-in" className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Influencers</h1>
          <p className="text-gray-500">Find creators who match your brand's vibe</p>
        </AnimatedSection>

        {/* Search and Filters */}
        <AnimatedSection animation="animate-slide-up" delay={100}>
          <Card className="mb-6 shadow-md">
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
                  <label className="text-sm font-medium text-gray-900 mb-2 block">Filter by Niche</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={selectedNiche === null ? "default" : "outline"}
                      onClick={() => setSelectedNiche(null)}
                      className={selectedNiche === null ? "bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90" : ""}
                    >
                      All
                    </Button>
                    {allNiches.map((niche) => (
                      <Button
                        key={niche}
                        size="sm"
                        variant={selectedNiche === niche ? "default" : "outline"}
                        onClick={() => setSelectedNiche(niche)}
                        className={selectedNiche === niche ? "bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90" : ""}
                      >
                        {niche}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Results */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredInfluencers.length} influencer{filteredInfluencers.length !== 1 ? "s" : ""}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer, index) => (
            <AnimatedSection key={influencer.id} animation="animate-slide-up" delay={index * 100}>
              <Card className="shadow-md card-interactive group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-16 h-16 bg-[#0E61FF] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {influencer.name.charAt(0)}
                    </div>
                    <Badge variant="warning" className="gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {influencer.engagementRate}%
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-gray-900">{influencer.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-gray-500">{influencer.bio}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Niches */}
                  <div>
                    <div className="flex gap-2 flex-wrap">
                      {influencer.niches.map((niche) => (
                        <Badge key={niche} variant="info">
                          {niche}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {influencer.location}
                  </div>

                  {/* Social Stats */}
                  <div className="space-y-2">
                    {influencer.platforms.map((platform) => (
                      <div key={platform.platform} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {platform.platform === "Instagram" && <Instagram className="w-4 h-4 text-pink-500" />}
                          {platform.platform === "YouTube" && <Youtube className="w-4 h-4 text-red-500" />}
                          <span className="text-gray-700">{platform.platform}</span>
                        </div>
                        <span className="font-medium text-gray-900">{formatNumber(platform.followers)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="border-t pt-4">
                    <div className="text-sm text-gray-500 mb-2">Starting from</div>
                    <div className="text-2xl font-bold text-[#0E61FF]">
                      {formatCurrency(influencer.rateCard.postPrice)}
                    </div>
                    <div className="text-xs text-gray-500">per post</div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href={`/dashboard/brand/influencers/${influencer.id}`} className="flex-1">
                      <Button className="w-full bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90 transition-smooth">View Profile →</Button>
                    </Link>
                    <Link href={`/dashboard/brand/deals/new?influencer=${influencer.id}`} className="flex-1 sm:flex-none">
                      <Button className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-600/90 transition-smooth">Propose Deal</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {filteredInfluencers.length === 0 && (
          <AnimatedSection animation="animate-fade-in">
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No creators matched those filters — try broadening your search.</p>
                <Button
                  variant="outline"
                  className="mt-4 transition-smooth"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedNiche(null);
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
