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

// ── Types ──────────────────────────────────────────────────────────
interface Creative {
  format: "REEL_SHORT" | "LONG_VIDEO";
  durationSeconds: number;
}

interface Post {
  id: string;
  title: string;
  description: string;
  niches: string[];
  minFollowers: number;
  maxFollowers: number;
  platforms: string[];
  creatives: Creative[];
  budgetMin: number;
  budgetMax: number;
  shouldCreatorPost: boolean;
  status: string;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  applicants: Applicant[];
}

interface Applicant {
  id: string;
  creatorName: string;
  handle: string;
  platform: string;
  followers: number;
  pitchMessage: string;
  proposedRate: number;
  appliedAt: string;
  chatMessages: ChatMsg[];
}

interface ChatMsg {
  id: string;
  sender: "brand" | "creator";
  message: string;
  time: string;
}

// ── Niche options ──────────────────────────────────────────────────
const NICHE_OPTIONS = [
  "Beauty", "Skincare", "Technology", "Gadgets", "Fitness", "Health",
  "Food", "Travel", "Fashion", "Lifestyle", "Gaming", "Education",
  "Finance", "Parenting", "Pets", "Automotive",
];

// ── Mock data ──────────────────────────────────────────────────────
const INITIAL_POSTS: Post[] = [
  {
    id: "post-1",
    title: "Summer Beauty Collection Launch",
    description: "Looking for beauty creators to showcase our new summer collection with engaging reels and stories",
    niches: ["Beauty", "Skincare"],
    minFollowers: 10000,
    maxFollowers: 500000,
    platforms: ["Instagram", "YouTube"],
    creatives: [
      { format: "REEL_SHORT", durationSeconds: 30 },
      { format: "REEL_SHORT", durationSeconds: 60 },
      { format: "LONG_VIDEO", durationSeconds: 300 },
    ],
    budgetMin: 30000,
    budgetMax: 50000,
    shouldCreatorPost: true,
    status: "ACTIVE",
    publishedAt: "2026-02-20",
    expiresAt: "2026-03-20",
    createdAt: "2026-02-20",
    applicants: [
      {
        id: "app-1", creatorName: "Priya Sharma", handle: "@priyasharma", platform: "Instagram",
        followers: 520000, pitchMessage: "I'd love to create stunning reels for your summer collection! I have 5 years of beauty content experience.", proposedRate: 35000, appliedAt: "2026-02-21",
        chatMessages: [
          { id: "m1", sender: "creator", message: "Hi! I'm very excited about this campaign. I have extensive experience with beauty brands.", time: "Feb 21, 10:30 AM" },
          { id: "m2", sender: "brand", message: "Thanks Priya! Your portfolio looks amazing. Can you share some past campaign results?", time: "Feb 21, 11:00 AM" },
          { id: "m3", sender: "creator", message: "Sure! My last skincare campaign got 2.5M views and 45K saves. I'll send the case study.", time: "Feb 21, 11:15 AM" },
        ],
      },
      {
        id: "app-2", creatorName: "Aisha Khan", handle: "@aishafitness", platform: "Instagram",
        followers: 150000, pitchMessage: "Beauty meets wellness! I can bring a unique fitness-beauty angle to your collection.", proposedRate: 20000, appliedAt: "2026-02-22",
        chatMessages: [
          { id: "m4", sender: "creator", message: "Hello! I think there's a great crossover between beauty and wellness content for your brand.", time: "Feb 22, 2:00 PM" },
        ],
      },
      {
        id: "app-3", creatorName: "Meera Joshi", handle: "@meerastyle", platform: "YouTube",
        followers: 280000, pitchMessage: "I specialize in detailed beauty tutorials. Can create both short and long-form content.", proposedRate: 40000, appliedAt: "2026-02-23",
        chatMessages: [],
      },
    ],
  },
  {
    id: "post-2",
    title: "Tech Product Review Series",
    description: "Need tech reviewers for our new smartphone launch. Detailed review video and short-form content required.",
    niches: ["Technology", "Gadgets"],
    minFollowers: 50000,
    maxFollowers: 1000000,
    platforms: ["YouTube"],
    creatives: [
      { format: "LONG_VIDEO", durationSeconds: 600 },
      { format: "REEL_SHORT", durationSeconds: 60 },
    ],
    budgetMin: 75000,
    budgetMax: 100000,
    shouldCreatorPost: true,
    status: "ACTIVE",
    publishedAt: "2026-02-25",
    expiresAt: "2026-03-25",
    createdAt: "2026-02-25",
    applicants: [
      {
        id: "app-4", creatorName: "Rahul Verma", handle: "RahulTechReviews", platform: "YouTube",
        followers: 320000, pitchMessage: "I'm one of India's top tech reviewers. My reviews consistently hit 500K+ views.", proposedRate: 85000, appliedAt: "2026-02-26",
        chatMessages: [
          { id: "m5", sender: "creator", message: "Hey! Really interested in reviewing your new smartphone. I do in-depth 10-min reviews.", time: "Feb 26, 9:00 AM" },
          { id: "m6", sender: "brand", message: "Hi Rahul! Big fan of your channel. Would love to work together.", time: "Feb 26, 10:30 AM" },
        ],
      },
    ],
  },
  {
    id: "post-3",
    title: "Fitness Challenge Campaign",
    description: "30-day fitness challenge featuring our supplements. Daily reel content required.",
    niches: ["Fitness", "Health"],
    minFollowers: 5000,
    maxFollowers: 200000,
    platforms: ["Instagram", "Facebook"],
    creatives: [
      { format: "REEL_SHORT", durationSeconds: 30 },
    ],
    budgetMin: 15000,
    budgetMax: 30000,
    shouldCreatorPost: true,
    status: "DRAFT",
    publishedAt: null,
    expiresAt: null,
    createdAt: "2026-02-28",
    applicants: [],
  },
];

