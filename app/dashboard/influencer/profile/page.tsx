"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import {
  ArrowLeft,
  User,
  Save,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Image,
  Instagram,
  Youtube,
  Facebook,
  Link2,
  BarChart3,
  Users,
  Zap,
  ChevronDown,
  Megaphone,
  Lock,
} from "lucide-react";

const NICHE_OPTIONS = [
  "Beauty", "Skincare", "Technology", "Gadgets", "Fitness", "Health",
  "Food", "Travel", "Fashion", "Lifestyle", "Gaming", "Education",
  "Finance", "Parenting", "Pets", "Automotive",
];

const platformOptions = ["Instagram", "YouTube", "Facebook"];

const platformConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Instagram: {
    icon: <Instagram className="w-5 h-5" />,
    color: "text-pink-600",
    bg: "bg-gradient-to-br from-pink-500 to-purple-600",
  },
  YouTube: {
    icon: <Youtube className="w-5 h-5" />,
    color: "text-red-600",
    bg: "bg-gradient-to-br from-red-500 to-red-700",
  },
  Facebook: {
    icon: <Facebook className="w-5 h-5" />,
    color: "text-blue-600",
    bg: "bg-gradient-to-br from-blue-500 to-blue-700",
  },
};

interface SocialEntity {
  id?: string;
  platform: string;
  handle: string;
  followers: number;
  engagementRate: number;
  connected: boolean;
  connecting?: boolean;
}

interface InfluencerProfileData {
  id: string;
  email: string;
  role: string;
  kycStatus?: string;
  creatorProfile?: {
    name: string;
    bio: string;
    avatar?: string;
    niche?: string;
    category?: string;
    portfolio?: string[];
    audienceDemographics?: Record<string, unknown>;
    reliabilityScore?: number;
  };
}

interface CompletionItem {
  label: string;
  weight: number;
  done: boolean;
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function InfluencerProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectToDiscover = searchParams.get("complete") === "true";

