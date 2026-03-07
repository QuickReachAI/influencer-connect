"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import {
  Building2,
  Users,
  IndianRupee,
  Loader2,
  Send,
  ChevronDown,
  X,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Link as LinkIcon,
} from "lucide-react";

interface Post {
  id: string;
  brandName: string;
  brandLogo: string;
  title: string;
  description: string;
  niches: string[];
  budgetMin: number;
  budgetMax: number;
  minFollowers: number;
  maxFollowers: number;
  platforms: string[];
  creatives: { format: string; durationSeconds: number }[];
  shouldCreatorPost: boolean;
  postedAt: string;
  applicants: number;
}

const mockPosts: Post[] = [
  {
    id: "post-1",
    brandName: "GlowSkin Beauty",
    brandLogo: "",
    title: "Summer Skincare Collection Launch",
    description:
      "Looking for beauty creators to showcase our new summer skincare line. Must create engaging content highlighting product benefits.",
    niches: ["Beauty", "Skincare"],
    budgetMin: 20000,
    budgetMax: 50000,
    minFollowers: 10000,
    maxFollowers: 500000,
    platforms: ["Instagram", "YouTube"],
    creatives: [
      { format: "REEL_SHORT", durationSeconds: 30 },
      { format: "REEL_SHORT", durationSeconds: 60 },
    ],
    shouldCreatorPost: true,
    postedAt: "2026-02-28",
    applicants: 8,
  },
  {
    id: "post-2",
    brandName: "TechNova Gadgets",
    brandLogo: "",
    title: "Flagship Phone Review Campaign",
    description:
      "Need tech reviewers for our latest smartphone. Detailed honest review with camera comparisons.",
    niches: ["Technology", "Gadgets"],
    budgetMin: 50000,
    budgetMax: 150000,
    minFollowers: 50000,
    maxFollowers: 2000000,
    platforms: ["YouTube"],
    creatives: [{ format: "LONG_FORM", durationSeconds: 600 }],
    shouldCreatorPost: true,
    postedAt: "2026-02-25",
    applicants: 15,
  },
  {
    id: "post-3",
    brandName: "FitLife Nutrition",
    brandLogo: "",
    title: "Protein Supplement Creator Partnership",
    description:
      "Partner with us for a 3-month content series about fitness nutrition and our protein range.",
    niches: ["Fitness", "Health"],
    budgetMin: 30000,
    budgetMax: 80000,
    minFollowers: 5000,
    maxFollowers: 200000,
    platforms: ["Instagram", "YouTube", "Facebook"],
    creatives: [
      { format: "REEL_SHORT", durationSeconds: 45 },
      { format: "REEL_SHORT", durationSeconds: 30 },
      { format: "LONG_FORM", durationSeconds: 480 },
    ],
    shouldCreatorPost: true,
    postedAt: "2026-02-20",
    applicants: 22,
  },
  {
    id: "post-4",
    brandName: "Urban Threads",
    brandLogo: "",
    title: "Street Style Fashion Lookbook",
    description:
      "Create a lookbook featuring our latest street fashion collection. Creative freedom encouraged.",
    niches: ["Fashion", "Lifestyle"],
    budgetMin: 15000,
    budgetMax: 40000,
    minFollowers: 5000,
    maxFollowers: 100000,
    platforms: ["Instagram"],
    creatives: [{ format: "REEL_SHORT", durationSeconds: 60 }],
    shouldCreatorPost: true,
    postedAt: "2026-02-18",
    applicants: 30,
  },
  {
    id: "post-5",
    brandName: "Foodie Haven",
    brandLogo: "",
    title: "Restaurant Chain Food Review Series",
    description:
      "Visit our restaurants and create authentic food review content. Multiple cities covered.",
    niches: ["Food", "Travel"],
    budgetMin: 10000,
    budgetMax: 25000,
    minFollowers: 2000,
    maxFollowers: 50000,
    platforms: ["Instagram", "YouTube"],
    creatives: [{ format: "REEL_SHORT", durationSeconds: 30 }],
    shouldCreatorPost: false,
    postedAt: "2026-02-15",
    applicants: 45,
  },
];

const ALL_NICHES = [
  "Beauty",
  "Skincare",
  "Technology",
  "Gadgets",
  "Fitness",
  "Health",
  "Fashion",
  "Lifestyle",
  "Food",
  "Travel",
];

const ALL_PLATFORMS = ["Instagram", "YouTube", "Facebook"] as const;

const platformColors: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700 border-pink-200",
  YouTube: "bg-red-100 text-red-700 border-red-200",
  Facebook: "bg-blue-100 text-blue-700 border-blue-200",
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function summarizeCreatives(creatives: { format: string; durationSeconds: number }[]): string {
  const reels = creatives.filter((c) => c.format === "REEL_SHORT").length;
  const long = creatives.filter((c) => c.format === "LONG_FORM").length;
  const parts: string[] = [];
  if (reels > 0) parts.push(`${reels} Reel${reels > 1 ? "s" : ""}`);
  if (long > 0) parts.push(`${long} Long Video${long > 1 ? "s" : ""}`);
  if (parts.length === 0) return `${creatives.length} Creative${creatives.length > 1 ? "s" : ""}`;
  return parts.join(", ");
}

