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
    toast.info("Coming soon!");
  };

  const trustStats = [
    { label: "Verified Creators", value: 10000, suffix: "+", icon: Users, bg: "bg-[hsl(var(--primary))]" },
    { label: "Brands Onboard", value: 5000, suffix: "+", icon: Target, bg: "bg-[hsl(var(--coral))]" },
    { label: "Campaigns Delivered", value: 50000, suffix: "+", icon: TrendingUp, bg: "bg-[hsl(var(--emerald))]" },
    { label: "Average Rating", value: 49, suffix: "/5", icon: Star, bg: "bg-[hsl(var(--sunflower))]", divisor: 10 },
  ];

  const features = [
    {
      icon: Shield,
      title: "KYC-Verified Creators",
      description: "Every creator is Aadhaar & PAN verified. Zero fake profiles, zero risk.",
      iconBg: "bg-[hsl(var(--primary))]",
      borderClass: "border-l-primary",
    },
    {
      icon: Lock,
      title: "Escrow Payments",
      description: "Money stays safe in escrow until you approve deliverables. 50/50 split model.",
      iconBg: "bg-[hsl(var(--coral))]",
      borderClass: "border-l-coral",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Matching",
      description: "Our AI matches the perfect creator to your brand's niche, audience, and budget.",
      iconBg: "bg-[hsl(var(--sunflower))]",
      borderClass: "border-l-sunflower",
    },
    {
      icon: MessageSquare,
      title: "On-Platform Chat",
      description: "Negotiate, share briefs, and collaborate — all on-platform with full audit trails.",
      iconBg: "bg-[hsl(var(--teal))]",
      borderClass: "border-l-teal",
    },
    {
      icon: IndianRupee,
      title: "Built for India",
      description: "Razorpay payments, GST invoicing, TDS compliance — all automated.",
      iconBg: "bg-[hsl(var(--emerald))]",
      borderClass: "border-l-emerald",
    },
    {
      icon: BarChart3,
      title: "Reliability Scores",
      description: "Data-driven creator scores based on delivery speed, quality, and satisfaction.",
      iconBg: "bg-[hsl(var(--rose))]",
      borderClass: "border-l-rose",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b shadow-sm animate-slide-down">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 group-hover:rotate-[-3deg]">
              <Zap className="w-6 h-6 text-white group-hover-wiggle" />
            </div>
            <span className="text-2xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-2 py-0.5 rounded-full">AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/browse" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] animated-underline transition-colors">Explore Creators</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] animated-underline transition-colors">How It Works</Link>
            <Link href="#features" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] animated-underline transition-colors">Features</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="hidden sm:inline-flex font-medium btn-press">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-[hsl(var(--coral))] text-white border-0 btn-animate shadow-md font-medium hover:opacity-90">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1 group-hover-arrow" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--bg-blue))] py-20 md:py-32">
        <div className="absolute top-10 -left-20 w-72 h-72 bg-[hsl(var(--primary))]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 -right-20 w-72 h-72 bg-[hsl(var(--coral))]/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-[hsl(var(--sunflower))] rounded-full opacity-40 animate-float-slow"></div>
        <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-[hsl(var(--teal))] rounded-full opacity-40 animate-float"></div>
        <div className="absolute top-1/2 right-1/6 w-3 h-3 bg-[hsl(var(--rose))] rounded-full opacity-30 animate-pulse-soft"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-md animate-bounce-in hover-pop cursor-default">
              <Sparkles className="w-4 h-4 animate-wiggle" />
              Powered by QuickReach AI
            </div>

            <h1 className="text-5xl md:text-7xl font-bold font-heading mb-6 leading-[1.1] text-[hsl(var(--navy))] animate-blur-in">
              Where Brands Meet
              <span className="text-[hsl(var(--primary))] block mt-2 animate-slide-right stagger-2">Verified Creators</span>
            </h1>

            <p className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in stagger-3">
              India&apos;s most trusted creator-brand collaboration platform.
              KYC-verified profiles, escrow-protected deals, AI-powered matching.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14 animate-fade-in stagger-4">
              <Link href="/auth/signup?role=brand">
                <Button size="lg" className="bg-[hsl(var(--primary))] text-white border-0 text-lg px-10 py-7 btn-animate shadow-lg font-semibold hover:opacity-90 group">
                  <Target className="w-5 h-5 mr-2 group-hover-bounce" />
                  I&apos;m a Brand
                  <ArrowRight className="w-4 h-4 ml-2 group-hover-arrow" />
                </Button>
              </Link>
              <Link href="/auth/signup?role=influencer">
                <Button size="lg" className="bg-[hsl(var(--coral))] text-white border-0 text-lg px-10 py-7 btn-animate shadow-lg font-semibold hover:opacity-90 group">
                  <Play className="w-5 h-5 mr-2 group-hover-bounce" />
                  I&apos;m a Creator
                  <ArrowRight className="w-4 h-4 ml-2 group-hover-arrow" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm animate-fade-in stagger-5">
              {["No upfront cost", "Escrow protection", "KYC verified", "24/7 support"].map((item, i) => (
                <span key={item} className="flex items-center gap-2 text-[hsl(var(--foreground))] animate-pop" style={{ animationDelay: `${600 + i * 100}ms` }}>
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--emerald))]" />
                  <span className="font-medium">{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats — animated counters */}
      <AnimatedSection as="section" className="py-16 bg-[hsl(var(--bg-blue-soft))]" animation="animate-fade-in">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustStats.map((stat, index) => (
              <AnimatedSection
                key={index}
                className={`${stat.bg} rounded-2xl p-6 text-center shadow-lg hover-tilt cursor-default`}
                animation="animate-pop"
                delay={index * 120}
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/20 flex items-center justify-center icon-hover-bounce">
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-1 font-heading">
                  {stat.divisor ? (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={2000} />
                  ) : (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={2500} />
                  )}
                </div>
                <div className="text-sm text-white/80 font-medium">{stat.label}</div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Features — scroll-triggered cards */}
      <section id="features" className="py-24 bg-[hsl(var(--bg-blue))]">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16" animation="animate-blur-in">
            <span className="inline-block text-sm font-bold text-white bg-[hsl(var(--teal))] px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 hover-pop cursor-default">Platform Features</span>
            <h2 className="text-4xl font-bold font-heading text-[hsl(var(--navy))]">Why Brands & Creators Choose Us</h2>
            <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mt-4">
              Built from the ground up for the Indian creator economy
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <AnimatedSection
                key={index}
                className={`bg-white rounded-2xl p-7 ${feature.borderClass} hover-tilt group shadow-md cursor-default`}
                animation="animate-flip-in"
                delay={index * 100}
              >
                <div className={`w-14 h-14 rounded-xl icon-box mb-5 shadow-md ${feature.iconBg}`}>
                  <feature.icon className="w-7 h-7 text-white group-hover-wiggle" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-[hsl(var(--navy))] group-hover:text-[hsl(var(--primary))] transition-colors">{feature.title}</h3>
                <p className="text-[hsl(var(--muted-foreground))] leading-relaxed text-[15px]">{feature.description}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — scroll-triggered steps */}
      <section id="how-it-works" className="py-24 bg-[hsl(var(--bg-blue-soft))]">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16" animation="animate-blur-in">
            <span className="inline-block text-sm font-bold text-white bg-[hsl(var(--coral))] px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 hover-pop cursor-default">Simple Process</span>
            <h2 className="text-4xl font-bold font-heading text-[hsl(var(--navy))]">How It Works</h2>
            <p className="text-lg text-[hsl(var(--muted-foreground))] mt-4">From discovery to delivery — three simple steps</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Discover & Match",
                description: "Browse verified creators or let our AI match you with the perfect fit for your campaign.",
                icon: Globe,
                bg: "bg-[hsl(var(--primary))]",
              },
              {
                step: "02",
                title: "Collaborate Securely",
                description: "Agree on deliverables, approve scripts, pay via escrow — everything stays on-platform.",
                icon: Handshake,
                bg: "bg-[hsl(var(--teal))]",
              },
              {
                step: "03",
                title: "Deliver & Grow",
                description: "Receive content, approve deliverables, release payment. Watch your brand grow.",
                icon: TrendingUp,
                bg: "bg-[hsl(var(--emerald))]",
              },
            ].map((item, index) => (
              <AnimatedSection key={index} className="relative text-center group" animation="animate-slide-up" delay={index * 180}>
                {index < 2 && (
                  <div className="hidden md:block absolute top-20 -right-4 w-8">
                    <ArrowRight className="w-6 h-6 text-[hsl(var(--coral))]/50 animate-pulse-soft" />
                  </div>
                )}
                <div className={`w-24 h-24 ${item.bg} rounded-3xl flex flex-col items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 icon-hover-bounce`}>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Step</span>
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <div className="w-12 h-12 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <item.icon className="w-6 h-6 text-[hsl(var(--primary))] group-hover-spin" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-[hsl(var(--navy))]">{item.title}</h3>
                <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">{item.description}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — bold navy */}
      <AnimatedSection as="section" className="py-24 bg-[hsl(var(--navy))] text-white relative overflow-hidden" animation="animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-2 bg-[hsl(var(--coral))]"></div>
        <div className="absolute top-10 left-10 w-52 h-52 bg-white/5 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[hsl(var(--primary))]/5 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <AnimatedSection animation="animate-blur-in">
            <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">
              Ready to Launch Your Next Campaign?
            </h2>
          </AnimatedSection>
          <AnimatedSection animation="animate-fade-in" delay={150}>
            <p className="text-xl mb-10 max-w-2xl mx-auto text-white/80">
              Join thousands of brands and creators already collaborating on QuickReach AI.
            </p>
          </AnimatedSection>
          <AnimatedSection className="flex flex-col sm:flex-row gap-4 justify-center" animation="animate-slide-up" delay={300}>
            <Link href="/auth/signup?role=brand">
              <Button size="lg" className="bg-[hsl(var(--primary))] text-white text-lg px-10 font-semibold btn-animate shadow-lg border-0 hover:opacity-90 group">
                <Target className="w-5 h-5 mr-2 group-hover-bounce" />
                Start as Brand
                <ArrowRight className="w-4 h-4 ml-2 group-hover-arrow" />
              </Button>
            </Link>
            <Link href="/auth/signup?role=influencer">
              <Button size="lg" className="bg-[hsl(var(--coral))] text-white text-lg px-10 font-semibold btn-animate shadow-lg border-0 hover:opacity-90 group">
                <Users className="w-5 h-5 mr-2 group-hover-bounce" />
                Join as Creator
                <ArrowRight className="w-4 h-4 ml-2 group-hover-arrow" />
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="bg-[hsl(var(--navy))] border-t border-white/10 py-14 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <AnimatedSection animation="animate-slide-right">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shadow-sm icon-hover-bounce">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold font-heading text-white">QuickReach</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white bg-white/15 px-1.5 py-0.5 rounded-full">AI</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                India&apos;s most trusted creator-brand collaboration platform. Powered by AI.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={100}>
              <h4 className="font-semibold mb-4 text-sm text-white">For Brands</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link href="/browse" className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Explore Creators</Link></li>
                <li><Link href="#how-it-works" className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">How It Works</Link></li>
                <li><Link href="#features" className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Features</Link></li>
              </ul>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up" delay={200}>
              <h4 className="font-semibold mb-4 text-sm text-white">For Creators</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link href="/auth/signup?role=influencer" className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Join as Creator</Link></li>
                <li><Link href="#features" className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Platform Benefits</Link></li>
                <li><Link href="#" onClick={comingSoon} className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Success Stories</Link></li>
              </ul>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-left" delay={300}>
              <h4 className="font-semibold mb-4 text-sm text-white">Company</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link href="#" onClick={comingSoon} className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">About Us</Link></li>
                <li><Link href="#" onClick={comingSoon} className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Contact</Link></li>
                <li><Link href="#" onClick={comingSoon} className="hover:text-[hsl(var(--primary))] animated-underline transition-colors">Careers</Link></li>
              </ul>
            </AnimatedSection>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
            <p>&copy; 2026 QuickReach AI. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" onClick={comingSoon} className="hover:text-white animated-underline transition-colors">Privacy</Link>
              <Link href="#" onClick={comingSoon} className="hover:text-white animated-underline transition-colors">Terms</Link>
              <Link href="#" onClick={comingSoon} className="hover:text-white animated-underline transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
