"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Mail, Lock } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      const role = data.user.role === "CREATOR" ? "influencer"
        : data.user.role === "BRAND" ? "brand"
        : "admin";

      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", data.user.id);

      toast.success("Welcome back!");
      router.push(`/dashboard/${role}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 animate-bounce-in">
          <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-md icon-hover-bounce">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-2 py-0.5 rounded-full">AI</span>
        </Link>

        <AnimatedSection animation="animate-blur-in">
          <div className="bg-[hsl(var(--primary))] h-1.5 rounded-t-xl" />
          <Card className="bg-white shadow-xl shadow-foreground/[0.04] rounded-t-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              </div>
              <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-white hover:opacity-90 border-0 btn-animate shadow-md" loading={loading}>
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-[hsl(var(--primary))] font-medium animated-underline">
                  Sign up
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
