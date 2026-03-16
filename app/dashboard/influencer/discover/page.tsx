"use client";

import { useState, useEffect } from "react";
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
import { useAuth } from "@/lib/hooks/use-auth";
import { formatINR, formatFollowers, formatDate } from "@/lib/utils/format";

interface ApiCampaign {
  id: string;
  title: string;
  description: string;
  niche: string[];
  minFollowers: number;
  maxFollowers: number;
  contentFormat: string[];
  budget: number;
  ownershipTransfer: boolean;
  publishedAt: string | null;
  createdAt: string;
  brand?: {
    companyName?: string;
    logo?: string;
    user?: { email: string };
  };
  _count?: { applications: number };
}

interface SocialEntity {
  id: string;
  platform: string;
  handle: string;
  followerCount: number;
}

const ALL_NICHES = [
  "Beauty", "Skincare", "Technology", "Gadgets", "Fitness", "Health",
  "Fashion", "Lifestyle", "Food", "Travel", "Gaming", "Education",
];

const platformColors: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700 border-pink-200",
  YOUTUBE: "bg-red-100 text-red-700 border-red-200",
  FACEBOOK: "bg-blue-100 text-blue-700 border-blue-200",
};

interface AppliedInfo {
  rate: number;
}

export default function InfluencerDiscoverPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth("influencer");

  // Data
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [entities, setEntities] = useState<SocialEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [selectedNiches, setSelectedNiches] = useState<Set<string>>(new Set());
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);

  // Proposal
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [pitchMessage, setPitchMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Applied tracking
  const [appliedPosts, setAppliedPosts] = useState<Map<string, AppliedInfo>>(new Map());

  // Fetch entities on mount
  useEffect(() => {
    if (!user) return;

    async function fetchEntities() {
      try {
        const res = await fetch("/api/social-entities");
        if (res.ok) {
          const data = await res.json();
          const ents = data.entities ?? (Array.isArray(data) ? data : []);
          setEntities(ents);
          if (ents.length > 0) setSelectedEntityId(ents[0].id);
        }
      } catch {
        // ignore
      }
    }

    fetchEntities();
  }, [user]);

  // Fetch campaigns when entity or filters change
  useEffect(() => {
    if (!user || entities.length === 0) {
      if (user && entities.length === 0) setLoading(false);
      return;
    }

    async function fetchCampaigns() {
      setLoading(true);
      try {
        const entityId = selectedEntityId || entities[0]?.id;
        if (!entityId) return;

        const params = new URLSearchParams({ entityId, page: String(page), pageSize: "20" });
        selectedNiches.forEach(n => params.append("niche", n));

        const res = await fetch(`/api/campaigns?${params}`);
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.data || data.campaigns || []);
          setTotal(data.total || (data.data || data.campaigns || []).length);
        }
      } catch {
        toast.error("Couldn't load posts right now — try refreshing");
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, [user, entities, selectedEntityId, selectedNiches, page]);

  const hasActiveFilters = selectedNiches.size > 0;

  function toggleNiche(niche: string) {
    setSelectedNiches(prev => {
      const next = new Set(prev);
      if (next.has(niche)) next.delete(niche); else next.add(niche);
      return next;
    });
    setPage(1);
  }

  function clearAllFilters() {
    setSelectedNiches(new Set());
    setPage(1);
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

  async function submitProposal(campaignId: string) {
    if (!selectedEntityId) {
      toast.error("Pick which account you want to apply with first");
      return;
    }
    if (!proposedRate || parseInt(proposedRate, 10) <= 0) {
      toast.error("Drop in your rate — how much are you charging for this?");
      return;
    }
    if (pitchMessage.trim().length < 50) {
      toast.error("Your pitch needs a bit more — at least 50 characters to stand out");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedEntityId,
          proposedRate: parseInt(proposedRate, 10),
          creatorMessage: pitchMessage.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit proposal");
      }

      setAppliedPosts(prev => {
        const next = new Map(prev);
        next.set(campaignId, { rate: parseInt(proposedRate, 10) });
        return next;
      });
      setExpandedPostId(null);
      setProposedRate("");
      setPitchMessage("");
      toast.success("Proposal sent! Fingers crossed — the brand will review it soon");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
      </div>
    );
  }

  // No entities → prompt to connect
  if (!loading && entities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-sm bg-white rounded-xl max-w-lg mx-auto">
            <CardContent className="py-16 text-center">
              <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Link your socials first</h3>
              <p className="text-gray-500 mb-6">Connect at least one social account so we can match you with the right brand collabs.</p>
              <Button className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9]" onClick={() => router.push("/dashboard/influencer/profile")}>
                Set up profile
              </Button>
            </CardContent>
          </Card>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discover Posts</h1>
            <p className="text-gray-500 mt-1">
              Brand collabs that match your vibe — pick one and pitch
            </p>
          </div>
        </AnimatedSection>

        {/* Entity Selector */}
        {entities.length > 1 && (
          <AnimatedSection animation="animate-fade-in" delay={50}>
            <Card className="mb-4 shadow-sm bg-white rounded-xl">
              <CardContent className="pt-4 pb-4">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Discover as</label>
                <div className="relative">
                  <select
                    value={selectedEntityId}
                    onChange={e => { setSelectedEntityId(e.target.value); setPage(1); }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF]"
                  >
                    {entities.map(ent => (
                      <option key={ent.id} value={ent.id}>
                        {ent.platform} — @{ent.handle} ({formatFollowers(ent.followerCount)} followers)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Filters */}
        <AnimatedSection animation="animate-slide-up" delay={100}>
          <Card className="mb-6 shadow-sm bg-white rounded-xl">
            <CardContent className="pt-6 pb-5">
              <div className="flex flex-wrap items-start gap-4">
                {/* Niche dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNicheDropdownOpen(v => !v)}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    Niche
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${nicheDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {nicheDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNicheDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 z-50 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl py-2 max-h-48 overflow-y-auto">
                        {ALL_NICHES.map(niche => (
                          <label key={niche} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
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
                      {Array.from(selectedNiches).map(n => (
                        <Badge key={n} variant="info" className="gap-1 cursor-pointer pr-1.5" onClick={() => toggleNiche(n)}>
                          {n} <X className="w-3 h-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-gray-500 hover:text-gray-700 gap-1 self-center">
                    <X className="w-3.5 h-3.5" /> Clear all
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">
          {loading ? "Loading..." : `Showing ${campaigns.length} of ${total} post${total !== 1 ? "s" : ""}`}
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-72 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {campaigns.map((campaign, index) => {
                const applied = appliedPosts.get(campaign.id);
                const isExpanded = expandedPostId === campaign.id;

                return (
                  <AnimatedSection key={campaign.id} animation="animate-fade-in" delay={index * 80}>
                    <Card className="shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white rounded-xl flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-600 truncate">
                              {campaign.brand?.companyName || "Brand"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {campaign.publishedAt ? `Posted ${formatDate(campaign.publishedAt)}` : ""}
                            </p>
                          </div>
                        </div>
                        <CardTitle className="text-lg text-gray-900 leading-snug">
                          {campaign.title}
                        </CardTitle>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {campaign.description}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-3 flex-1 flex flex-col pt-0">
                        {/* Niche badges */}
                        <div className="flex gap-1.5 flex-wrap">
                          {campaign.niche.map(n => (
                            <Badge key={n} variant="secondary" className="text-[11px] rounded-lg">{n}</Badge>
                          ))}
                        </div>

                        {/* Budget + Followers */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span className="flex items-center gap-1.5 text-gray-700">
                            <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium">Up to {formatINR(Number(campaign.budget))}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-gray-700">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium">
                              {formatFollowers(campaign.minFollowers)} — {formatFollowers(campaign.maxFollowers)} followers
                            </span>
                          </span>
                        </div>

                        {/* Content format badges */}
                        <div className="flex gap-1.5 flex-wrap">
                          {campaign.contentFormat.map(f => (
                            <Badge key={f} variant="outline" className="text-[11px] rounded-lg">{f}</Badge>
                          ))}
                        </div>

                        {/* Applicants + ownership */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {campaign._count?.applications || 0} applicant{(campaign._count?.applications || 0) !== 1 ? "s" : ""}
                          </span>
                          {campaign.ownershipTransfer && (
                            <Badge variant="warning" className="text-[10px] py-0">Creator posts</Badge>
                          )}
                        </div>

                        <div className="flex-1" />

                        {/* Action area */}
                        {applied ? (
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <Badge variant="success" className="gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Proposal Sent
                            </Badge>
                            <span className="text-sm font-medium text-gray-600">{formatINR(applied.rate)}</span>
                          </div>
                        ) : isExpanded ? (
                          <div className="space-y-3 pt-3 border-t border-gray-100">
                            {/* Entity selector */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Apply with Account</label>
                              <div className="relative">
                                <select
                                  value={selectedEntityId}
                                  onChange={e => setSelectedEntityId(e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF]"
                                >
                                  {entities.map(ent => (
                                    <option key={ent.id} value={ent.id}>
                                      {ent.platform} — @{ent.handle} ({formatFollowers(ent.followerCount)} followers)
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* Proposed Rate */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Proposed Rate</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                                <Input
                                  type="number"
                                  value={proposedRate}
                                  onChange={e => setProposedRate(e.target.value)}
                                  placeholder="Enter your rate"
                                  className="pl-8 rounded-xl text-base sm:text-sm"
                                  min="0"
                                />
                              </div>
                            </div>

                            {/* Pitch */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                                Pitch Message <span className="text-gray-400 font-normal ml-1">(min 50 chars)</span>
                              </label>
                              <textarea
                                value={pitchMessage}
                                onChange={e => setPitchMessage(e.target.value)}
                                placeholder="Why you? Tell the brand what makes you the perfect fit..."
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF] min-h-[80px] resize-y"
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
                                onClick={() => submitProposal(campaign.id)}
                              >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit Proposal
                              </Button>
                              <Button variant="outline" className="rounded-xl" onClick={cancelProposal}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            className="w-full gap-2 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white rounded-xl mt-2"
                            onClick={() => openProposal(campaign.id)}
                          >
                            <Send className="w-4 h-4" /> Submit Proposal
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                );
              })}
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="flex items-center text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
                <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        ) : (
          <AnimatedSection animation="animate-fade-in">
            <Card className="shadow-sm bg-white rounded-xl">
              <CardContent className="py-16 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-1">Nothing here yet</p>
                <p className="text-gray-400 text-sm mb-4">
                  {hasActiveFilters ? "Try tweaking your filters — there might be something just outside your range" : "New brand posts drop all the time — check back soon"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" className="rounded-xl gap-1.5" onClick={clearAllFilters}>
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
