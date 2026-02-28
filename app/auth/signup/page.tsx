"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Video } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"brand" | "influencer" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "brand" || roleParam === "influencer") {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    localStorage.setItem("userRole", role);
    localStorage.setItem("userId", `user-${role}-demo`);
    router.push(`/dashboard/${role}`);
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              InfluencerConnect
            </span>
          </Link>

          <h1 className="text-3xl font-bold text-center mb-4">Join InfluencerConnect</h1>
          <p className="text-center text-gray-600 mb-8">Choose how you want to get started</p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-600"
              onClick={() => setRole("brand")}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>I'm a Brand</CardTitle>
                <CardDescription>
                  Find influencers to promote your products and grow your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Discover verified influencers</li>
                  <li>✓ Send collaboration proposals</li>
                  <li>✓ Track campaign performance</li>
                  <li>✓ Manage multiple partnerships</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-600"
              onClick={() => setRole("influencer")}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-pink-600" />
                </div>
                <CardTitle>I'm an Influencer</CardTitle>
                <CardDescription>
                  Connect with brands and monetize your content with authentic partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Browse brand opportunities</li>
                  <li>✓ Showcase your portfolio</li>
                  <li>✓ Set your rates</li>
                  <li>✓ Receive collaboration offers</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-purple-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            InfluencerConnect
          </span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              Create your {role === "brand" ? "Brand" : "Influencer"} Account
            </CardTitle>
            <CardDescription>
              Get started with InfluencerConnect today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  {role === "brand" ? "Company Name" : "Your Name"}
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder={role === "brand" ? "Acme Inc." : "John Doe"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRole(null)}
              >
                ← Back to role selection
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-purple-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
