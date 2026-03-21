"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SingleSelect, MultiSelect } from "@/components/ui/dropdown-select";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  ArrowLeft, Building2, Globe, Save, Loader2,
  AlertTriangle, CheckCircle, ShieldCheck, Image,
  FileCheck, Clock, Info, X, Megaphone, Lock,
} from "lucide-react";
import { KYCVerificationModal } from "@/components/kyc/kyc-verification-modal";

const NICHE_OPTIONS = [
  "Beauty", "Skincare", "Technology", "Gadgets", "Fitness", "Health",
  "Food", "Travel", "Fashion", "Lifestyle", "Gaming", "Education",
  "Finance", "Parenting", "Pets", "Automotive",
];

const INDUSTRY_OPTIONS = [
  "Beauty & Skincare", "Fashion & Apparel", "Technology & Gadgets",
  "Health & Fitness", "Food & Beverage", "Travel & Hospitality",
  "Education & E-Learning", "Finance & Fintech", "Gaming & Entertainment",
  "Home & Living", "Automotive", "Real Estate",
  "E-Commerce & Retail", "Media & Publishing", "SaaS & Software",
  "FMCG & Consumer Goods", "Pharma & Healthcare", "Sports",
  "Non-Profit & Social", "Other",
];

interface BrandProfileData {
  id: string;
  email: string;
  phone?: string;
  role: string;
  kycStatus?: string;
  brandProfile?: {
    companyName: string;
    industry: string;
    description: string;
    website: string;
    logo?: string;
    gstin?: string;
    gstinVerified?: boolean;
    niches?: string[];
  };
}

interface CompletionItem {
  label: string;
  weight: number;
  done: boolean;
}

function BrandProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectToCreate = searchParams.get("complete") === "true";

  const [profile, setProfile] = useState<BrandProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [companyName, setCompanyNameRaw] = useState("");
  const [industry, setIndustryRaw] = useState("");
  const [description, setDescriptionRaw] = useState("");
  const [website, setWebsiteRaw] = useState("");
  const [logo, setLogoRaw] = useState("");
  const [niches, setNichesRaw] = useState<string[]>([]);

  // Wrap setters to mark form as dirty on user edits
  const setCompanyName = (v: string) => { setCompanyNameRaw(v); setIsDirty(true); };
  const setIndustry = (v: string) => { setIndustryRaw(v); setIsDirty(true); };
  const setDescription = (v: string) => { setDescriptionRaw(v); setIsDirty(true); };
  const setWebsite = (v: string) => { setWebsiteRaw(v); setIsDirty(true); };
  const setLogo = (v: string) => { setLogoRaw(v); setIsDirty(true); };
  const setNiches = (v: string[]) => { setNichesRaw(v); setIsDirty(true); };
  const [useCustomLogo, setUseCustomLogo] = useState(false);

  const [gstin, setGstin] = useState("");
  const [kybStatus, setKybStatus] = useState<"NOT_STARTED" | "PENDING" | "VERIFIED">("NOT_STARTED");
  const [kybSubmitting, setKybSubmitting] = useState(false);
  const [kybToast, setKybToast] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [privacyConsentLocked, setPrivacyConsentLocked] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialLoadRef = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") router.push("/auth/login");
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
      if (user.brandProfile) {
        setCompanyNameRaw(user.brandProfile.companyName || "");
        setIndustryRaw(user.brandProfile.industry || "");
        setDescriptionRaw(user.brandProfile.description || "");
        setWebsiteRaw(user.brandProfile.website || "");
        const savedLogo = user.brandProfile.logo || "";
        setLogoRaw(savedLogo);
        if (savedLogo && user.brandProfile.website) {
          const isAutoUrl = savedLogo.includes("logo.clearbit.com/") || savedLogo.includes("logo.dev/") || savedLogo.includes("google.com/s2/favicons");
          if (!isAutoUrl) setUseCustomLogo(true);
        }
        const fetchedNiches = user.brandProfile.niches || [];
        if (fetchedNiches.length > 0) setNichesRaw(fetchedNiches);
        if (user.brandProfile.gstin) {
          setGstin(user.brandProfile.gstin);
          setKybStatus(user.brandProfile.gstinVerified ? "VERIFIED" : "PENDING");
        }
      }

      // Load privacy consent from localStorage (lock if previously saved)
      try {
        const stored = localStorage.getItem("brandPrivacyConsent");
        if (stored === "true") {
          setPrivacyConsent(true);
          setPrivacyConsentLocked(true);
        }
      } catch { /* ignore */ }

      setIsDirty(false);
      // Allow auto-save after initial load completes
      setTimeout(() => { initialLoadRef.current = false; }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Logo auto-detect ─────────────────────────────────────
  const [autoLogoCandidates, setAutoLogoCandidates] = useState<string[]>([]);
  const [autoLogoUrl, setAutoLogoUrl] = useState("");
  const [autoLogoStatus, setAutoLogoStatus] = useState<"idle" | "checking" | "found" | "none">("idle");

  useEffect(() => {
    if (!website || !website.includes(".")) {
      setAutoLogoCandidates([]);
      setAutoLogoUrl("");
      setAutoLogoStatus("idle");
      return;
    }

    try {
      const raw = website.trim();
      const full = raw.startsWith("http") ? raw : `https://${raw}`;
      const hostname = new URL(full).hostname;
      const bare = hostname.replace(/^www\./, "");

      const candidates = [
        `https://logo.clearbit.com/${bare}?size=256`,
        `https://logo.clearbit.com/www.${bare}?size=256`,
        `https://img.logo.dev/${bare}?token=pk_anonymous&size=256`,
        `https://www.google.com/s2/favicons?domain=${bare}&sz=128`,
      ];

      setAutoLogoCandidates(candidates);
      setAutoLogoUrl("");
      setAutoLogoStatus("checking");
    } catch {
      setAutoLogoCandidates([]);
      setAutoLogoUrl("");
      setAutoLogoStatus("none");
    }
  }, [website]);

  const handleAutoLogoLoad = (url: string) => {
    if (autoLogoStatus === "found") return;
    setAutoLogoUrl(url);
    setAutoLogoStatus("found");
  };

  const [autoLogoFailCount, setAutoLogoFailCount] = useState(0);
  useEffect(() => { setAutoLogoFailCount(0); }, [autoLogoCandidates]);

  const handleAutoLogoError = () => {
    setAutoLogoFailCount(prev => {
      const next = prev + 1;
      if (next >= autoLogoCandidates.length) {
        setAutoLogoStatus("none");
      }
      return next;
    });
  };

  const effectiveLogo = useCustomLogo ? logo : (autoLogoStatus === "found" && autoLogoUrl ? autoLogoUrl : logo);

  // ── Auto-save with 1.5s debounce ──────────────────────────
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (!isDirty) return;
    if (!companyName.trim() || !privacyConsent) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        const body: Record<string, unknown> = {};
        if (companyName.trim()) body.companyName = companyName.trim();
        if (industry.trim()) body.industry = industry.trim();
        if (description.trim()) body.description = description.trim();
        const w = website.trim();
        body.website = (w && w.includes(".") && !w.startsWith("http")) ? `https://${w}` : w;
        if (effectiveLogo) body.logo = effectiveLogo;
        if (niches.length > 0) body.niches = niches;

        const res = await fetch("/api/auth/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("Auto-save failed");

        localStorage.setItem("brandNiches", JSON.stringify(niches));
        localStorage.setItem("brandPrivacyConsent", privacyConsent ? "true" : "false");

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
  }, [companyName, industry, description, website, effectiveLogo, niches, isDirty, privacyConsent]);

  // ── Completion score ──────────────────────────────────────
  // Clear success banner when user starts editing again
  useEffect(() => {
    if (isDirty && success) setSuccess(false);
  }, [isDirty, success]);

  const completionItems: CompletionItem[] = [
    { label: "Company Name", weight: 15, done: companyName.trim().length > 0 },
    { label: "Industry", weight: 10, done: industry.trim().length > 0 },
    { label: "Description", weight: 15, done: description.trim().length >= 20 },
    { label: "Website", weight: 10, done: website.trim().length > 0 && website.includes(".") },
    { label: "Niche Categories", weight: 15, done: niches.length > 0 },
    { label: "GSTIN Verification", weight: 20, done: kybStatus === "VERIFIED" || kybStatus === "PENDING" },
    { label: "KYC Verification", weight: 10, done: profile?.kycStatus === "VERIFIED" },
    { label: "Logo", weight: 5, done: effectiveLogo.length > 0 },
  ];

  const completionScore = completionItems.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  const isProfileComplete = completionScore >= 100;


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, unknown> = {};
      if (companyName.trim()) body.companyName = companyName.trim();
      if (industry.trim()) body.industry = industry.trim();
      if (description.trim()) body.description = description.trim();
      const w = website.trim();
      body.website = (w && w.includes(".") && !w.startsWith("http")) ? `https://${w}` : w;
      if (effectiveLogo) body.logo = effectiveLogo;
      if (niches.length > 0) body.niches = niches;

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      localStorage.setItem("brandNiches", JSON.stringify(niches));
      localStorage.setItem("brandProfileComplete", completionScore >= 100 ? "true" : "false");
      localStorage.setItem("brandPrivacyConsent", privacyConsent ? "true" : "false");

      // Mark as clean after successful save
      setIsDirty(false);

      // Lock privacy consent after save
      if (privacyConsent) setPrivacyConsentLocked(true);

      setSuccess(true);

      if (redirectToCreate && completionScore >= 100) {
        setTimeout(() => router.push("/dashboard/brand/campaigns?create=true"), 1000);
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
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
          <div className="h-6 w-36 mb-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-12 w-64 mb-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
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
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard/brand" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Redirect banner */}
        {redirectToCreate && (
          <AnimatedSection animation="animate-slide-up" className="mb-6">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4 flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Finish your profile to unlock posting</p>
                  <p className="text-xs text-amber-600">Fill in the fields below to hit 100% — then you can create posts and start getting deals.</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        <AnimatedSection animation="animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-500 mb-6">Make your brand look good — this is what creators see</p>
        </AnimatedSection>

        {/* Profile Completion Score */}
        <AnimatedSection animation="animate-slide-up" delay={50} className="mb-6">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Profile Completion</h3>
                <span className={`text-lg font-bold ${completionScore >= 100 ? "text-emerald-600" : completionScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
                  {completionScore}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completionScore >= 100 ? "bg-emerald-500" : completionScore >= 50 ? "bg-amber-500" : "bg-red-400"
                  }`}
                  style={{ width: `${completionScore}%` }}
                />
              </div>

              {/* Checklist */}
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
                  Almost there — hit 100% to start posting and getting deals
                </p>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* KYC Status */}
        <AnimatedSection animation="animate-slide-up" delay={100} className="mb-6">
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
                <div className="flex items-center gap-3">
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

        {/* KYB / GSTIN Verification */}
        <AnimatedSection animation="animate-slide-up" delay={150} className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-[#0E61FF]" />
                </div>
                Business Verification (KYB)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Verification Status</p>
                {kybStatus === "VERIFIED" ? (
                  <Badge variant="success" className="gap-1"><ShieldCheck className="w-3 h-3" />Verified Brand</Badge>
                ) : kybStatus === "PENDING" ? (
                  <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" />Under Verification</Badge>
                ) : (
                  <Badge variant="secondary">Not Started</Badge>
                )}
              </div>

              {kybStatus !== "VERIFIED" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-1.5 block">GSTIN Number</label>
                    <Input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      disabled={kybStatus === "PENDING"}
                    />
                    <p className="text-xs text-gray-400 mt-1">15-character alphanumeric GSTIN</p>
                  </div>
                  <Button
                    type="button"
                    disabled={gstin.length !== 15 || kybSubmitting || kybStatus === "PENDING"}
                    className="gap-2 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90"
                    onClick={async () => {
                      setKybSubmitting(true);
                      setError(null);
                      try {
                        const res = await fetch("/api/auth/kyb", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ gstin }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Verification failed");
                        setKybStatus("PENDING");
                        setKybToast(true);
                        setTimeout(() => setKybToast(false), 4000);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "GSTIN verification failed");
                      } finally {
                        setKybSubmitting(false);
                      }
                    }}
                  >
                    {kybSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><FileCheck className="w-4 h-4" />Verify GSTIN</>}
                  </Button>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                <Info className="w-4 h-4 text-[#0E61FF] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#0E61FF]">GSTIN verification is required to create posts and lock deals.</p>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* KYB Toast */}
        {kybToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <Card className="border-emerald-200 bg-emerald-50 shadow-lg">
              <CardContent className="py-3 px-4 flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">GSTIN submitted for verification! Status: Under Verification.</span>
              </CardContent>
            </Card>
          </div>
        )}

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
          {/* Company Info */}
          <AnimatedSection animation="animate-slide-up" delay={200} className="mb-6 relative z-10">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#0E61FF]" />
                  </div>
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Company Name *</label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Industry *</label>
                  <SingleSelect
                    value={industry}
                    onChange={setIndustry}
                    options={INDUSTRY_OPTIONS}
                    placeholder="Select industry..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block">Description *</label>
                  <textarea
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] min-h-[100px] resize-y transition-all"
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your company and what you're looking for... (min 20 characters)"
                  />
                  {description.length > 0 && description.length < 20 && (
                    <p className="text-xs text-amber-500 mt-1">{20 - description.length} more characters needed</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block flex items-center gap-1">
                    <Globe className="w-4 h-4" /> Website *
                  </label>
                  <Input
                    type="text"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    onBlur={() => {
                      const v = website.trim();
                      if (v && v.includes(".") && !v.startsWith("http://") && !v.startsWith("https://")) {
                        setWebsite(`https://${v}`);
                      }
                    }}
                    placeholder="quickreach.com"
                  />
                  {website && !website.includes(".") && (
                    <p className="text-xs text-amber-500 mt-1">Enter a valid domain (e.g. quickreach.com)</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1.5 block flex items-center gap-1">
                    <Image className="w-4 h-4" /> Logo
                  </label>

                  {/* Hidden probe images — first one to load wins */}
                  {autoLogoStatus === "checking" && (
                    <div className="hidden">
                      {autoLogoCandidates.map(url => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          onLoad={() => handleAutoLogoLoad(url)}
                          onError={handleAutoLogoError}
                        />
                      ))}
                    </div>
                  )}

                  {/* Auto-detected logo preview */}
                  {autoLogoStatus === "found" && autoLogoUrl && !useCustomLogo && (
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 mb-3">
                      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                        <img
                          src={autoLogoUrl}
                          alt="Auto-detected logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-800">Logo detected from your website</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Fetched automatically</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    </div>
                  )}

                  {/* Loading state */}
                  {autoLogoStatus === "checking" && !useCustomLogo && (
                    <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-gray-200 bg-gray-50 mb-3">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <p className="text-sm text-gray-500">Detecting logo from website...</p>
                    </div>
                  )}

                  {/* Toggle for custom URL */}
                  <button
                    type="button"
                    onClick={() => setUseCustomLogo(!useCustomLogo)}
                    className="text-xs text-[#0E61FF] hover:underline mb-2 block"
                  >
                    {useCustomLogo
                      ? "Use auto-detected logo instead"
                      : autoLogoStatus === "found" ? "Use a custom logo URL instead" : "Add a logo URL manually"}
                  </button>

                  {(useCustomLogo || autoLogoStatus !== "found") && (
                    <>
                      <Input type="text" value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://example.com/logo.png" />
                      {logo && (
                        <div className="mt-2 w-14 h-14 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-white p-1">
                          <img src={logo} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Niche Categories */}
          <AnimatedSection animation="animate-slide-up" delay={250} className="mb-6 relative z-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Niche Categories *</CardTitle>
                <p className="text-sm text-gray-500">Select the categories relevant to your brand</p>
              </CardHeader>
              <CardContent>
                <MultiSelect
                  values={niches}
                  onChange={setNiches}
                  options={NICHE_OPTIONS}
                  placeholder="Select niches..."
                />
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Privacy & Data Consent */}
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
                    I consent to QuickConnects processing brand data and connecting with creators for campaign purposes.
                    {privacyConsentLocked && <span className="block text-xs text-emerald-600 mt-1">Consent recorded</span>}
                  </span>
                </label>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Submit */}
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
              <Link href="/dashboard/brand">
                <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
              </Link>
              <Button type="submit" variant="outline" disabled={saving || !companyName.trim() || !privacyConsent || !isDirty} className="w-full sm:w-auto gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
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

export default function BrandProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
          <div className="h-6 w-36 mb-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-12 w-64 mb-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    }>
      <BrandProfileInner />
    </Suspense>
  );
}
