"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search, Users, Target, MessageSquare, TrendingUp, Star, Shield,
  Zap, CheckCircle2, ArrowRight, Sparkles, Award, Clock, Globe
} from "lucide-react";
import { categories } from "@/data/enhanced-sample-data";
import { useState } from "react";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to search results page (to be implemented)
    console.log("Searching for:", searchQuery);
  };

  const trustStats = [
    { label: "Active Influencers", value: "10,000+", icon: Users },
    { label: "Brands Served", value: "5,000+", icon: Target },
    { label: "Successful Campaigns", value: "50,000+", icon: TrendingUp },
    { label: "Average Rating", value: "4.9/5", icon: Star },
  ];

  const features = [
    {
      icon: Shield,
      title: "Verified Creators",
      description: "All influencers are verified with authentic metrics and proven track records.",
    },
    {
      icon: Zap,
      title: "Fast Delivery",
      description: "Get your campaigns launched quickly with our streamlined collaboration process.",
    },
    {
      icon: Award,
      title: "Top Quality",
      description: "Work with top-rated influencers who deliver exceptional content every time.",
    },
    {
      icon: MessageSquare,
      title: "24/7 Support",
      description: "Our team is always here to help you succeed with your influencer campaigns.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Modern Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">
              InfluencerConnect
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/browse" className="text-sm font-medium hover:text-primary transition-colors">
              Browse Services
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="/become-seller" className="text-sm font-medium hover:text-primary transition-colors">
              Become a Seller
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-primary hover:bg-primary-hover btn-animate">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Search */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-transparent py-20 md:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Find the perfect
              <span className="gradient-text block mt-2">influencer services</span>
              for your brand
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Connect with verified influencers and creators. Get authentic content that drives real results.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder='Try "Instagram marketing" or "product review"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-32 py-7 text-lg border-2 focus:border-primary shadow-lg hover:shadow-xl transition-all"
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-hover btn-animate"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Popular Searches */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {["Instagram Posts", "YouTube Reviews", "TikTok Videos", "Brand Partnerships"].map((term) => (
                <button
                  key={term}
                  className="px-4 py-2 rounded-full border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-12 border-y bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustStats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Browse by Category</h2>
            <p className="text-xl text-muted-foreground">Find the perfect service for your needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="card-interactive hover-lift cursor-pointer h-full">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription>
                      {category.subcategories.length} services available
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose InfluencerConnect?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The most trusted platform for brand-influencer collaborations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 hover-lift">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Find Your Influencer",
                description: "Browse thousands of verified influencers across all niches and platforms.",
                icon: Search,
              },
              {
                step: "2",
                title: "Start Collaboration",
                description: "Choose a service package and provide your campaign requirements.",
                icon: MessageSquare,
              },
              {
                step: "3",
                title: "Get Results",
                description: "Receive high-quality content and watch your brand grow.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-12 -right-6 w-8 h-8 text-primary/30" />
                )}
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6 shadow-lg">
                  {item.step}
                </div>
                <item.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-accent text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Grow Your Brand?
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90">
            Join thousands of brands and influencers already collaborating on InfluencerConnect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup?role=brand">
              <Button size="lg" variant="secondary" className="text-lg px-8 btn-animate">
                <Target className="w-5 h-5 mr-2" />
                I'm a Brand
              </Button>
            </Link>
            <Link href="/auth/signup?role=influencer">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 border-white/30 hover:bg-white/20 text-white btn-animate">
                <Users className="w-5 h-5 mr-2" />
                I'm an Influencer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">InfluencerConnect</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The premier marketplace for brand-influencer collaborations.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Brands</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/browse" className="hover:text-primary transition-colors">Find Influencers</Link></li>
                <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Influencers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/become-seller" className="hover:text-primary transition-colors">Become a Seller</Link></li>
                <li><Link href="/seller-guide" className="hover:text-primary transition-colors">Seller Guide</Link></li>
                <li><Link href="/success-stories" className="hover:text-primary transition-colors">Success Stories</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2026 InfluencerConnect. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}
