"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Briefcase, Video, Mail, Lock, User, Phone, CheckCircle2, Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

function PasswordChecklist({ password }: { password: string }) {
  const checks = useMemo(() => [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "One uppercase", met: /[A-Z]/.test(password) },
    { label: "One lowercase", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ], [password]);

  if (!password) return null;

  return (
    <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2 mt-1.5">
      {checks.map((check) => (
        <span key={check.label} className={`flex items-center gap-1 text-xs ${check.met ? "text-green-600" : "text-gray-400"}`}>
          {check.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {check.label}
        </span>
      ))}
    </div>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"BRAND" | "CREATOR" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "brand") setRole("BRAND");
    if (roleParam === "influencer") setRole("CREATOR");
  }, [searchParams]);

  const isPasswordValid = useMemo(() => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
  }, [password]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      toast.error(role === "BRAND" ? "Company name needs to be at least 2 characters" : "Your name needs at least 2 characters — we gotta call you something!");
      return;
    }

    if (phone.length !== 10) {
      toast.error("We need a valid 10-digit phone number to keep your account secure");
      return;
    }

    if (!isPasswordValid) {
      toast.error("Almost there — your password needs a few more tweaks");
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, string> = {
        email: trimmedEmail,
        password,
        phone,
        role,
      };

      if (role === "CREATOR") {
        payload.name = trimmedName;
      } else {
        payload.companyName = trimmedName;
        payload.industry = "General";
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const firstIssue = data.details[0];
          toast.error(firstIssue?.message || data.error || "Signup failed");
        } else {
          toast.error(data.error || "Signup failed");
        }
        return;
      }

      // Signup API now sets the session cookie automatically
      const userRole = data.user.role === "CREATOR" ? "influencer"
        : data.user.role === "BRAND" ? "brand"
        : "admin";

      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", data.user.id);

      if (userRole === "brand" && data.user.brandProfile) {
        const bp = data.user.brandProfile;
        const hasRequired = bp.companyName && bp.industry && bp.description && bp.website;
        localStorage.setItem("brandProfileComplete", hasRequired ? "true" : "false");
      }

      toast.success("You're in! Welcome to QuickConnects — let's build something great");
      router.push(`/dashboard/${userRole}`);
    } catch {
      toast.error("Something broke on our end — try again in a bit");
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-[#0E61FF] flex items-center justify-center px-4 sm:px-6 py-4">
        <div className="w-full max-w-4xl">
          <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Quick<span className="text-white/70">Connects</span></span>
          </Link>

          <AnimatedSection animation="animate-fade-in">
            <h1 className="text-3xl font-bold text-center mb-2 text-white">Join QuickConnects</h1>
            <p className="text-center text-white/70 mb-8">Choose how you want to get started</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AnimatedSection animation="animate-slide-up" delay={0}>
              <Card
                className="cursor-pointer border-2 border-transparent hover:border-[#0E61FF] transition-all duration-200 hover:shadow-2xl group"
                onClick={() => setRole("BRAND")}
              >
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-[#0E61FF] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Briefcase className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">I&apos;m a Brand</CardTitle>
                  <CardDescription className="text-gray-500">
                    Find influencers to promote your products and grow your business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Discover verified influencers</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Secure escrow payments</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Track campaign deliverables</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Human-mediated dispute resolution</li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={100}>
              <Card
                className="cursor-pointer border-2 border-transparent hover:border-[#0E61FF] transition-all duration-200 hover:shadow-2xl group"
                onClick={() => setRole("CREATOR")}
              >
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-[#0E61FF] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">I&apos;m a Creator</CardTitle>
                  <CardDescription className="text-gray-500">
                    Connect with brands and monetize your content through authentic partnerships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Browse brand opportunities</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> 95% payout guarantee</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Set your own rates</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0E61FF]" /> Fair mediation support</li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/70">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-white font-semibold hover:underline py-2 inline-block">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E61FF] flex items-center justify-center px-4 sm:px-6 py-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Quick<span className="text-white/70">Connects</span></span>
        </Link>

        <AnimatedSection animation="animate-slide-up">
          <Card className="shadow-2xl border-0">
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() => setRole(null)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2 -ml-1 min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change role
              </button>
              <CardTitle className="text-2xl text-gray-900">
                Create your {role === "BRAND" ? "Brand" : "Creator"} Account
              </CardTitle>
              <CardDescription className="text-gray-500">
                Get started with QuickConnects today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-700">
                    {role === "BRAND" ? "Company Name" : "Your Name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={role === "BRAND" ? "e.g. Acme Inc." : "e.g. Priya Sharma"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 text-base"
                      required
                      autoComplete={role === "BRAND" ? "organization" : "name"}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 text-base"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2 text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="pl-10 text-base"
                      maxLength={10}
                      required
                      autoComplete="tel-national"
                    />
                  </div>
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="text-xs text-amber-500 mt-1">{10 - phone.length} more digit{10 - phone.length !== 1 ? "s" : ""} needed</p>
                  )}
                  {phone.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">10-digit Indian mobile number</p>
                  )}
                  {phone.length === 10 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Valid phone number</p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 text-base"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors w-11 h-11 flex items-center justify-center"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordChecklist password={password} />
                </div>
                <Button type="submit" className="w-full" loading={loading} disabled={loading || !isPasswordValid}>
                  Create Account
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-[#0E61FF] font-semibold hover:underline py-2 inline-block">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E61FF] flex items-center justify-center"><div className="skeleton h-8 w-32 rounded" /></div>}>
      <SignupPageContent />
    </Suspense>
  );
}