// ── Helpers ────────────────────────────────────────────────────────
function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds}s`;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  PAUSED: { label: "Paused", color: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", color: "bg-blue-100 text-blue-700" },
};

// ── Inner component (uses useSearchParams) ─────────────────────────
function PostsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(searchParams.get("post"));
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  // Create/edit form
  const [showCreate, setShowCreate] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formNiches, setFormNiches] = useState<string[]>([]);
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);
  const [formBudgetMin, setFormBudgetMin] = useState(10000);
  const [formBudgetMax, setFormBudgetMax] = useState(50000);
  const [formMinFollowers, setFormMinFollowers] = useState(5000);
  const [formMaxFollowers, setFormMaxFollowers] = useState(500000);
  const [formPlatforms, setFormPlatforms] = useState<string[]>([]);
  const [formCreatives, setFormCreatives] = useState<Creative[]>([{ format: "REEL_SHORT", durationSeconds: 30 }]);
  const [formShouldPost, setFormShouldPost] = useState(false);

  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") { router.push("/auth/login"); return; }
    const complete = localStorage.getItem("brandProfileComplete") === "true";
    setProfileComplete(complete);
    if (searchParams.get("create") === "true") {
      if (complete) {
        setShowCreate(true);
      } else {
        router.push("/dashboard/brand/profile?complete=true");
      }
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [selectedApplicantId, posts]);

  const handleCreateClick = () => {
    if (!profileComplete) {
      router.push("/dashboard/brand/profile?complete=true");
    } else {
      setShowCreate(true);
    }
  };

  const selectedPost = posts.find(p => p.id === selectedPostId) || null;
  const selectedApplicant = selectedPost?.applicants.find(a => a.id === selectedApplicantId) || null;

  const filteredPosts = activeTab === "all" ? posts : posts.filter(p => p.status === activeTab.toUpperCase());

  // ── Chat ───────────────────────────────────────────────────
  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedPostId || !selectedApplicantId) return;

    setPosts(prev => prev.map(post => {
      if (post.id !== selectedPostId) return post;
      return {
        ...post,
        applicants: post.applicants.map(app => {
          if (app.id !== selectedApplicantId) return app;
          return {
            ...app,
            chatMessages: [...app.chatMessages, {
              id: `m-${Date.now()}`,
              sender: "brand" as const,
              message: chatInput.trim(),
              time: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
            }],
          };
        }),
      };
    }));
    setChatInput("");
  };

  // ── Create Post ────────────────────────────────────────────
  const toggleNiche = (n: string) => {
    setFormNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const togglePlatform = (p: string) => {
    setFormPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const addCreative = () => {
    setFormCreatives(prev => [...prev, { format: "REEL_SHORT", durationSeconds: 30 }]);
  };

  const removeCreative = (idx: number) => {
    if (formCreatives.length <= 1) return;
    setFormCreatives(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCreative = (idx: number, field: keyof Creative, value: string | number) => {
    setFormCreatives(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const updated = { ...c, [field]: value };
      if (field === "format" && value === "LONG_VIDEO" && c.durationSeconds < 60) {
        updated.durationSeconds = 300;
      } else if (field === "format" && value === "REEL_SHORT" && c.durationSeconds > 180) {
        updated.durationSeconds = 30;
      }
      return updated;
    }));
  };

  const handlePublish = (asDraft: boolean) => {
    if (!formTitle.trim()) { toast.error("Post title is required"); return; }
    if (formPlatforms.length === 0) { toast.error("Select at least one platform"); return; }
    if (formNiches.length === 0) { toast.error("Select at least one niche"); return; }

    const postData = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      niches: formNiches,
      minFollowers: formMinFollowers,
      maxFollowers: formMaxFollowers,
      platforms: formPlatforms,
      creatives: formCreatives,
      budgetMin: formBudgetMin,
      budgetMax: formBudgetMax,
      shouldCreatorPost: formShouldPost,
      status: asDraft ? "DRAFT" : "ACTIVE",
      publishedAt: asDraft ? null : new Date().toISOString().split("T")[0],
      expiresAt: asDraft ? null : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    };

    if (editingPostId) {
      setPosts(prev => prev.map(p => p.id === editingPostId ? { ...p, ...postData } : p));
      toast.success(asDraft ? "Draft updated!" : "Post published! Creators can now apply.");
    } else {
      const newPost: Post = {
        id: `post-${Date.now()}`,
        ...postData,
        createdAt: new Date().toISOString().split("T")[0],
        applicants: [],
      };
      setPosts(prev => [newPost, ...prev]);
      toast.success(asDraft ? "Post saved as draft!" : "Post published! Creators can now apply.");
    }

    setShowCreate(false);
    resetForm();
  };

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormNiches([]); setFormPlatforms([]);
    setFormBudgetMin(10000); setFormBudgetMax(50000); setFormMinFollowers(5000);
    setFormMaxFollowers(500000); setFormCreatives([{ format: "REEL_SHORT", durationSeconds: 30 }]);
    setFormShouldPost(false); setEditingPostId(null);
  };

  // ── Create Post Form ───────────────────────────────────────
  if (showCreate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
          <button onClick={() => setShowCreate(false)} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Posts
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{editingPostId ? "Edit Draft Post" : "Create New Post"}</h1>
          <p className="text-gray-500 mb-8">{editingPostId ? "Resume editing your draft and publish when ready" : "Define what you need and let creators come to you"}</p>

          <div className="space-y-6">
            {/* Title & Description */}
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Post Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Post Title *</label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Summer Beauty Reel Campaign" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Description</label>
                  <textarea
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] transition-all"
                    value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    placeholder="Describe what you're looking for in detail..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Niche Selection - Dropdown with checkboxes */}
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Niche Categories *</CardTitle></CardHeader>
              <CardContent>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNicheDropdownOpen(!nicheDropdownOpen)}
                    className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-left hover:border-gray-300 transition-colors"
                  >
                    <span className={formNiches.length > 0 ? "text-gray-900" : "text-gray-400"}>
                      {formNiches.length > 0 ? formNiches.join(", ") : "Select niches..."}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${nicheDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {nicheDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-slide-down">
                      {NICHE_OPTIONS.map(niche => (
                        <label key={niche} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formNiches.includes(niche)}
                            onChange={() => toggleNiche(niche)}
                            className="w-4 h-4 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF]"
                          />
                          <span className="text-sm text-gray-700">{niche}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {formNiches.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formNiches.map(n => (
                      <Badge key={n} variant="info" className="gap-1">
                        {n}
                        <button onClick={() => toggleNiche(n)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Target Platforms *</CardTitle>
                <CardDescription className="text-gray-500">Select at least one platform where you need content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "Instagram", icon: <Instagram className="w-5 h-5" />, color: "border-pink-300 bg-pink-50 text-pink-700" },
                    { id: "YouTube", icon: <Youtube className="w-5 h-5" />, color: "border-red-300 bg-red-50 text-red-700" },
                    { id: "Facebook", icon: <Facebook className="w-5 h-5" />, color: "border-blue-300 bg-blue-50 text-blue-700" },
                  ].map(pl => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => togglePlatform(pl.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        formPlatforms.includes(pl.id)
                          ? `${pl.color} border-2 shadow-sm`
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {pl.icon}
                      <span className="font-medium text-sm">{pl.id}</span>
                      {formPlatforms.includes(pl.id) && <CheckCircle className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Budget Range */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Budget Range (INR)</CardTitle>
                <CardDescription className="text-gray-500">Total budget for all creatives combined</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Minimum</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number" value={formBudgetMin}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setFormBudgetMin(v);
                          if (v > formBudgetMax) setFormBudgetMax(v);
                        }}
                        className="pl-9" min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Maximum</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number" value={formBudgetMax}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setFormBudgetMax(v);
                          if (v < formBudgetMin) setFormBudgetMin(v);
                        }}
                        className="pl-9" min={0}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">Min</span>
                    <input
                      type="range" min={5000} max={500000} step={5000}
                      value={formBudgetMin}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setFormBudgetMin(v);
                        if (v > formBudgetMax) setFormBudgetMax(v);
                      }}
                      className="w-full accent-[#0E61FF] h-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">Max</span>
                    <input
                      type="range" min={5000} max={500000} step={5000}
                      value={formBudgetMax}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setFormBudgetMax(v);
                        if (v < formBudgetMin) setFormBudgetMin(v);
                      }}
                      className="w-full accent-[#0E61FF] h-2"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  ₹{formBudgetMin.toLocaleString("en-IN")} — ₹{formBudgetMax.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>

            {/* Follower Range */}
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Creator Follower Range</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Minimum followers</label>
                    <Input
                      type="number" value={formMinFollowers}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setFormMinFollowers(v);
                        if (v > formMaxFollowers) setFormMaxFollowers(v);
                      }}
                      min={1000}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Maximum followers</label>
                    <Input
                      type="number" value={formMaxFollowers}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setFormMaxFollowers(v);
                        if (v < formMinFollowers) setFormMinFollowers(v);
                      }}
                      min={1000}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">Min</span>
                    <input
                      type="range" min={1000} max={5000000} step={1000}
                      value={formMinFollowers}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setFormMinFollowers(v);
                        if (v > formMaxFollowers) setFormMaxFollowers(v);
                      }}
                      className="w-full accent-[#0E61FF] h-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">Max</span>
                    <input
                      type="range" min={1000} max={5000000} step={1000}
                      value={formMaxFollowers}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setFormMaxFollowers(v);
                        if (v < formMinFollowers) setFormMinFollowers(v);
                      }}
                      className="w-full accent-[#0E61FF] h-2"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  {formatFollowers(formMinFollowers)} — {formatFollowers(formMaxFollowers)}
                </p>
              </CardContent>
            </Card>

            {/* Creatives Specification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Creatives Needed</CardTitle>
                <CardDescription className="text-gray-500">Specify each creative: format and duration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formCreatives.map((creative, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                    <span className="text-sm font-semibold text-gray-400 w-6">{idx + 1}.</span>

                    <select
                      value={creative.format}
                      onChange={e => updateCreative(idx, "format", e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E61FF]"
                    >
                      <option value="REEL_SHORT">Reel / Short</option>
                      <option value="LONG_VIDEO">Long Form Video (YouTube)</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 whitespace-nowrap">Duration:</label>
                      {creative.format === "LONG_VIDEO" ? (
                        <>
                          <Input
                            type="number" min={1} max={60}
                            value={Math.round(creative.durationSeconds / 60) || 1}
                            onChange={e => updateCreative(idx, "durationSeconds", Number(e.target.value) * 60)}
                            className="w-20 text-center"
                          />
                          <span className="text-xs text-gray-400">min</span>
                        </>
                      ) : (
                        <>
                          <Input
                            type="number" min={5} max={180}
                            value={creative.durationSeconds}
                            onChange={e => updateCreative(idx, "durationSeconds", Number(e.target.value))}
                            className="w-20 text-center"
                          />
                          <span className="text-xs text-gray-400">sec</span>
                        </>
                      )}
                    </div>

                    {formCreatives.length > 1 && (
                      <button onClick={() => removeCreative(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" onClick={addCreative} className="gap-1">
                  <Plus className="w-4 h-4" /> Add Another Creative
                </Button>

                <div className="text-sm text-gray-500 mt-2">
                  Summary: {formCreatives.filter(c => c.format === "REEL_SHORT").length} reel/short{formCreatives.filter(c => c.format === "REEL_SHORT").length !== 1 ? "s" : ""},
                  {" "}{formCreatives.filter(c => c.format === "LONG_VIDEO").length} long-form video{formCreatives.filter(c => c.format === "LONG_VIDEO").length !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>

            {/* Should creator post? */}
            <Card>
              <CardContent className="py-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={formShouldPost}
                    onChange={e => setFormShouldPost(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Creator must post on their page</span>
                    <p className="text-xs text-gray-500">The creator will publish the creatives on their own social media accounts</p>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end pb-8">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
              <Button variant="outline" onClick={() => handlePublish(true)}>Save as Draft</Button>
              <Button className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2" onClick={() => handlePublish(false)}>
                <Megaphone className="w-4 h-4" /> Publish Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Post Detail with Applicants & Inline Chat ──────────────
  if (selectedPost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <button onClick={() => { setSelectedPostId(null); setSelectedApplicantId(null); }} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Posts
          </button>

          {/* Post Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{selectedPost.title}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_MAP[selectedPost.status]?.color || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_MAP[selectedPost.status]?.label || selectedPost.status}
                </span>
              </div>
              <p className="text-gray-500 mb-3">{selectedPost.description}</p>
              <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />₹{selectedPost.budgetMin.toLocaleString("en-IN")} – ₹{selectedPost.budgetMax.toLocaleString("en-IN")}</span>
                <span>•</span>
                <span>{formatFollowers(selectedPost.minFollowers)} – {formatFollowers(selectedPost.maxFollowers)} followers</span>
                <span>•</span>
                <span>{selectedPost.creatives.length} creative{selectedPost.creatives.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedPost.niches.map(n => <Badge key={n} variant="info">{n}</Badge>)}
                {selectedPost.platforms.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
              </div>
            </div>
          </div>

          {/* Two-pane: Applicants list + Chat */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Applicants */}
            <Card className="lg:col-span-1 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-900 text-base">Applicants ({selectedPost.applicants.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selectedPost.applicants.length === 0 ? (
                  <p className="text-sm text-gray-400 px-6 pb-6">No applications yet</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedPost.applicants.map(app => (
                      <button
                        key={app.id}
                        onClick={() => setSelectedApplicantId(app.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedApplicantId === app.id ? "bg-blue-50 border-l-3 border-l-[#0E61FF]" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900">{app.creatorName}</span>
                          {app.chatMessages.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MessageSquare className="w-3 h-3" /> {app.chatMessages.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{app.handle} • {formatFollowers(app.followers)}</p>
                        <p className="text-xs text-[#0E61FF] font-medium mt-1">₹{app.proposedRate.toLocaleString("en-IN")}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat / Applicant Detail */}
            <Card className="lg:col-span-2 shadow-md flex flex-col" style={{ minHeight: 500 }}>
              {selectedApplicant ? (
                <>
                  {/* Applicant Header */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedApplicant.creatorName}</h3>
                        <p className="text-sm text-gray-500">{selectedApplicant.handle} • {selectedApplicant.platform} • {formatFollowers(selectedApplicant.followers)} followers</p>
                      </div>
                      <Badge variant="info" className="text-xs">₹{selectedApplicant.proposedRate.toLocaleString("en-IN")} proposed</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3 italic">&quot;{selectedApplicant.pitchMessage}&quot;</p>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {selectedApplicant.chatMessages.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No messages yet. Start the conversation!</p>
                    ) : (
                      selectedApplicant.chatMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === "brand" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            msg.sender === "brand"
                              ? "bg-[#0E61FF] text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${msg.sender === "brand" ? "text-white/60" : "text-gray-400"}`}>{msg.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="px-6 py-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!chatInput.trim()} className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9]">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select an applicant to view their pitch and start chatting</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── Posts Listing ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />
      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-fade-in" className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Posts</h1>
            <p className="text-gray-500">Manage your creator briefs and review applications</p>
          </div>
          <Button onClick={handleCreateClick} className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2">
            <Plus className="w-4 h-4" /> Create New Post
          </Button>
        </AnimatedSection>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "active", "draft", "paused", "completed"].map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              onClick={() => setActiveTab(tab)}
              size="sm"
              className={activeTab === tab ? "bg-[#0E61FF] text-white hover:bg-[#0B4FD9]" : ""}
            >
              {tab === "all" ? `All (${posts.length})` : `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${posts.filter(p => p.status === tab.toUpperCase()).length})`}
            </Button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="space-y-4">
          {filteredPosts.map((post, idx) => (
            <AnimatedSection key={post.id} animation="animate-slide-up" delay={idx * 80}>
              <Card className="shadow-md hover-lift cursor-pointer" onClick={() => {
                if (post.status === "DRAFT") {
                  setFormTitle(post.title);
                  setFormDesc(post.description);
                  setFormNiches([...post.niches]);
                  setFormPlatforms([...post.platforms]);
                  setFormBudgetMin(post.budgetMin);
                  setFormBudgetMax(post.budgetMax);
                  setFormMinFollowers(post.minFollowers);
                  setFormMaxFollowers(post.maxFollowers);
                  setFormCreatives([...post.creatives]);
                  setFormShouldPost(post.shouldCreatorPost);
                  setEditingPostId(post.id);
                  setShowCreate(true);
                } else {
                  setSelectedPostId(post.id);
                  setSelectedApplicantId(null);
                }
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_MAP[post.status]?.color || "bg-gray-100 text-gray-600"}`}>
                          {STATUS_MAP[post.status]?.label || post.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{post.description}</p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.niches.map(n => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
                        {post.platforms.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />₹{post.budgetMin.toLocaleString("en-IN")} – ₹{post.budgetMax.toLocaleString("en-IN")}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{post.applicants.length} applicant{post.applicants.length !== 1 ? "s" : ""}</span>
                        <span>{post.creatives.length} creative{post.creatives.length !== 1 ? "s" : ""}</span>
                        {post.publishedAt && <span>Published: {post.publishedAt}</span>}
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="ml-4">
                      <Eye className="w-4 h-4 mr-1" /> {post.status === "DRAFT" ? "Edit" : "View"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="py-12 text-center">
              <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No posts yet. Create your first post to attract creators!</p>
              <Button onClick={handleCreateClick} className="bg-[#0E61FF] text-white hover:bg-[#0B4FD9] gap-2">
                <Plus className="w-4 h-4" /> Create New Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Page wrapper with Suspense for useSearchParams ─────────────────
export default function BrandPostsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E61FF]" />
      </div>
    }>
      <PostsPageInner />
    </Suspense>
  );
}
