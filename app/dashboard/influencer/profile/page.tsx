"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
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
import { MultiSelect } from "@/components/ui/dropdown-select";
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
  Instagram,
  Youtube,
  Facebook,
  Link2,
  Users,
  Zap,
  Megaphone,
  Lock,
  Unlink,
  XCircle,
} from "lucide-react";
import { KYCVerificationModal } from "@/components/kyc/kyc-verification-modal";

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

interface InstagramLookupResult {
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profilePicUrl: string;
  isVerified: boolean;
}

interface SocialEntity {
  id?: string;
  platform: string;
  handle: string;
  followers: number;
  engagementRate: number;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  lookupData?: InstagramLookupResult;
}

interface InfluencerProfileData {
  id: string;
  email: string;
  role: string;
  phone?: string;
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

  // OAuth callback params
  const oauthStatus = searchParams.get("oauth");
  const oauthPlatform = searchParams.get("platform");
  const oauthMessage = searchParams.get("message");

  const [profile, setProfile] = useState<InfluencerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [oauthToast, setOauthToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const [name, setNameRaw] = useState("");
  const [bio, setBioRaw] = useState("");
  const [avatar, setAvatar] = useState("");
  const [niches, setNichesRaw] = useState<string[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Wrap setters to mark form as dirty on user edits
  const setName = (v: string) => { setNameRaw(v); setIsDirty(true); };
  const setBio = (v: string) => { setBioRaw(v); setIsDirty(true); };
  const setNiches = (v: string[]) => { setNichesRaw(v); setIsDirty(true); };

  const [privacyConsentLocked, setPrivacyConsentLocked] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialLoadRef = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [entities, setEntities] = useState<SocialEntity[]>([
    { platform: "Instagram", handle: "", followers: 0, engagementRate: 0, connected: false },
  ]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") router.push("/auth/login");
  }, [router]);

  // Handle OAuth callback toast
  useEffect(() => {
    if (oauthStatus) {
      setOauthToast({
        type: oauthStatus === "success" ? "success" : "error",
        message: oauthMessage || (oauthStatus === "success" ? "Account connected successfully!" : "OAuth failed"),
      });
      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      url.searchParams.delete("platform");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.pathname);
      setTimeout(() => setOauthToast(null), 6000);
    }
  }, [oauthStatus, oauthMessage]);

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
      if (stored === "true") {
        setPrivacyConsent(true);
        setPrivacyConsentLocked(true);
      }
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
        setNameRaw(user.creatorProfile.name || "");
        setBioRaw(user.creatorProfile.bio || "");
        setAvatar(user.creatorProfile.avatar || "");
        if (user.creatorProfile.niche) {
          const parsed = user.creatorProfile.niche.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (parsed.length > 0) setNichesRaw(parsed);
        }
      }

      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json();
        const apiEntities = entitiesData.entities ?? [];
        if (apiEntities.length > 0) {
          const mapped = apiEntities.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            platform:
              e.platform === "INSTAGRAM" ? "Instagram"
                : e.platform === "YOUTUBE" ? "YouTube"
                  : "Facebook",
            handle: (e.handle as string) || "",
            followers: (e.followerCount as number) || 0,
            engagementRate: Number(e.engagementRate) || 0,
            connected: (e.isVerified as boolean) || false,
          }));
          setEntities(mapped);
        }
      }

      setIsDirty(false);
      setTimeout(() => { initialLoadRef.current = false; }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Clear success banner when user starts editing again
  useEffect(() => {
    if (isDirty && success) setSuccess(false);
  }, [isDirty, success]);

  const completionItems: CompletionItem[] = [
    { label: "Name", weight: 15, done: name.trim().length >= 2 },
    { label: "Bio", weight: 15, done: bio.trim().length >= 20 },
    { label: "Niche Categories", weight: 15, done: niches.length > 0 },
    { label: "Social Accounts Connected", weight: 30, done: entities.some(e => e.connected && e.handle.trim().length > 0) },
    { label: "KYC Verification", weight: 15, done: profile?.kycStatus === "VERIFIED" },
    { label: "Privacy Consent", weight: 10, done: privacyConsent },
  ];

  const completionScore = completionItems.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);

  // ── Auto-save with 1.5s debounce ──────────────────────────
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (!isDirty) return;
    if (!name.trim() || !privacyConsent) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
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

        if (!res.ok) throw new Error("Auto-save failed");

        localStorage.setItem("infNiches", JSON.stringify(niches));
        localStorage.setItem("infPrivacyConsent", privacyConsent ? "true" : "false");

        setIsDirty(false);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, bio, avatar, niches, isDirty, privacyConsent]);

  const addEntity = () => {
    setEntities(prev => [
      ...prev,
      { platform: "Instagram", handle: "", followers: 0, engagementRate: 0, connected: false },
    ]);
  };

  const removeEntity = async (idx: number) => {
    if (entities.length <= 1) return;
    const entity = entities[idx];
    // If entity has a DB id, call DELETE API to remove it
    if (entity.id) {
      try {
        const res = await fetch(`/api/social-entities/${entity.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to remove social account");
          return;
        }
      } catch {
        setError("Failed to remove social account");
        return;
      }
    }
    setEntities(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEntity = (idx: number, field: keyof SocialEntity, value: string | number | boolean) => {
    setEntities(prev => {
      const updated = [...prev];
      (updated[idx] as unknown as Record<string, unknown>)[field] = value;
      return updated;
    });
    // Mark dirty for user-editable fields (not internal flags)
    if (field === "handle" || field === "platform") setIsDirty(true);
  };

  const handleOAuthConnect = async (idx: number) => {
    const entity = entities[idx];
    if (entity.connected) return;
    if (!entity.handle.trim()) return;

    if (entity.platform === "Instagram") {
      // Use Apify scraper to look up Instagram profile
      updateEntity(idx, "connecting", true);
      try {
        const res = await fetch("/api/instagram/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: entity.handle.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to look up Instagram profile");
        }

        const igProfile: InstagramLookupResult = data.profile;
        const normalizedHandle = igProfile.username.replace(/^@/, "");

        // Auto-save entity to DB immediately
        const entityPayload = {
          platform: "INSTAGRAM" as const,
          handle: normalizedHandle,
          followerCount: igProfile.followerCount,
          engagementRate: 0,
          isVerified: true,
        };

        let savedEntityId = entity.id;
        try {
          if (entity.id) {
            await fetch(`/api/social-entities/${entity.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entityPayload),
            });
          } else {
            const saveRes = await fetch("/api/social-entities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entityPayload),
            });
            if (saveRes.ok) {
              const saved = await saveRes.json();
              savedEntityId = saved.id;
            }
          }
        } catch {
          // Non-fatal — entity will still show as connected in UI
        }

        // Auto-save avatar from Instagram profile picture
        if (igProfile.profilePicUrl) {
          setAvatar(igProfile.profilePicUrl);
          try {
            await fetch("/api/auth/me", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ avatar: igProfile.profilePicUrl }),
            });
          } catch { /* non-fatal */ }
        }

        setEntities(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            id: savedEntityId,
            handle: normalizedHandle,
            followers: igProfile.followerCount,
            connected: true,
            connecting: false,
            lookupData: igProfile,
          };
          return updated;
        });

        // Entity was auto-saved to DB, so this isn't an unsaved change
        setIsDirty(false);

        setOauthToast({
          type: "success",
          message: `@${igProfile.username}: ${igProfile.followerCount.toLocaleString()} followers — saved`,
        });
        setTimeout(() => setOauthToast(null), 6000);
      } catch (err) {
        updateEntity(idx, "connecting", false);
        setOauthToast({
          type: "error",
          message: err instanceof Error ? err.message : "Instagram lookup failed",
        });
        setTimeout(() => setOauthToast(null), 6000);
      }
      return;
    }

    if (entity.platform === "YouTube") {
      updateEntity(idx, "connecting", true);
      try {
        const res = await fetch("/api/youtube/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: entity.handle.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to look up YouTube channel");

        const ytChannel = data.channel;

        // Save entity to DB
        const entityPayload = {
          platform: "YOUTUBE" as const,
          handle: ytChannel.handle,
          followerCount: ytChannel.subscriberCount,
          engagementRate: 0,
          isVerified: true,
        };

        let savedEntityId = entity.id;
        try {
          if (entity.id) {
            await fetch(`/api/social-entities/${entity.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entityPayload),
            });
          } else {
            const saveRes = await fetch("/api/social-entities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entityPayload),
            });
            if (saveRes.ok) {
              const saved = await saveRes.json();
              savedEntityId = saved.id;
            }
          }
        } catch { /* non-fatal */ }

        setEntities(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            id: savedEntityId,
            handle: ytChannel.handle,
            followers: ytChannel.subscriberCount,
            connected: true,
            connecting: false,
          };
          return updated;
        });
        setIsDirty(false);

        setOauthToast({
          type: "success",
          message: `${ytChannel.channelName}: ${ytChannel.subscriberCount.toLocaleString()} subscribers`,
        });
        setTimeout(() => setOauthToast(null), 6000);
      } catch (err) {
        updateEntity(idx, "connecting", false);
        setOauthToast({
          type: "error",
          message: err instanceof Error ? err.message : "YouTube lookup failed",
        });
        setTimeout(() => setOauthToast(null), 6000);
      }
      return;
    }

    // Facebook — no OAuth implemented, just mark as connected locally
    updateEntity(idx, "connecting", true);
    setTimeout(() => {
      setEntities(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], connected: true, connecting: false };
        return updated;
      });
    }, 1000);
  };

  const handleDisconnect = async (idx: number) => {
    const entity = entities[idx];
    if (!entity.connected) return;

    updateEntity(idx, "disconnecting", true);

    // For Instagram (Apify-based), reset locally and persist to DB
    if (entity.platform === "Instagram") {
      // Persist disconnection to DB
      if (entity.id) {
        try {
          await fetch(`/api/social-entities/${entity.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVerified: false, followerCount: 0 }),
          });
        } catch { /* non-fatal */ }
      }
      setEntities(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          connected: false,
          disconnecting: false,
          followers: 0,
          lookupData: undefined,
        };
        return updated;
      });
      setIsDirty(false);
      setOauthToast({ type: "success", message: "Instagram account disconnected" });
      setTimeout(() => setOauthToast(null), 4000);
      return;
    }

    // YouTube (Apify-based), reset locally and persist to DB
    if (entity.platform === "YouTube") {
      if (entity.id) {
        try {
          await fetch(`/api/social-entities/${entity.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVerified: false, followerCount: 0 }),
          });
        } catch { /* non-fatal */ }
      }
      setEntities(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          connected: false,
          disconnecting: false,
          followers: 0,
        };
        return updated;
      });
      setIsDirty(false);
      setOauthToast({ type: "success", message: "YouTube account disconnected" });
      setTimeout(() => setOauthToast(null), 4000);
      return;
    }

    // Others — generic disconnect
    updateEntity(idx, "disconnecting", false);
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
          if (entity.id) {
            // PATCH only sends update-safe fields (no platform/handle)
            return fetch(`/api/social-entities/${entity.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                followerCount: Number(entity.followers) || 0,
                engagementRate: Number(entity.engagementRate) || 0,
                isVerified: entity.connected,
              }),
            });
          }
          // POST for new entities includes platform + handle
          return fetch("/api/social-entities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: platformMap[entity.platform] || entity.platform,
              handle: entity.handle.trim().replace(/^@/, ""),
              followerCount: Number(entity.followers) || 0,
              engagementRate: Number(entity.engagementRate) || 0,
              isVerified: entity.connected,
            }),
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

      // Mark as clean after successful save
      setIsDirty(false);

      // Lock privacy consent after save
      if (privacyConsent) setPrivacyConsentLocked(true);

      setSuccess(true);

      if (redirectToDiscover && scoreAfterSave >= 100) {
        setTimeout(() => router.push("/dashboard/influencer/discover"), 1000);
      }
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

      {/* OAuth Toast */}
      {oauthToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <Card className={`shadow-lg ${oauthToast.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <CardContent className="py-3 px-4 flex items-center gap-2">
              {oauthToast.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className={`text-sm font-medium ${oauthToast.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
                {oauthToast.message}
              </span>
              <button onClick={() => setOauthToast(null)} className="ml-2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <AnimatedSection animation="animate-slide-up" delay={100} className="mb-6 relative z-10">
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
                    className="rounded-xl text-base sm:text-sm"
                  />
                  {name.length > 0 && name.length < 2 && (
                    <p className="text-xs text-amber-500 mt-1">{2 - name.length} more character{2 - name.length > 1 ? "s" : ""} needed</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Bio *</label>
                  <textarea
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] min-h-[100px] resize-y transition-all"
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
                  <MultiSelect
                    values={niches}
                    onChange={setNiches}
                    options={NICHE_OPTIONS}
                    placeholder="Select niches..."
                  />
                </div>

                {/* Profile Picture — auto-fetched from Instagram */}
                {avatar && (
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-1.5 block">Profile Picture</label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-2 border-gray-200 overflow-hidden flex-shrink-0">
                        <img
                          src={avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">Fetched from your connected Instagram account</p>
                    </div>
                  </div>
                )}

                {/* Account Info — read-only */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-1.5 block">Email</label>
                    <Input
                      value={profile?.email || ""}
                      disabled
                      className="rounded-xl bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-1.5 block">Phone</label>
                    <Input
                      value={profile?.phone || ""}
                      disabled
                      className="rounded-xl bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* ── Social Accounts / Entities ── */}
          <AnimatedSection animation="animate-slide-up" delay={200} className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    className="gap-1 flex-shrink-0 w-full sm:w-auto"
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

                  const isVerifiablePlatform = entity.platform === "Instagram" || entity.platform === "YouTube";

                  return (
                    <div key={idx} className="rounded-xl border border-gray-200">
                      {/* Entity Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 gap-2 sm:gap-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center text-white`}>
                            {config.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={entity.platform}
                                onChange={e => updateEntity(idx, "platform", e.target.value)}
                                disabled={entity.connected}
                                className="font-semibold text-sm text-gray-900 bg-transparent border-none outline-none cursor-pointer disabled:cursor-default"
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
                                  {entity.platform === "Instagram" ? "Followers loaded" : entity.platform === "YouTube" ? "Subscribers loaded" : "Connected"}
                                </Badge>
                              )}
                            </div>
                            {entity.handle && (
                              <p className="text-xs text-gray-500">{entity.handle}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entity.connected && isVerifiablePlatform && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnect(idx)}
                              disabled={entity.disconnecting}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                            >
                              {entity.disconnecting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Unlink className="w-3.5 h-3.5" />
                              )}
                              Disconnect
                            </Button>
                          )}
                          {entities.length > 1 && !entity.connected && (
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
                        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Handle</label>
                            <Input
                              value={entity.handle}
                              onChange={e => updateEntity(idx, "handle", e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (!entity.connected && entity.handle.trim()) {
                                    handleOAuthConnect(idx);
                                  }
                                }
                              }}
                              placeholder={entity.platform === "YouTube" ? "@channel or URL" : "@yourhandle"}
                              className="rounded-xl text-base sm:text-sm"
                              disabled={entity.connected && isVerifiablePlatform}
                            />
                          </div>
                          <div className="flex items-end">
                            {!entity.connected ? (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => handleOAuthConnect(idx)}
                                disabled={entity.connecting || !entity.handle.trim()}
                                className="w-full gap-1.5 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90"
                              >
                                {entity.connecting ? (
                                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />{entity.platform === "Instagram" ? "Fetching..." : entity.platform === "YouTube" ? "Fetching..." : "Connecting..."}</>
                                ) : (
                                  <><Zap className="w-3.5 h-3.5" />{entity.platform === "Instagram" ? "Get Followers" : entity.platform === "YouTube" ? "Get Subscribers" : "Connect"}</>
                                )}
                              </Button>
                            ) : (
                              <div className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-emerald-600 font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {entity.platform === "Instagram" ? "Followers loaded" : entity.platform === "YouTube" ? "Subscribers loaded" : "Verified"}
                              </div>
                            )}
                          </div>
                        </div>

                        {entity.connected && (
                          <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E61FF]/10">
                                <Users className="h-5 w-5 text-[#0E61FF]" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Followers</p>
                                <p className="text-lg font-semibold tabular-nums text-gray-900">
                                  {entity.followers > 0 ? formatFollowers(entity.followers) : "—"}
                                </p>
                              </div>
                              {entity.followers > 0 && (
                                <p className="ml-auto text-xs text-gray-400">
                                  {entity.platform === "Instagram" ? "From Instagram" : `From ${entity.platform}`}
                                </p>
                              )}
                            </div>
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
                <label className={`flex items-start gap-3 group ${privacyConsentLocked ? "cursor-default" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={e => !privacyConsentLocked && setPrivacyConsent(e.target.checked)}
                    disabled={privacyConsentLocked}
                    className="w-5 h-5 rounded border-gray-300 text-[#0E61FF] focus:ring-[#0E61FF] mt-0.5 flex-shrink-0 disabled:opacity-60"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    I consent to QuickConnects accessing my public social media data (followers, posts) for deal matching purposes.
                    {privacyConsentLocked && <span className="block text-xs text-emerald-600 mt-1">Consent recorded</span>}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-[#0E61FF]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">KYC Verification</p>
                      <p className="text-xs text-gray-500">Identity verification status</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {(profile?.kycStatus === "PENDING" || profile?.kycStatus === "REJECTED") && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setKycModalOpen(true)}
                        className="gap-1.5 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {profile?.kycStatus === "REJECTED" ? "Try Again" : "Start Verification"}
                      </Button>
                    )}
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
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* ── Submit ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-8">
            <div className="text-sm flex items-center gap-1.5">
              {autoSaveStatus === "saving" && (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /><span className="text-gray-400">Saving...</span></>
              )}
              {autoSaveStatus === "saved" && (
                <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Saved</span></>
              )}
              {autoSaveStatus === "error" && (
                <><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-500">Auto-save failed</span></>
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard/influencer" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
              </Link>
              <Button type="submit" variant="outline" disabled={saving || !privacyConsent || !isDirty} className="gap-2 w-full sm:w-auto">
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4" />Save Changes</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* KYC Modal */}
      {kycModalOpen && (
        <KYCVerificationModal
          userPhone={profile?.phone}
          onClose={() => {
            setKycModalOpen(false);
            fetchProfile();
          }}
        />
      )}
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