interface AppliedInfo {
  rate: number;
}

export default function InfluencerDiscoverPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Filters
  const [selectedNiches, setSelectedNiches] = useState<Set<string>>(new Set());
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  // Proposal
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [pitchMessage, setPitchMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Applied tracking
  const [appliedPosts, setAppliedPosts] = useState<Map<string, AppliedInfo>>(new Map());

  // Entities from localStorage
  const [entities, setEntities] = useState<{ id: string; platform: string; handle: string; followerCount: number }[]>([]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.replace("/");
      return;
    }

    const profileComplete = localStorage.getItem("infProfileComplete");
    if (profileComplete !== "true") {
      router.replace("/dashboard/influencer/profile?complete=true");
      return;
    }

    try {
      const raw = localStorage.getItem("infEntities");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEntities(parsed);
          if (parsed.length > 0) setSelectedEntityId(parsed[0].id);
        }
      }
    } catch {
      // ignore
    }

    setReady(true);
  }, [router]);

  const hasActiveFilters =
    selectedNiches.size > 0 ||
    selectedPlatforms.size > 0 ||
    minBudget !== "" ||
    maxBudget !== "";

  const filteredPosts = useMemo(() => {
    return mockPosts.filter((post) => {
      if (selectedNiches.size > 0) {
        const match = post.niches.some((n) => selectedNiches.has(n));
        if (!match) return false;
      }
      if (selectedPlatforms.size > 0) {
        const match = post.platforms.some((p) => selectedPlatforms.has(p));
        if (!match) return false;
      }
      const minB = minBudget ? parseInt(minBudget, 10) : 0;
      const maxB = maxBudget ? parseInt(maxBudget, 10) : Infinity;
      if (minB && post.budgetMax < minB) return false;
      if (maxB !== Infinity && post.budgetMin > maxB) return false;
      return true;
    });
  }, [selectedNiches, selectedPlatforms, minBudget, maxBudget]);

  function toggleNiche(niche: string) {
    setSelectedNiches((prev) => {
      const next = new Set(prev);
      if (next.has(niche)) next.delete(niche);
      else next.add(niche);
      return next;
    });
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  function clearAllFilters() {
    setSelectedNiches(new Set());
    setSelectedPlatforms(new Set());
    setMinBudget("");
    setMaxBudget("");
  }

  function openProposal(postId: string) {
    setExpandedPostId(postId);
    setProposedRate("");
    setPitchMessage("");
    if (entities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(entities[0].id);
    }
  }

  function cancelProposal() {
    setExpandedPostId(null);
    setProposedRate("");
    setPitchMessage("");
  }

  async function submitProposal(postId: string) {
    if (!selectedEntityId) {
      toast.error("Please select an account to apply with.");
      return;
    }
    if (!proposedRate || parseInt(proposedRate, 10) <= 0) {
      toast.error("Please enter a valid proposed rate.");
      return;
    }
    if (pitchMessage.trim().length < 50) {
      toast.error("Pitch message must be at least 50 characters.");
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setAppliedPosts((prev) => {
      const next = new Map(prev);
      next.set(postId, { rate: parseInt(proposedRate, 10) });
      return next;
    });
    setExpandedPostId(null);
    setProposedRate("");
    setPitchMessage("");
    setSubmitting(false);
    toast.success("Proposal submitted successfully!");
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8">
          <div className="h-10 w-64 mb-6 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-20 rounded-xl bg-gray-200 animate-pulse mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <AnimatedSection animation="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Discover Posts</h1>
            <p className="text-gray-500 mt-1">
              Browse brand opportunities that match your profile
            </p>
          </div>
        </AnimatedSection>

        {/* Filters */}
        <AnimatedSection animation="animate-slide-up" delay={100}>
          <Card className="mb-6 shadow-sm bg-white rounded-xl">
            <CardContent className="pt-6 pb-5">
              <div className="flex flex-wrap items-start gap-4">
                {/* Niche dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNicheDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    Niche
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${nicheDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {nicheDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setNicheDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 z-20 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-2">
                        {ALL_NICHES.map((niche) => (
                          <label
                            key={niche}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedNiches.has(niche)}
                              onChange={() => toggleNiche(niche)}
                              className="rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF]"
                            />
                            {niche}
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedNiches.size > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Array.from(selectedNiches).map((n) => (
                        <Badge
                          key={n}
                          variant="info"
                          className="gap-1 cursor-pointer pr-1.5"
                          onClick={() => toggleNiche(n)}
                        >
                          {n}
                          <X className="w-3 h-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Platform toggles */}
                <div className="flex items-center gap-2">
                  {ALL_PLATFORMS.map((platform) => {
                    const active = selectedPlatforms.has(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${
                          active
                            ? platformColors[platform] + " border-current"
                            : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"
                        }`}
                      >
                        {platform}
                      </button>
                    );
                  })}
                </div>

                {/* Budget range */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Min ₹</span>
                    <Input
                      type="number"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                      className="pl-14 w-40 rounded-xl"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <span className="text-gray-300">—</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Max ₹</span>
                    <Input
                      type="number"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      className="pl-14 w-40 rounded-xl"
                      placeholder="∞"
                      min="0"
                    />
                  </div>
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-gray-500 hover:text-gray-700 gap-1 self-center"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear all
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
        </div>

        {/* Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredPosts.map((post, index) => {
              const applied = appliedPosts.get(post.id);
              const isExpanded = expandedPostId === post.id;

              return (
                <AnimatedSection
                  key={post.id}
                  animation="animate-fade-in"
                  delay={index * 80}
                >
                  <Card className="shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white rounded-xl flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          {post.brandLogo ? (
                            <img
                              src={post.brandLogo}
                              alt={post.brandName}
                              className="w-11 h-11 rounded-xl object-cover"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-600 truncate">
                            {post.brandName}
                          </p>
                          <p className="text-xs text-gray-400">
                            Posted {new Date(post.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-gray-900 leading-snug">
                        {post.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {post.description}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-3 flex-1 flex flex-col pt-0">
                      {/* Niche badges */}
                      <div className="flex gap-1.5 flex-wrap">
                        {post.niches.map((n) => (
                          <Badge key={n} variant="secondary" className="text-[11px] rounded-lg">
                            {n}
                          </Badge>
                        ))}
                      </div>

                      {/* Budget + Followers */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium">
                            {formatCurrency(post.budgetMin)} — {formatCurrency(post.budgetMax)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium">
                            {formatFollowers(post.minFollowers)} — {formatFollowers(post.maxFollowers)} followers
                          </span>
                        </span>
                      </div>

                      {/* Platform badges */}
                      <div className="flex gap-1.5 flex-wrap">
                        {post.platforms.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className={`text-[11px] rounded-lg ${platformColors[p] || ""}`}
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>

                      {/* Creatives + Applicants */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>{summarizeCreatives(post.creatives)}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {post.applicants} applicant{post.applicants !== 1 ? "s" : ""}
                        </span>
                        {post.shouldCreatorPost && (
                          <Badge variant="warning" className="text-[10px] py-0">
                            Creator posts
                          </Badge>
                        )}
                      </div>

                      <div className="flex-1" />

                      {/* Action area */}
                      {applied ? (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <Badge variant="success" className="gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Proposal Sent
                          </Badge>
                          <span className="text-sm font-medium text-gray-600">
                            {formatCurrency(applied.rate)}
                          </span>
                        </div>
                      ) : isExpanded ? (
                        <div className="space-y-3 pt-3 border-t border-gray-100">
                          {/* Entity selector */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                              Apply with Account
                            </label>
                            {entities.length === 0 ? (
                              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  No connected accounts.{" "}
                                  <a
                                    href="/dashboard/influencer/profile"
                                    className="underline font-medium hover:text-amber-700"
                                  >
                                    Connect an account first
                                  </a>
                                </span>
                              </div>
                            ) : (
                              <div className="relative">
                                <select
                                  value={selectedEntityId}
                                  onChange={(e) => setSelectedEntityId(e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF]"
                                >
                                  {entities.map((ent) => (
                                    <option key={ent.id} value={ent.id}>
                                      {ent.platform} — @{ent.handle} ({formatFollowers(ent.followerCount)} followers)
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                            )}
                          </div>

                          {/* Proposed Rate */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                              Proposed Rate
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                              <Input
                                type="number"
                                value={proposedRate}
                                onChange={(e) => setProposedRate(e.target.value)}
                                placeholder="Enter your rate"
                                className="pl-8 rounded-xl"
                                min="0"
                              />
                            </div>
                          </div>

                          {/* Pitch */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                              Pitch Message
                              <span className="text-gray-400 font-normal ml-1">(min 50 chars)</span>
                            </label>
                            <textarea
                              value={pitchMessage}
                              onChange={(e) => setPitchMessage(e.target.value)}
                              placeholder="Tell the brand why you're a great fit for this post..."
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF] min-h-[80px] resize-y"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                              {pitchMessage.trim().length}/50 characters
                            </p>
                          </div>

                          {/* Submit + Cancel */}
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 gap-2 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white rounded-xl"
                              disabled={submitting || entities.length === 0}
                              onClick={() => submitProposal(post.id)}
                            >
                              {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              Submit Proposal
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={cancelProposal}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full gap-2 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white rounded-xl mt-2"
                          onClick={() => openProposal(post.id)}
                        >
                          <Send className="w-4 h-4" />
                          Submit Proposal
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </AnimatedSection>
              );
            })}
          </div>
        ) : (
          <AnimatedSection animation="animate-fade-in">
            <Card className="shadow-sm bg-white rounded-xl">
              <CardContent className="py-16 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-1">
                  No posts match your filters
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Try adjusting your filters to see more opportunities
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={clearAllFilters}
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
