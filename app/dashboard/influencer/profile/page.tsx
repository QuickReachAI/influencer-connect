"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, User, Save, Loader2, Plus, X,
  AlertTriangle, CheckCircle, ShieldCheck, Image,
  Star, Instagram, Youtube, TrendingUp
} from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

interface SocialPlatformEntry {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
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
    reliabilityScore?: number;
    socialPlatforms?: SocialPlatformEntry[];
  };
}

const platformOptions = ["Instagram", "YouTube", "TikTok", "Twitter", "Facebook", "LinkedIn"];

export default function InfluencerProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<InfluencerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatformEntry[]>([
    { platform: "Instagram", handle: "", followers: 0, verified: false },
  ]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch profile");
      }
      const data = await res.json();
      const user = data.user;
      setProfile(user);
      if (user.creatorProfile) {
        setName(user.creatorProfile.name || "");
        setBio(user.creatorProfile.bio || "");
        setAvatar(user.creatorProfile.avatar || "");
        if (user.creatorProfile.socialPlatforms && user.creatorProfile.socialPlatforms.length > 0) {
          setPlatforms(user.creatorProfile.socialPlatforms);
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

  const addPlatform = () => {
    const used = new Set(platforms.map((p) => p.platform));
    const next = platformOptions.find((p) => !used.has(p)) || platformOptions[0];
    setPlatforms([...platforms, { platform: next, handle: "", followers: 0, verified: false }]);
  };

  const removePlatform = (idx: number) => {
    if (platforms.length <= 1) return;
    setPlatforms(platforms.filter((_, i) => i !== idx));
  };

  const updatePlatform = (idx: number, field: keyof SocialPlatformEntry, value: string | number | boolean) => {
    const updated = [...platforms];
    (updated[idx] as any)[field] = value;
    setPlatforms(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const validPlatforms = platforms
        .filter((p) => p.handle.trim())
        .map((p) => ({
          platform: p.platform,
          handle: p.handle.trim(),
          followers: Number(p.followers) || 0,
          verified: p.verified,
        }));

      const body: Record<string, any> = {};
      if (name.trim()) body.name = name.trim();
      if (bio.trim()) body.bio = bio.trim();
      if (avatar.trim()) body.avatar = avatar.trim();
      if (validPlatforms.length > 0) body.socialPlatforms = validPlatforms;

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStartKyc = () => {
    toast.info("KYC verification coming soon!");
  };

  const platformIcon = (platform: string) => {
    switch (platform) {
      case "Instagram": return <Instagram className="w-4 h-4" />;
      case "YouTube": return <Youtube className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
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
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-white">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Error Loading Profile</h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={() => { setError(null); setLoading(true); fetchProfile(); }}>
                Try Again
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

      <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
        <Link href="/dashboard/influencer" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <AnimatedSection animation="animate-fade-in">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 mb-8">Manage your influencer profile</p>
        </AnimatedSection>

        {/* KYC & Reliability */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <AnimatedSection animation="animate-fade-in" delay={0}>
          <Card className="bg-[#0E61FF] border-none hover-lift">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <div>
                    <p className="font-medium text-sm text-white">KYC Status</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      profile?.kycStatus === "VERIFIED"
                        ? "bg-white/20 text-white border-none"
                        : profile?.kycStatus === "PENDING"
                        ? "bg-amber-500 text-white border-none"
                        : "bg-white/20 text-white border-none"
                    }
                  >
                    {profile?.kycStatus === "VERIFIED" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {profile?.kycStatus || "Not Started"}
                  </Badge>
                  {profile?.kycStatus !== "VERIFIED" && (
                    <Button size="sm" onClick={handleStartKyc} className="bg-white text-[#0E61FF] hover:bg-white/90">
                      Start KYC
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </AnimatedSection>

          <AnimatedSection animation="animate-fade-in" delay={100}>
          <Card className="bg-amber-500 border-none hover-lift">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-white" />
                  <div>
                    <p className="font-medium text-sm text-white">Reliability Score</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">
                  {profile?.creatorProfile?.reliabilityScore ?? "N/A"}
                  {profile?.creatorProfile?.reliabilityScore !== undefined && "%"}
                </span>
              </div>
            </CardContent>
          </Card>
          </AnimatedSection>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-white">
            <CardContent className="py-3 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 bg-emerald-600 border-none">
            <CardContent className="py-3 flex items-center gap-2 text-white">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Profile saved successfully!</span>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSave}>
          {/* Basic Info */}
          <AnimatedSection animation="animate-slide-up" delay={200} className="mb-6">
          <Card className="bg-white shadow-md hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block text-gray-900">Display Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-gray-900">Bio</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0E61FF] min-h-[100px] resize-y"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell brands about yourself, your content style, and your audience..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1 text-gray-900">
                  <Image className="w-4 h-4" />
                  Avatar URL
                </label>
                <Input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
                {avatar && (
                  <div className="mt-2 w-16 h-16 rounded-full border border-gray-200 overflow-hidden">
                    <img src={avatar} alt="Avatar preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </AnimatedSection>

          {/* Social Platforms */}
          <AnimatedSection animation="animate-slide-up" delay={300} className="mb-6">
          <Card className="bg-white shadow-md hover-lift">
            <CardHeader>
              <CardTitle className="text-gray-900">Social Platforms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {platforms.map((p, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {platformIcon(p.platform)}
                      <select
                        value={p.platform}
                        onChange={(e) => updatePlatform(idx, "platform", e.target.value)}
                        className="rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm"
                      >
                        {platformOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    {platforms.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePlatform(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Handle</label>
                      <Input
                        value={p.handle}
                        onChange={(e) => updatePlatform(idx, "handle", e.target.value)}
                        placeholder="@yourhandle"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Followers</label>
                      <Input
                        type="number"
                        value={p.followers || ""}
                        onChange={(e) => updatePlatform(idx, "followers", parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addPlatform} className="gap-1">
                <Plus className="w-4 h-4" />
                Add Platform
              </Button>
            </CardContent>
          </Card>
          </AnimatedSection>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Link href="/dashboard/influencer">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving} className="gap-2 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white btn-premium">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
