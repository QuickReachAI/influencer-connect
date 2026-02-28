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
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Brands</h1>
          <p className="text-gray-600">Find amazing brands to collaborate with</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                    variant={selectedIndustry === null ? "default" : "outline"}
                    onClick={() => setSelectedIndustry(null)}
                  >
                    All
                  </Button>
                  {allIndustries.map((industry) => (
                    <Button
                      key={industry}
                      size="sm"
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

        {/* Results */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {brand.companyName.charAt(0)}
                </div>
                <CardTitle className="text-xl">{brand.companyName}</CardTitle>
                <CardDescription className="line-clamp-2">{brand.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Industry */}
                <div>
                  <Badge variant="secondary" className="gap-1">
                    <Briefcase className="w-3 h-3" />
                    {brand.industry}
                  </Badge>
                </div>

                {/* Website */}
                {brand.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="w-4 h-4" />
                    <span className="truncate">{brand.website}</span>
                  </div>
                )}

                {/* Budget */}
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">Budget Range</div>
                  <div className="text-xl font-bold text-purple-600">
                    {brand.budgetRange}
                  </div>
                  <div className="text-xs text-gray-500">per campaign</div>
                </div>

                {/* Requirements */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Looking for</div>
                  <div className="flex gap-2 flex-wrap">
                    {brand.requirements.slice(0, 2).map((req) => (
                      <Badge key={req} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                    {brand.requirements.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{brand.requirements.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Past Campaigns */}
                {brand.pastCampaigns.length > 0 && (
                  <div className="text-sm text-gray-600">
                    ✓ {brand.pastCampaigns.length} successful campaign{brand.pastCampaigns.length !== 1 ? "s" : ""}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/influencer/brands/${brand.id}`} className="flex-1">
                    <Button className="w-full">View Profile</Button>
                  </Link>
                  <Link href={`/dashboard/influencer/messages?brand=${brand.id}`}>
                    <Button variant="outline">Contact</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBrands.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No brands found matching your criteria.</p>
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
        )}
      </div>
    </div>
  );
}
