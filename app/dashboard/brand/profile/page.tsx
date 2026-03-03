"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  ArrowLeft, Building2, Globe, Save, Loader2,
  AlertTriangle, CheckCircle, ShieldCheck, Image
} from "lucide-react";

interface BrandProfile {
  id: string;
  email: string;
  role: string;
  kycStatus?: string;
  brandProfile?: {
    companyName: string;
    industry: string;
    description: string;
    website: string;
    logo?: string;
  };
}

export default function BrandProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") {
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
      if (user.brandProfile) {
        setCompanyName(user.brandProfile.companyName || "");
        setIndustry(user.brandProfile.industry || "");
        setDescription(user.brandProfile.description || "");
        setWebsite(user.brandProfile.website || "");
        setLogo(user.brandProfile.logo || "");
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, string> = {};
      if (companyName.trim()) body.companyName = companyName.trim();
      if (industry.trim()) body.industry = industry.trim();
      if (description.trim()) body.description = description.trim();
      body.website = website.trim();
      if (logo.trim()) body.logo = logo.trim();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
          <div className="skeleton h-6 w-36 mb-6 rounded" />
          <div className="skeleton h-12 w-64 mb-4 rounded" />
          <div className="skeleton h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
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
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard/brand" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors animated-underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <AnimatedSection animation="animate-blur-in">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your brand profile information</p>
        </AnimatedSection>

        {/* KYC Status */}
        <AnimatedSection animation="animate-slide-up" delay={100} className="mb-6">
        <Card className="hover-glow">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/15 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <p className="font-medium text-sm">KYC Verification</p>
                  <p className="text-xs text-muted-foreground">Identity verification status</p>
                </div>
              </div>
              <Badge
                className={
                  profile?.kycStatus === "VERIFIED"
                    ? "bg-[hsl(var(--emerald))] text-white hover:bg-[hsl(var(--emerald))]"
                    : profile?.kycStatus === "PENDING"
                      ? "bg-[hsl(var(--sunflower))] text-white hover:bg-[hsl(var(--sunflower))]"
                      : "bg-[hsl(var(--rose))]/15 text-[hsl(var(--rose))]"
                }
              >
                {profile?.kycStatus === "VERIFIED" && <CheckCircle className="w-3 h-3 mr-1" />}
                {profile?.kycStatus || "Not Started"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>

        {error && (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="py-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-[hsl(var(--emerald))]/30 bg-[hsl(var(--emerald))]/5">
            <CardContent className="py-3 flex items-center gap-2 text-[hsl(var(--emerald))]">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Profile saved successfully!</span>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSave}>
          <AnimatedSection animation="animate-slide-up" delay={200}>
          <Card className="hover-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--coral))]/15 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[hsl(var(--coral))]" />
                </div>
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Industry</label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Beauty & Skincare, Technology"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your company and what you're looking for..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  Logo URL
                </label>
                <Input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {logo && (
                  <div className="mt-2 w-16 h-16 rounded-lg border border-border overflow-hidden">
                    <img src={logo} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Link href="/dashboard/brand">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={saving} className="gap-2 bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 btn-animate">
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
            </CardFooter>
          </Card>
          </AnimatedSection>
        </form>
      </div>
    </div>
  );
}
