"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sampleBrands } from "@/data/sample-data";
import { Search, Globe, Briefcase } from "lucide-react";
import Link from "next/link";
import { AnimatedSection } from "@/components/ui/animated-section";

export default function InfluencerDiscoverPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const allIndustries = Array.from(
    new Set(sampleBrands.map((brand) => brand.industry))
  );

  const filteredBrands = sampleBrands.filter((brand) => {
    const matchesSearch =
      searchTerm === "" ||
      brand.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesIndustry =
      !selectedIndustry || brand.industry === selectedIndustry;

    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <AnimatedSection animation="animate-blur-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Discover Brands</h1>
            <p className="text-muted-foreground">Find amazing brands to collaborate with</p>
          </div>
        </AnimatedSection>

        {/* Search and Filters */}
        <AnimatedSection animation="animate-slide-up" delay={100}>
        <Card className="mb-6 shadow-md bg-white">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brands by name or industry..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Industry</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className={selectedIndustry === null ? "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90" : ""}
                    variant={selectedIndustry === null ? "default" : "outline"}
                    onClick={() => setSelectedIndustry(null)}
                  >
                    All
                  </Button>
                  {allIndustries.map((industry) => (
                    <Button
                      key={industry}
                      size="sm"
                      className={selectedIndustry === industry ? "bg-[hsl(var(--coral))] text-white hover:bg-[hsl(var(--coral))]/90" : ""}
                      variant={selectedIndustry === industry ? "default" : "outline"}
                      onClick={() => setSelectedIndustry(industry)}
                    >
                      {industry}
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
          Showing {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((brand, index) => (
            <AnimatedSection key={brand.id} animation="animate-flip-in" delay={index * 100}>
              <Card className="shadow-md hover-tilt group bg-white">
                <CardHeader>
                  <div className="w-16 h-16 bg-[hsl(var(--coral))] rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
                    {brand.companyName.charAt(0)}
                  </div>
                  <CardTitle className="text-xl">{brand.companyName}</CardTitle>
                  <CardDescription className="line-clamp-2">{brand.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Industry */}
                  <div>
                    <Badge variant="secondary" className="gap-1 hover-pop">
                      <Briefcase className="w-3 h-3 group-hover-bounce" />
                      {brand.industry}
                    </Badge>
                  </div>

                  {/* Website */}
                  {brand.website && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4 group-hover-bounce" />
                      <span className="truncate">{brand.website}</span>
                    </div>
                  )}

                  {/* Budget */}
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-2">Budget Range</div>
                    <div className="text-xl font-bold text-[hsl(var(--emerald))]">
                      {brand.budgetRange}
                    </div>
                    <div className="text-xs text-muted-foreground">per campaign</div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Looking for</div>
                    <div className="flex gap-2 flex-wrap">
                      {brand.requirements.slice(0, 2).map((req) => (
                        <Badge key={req} variant="outline" className="text-xs hover-pop">
                          {req}
                        </Badge>
                      ))}
                      {brand.requirements.length > 2 && (
                        <Badge variant="outline" className="text-xs hover-pop">
                          +{brand.requirements.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Past Campaigns */}
                  {brand.pastCampaigns.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      ✓ {brand.pastCampaigns.length} successful campaign{brand.pastCampaigns.length !== 1 ? "s" : ""}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/influencer/brands/${brand.id}`} className="flex-1">
                      <Button className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white btn-animate group">
                        View Profile <span className="group-hover-arrow ml-1">→</span>
                      </Button>
                    </Link>
                    <Link href={`/dashboard/influencer/messages?brand=${brand.id}`}>
                      <Button className="bg-[hsl(var(--teal))] hover:bg-[hsl(var(--teal))]/90 text-white btn-animate group">
                        Contact <span className="group-hover-arrow ml-1">→</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {filteredBrands.length === 0 && (
          <AnimatedSection animation="animate-fade-in">
          <Card className="shadow-md bg-white">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No brands found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedIndustry(null);
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