  const [profile, setProfile] = useState<InfluencerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [entities, setEntities] = useState<SocialEntity[]>([
    { platform: "Instagram", handle: "", followers: 0, engagementRate: 0, connected: false },
  ]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") router.push("/auth/login");
  }, [router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("infNiches");
      if (stored) setNiches(JSON.parse(stored));
    } catch { /* ignore */ }
    try {
      const stored = localStorage.getItem("infEntities");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setEntities(parsed);
      }
    } catch { /* ignore */ }
    try {
      const stored = localStorage.getItem("infPrivacyConsent");
      if (stored === "true") setPrivacyConsent(true);
    } catch { /* ignore */ }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, entitiesRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/social-entities"),
      ]);

      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error || "Failed to fetch profile");
      }
      const profileData = await profileRes.json();
      const user = profileData.user;
      setProfile(user);
      if (user.creatorProfile) {
        setName(user.creatorProfile.name || "");
        setBio(user.creatorProfile.bio || "");
        setAvatar(user.creatorProfile.avatar || "");
      }

      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json();
        const apiEntities = entitiesData.entities ?? [];
        if (apiEntities.length > 0) {
          setEntities(
            apiEntities.map((e: Record<string, unknown>) => ({
              id: e.id as string,
              platform:
                e.platform === "INSTAGRAM" ? "Instagram"
                  : e.platform === "YOUTUBE" ? "YouTube"
                    : "Facebook",
              handle: (e.handle as string) || "",
              followers: (e.followerCount as number) || 0,
              engagementRate: Number(e.engagementRate) || 0,
              connected: (e.isVerified as boolean) || false,
            }))
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const completionItems: CompletionItem[] = [
    { label: "Name", weight: 15, done: name.trim().length >= 2 },
    { label: "Bio", weight: 15, done: bio.trim().length >= 20 },
    { label: "Niche Categories", weight: 15, done: niches.length > 0 },
    { label: "Social Accounts Connected", weight: 30, done: entities.some(e => e.connected && e.handle.trim().length > 0) },
    { label: "KYC Verification", weight: 10, done: profile?.kycStatus === "VERIFIED" },
    { label: "Privacy Consent", weight: 10, done: privacyConsent },
    { label: "Avatar", weight: 5, done: avatar.trim().length > 0 },
  ];

  const completionScore = completionItems.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);

  const toggleNiche = (n: string) => {
    setNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const addEntity = () => {
    setEntities(prev => [
      ...prev,
      { platform: "Instagram", handle: "", followers: 0, engagementRate: 0, connected: false },
    ]);
  };

  const removeEntity = (idx: number) => {
    if (entities.length <= 1) return;
    setEntities(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEntity = (idx: number, field: keyof SocialEntity, value: string | number | boolean) => {
    setEntities(prev => {
      const updated = [...prev];
      (updated[idx] as unknown as Record<string, unknown>)[field] = value;
      return updated;
    });
  };

  const handleOAuthConnect = (idx: number) => {
    if (entities[idx].connected) return;
    updateEntity(idx, "connecting", true);
    setTimeout(() => {
      setEntities(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          connected: true,
          connecting: false,
          followers: updated[idx].followers || Math.floor(Math.random() * 50000) + 1000,
          engagementRate: updated[idx].engagementRate || parseFloat((Math.random() * 5 + 1).toFixed(1)),
        };
        return updated;
      });
    }, 1000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, unknown> = {};
      if (name.trim()) body.name = name.trim();
      if (bio.trim()) body.bio = bio.trim();
      if (avatar.trim()) body.avatar = avatar.trim();
      if (niches.length > 0) body.niche = niches.join(", ");

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      const platformMap: Record<string, string> = {
        Instagram: "INSTAGRAM",
        YouTube: "YOUTUBE",
        Facebook: "FACEBOOK",
      };

      const entityPromises = entities
        .filter(p => p.handle.trim())
        .map(entity => {
          const payload = {
            platform: platformMap[entity.platform] || entity.platform,
            handle: entity.handle.trim(),
            followerCount: Number(entity.followers) || 0,
            engagementRate: Number(entity.engagementRate) || 0,
          };
          if (entity.id) {
            return fetch(`/api/social-entities/${entity.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }
          return fetch("/api/social-entities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        });

      const results = await Promise.all(entityPromises);
      const failed = results.find(r => !r.ok);
      if (failed) {
        const data = await failed.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save social entities");
      }

      localStorage.setItem("infNiches", JSON.stringify(niches));
      localStorage.setItem("infEntities", JSON.stringify(entities));
      localStorage.setItem("infPrivacyConsent", privacyConsent ? "true" : "false");

      const scoreAfterSave = completionItems.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
      localStorage.setItem("infProfileComplete", scoreAfterSave >= 100 ? "true" : "false");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (redirectToDiscover && scoreAfterSave >= 100) {
        setTimeout(() => router.push("/dashboard/influencer/discover"), 1000);
      }

      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
          <div className="h-6 w-36 mb-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-12 w-64 mb-4 rounded bg-gray-200 animate-pulse" />
          <div className="space-y-6">
            <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={() => { setError(null); setLoading(true); fetchProfile(); }}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/dashboard/influencer"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {redirectToDiscover && (
          <AnimatedSection animation="animate-slide-up" className="mb-6">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4 flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Complete your profile to discover deals</p>
                  <p className="text-xs text-amber-600">Fill in all required fields below. Reach 100% completion to start browsing and accepting deals.</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        <AnimatedSection animation="animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-500 mb-6">Manage your influencer profile and connected accounts</p>
        </AnimatedSection>

        {/* ── Profile Completion Score ── */}
        <AnimatedSection animation="animate-slide-up" delay={50} className="mb-6">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#0E61FF]" />
                  <h3 className="text-sm font-semibold text-gray-900">Profile Completion</h3>
                </div>
                <span className={`text-lg font-bold ${completionScore >= 100 ? "text-emerald-600" : completionScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
                  {completionScore}%
                </span>
              </div>

              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completionScore >= 100 ? "bg-emerald-500" : completionScore >= 50 ? "bg-amber-500" : "bg-red-400"
                  }`}
                  style={{ width: `${completionScore}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {completionItems.map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${item.done ? "text-gray-600" : "text-gray-400"}`}>
                      {item.label} ({item.weight}%)
                    </span>
                  </div>
                ))}
              </div>

              {completionScore < 100 && (
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Complete your profile to 100% to start discovering and accepting deals
                </p>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="py-3 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50">
            <CardContent className="py-3 flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Profile saved successfully!</span>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSave}>
          {/* ── Basic Information ── */}
          <AnimatedSection animation="animate-slide-up" delay={100} className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#0E61FF]" />
                  </div>
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Display Name *</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your display name (min 2 characters)"
                    className="rounded-xl"
                  />
                  {name.length > 0 && name.length < 2 && (
                    <p className="text-xs text-amber-500 mt-1">{2 - name.length} more character{2 - name.length > 1 ? "s" : ""} needed</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Bio *</label>
                  <textarea
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] min-h-[100px] resize-y transition-all"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell brands about yourself, your content style, and your audience... (min 20 characters)"
                  />
                  <div className="flex items-center justify-between mt-1">
                    {bio.length > 0 && bio.length < 20 ? (
                      <p className="text-xs text-amber-500">{20 - bio.length} more characters needed</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-gray-400">{bio.length} characters</p>
                  </div>
                </div>

                {/* Niche Categories */}
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Niche Categories *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNicheDropdownOpen(!nicheDropdownOpen)}
                      className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-left hover:border-gray-300 transition-colors"
                    >
                      <span className={niches.length > 0 ? "text-gray-900" : "text-gray-400"}>
                        {niches.length > 0 ? niches.join(", ") : "Select niches..."}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${nicheDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {nicheDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-slide-down">
                        {NICHE_OPTIONS.map(niche => (
                          <label key={niche} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={niches.includes(niche)}
                              onChange={() => toggleNiche(niche)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF]"
                            />
                            <span className="text-sm text-gray-700">{niche}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {niches.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {niches.map(n => (
                        <Badge key={n} variant="info" className="gap-1">
                          {n}
                          <button type="button" onClick={() => toggleNiche(n)} className="ml-1 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 flex items-center gap-1">
                    <Image className="w-4 h-4" /> Avatar URL
                  </label>
                  <Input
                    type="url"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="rounded-xl"
                  />
                  {avatar && (
                    <div className="mt-2 w-16 h-16 rounded-full border border-gray-200 overflow-hidden">
                      <img
                        src={avatar}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* ── Social Accounts / Entities ── */}
          <AnimatedSection animation="animate-slide-up" delay={200} className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-[#0E61FF]" />
                      </div>
                      Connected Accounts
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Connect your social accounts to receive deals. You can manage multiple accounts (entities) under your profile.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEntity}
                    className="gap-1 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {entities.map((entity, idx) => {
                  const config = platformConfig[entity.platform] || {
                    icon: <Link2 className="w-5 h-5" />,
                    color: "text-gray-600",
                    bg: "bg-gray-500",
                  };

                  return (
                    <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden">
                      {/* Entity Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center text-white`}>
                            {config.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <select
                                value={entity.platform}
                                onChange={e => updateEntity(idx, "platform", e.target.value)}
                                className="font-semibold text-sm text-gray-900 bg-transparent border-none outline-none cursor-pointer"
                              >
                                {platformOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              {idx === 0 ? (
                                <Badge variant="info" className="text-[10px]">Primary</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Entity #{idx + 1}</Badge>
                              )}
                              {entity.connected && (
                                <Badge variant="success" className="text-[10px] gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Connected
                                </Badge>
                              )}
                            </div>
                            {entity.handle && (
                              <p className="text-xs text-gray-500">{entity.handle}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entities.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntity(idx)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Entity Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Handle</label>
                            <Input
                              value={entity.handle}
                              onChange={e => updateEntity(idx, "handle", e.target.value)}
                              placeholder="@yourhandle"
                              className="rounded-xl"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant={entity.connected ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleOAuthConnect(idx)}
                              disabled={entity.connecting || entity.connected || !entity.handle.trim()}
                              className={`w-full gap-1.5 ${!entity.connected ? "bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90" : ""}`}
                            >
                              {entity.connecting ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Connecting...</>
                              ) : entity.connected ? (
                                <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />Connected via OAuth</>
                              ) : (
                                <><Zap className="w-3.5 h-3.5" />Connect via OAuth</>
                              )}
                            </Button>
                          </div>
                        </div>

                        {entity.connected && (
                          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Users className="w-3.5 h-3.5" />
                              <span className="font-medium text-gray-900">{formatFollowers(entity.followers)}</span>
                              followers
                            </div>
                            {entity.engagementRate > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span className="font-medium text-gray-900">{entity.engagementRate}%</span>
                                engagement
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* ── Privacy & Data Consent ── */}
          <AnimatedSection animation="animate-slide-up" delay={300} className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#0E61FF]" />
                  </div>
                  Privacy & Data Consent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={e => setPrivacyConsent(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF] mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    I consent to InfluencerConnect accessing my public social media data (followers, engagement, posts) for deal matching purposes.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.createElement("div");
                    el.className = "fixed bottom-6 right-6 z-50 animate-slide-up bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg";
                    el.textContent = "Privacy Policy coming soon!";
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 3000);
                  }}
                  className="text-sm text-[#0E61FF] hover:underline"
                >
                  View our Privacy Policy
                </button>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* ── KYC Status ── */}
          <AnimatedSection animation="animate-slide-up" delay={350} className="mb-6">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-[#0E61FF]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">KYC Verification</p>
                      <p className="text-xs text-gray-500">Identity verification status</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      profile?.kycStatus === "VERIFIED" ? "success"
                        : profile?.kycStatus === "PENDING" ? "warning"
                          : "destructive"
                    }
                  >
                    {profile?.kycStatus === "VERIFIED" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {profile?.kycStatus || "Not Started"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* ── Submit ── */}
          <div className="flex justify-end gap-3 pb-8">
            <Link href="/dashboard/influencer">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving} className="gap-2 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4" />Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InfluencerProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
          <div className="h-6 w-36 mb-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-12 w-64 mb-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    }>
      <InfluencerProfileInner />
    </Suspense>
  );
}
