"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Briefcase, Video, Mail, Lock, User, Phone } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"BRAND" | "CREATOR" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "brand") setRole("BRAND");
    if (roleParam === "influencer") setRole("CREATOR");
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);

    try {
      const payload: Record<string, any> = {
        email,
        password,
        phone,
        role,
      };

      if (role === "CREATOR") {
        payload.name = name;
      } else {
        payload.companyName = name;
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

      toast.success("Account created! Please log in.");
      router.push("/auth/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-md icon-hover-bounce">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-2 py-0.5 rounded-full">AI</span>
          </Link>

          <AnimatedSection animation="animate-fade-in">
            <h1 className="text-3xl font-heading font-bold text-center mb-4 text-foreground">Join QuickReach AI</h1>
            <p className="text-center text-muted-foreground mb-8">Choose how you want to get started</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <AnimatedSection animation="animate-flip-in" delay={0}>
              <Card
                className="cursor-pointer card-interactive hover-tilt group border-2 hover:border-[hsl(var(--primary))] border-l-4 border-l-[hsl(var(--primary))] bg-white shadow-xl shadow-foreground/[0.04]"
                onClick={() => setRole("BRAND")}
              >
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center mx-auto mb-4 group-hover-bounce">
                    <Briefcase className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle>I'm a Brand</CardTitle>
                  <CardDescription>
                    Find influencers to promote your products and grow your business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Discover verified influencers</li>
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Secure escrow payments</li>
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Track campaign deliverables</li>
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Human-mediated dispute resolution</li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-flip-in" delay={150}>
              <Card
                className="cursor-pointer card-interactive hover-tilt group border-2 hover:border-[hsl(var(--coral))] border-l-4 border-l-[hsl(var(--coral))] bg-white shadow-xl shadow-foreground/[0.04]"
                onClick={() => setRole("CREATOR")}
              >
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-[hsl(var(--coral))] rounded-full flex items-center justify-center mx-auto mb-4 group-hover-bounce">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle>I'm a Creator</CardTitle>
                  <CardDescription>
                    Connect with brands and monetize your content through authentic partnerships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Browse brand opportunities</li>
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> 95% payout guarantee</li>
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Set your own rates</li>
                    <li className="flex items-center gap-2"><span className="text-primary font-bold">+</span> Fair mediation support</li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[hsl(var(--primary))] font-medium animated-underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-md icon-hover-bounce">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-2 py-0.5 rounded-full">AI</span>
        </Link>

        <AnimatedSection animation="animate-blur-in">
          <div className="bg-[hsl(var(--primary))] h-1.5 rounded-t-xl" />
          <Card className="bg-white shadow-xl shadow-foreground/[0.04] rounded-t-none">
          <CardHeader>
            <CardTitle className="text-2xl">
              Create your {role === "BRAND" ? "Brand" : "Creator"} Account
            </CardTitle>
            <CardDescription>
              Get started with QuickReach AI today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
                  {role === "BRAND" ? "Company Name" : "Your Name"}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={role === "BRAND" ? "Acme Inc." : "Priya Sharma"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 input-glow"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 input-glow"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2 text-foreground">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-10 input-glow"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">10-digit Indian mobile number</p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 input-glow"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
              </div>
              <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-white hover:opacity-90 border-0 btn-animate shadow-md" loading={loading}>
                Create Account
              </Button>
            </form>

            <div className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRole(null)}
                className="text-muted-foreground"
              >
                ← Back to role selection
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-[hsl(var(--primary))] font-medium animated-underline">
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
    <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--bg-blue))] flex items-center justify-center"><div className="skeleton h-8 w-32 rounded" /></div>}>
      <SignupPageContent />
    </Suspense>
  );
}
