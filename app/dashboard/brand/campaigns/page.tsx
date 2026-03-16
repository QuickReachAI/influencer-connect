"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Megaphone, Loader2, CheckCircle, Clock,
  Pause, X, Users, IndianRupee, Send, ChevronDown,
  Instagram, Youtube, Facebook, Film, Video, Eye, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { formatINR, formatDate } from "@/lib/utils/format";

// ── Types ──────────────────────────────────────────────────────────
interface ApiCampaign {
  id: string;
  title: string;
  description: string;
  niche: string[];
  minFollowers: number;
  maxFollowers: number;
  contentFormat: string[];
  duration?: string;
  ownershipTransfer: boolean;
  budget: number;
  status: string;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  _count: { applications: number; deals: number };
}

interface ApiApplication {
  id: string;
  status: string;
  creatorMessage?: string;
  proposedRate?: number;
  appliedAt: string;
  entity: {
    id: string;
    platform: string;
    handle: string;
    followerCount: number;
  };
  applicant: {
    email: string;
    creatorProfile?: { name: string; avatar?: string } | null;
  };
}

// ── Niche options ──────────────────────────────────────────────────
const NICHE_OPTIONS = [
  "Beauty", "Skincare", "Technology", "Gadgets", "Fitness", "Health",
  "Food", "Travel", "Fashion", "Lifestyle", "Gaming", "Education",
  "Finance", "Parenting", "Pets", "Automotive",
];

const CONTENT_FORMAT_OPTIONS = [
  { value: "REEL", label: "Reel" },
  { value: "SHORT", label: "Short" },
  { value: "VIDEO", label: "Video" },
  { value: "POST", label: "Post" },
  { value: "STORY", label: "Story" },
  { value: "CAROUSEL", label: "Carousel" },
];

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DRAFT: { label: "Draft", icon: <Clock className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Active", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "bg-emerald-100 text-emerald-700" },
  PAUSED: { label: "Paused", icon: <Pause className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Cancelled", icon: <X className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-700" },
};

function CampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth("brand");

  // State
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(searchParams.get("create") === "true");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(searchParams.get("post"));
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newNiches, setNewNiches] = useState<string[]>([]);
  const [newNicheDropdown, setNewNicheDropdown] = useState(false);
  const [newBudget, setNewBudget] = useState("");
  const [newMinFollowers, setNewMinFollowers] = useState("");
  const [newMaxFollowers, setNewMaxFollowers] = useState("");
  const [newContentFormats, setNewContentFormats] = useState<string[]>([]);
  const [newOwnershipTransfer, setNewOwnershipTransfer] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch campaigns
  useEffect(() => {
    if (!user) return;

    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/campaigns");
        if (!res.ok) throw new Error("Failed to load campaigns");
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      } catch {
        toast.error("Couldn't load your posts — try refreshing");
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, [user]);

  // Fetch applications when a campaign is selected
  useEffect(() => {
    if (!selectedCampaignId) {
      setApplications([]);
      return;
    }

    async function fetchApplications() {
      setApplicationsLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${selectedCampaignId}/applications`);
        if (res.ok) {
          const data = await res.json();
          setApplications(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        setApplicationsLoading(false);
      }
    }

    fetchApplications();
  }, [selectedCampaignId]);

  async function handleCreate() {
    if (!newTitle.trim()) { toast.error("Your post needs a title"); return; }
    if (!newDescription.trim()) { toast.error("Add a description so creators know what you're looking for"); return; }
    if (newNiches.length === 0) { toast.error("Pick at least one niche to target the right creators"); return; }
    if (!newBudget || Number(newBudget) <= 0) { toast.error("Set a budget — creators want to know what you're offering"); return; }
    if (newContentFormats.length === 0) { toast.error("Choose at least one content format"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          niche: newNiches,
          budget: Number(newBudget),
          minFollowers: newMinFollowers ? Number(newMinFollowers) : 0,
          maxFollowers: newMaxFollowers ? Number(newMaxFollowers) : 999999999,
          contentFormat: newContentFormats,
          ownershipTransfer: newOwnershipTransfer,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.fieldErrors ? "Validation failed" : (err.error || "Failed to create post"));
      }

      const campaign = await res.json();
      setCampaigns(prev => [campaign, ...prev]);
      setShowCreateForm(false);
      resetForm();
      toast.success("Draft saved! Publish it when you're ready to go live");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setNewTitle("");
    setNewDescription("");
    setNewNiches([]);
    setNewBudget("");
    setNewMinFollowers("");
    setNewMaxFollowers("");
    setNewContentFormats([]);
    setNewOwnershipTransfer(false);
  }

  async function handlePublish(campaignId: string) {
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: "ACTIVE", publishedAt: new Date().toISOString() } : c));
      toast.success("Your post is live! Creators can now discover it");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePause(campaignId: string) {
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      if (!res.ok) throw new Error("Failed to pause");
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: "PAUSED" } : c));
      toast.success("Post paused — you can unpause it anytime");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReviewApplication(campaignId: string, appId: string, status: "ACCEPTED" | "REJECTED") {
    setActionLoading(appId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Failed to ${status.toLowerCase()} application`);
      const result = await res.json();
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      if (status === "ACCEPTED" && result.deal) {
        toast.success("Nice pick! Deal created — taking you there now...");
        setTimeout(() => router.push(`/dashboard/brand/deals/${result.deal.id}`), 1500);
      } else {
        toast.success(status === "ACCEPTED" ? "Application accepted!" : "Application declined");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
      </div>
    );
  }

  // ── Detail / Applicant View ──────────────────────────────────────
  if (selectedCampaign) {
    const sc = statusConfig[selectedCampaign.status] || statusConfig.DRAFT;
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8">
          <AnimatedSection animation="animate-fade-in">
            <Button variant="ghost" className="gap-2 mb-4" onClick={() => setSelectedCampaignId(null)}>
              <ArrowLeft className="w-4 h-4" /> Back to Posts
            </Button>

            <Card className="shadow-md mb-6">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl text-gray-900">{selectedCampaign.title}</CardTitle>
                  <Badge className={`gap-1 ${sc.color}`}>{sc.icon}{sc.label}</Badge>
                </div>
                <CardDescription className="text-gray-500">{selectedCampaign.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <span className="text-sm text-gray-500">Budget</span>
                    <p className="font-semibold text-gray-900">Up to {formatINR(Number(selectedCampaign.budget))}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Followers</span>
                    <p className="font-semibold text-gray-900">
                      {formatFollowers(selectedCampaign.minFollowers)} — {formatFollowers(selectedCampaign.maxFollowers)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Niches</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {selectedCampaign.niche.map(n => (
                        <Badge key={n} variant="secondary" className="text-[11px]">{n}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Content Formats</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {selectedCampaign.contentFormat.map(f => (
                        <Badge key={f} variant="outline" className="text-[11px]">{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedCampaign.status === "DRAFT" && (
                    <Button
                      className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2"
                      disabled={actionLoading === selectedCampaign.id}
                      onClick={() => handlePublish(selectedCampaign.id)}
                    >
                      {actionLoading === selectedCampaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                      Publish
                    </Button>
                  )}
                  {selectedCampaign.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={actionLoading === selectedCampaign.id}
                      onClick={() => handlePause(selectedCampaign.id)}
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Applicants */}
          <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Applications ({applications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : applications.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No applications yet. {selectedCampaign.status === "DRAFT" && "Hit publish and creators will start rolling in."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {app.applicant?.creatorProfile?.name || app.applicant?.email || "Creator"}
                              </h4>
                              <Badge variant="outline" className="text-[11px]">{app.entity.platform}</Badge>
                              {app.status !== "PENDING" && (
                                <Badge className={app.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                                  {app.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              @{app.entity.handle} • {formatFollowers(app.entity.followerCount)} followers
                            </p>
                            {app.creatorMessage && (
                              <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3">{app.creatorMessage}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              {app.proposedRate && (
                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                  <IndianRupee className="w-3.5 h-3.5" />
                                  {formatINR(Number(app.proposedRate))}
                                </span>
                              )}
                              <span className="text-gray-400">Applied {formatDate(app.appliedAt)}</span>
                            </div>
                          </div>

                          {app.status === "PENDING" && (
                            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                disabled={actionLoading === app.id}
                                onClick={() => handleReviewApplication(selectedCampaign.id, app.id, "ACCEPTED")}
                              >
                                {actionLoading === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700"
                                disabled={actionLoading === app.id}
                                onClick={() => handleReviewApplication(selectedCampaign.id, app.id, "REJECTED")}
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  // ── Create Form View ─────────────────────────────────────────────
  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <AnimatedSection animation="animate-fade-in">
            <Button variant="ghost" className="gap-2 mb-4" onClick={() => setShowCreateForm(false)}>
              <ArrowLeft className="w-4 h-4" /> Back to Posts
            </Button>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900">Create New Post</CardTitle>
                <CardDescription>Tell creators exactly what you need — the more detail, the better pitches you get</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Title *</label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Summer Beauty Collection Launch" className="rounded-xl" />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description *</label>
                  <textarea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="What's the collab about? Be specific — creators love knowing exactly what you need..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF] min-h-[100px] resize-y"
                  />
                </div>

                {/* Niches */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Niches *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNewNicheDropdown(v => !v)}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 w-full justify-between"
                    >
                      {newNiches.length > 0 ? `${newNiches.length} selected` : "Select niches"}
                      <ChevronDown className={`w-4 h-4 transition-transform ${newNicheDropdown ? "rotate-180" : ""}`} />
                    </button>
                    {newNicheDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setNewNicheDropdown(false)} />
                        <div className="absolute top-full left-0 mt-1 z-20 w-full rounded-xl border border-gray-200 bg-white shadow-lg py-2 max-h-48 overflow-y-auto">
                          {NICHE_OPTIONS.map(niche => (
                            <label key={niche} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newNiches.includes(niche)}
                                onChange={() => setNewNiches(prev => prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche])}
                                className="rounded border-gray-300 text-[#0E61FF]"
                              />
                              {niche}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {newNiches.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {newNiches.map(n => (
                        <Badge key={n} variant="info" className="gap-1 cursor-pointer pr-1.5" onClick={() => setNewNiches(prev => prev.filter(x => x !== n))}>
                          {n} <X className="w-3 h-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Formats */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Content Formats *</label>
                  <div className="flex gap-2 flex-wrap">
                    {CONTENT_FORMAT_OPTIONS.map(opt => {
                      const active = newContentFormats.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewContentFormats(prev => active ? prev.filter(f => f !== opt.value) : [...prev, opt.value])}
                          className={`rounded-xl px-4 py-2 text-sm font-medium border transition-all ${active ? "bg-[#0E61FF] text-white border-[#0E61FF]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Budget (INR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                    <Input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} className="pl-8 rounded-xl" placeholder="50000" min="0" />
                  </div>
                </div>

                {/* Follower Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Min Followers</label>
                    <Input type="number" value={newMinFollowers} onChange={e => setNewMinFollowers(e.target.value)} className="rounded-xl" placeholder="0" min="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Max Followers</label>
                    <Input type="number" value={newMaxFollowers} onChange={e => setNewMaxFollowers(e.target.value)} className="rounded-xl" placeholder="No limit" min="0" />
                  </div>
                </div>

                {/* Ownership Transfer */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newOwnershipTransfer}
                    onChange={e => setNewOwnershipTransfer(e.target.checked)}
                    className="rounded border-gray-300 text-[#0E61FF]"
                  />
                  <span className="text-sm text-gray-700">Creator posts on their channel (ownership transfer)</span>
                </label>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2 rounded-xl"
                    disabled={creating}
                    onClick={handleCreate}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Post (Draft)
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  // ── Main Posts List View ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />
      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-fade-in" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Posts</h1>
            <p className="text-gray-500">Create and manage your brand campaigns</p>
          </div>
          <Button className="w-full sm:w-auto bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4" /> Create New Post
          </Button>
        </AnimatedSection>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <AnimatedSection animation="animate-fade-in">
            <Card className="shadow-md">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-7 h-7 text-[#0E61FF]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet — time to create your first one!</h3>
                <p className="text-gray-500 mb-6">Create your first post to start finding creators</p>
                <Button className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2" onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4" /> Create Post
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign, index) => {
              const sc = statusConfig[campaign.status] || statusConfig.DRAFT;
              return (
                <AnimatedSection key={campaign.id} animation="animate-slide-up" delay={index * 80}>
                  <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCampaignId(campaign.id)}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
                            <Badge className={`gap-1 ${sc.color}`}>{sc.icon}{sc.label}</Badge>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{campaign.description}</p>

                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-700">
                              <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium">Up to {formatINR(Number(campaign.budget))}</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-700">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium">{campaign._count?.applications || 0} applicants</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-700">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              {formatFollowers(campaign.minFollowers)} — {formatFollowers(campaign.maxFollowers)} followers
                            </span>
                            {campaign.publishedAt && (
                              <span className="text-gray-400">Published {formatDate(campaign.publishedAt)}</span>
                            )}
                          </div>

                          <div className="flex gap-1.5 flex-wrap mt-3">
                            {campaign.niche.map(n => (
                              <Badge key={n} variant="secondary" className="text-[11px]">{n}</Badge>
                            ))}
                            {campaign.contentFormat.map(f => (
                              <Badge key={f} variant="outline" className="text-[11px]">{f}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                          {campaign.status === "DRAFT" && (
                            <Button
                              size="sm"
                              className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-1"
                              disabled={actionLoading === campaign.id}
                              onClick={(e) => { e.stopPropagation(); handlePublish(campaign.id); }}
                            >
                              {actionLoading === campaign.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                              Publish
                            </Button>
                          )}
                          {campaign.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={actionLoading === campaign.id}
                              onClick={(e) => { e.stopPropagation(); handlePause(campaign.id); }}
                            >
                              <Pause className="w-3.5 h-3.5" /> Pause
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={(e) => { e.stopPropagation(); setSelectedCampaignId(campaign.id); }}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrandCampaignsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
      </div>
    }>
      <CampaignsContent />
    </Suspense>
  );
}
