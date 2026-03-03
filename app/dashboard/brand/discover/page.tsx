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
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-blur-in" className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Influencers</h1>
          <p className="text-muted-foreground">Find the perfect creators for your brand campaigns</p>
        </AnimatedSection>

        {/* Search and Filters */}
        <AnimatedSection animation="animate-slide-up" delay={100}>
          <Card className="mb-6 shadow-md">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                      className="btn-press"
                    >
                      All
                    </Button>
                    {allNiches.map((niche) => (
                      <Button
                        key={niche}
                        size="sm"
                        variant={selectedNiche === niche ? "default" : "outline"}
                        onClick={() => setSelectedNiche(niche)}
                        className="btn-press"
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
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredInfluencers.length} influencer{filteredInfluencers.length !== 1 ? "s" : ""}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer, index) => (
            <AnimatedSection key={influencer.id} animation="animate-slide-up" delay={index * 100}>
              <Card className="shadow-md hover-tilt group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-16 h-16 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center text-white text-2xl font-bold group-hover-scale">
                      {influencer.name.charAt(0)}
                    </div>
                    <Badge className="gap-1 bg-[hsl(var(--coral))] text-white hover:bg-[hsl(var(--coral))] hover-pop">
                      <TrendingUp className="w-3 h-3 group-hover-bounce" />
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
                        <Badge key={niche} className="bg-[hsl(var(--teal))]/15 text-[hsl(var(--teal))] hover:bg-[hsl(var(--teal))]/20 hover-pop">
                          {niche}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 icon-hover-bounce" />
                    {influencer.location}
                  </div>

                  {/* Social Stats */}
                  <div className="space-y-2">
                    {influencer.platforms.map((platform) => (
                      <div key={platform.platform} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {platform.platform === "Instagram" && <Instagram className="w-4 h-4 text-[hsl(var(--rose))] icon-hover-bounce" />}
                          {platform.platform === "YouTube" && <Youtube className="w-4 h-4 text-[hsl(var(--coral))] icon-hover-bounce" />}
                          <span>{platform.platform}</span>
                        </div>
                        <span className="font-medium">{formatNumber(platform.followers)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-2">Starting from</div>
                    <div className="text-2xl font-bold text-[hsl(var(--coral))]">
                      {formatCurrency(influencer.rateCard.postPrice)}
                    </div>
                    <div className="text-xs text-muted-foreground">per post</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/brand/influencers/${influencer.id}`} className="flex-1">
                      <Button className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 btn-animate group">View Profile <span className="group-hover-arrow ml-1">→</span></Button>
                    </Link>
                    <Link href={`/dashboard/brand/deals/new?influencer=${influencer.id}`}>
                      <Button className="bg-[hsl(var(--coral))] text-white hover:bg-[hsl(var(--coral))]/90 btn-animate">Propose Deal</Button>
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
                <p className="text-muted-foreground">No influencers found matching your criteria.</p>
                <Button
                  variant="outline"
                  className="mt-4 btn-animate"
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
