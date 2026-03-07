"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import {
  ChevronLeft,
  MessageSquare,
  FileText,
  DollarSign,
  User,
  Building2,
  Scale,
  CheckCircle,
  Play,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface DisputeDeal {
  id: string;
  title: string;
  description?: string;
  status: string;
  totalAmount: number;
  disputeReason: string;
  createdAt: string;
  brand: {
    id: string;
    email: string;
    brandProfile?: { companyName: string };
  };
  creator: {
    id: string;
    email: string;
    creatorProfile?: { name: string; reliabilityScore?: number };
  };
  chatMessages: Array<{
    id: string;
    senderId: string;
    content: string;
    messageType: string;
    flagged: boolean;
    createdAt: string;
    sender: { role: string; email: string };
  }>;
  deliverables: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  }>;
  escrowTransactions: Array<{
    id: string;
    amount: number;
    transactionType: string;
    status: string;
    createdAt: string;
  }>;
  revisions?: Array<{
    id: string;
    revisionNumber: number;
    feedback?: string;
    status: string;
    createdAt: string;
    videoAsset?: {
      hlsUrl?: string;
      watermarkedUrl?: string;
      status: string;
      thumbnailUrl?: string;
    };
  }>;
  scriptChecklist?: string[];
  scriptApprovedAt?: string;
}

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId as string;

  const [deal, setDeal] = useState<DisputeDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch deal");
      const data = await res.json();
      setDeal(data.deal);
    } catch {
      toast.error("Failed to load dispute details");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId) fetchDeal();
  }, [dealId, fetchDeal]);

  const handleResolve = async () => {
    if (!decision || !notes.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/dispute`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Resolution failed");
      }
      toast.success("Dispute resolved successfully");
      router.push("/dashboard/admin/disputes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resolution failed");
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-3 gap-6">
            <div className="h-[600px] bg-gray-200 rounded-xl" />
            <div className="h-[600px] bg-gray-200 rounded-xl" />
            <div className="h-[600px] bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto text-center py-20">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Deal not found</h2>
          <Link href="/dashboard/admin/disputes">
            <Button variant="outline">Back to Disputes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const chatMessages = deal.chatMessages || [];
  const revisions = deal.revisions || [];
  const escrowTxns = deal.escrowTransactions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/admin/disputes"
            className="text-[#0E61FF] hover:text-[#0B4FD9] flex items-center gap-1 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Disputes
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Deal ID: {deal.id}</p>
            </div>
            <div className="flex gap-3">
              <div className="text-center p-3 bg-[#0E61FF] rounded-lg">
                <Building2 className="w-4 h-4 text-white mx-auto mb-1" />
                <p className="text-xs text-white font-medium">
                  {deal.brand.brandProfile?.companyName || deal.brand.email}
                </p>
              </div>
              <div className="text-center p-3 bg-amber-500 rounded-lg">
                <User className="w-4 h-4 text-white mx-auto mb-1" />
                <p className="text-xs text-white font-medium">
                  {deal.creator.creatorProfile?.name || deal.creator.email}
                </p>
              </div>
            </div>
          </div>

          {/* Dispute Reason */}
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-700">Dispute Reason:</p>
            <p className="text-sm text-red-600 mt-1">{deal.disputeReason}</p>
          </div>
        </div>

        {/* 3-Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Pane: Chat & Script */}
          <AnimatedSection animation="animate-slide-up" delay={0}>
            <Card className="bg-white shadow-md h-[600px] flex flex-col">
              <CardHeader className="border-b border-gray-100 py-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="w-4 h-4" />
                  Chat History & Script
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {/* Script Section */}
                {deal.scriptChecklist && deal.scriptChecklist.length > 0 && (
                  <div className="p-4 border-b border-gray-100 bg-blue-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Approved Script
                    </p>
                    <ul className="space-y-1">
                      {deal.scriptChecklist.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Chat Messages */}
                <div className="p-4 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No messages</p>
                  ) : (
                    chatMessages.map((msg) => {
                      const isBrand = msg.sender.role === "BRAND";
                      const isSystem = msg.messageType === "SYSTEM";

                      return (
                        <div
                          key={msg.id}
                          className={`text-xs ${isSystem ? "text-center" : ""}`}
                        >
                          {isSystem ? (
                            <span className="text-gray-400 italic">{msg.content}</span>
                          ) : (
                            <div className={`rounded-lg p-2 ${isBrand ? "bg-blue-50 ml-6" : "bg-gray-50 mr-6"} ${msg.flagged ? "border border-red-200" : ""}`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`font-medium ${isBrand ? "text-[#0E61FF]" : "text-amber-600"}`}>
                                  {msg.sender.email.split("@")[0]}
                                </span>
                                <span className="text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "Asia/Kolkata",
                                  })}
                                </span>
                                {msg.flagged && (
                                  <Badge variant="destructive" className="text-[8px] px-1 py-0">
                                    PII
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-700">{msg.content}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Center Pane: Video & Revisions */}
          <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="bg-white shadow-md h-[600px] flex flex-col">
              <CardHeader className="border-b border-gray-100 py-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Play className="w-4 h-4" />
                  Video & Revision History
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {revisions.length === 0 && deal.deliverables.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No revisions or deliverables</p>
                  </div>
                ) : (
                  <>
                    {revisions.map((rev) => (
                      <div key={rev.id} className="rounded-lg border border-gray-200 overflow-hidden">
                        {rev.videoAsset?.hlsUrl && (
                          <div className="bg-black aspect-video">
                            <video
                              controls
                              className="w-full h-full"
                              poster={rev.videoAsset.thumbnailUrl || undefined}
                            >
                              <source src={rev.videoAsset.hlsUrl} type="application/x-mpegURL" />
                            </video>
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              Revision #{rev.revisionNumber}
                            </span>
                            <Badge
                              variant={rev.status === "APPROVED" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {rev.status}
                            </Badge>
                          </div>
                          {rev.feedback && (
                            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-1">
                              {rev.feedback}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(rev.createdAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))}

                    {deal.deliverables.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                          Deliverables
                        </p>
                        {deal.deliverables.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 p-2 rounded border border-gray-100 mb-1">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{d.fileName}</p>
                              <p className="text-[10px] text-gray-400">
                                {(d.fileSize / 1024 / 1024).toFixed(1)} MB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Right Pane: Financial Context & Resolution */}
          <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card className="bg-white shadow-md h-[600px] flex flex-col">
              <CardHeader className="border-b border-gray-100 py-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4" />
                  Financial & Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Financial Summary */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Deal Financials
                  </p>
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deal Value</span>
                      <span className="font-semibold">
                        ₹{Number(deal.totalAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Escrow Transactions */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Escrow Transactions
                  </p>
                  {escrowTxns.length === 0 ? (
                    <p className="text-xs text-gray-400">No transactions</p>
                  ) : (
                    <div className="space-y-1.5">
                      {escrowTxns.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between text-xs p-2 rounded bg-gray-50">
                          <div>
                            <span className="font-medium text-gray-700">
                              {tx.transactionType.replace(/_/g, " ")}
                            </span>
                            <p className="text-gray-400 text-[10px]">
                              {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">
                              ₹{Number(tx.amount).toLocaleString("en-IN")}
                            </span>
                            <Badge
                              variant={tx.status === "COMPLETED" ? "default" : "secondary"}
                              className="ml-1 text-[8px]"
                            >
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolution Form */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Resolution Decision
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {[
                      { value: "FAVOR_CREATOR", label: "Favor Creator", icon: <User className="w-4 h-4" />, active: "bg-amber-500 border-amber-500 text-white" },
                      { value: "FAVOR_BRAND", label: "Favor Brand", icon: <Building2 className="w-4 h-4" />, active: "bg-[#0E61FF] border-[#0E61FF] text-white" },
                      { value: "PARTIAL", label: "Split", icon: <Scale className="w-4 h-4" />, active: "bg-gray-900 border-gray-900 text-white" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDecision(opt.value)}
                        className={`p-2 rounded-lg border text-center transition-colors text-xs ${
                          decision === opt.value
                            ? opt.active
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="mx-auto w-fit mb-0.5">{opt.icon}</div>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Decision notes (required)..."
                    className="w-full p-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF]"
                    rows={3}
                  />

                  <button
                    onClick={handleResolve}
                    disabled={!decision || !notes.trim() || resolving}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                  >
                    {resolving ? "Resolving..." : "Submit Resolution"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
