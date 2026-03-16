"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users, Target, MessageSquare, TrendingUp, Star, Shield,
  Zap, CheckCircle2, ArrowRight, Sparkles, Lock,
  IndianRupee, BarChart3, Handshake, Globe, Play
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default function HomePage() {
  const comingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("Hang tight — this is coming soon!");
  };

  const trustStats = [
    { label: "Verified Creators", value: 10000, suffix: "+", icon: Users },
    { label: "Brands Onboard", value: 5000, suffix: "+", icon: Target },
    { label: "Campaigns Delivered", value: 50000, suffix: "+", icon: TrendingUp },
    { label: "Average Rating", value: 49, suffix: "/5", icon: Star, divisor: 10 },
  ];

  const features = [
    {
      icon: Shield,
      title: "KYC-Verified Creators",
      description: "Every creator is Aadhaar & PAN verified. Zero fake profiles, zero risk.",
    },
    {
      icon: Lock,
      title: "Escrow Payments",
      description: "Money stays safe in escrow until you approve deliverables. 50/50 split model.",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Matching",
      description: "Our AI matches the perfect creator to your brand's niche, audience, and budget.",
    },
    {
      icon: MessageSquare,
      title: "On-Platform Chat",
      description: "Negotiate, share briefs, and collaborate — all on-platform with full audit trails.",
    },
    {
      icon: IndianRupee,
      title: "Built for India",
      description: "Razorpay payments, GST invoicing, TDS compliance — all automated.",
    },
    {
      icon: BarChart3,
      title: "Reliability Scores",
      description: "Data-driven creator scores based on delivery speed, quality, and satisfaction.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E61FF]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b-2 border-gray-100 shadow-sm animate-slide-down">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#0E61FF] rounded-xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Quick<span className="text-[#0E61FF]">Connects</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/browse" className="text-sm font-medium text-gray-500 hover:text-[#0E61FF] transition-colors">Explore Creators</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-[#0E61FF] transition-colors">How It Works</Link>
            <Link href="#features" className="text-sm font-medium text-gray-500 hover:text-[#0E61FF] transition-colors">Features</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="hidden sm:inline-flex font-medium text-gray-600">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="font-medium">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — bold #0E61FF */}
      <section className="relative overflow-hidden bg-[#0E61FF] py-12 sm:py-16 md:py-36">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection animation="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-8 border border-white/20">
                <Sparkles className="w-4 h-4" />
                Powered by QuickReach AI
              </div>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={100}>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[1.05] text-white">
                Where Brands Meet
                <span className="block mt-2 text-white/90">Verified Creators</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection animation="animate-fade-in" delay={200}>
              <p className="text-lg md:text-xl text-white/75 mb-12 max-w-2xl mx-auto leading-relaxed">
                India&apos;s most trusted creator-brand collaboration platform.
                KYC-verified profiles, escrow-protected deals, AI-powered matching.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={300}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
                <Link href="/auth/signup?role=brand">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-[#0E61FF] hover:bg-gray-100 text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-7 shadow-xl font-semibold">
                    <Target className="w-5 h-5 mr-2" />
                    I&apos;m a Brand
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/auth/signup?role=influencer">
                  <Button size="lg" className="w-full sm:w-auto bg-white/15 text-white hover:bg-white/25 border-2 border-white/30 text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-7 shadow-xl font-semibold backdrop-blur-sm">
                    <Play className="w-5 h-5 mr-2" />
                    I&apos;m a Creator
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="animate-fade-in" delay={400}>
              <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2 sm:gap-y-3 text-sm">
                {["No upfront cost", "Escrow protection", "KYC verified", "24/7 support"].map((item) => (
                  <span key={item} className="flex items-center gap-2 text-white/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span className="font-medium">{item}</span>
                  </span>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {trustStats.map((stat, index) => (
              <AnimatedSection
                key={index}
                className="bg-[#0E61FF] rounded-2xl p-4 sm:p-6 text-center shadow-lg hover-lift cursor-default"
                animation="animate-slide-up"
                delay={index * 80}
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/20 flex items-center justify-center">
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={2500} />
                </div>
                <div className="text-sm text-white/70 font-medium">{stat.label}</div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16" animation="animate-fade-in">
            <span className="inline-block text-sm font-bold text-[#0E61FF] bg-blue-100 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Platform Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why Brands & Creators Choose Us</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto mt-4">
              Built from the ground up for the Indian creator economy
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <AnimatedSection
                key={index}
                className="bg-white rounded-2xl p-7 border-2 border-gray-100 card-interactive group shadow-md cursor-default"
                animation="animate-slide-up"
                delay={index * 80}
              >
                <div className="w-14 h-14 rounded-xl bg-[#0E61FF] flex items-center justify-center mb-5 shadow-md">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-[#0E61FF] transition-colors">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-[15px]">{feature.description}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 sm:py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16" animation="animate-fade-in">
            <span className="inline-block text-sm font-bold text-white bg-[#0E61FF] px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Simple Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="text-lg text-gray-500 mt-4">From discovery to delivery — three simple steps</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Discover & Match",
                description: "Browse verified creators or let our AI match you with the perfect fit for your campaign.",
                icon: Globe,
              },
              {
                step: "02",
                title: "Collaborate Securely",
                description: "Agree on deliverables, approve scripts, pay via escrow — everything stays on-platform.",
                icon: Handshake,
              },
              {
                step: "03",
                title: "Deliver & Grow",
                description: "Receive content, approve deliverables, release payment. Watch your brand grow.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <AnimatedSection key={index} className="relative text-center group" animation="animate-slide-up" delay={index * 120}>
                {index < 2 && (
                  <div className="hidden md:block absolute top-20 -right-4 w-8">
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <div className="w-24 h-24 bg-[#0E61FF] rounded-3xl flex flex-col items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Step</span>
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-gray-100">
                  <item.icon className="w-6 h-6 text-[#0E61FF]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.description}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 md:py-24 bg-[#0E61FF] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-52 h-52 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <AnimatedSection animation="animate-slide-up">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
              Ready to Launch Your Next Campaign?
            </h2>
          </AnimatedSection>
          <AnimatedSection animation="animate-fade-in" delay={150}>
            <p className="text-xl mb-10 max-w-2xl mx-auto text-white/75">
              Join thousands of brands and creators already collaborating on QuickConnects.
            </p>
          </AnimatedSection>
          <AnimatedSection className="flex flex-col sm:flex-row gap-4 justify-center" animation="animate-slide-up" delay={300}>
            <Link href="/auth/signup?role=brand">
              <Button size="lg" className="w-full sm:w-auto bg-white text-[#0E61FF] hover:bg-gray-100 text-lg px-6 sm:px-10 font-semibold shadow-xl">
                <Target className="w-5 h-5 mr-2" />
                Start as Brand
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/signup?role=influencer">
              <Button size="lg" className="w-full sm:w-auto bg-white/15 text-white hover:bg-white/25 border-2 border-white/30 text-lg px-6 sm:px-10 font-semibold backdrop-blur-sm">
                <Users className="w-5 h-5 mr-2" />
                Join as Creator
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-14 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-[#0E61FF] rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Quick<span className="text-white/60">Connects</span></span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                India&apos;s most trusted creator-brand collaboration platform. Powered by QuickReach AI.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">For Brands</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><Link href="/browse" className="hover:text-white transition-colors">Explore Creators</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">For Creators</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><Link href="/auth/signup?role=influencer" className="hover:text-white transition-colors">Join as Creator</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Platform Benefits</Link></li>
                <li><Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">Success Stories</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm text-white">Company</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; 2026 QuickConnects. Powered by QuickReach AI. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" onClick={comingSoon} className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
