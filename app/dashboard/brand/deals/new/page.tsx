"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  ArrowLeft, Plus, X, DollarSign, FileText,
  Search, User, AlertTriangle, Loader2
} from "lucide-react";

interface CreatorOption {
  id: string;
  name: string;
  bio: string;
  avatar?: string;
  platforms: Array<{ platform: string; followers: number }>;
}

function CreateDealPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCreatorId = searchParams?.get("creatorId") || searchParams?.get("influencer") || "";

  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false);

  const [selectedCreator, setSelectedCreator] = useState<CreatorOption | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchCreators = useCallback(async () => {
    try {
      const res = await fetch("/api/influencers");
      if (!res.ok) throw new Error("Failed to fetch creators");
      const data = await res.json();
      const mapped: CreatorOption[] = (Array.isArray(data) ? data : data.influencers || []).map((inf: any) => ({
        id: inf.id,
        name: inf.name,
        bio: inf.bio || "",
        avatar: inf.avatar,
        platforms: inf.platforms || [],
      }));
      setCreators(mapped);

      if (preselectedCreatorId) {
        const found = mapped.find((c) => c.id === preselectedCreatorId);
        if (found) setSelectedCreator(found);
      }
    } catch {
      setError("Failed to load creators");
    } finally {
      setLoadingCreators(false);
    }
  }, [preselectedCreatorId]);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  const parsedAmount = parseFloat(amount) || 0;
  const platformFee = parsedAmount * 0.05;
  const creatorPayout = parsedAmount * 0.95;

  const filteredCreators = creators.filter(
    (c) =>
      c.name.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      c.bio.toLowerCase().includes(creatorSearch.toLowerCase())
  );

  const addChecklistItem = () => setChecklistItems([...checklistItems, ""]);
  const removeChecklistItem = (idx: number) => {
    if (checklistItems.length <= 1) return;
    setChecklistItems(checklistItems.filter((_, i) => i !== idx));
  };
  const updateChecklistItem = (idx: number, value: string) => {
    const updated = [...checklistItems];
    updated[idx] = value;
    setChecklistItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreator || !title.trim() || parsedAmount <= 0) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const scriptChecklist = checklistItems.filter((item) => item.trim() !== "");
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: selectedCreator.id,
          title: title.trim(),
          description: description.trim(),
          totalAmount: parsedAmount,
          scriptChecklist,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create deal");
      }

      const data = await res.json();
      router.push(`/dashboard/brand/deals/${data.deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/dashboard/brand/deals" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>

        <AnimatedSection animation="animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Create New Deal</h1>
          <p className="text-gray-500 mb-8">Propose a collaboration with a creator</p>
        </AnimatedSection>

        {error && (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="py-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Creator Selector */}
          <AnimatedSection animation="animate-fade-in" delay={100}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0E61FF]/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#0E61FF]" />
                </div>
                Select Creator
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCreator ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
                      {selectedCreator.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{selectedCreator.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{selectedCreator.bio}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCreator(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder={loadingCreators ? "Loading creators..." : "Search creators by name..."}
                    value={creatorSearch}
                    onChange={(e) => { setCreatorSearch(e.target.value); setShowCreatorDropdown(true); }}
                    onFocus={() => setShowCreatorDropdown(true)}
                    className="pl-10"
                    disabled={loadingCreators}
                  />
                  {showCreatorDropdown && !loadingCreators && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCreators.length > 0 ? (
                        filteredCreators.map((creator) => (
                          <button
                            key={creator.id}
                            type="button"
                            className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                            onClick={() => {
                              setSelectedCreator(creator);
                              setShowCreatorDropdown(false);
                              setCreatorSearch("");
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                              {creator.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{creator.name}</p>
                              <p className="text-xs text-gray-500 truncate">{creator.bio}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-gray-500 text-center">No creators found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          </AnimatedSection>

          {/* Deal Details */}
          <AnimatedSection animation="animate-fade-in" delay={200}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0E61FF]/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0E61FF]" />
                </div>
                Deal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Spring Skincare Campaign"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the campaign goals, requirements, and expectations..."
                />
              </div>
            </CardContent>
          </Card>

          </AnimatedSection>

          {/* Amount & Fee Calculator */}
          <AnimatedSection animation="animate-fade-in" delay={300}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                Compensation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Amount (INR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10000"
                    min="0"
                    step="100"
                    className="pl-7"
                    required
                  />
                </div>
              </div>

              {parsedAmount > 0 && (
                <div className="rounded-lg bg-gray-100/50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="font-medium">₹{parsedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform Fee (5%)</span>
                    <span>₹{platformFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-medium">Creator Payout</span>
                    <span className="font-semibold text-emerald-600">₹{creatorPayout.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          </AnimatedSection>

          {/* Script Checklist */}
          <AnimatedSection animation="animate-fade-in" delay={400}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                Script Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">
                Add checklist items that the creator should follow in their script/content.
              </p>
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateChecklistItem(idx, e.target.value)}
                    placeholder={`Checklist item ${idx + 1}...`}
                  />
                  {checklistItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} className="gap-1">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          </AnimatedSection>

          {/* Submit */}
          <AnimatedSection animation="animate-fade-in" delay={500} className="flex gap-3 justify-end">
            <Link href="/dashboard/brand/deals">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={submitting || !selectedCreator || !title.trim() || parsedAmount <= 0} className="gap-2 bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90 btn-premium">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Deal"
              )}
            </Button>
          </AnimatedSection>
        </form>
      </div>
    </div>
  );
}

export default function CreateDealPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="skeleton h-8 w-32 rounded" /></div>}>
      <CreateDealPageContent />
    </Suspense>
  );
}
