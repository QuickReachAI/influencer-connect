"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  ArrowLeft, FileText, CheckCircle, DollarSign, Upload,
  MessageSquare, AlertTriangle, Download, Send, Clock,
  ShieldAlert, User, Building2, ListChecks, Play,
  RotateCcw, ThumbsUp, History
} from "lucide-react";
import { toast } from "sonner";
import { VideoPlayer } from "@/components/ui/video-player";

interface DealRevision {
  id: string;
  revisionNumber: number;
  feedback?: string;
  videoUrl?: string;
  watermarkedUrl?: string;
  cleanUrl?: string;
  status: string;
  createdAt: string;
  videoAsset?: {
    id: string;
    hlsUrl?: string;
    watermarkedUrl?: string;
    cleanUrl?: string;
    status: string;
    thumbnailUrl?: string;
  };
}

interface DealData {
  id: string;
  title: string;
  description: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  creatorPayout: number;
  maxRevisions: number;
  currentRevision: number;
  scriptChecklist: string[];
  scriptApprovedAt: string | null;
  payment50Paid: boolean;
  payment50PaidAt: string | null;
  payment100Paid: boolean;
  payment100PaidAt: string | null;
  filesUploaded: boolean;
  disputeRaised: boolean;
  disputeReason: string | null;
  createdAt: string;
  brand: {
    id: string;
    email: string;
    brandProfile: { companyName: string; logo?: string } | null;
  };
  creator: {
    id: string;
    email: string;
    creatorProfile: { name: string; avatar?: string; reliabilityScore?: number; completionScore?: number } | null;
  };
  deliverables: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
  }>;
  chatMessages: Array<{
    id: string;
    senderId: string;
    senderRole: string;
    content: string;
    createdAt: string;
  }>;
  escrowTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: string;
  }>;
  revisions?: DealRevision[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  LOCKED: { label: "Locked", variant: "default" },
  SCRIPT_PENDING: { label: "Script Pending", variant: "secondary" },
  SCRIPT_APPROVED: { label: "Script Approved", variant: "default" },
  PAYMENT_50_PENDING: { label: "Payment Pending", variant: "secondary" },
  PRODUCTION: { label: "In Production", variant: "default" },
  DELIVERY_PENDING: { label: "Delivery Pending", variant: "secondary" },
  REVISION_PENDING: { label: "Revision Pending", variant: "secondary" },
  PAYMENT_100_PENDING: { label: "Final Payment", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "outline" },
  DISPUTED: { label: "Disputed", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default function BrandDealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.id as string;

  const [deal, setDeal] = useState<DealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [currentRevision, setCurrentRevision] = useState(1);
  const [maxRevisions] = useState(2);
  const [revisionHistory] = useState([
    { id: 1, revision: 1, feedback: "Initial draft uploaded. Please review audio levels in the intro section.", date: "2026-02-28T10:30:00Z" },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch deal");
      }
      const data = await res.json();
      setDeal(data.deal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId) fetchDeal();
  }, [dealId, fetchDeal]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [deal?.chatMessages]);

  const handleApproveScript = async (approved: boolean) => {
    setActionLoading("script");
    try {
      const res = await fetch(`/api/deals/${dealId}/approve-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, notes: approved ? undefined : "Please revise the script" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update script");
      }
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayment = async (phase: "50" | "100") => {
    setActionLoading(`pay-${phase}`);
    try {
      const res = await fetch(`/api/deals/${dealId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Payment failed");
      }
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/chat/${dealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatMessage }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }
      setChatMessage("");
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingMessage(false);
    }
  };

  const [revisionFeedback, setRevisionFeedback] = useState("");

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) return;
    setActionLoading("revision");
    try {
      const latestRevision = deal?.revisions?.length
        ? deal.revisions[deal.revisions.length - 1]
        : null;
      const revisionId = latestRevision?.id;
      const res = await fetch(`/api/deals/${dealId}/revisions/${revisionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVISION_REQUESTED", feedback: revisionFeedback }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to request revision");
      }
      setRevisionFeedback("");
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision request failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveFinal = async () => {
    setActionLoading("approve-final");
    try {
      const latestRevision = deal?.revisions?.length
        ? deal.revisions[deal.revisions.length - 1]
        : null;
      const revisionId = latestRevision?.id;
      const res = await fetch(`/api/deals/${dealId}/revisions/${revisionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to approve");
      }
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) return;
    setActionLoading("dispute");
    try {
      const res = await fetch(`/api/deals/${dealId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to raise dispute");
      }
      setShowDisputeForm(false);
      setDisputeReason("");
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispute failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="skeleton h-8 w-48 mb-6 rounded" />
          <div className="skeleton h-12 w-96 mb-4 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 lg:col-span-2 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-48 rounded-xl" />
              ))}
            </div>
            <div className="space-y-6">
              <div className="skeleton h-64 rounded-xl" />
              <div className="skeleton h-48 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Deal</h2>
              <p className="text-gray-500 mb-4">{error || "Deal not found"}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => { setError(null); setLoading(true); fetchDeal(); }}>
                  Try Again
                </Button>
                <Link href="/dashboard/brand/deals">
                  <Button variant="outline">Back to Deals</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const status = statusConfig[deal.status] || { label: deal.status, variant: "secondary" as const };
  const messages = [...(deal.chatMessages || [])].reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard/brand/deals" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>

        {/* Deal Header */}
        <AnimatedSection animation="animate-fade-in" className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{deal.title}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-gray-500 mb-3">{deal.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Creator: {deal.creator?.creatorProfile?.name || deal.creator?.email || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(deal.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ₹{Number(deal.totalAmount).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 lg:col-span-2 space-y-6">
            {/* Script Checklist */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5" />
                  Script / Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deal.scriptChecklist && deal.scriptChecklist.length > 0 ? (
                  <ul className="space-y-2">
                    {deal.scriptChecklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${deal.scriptApprovedAt ? "text-primary" : "text-gray-500"}`} />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No script checklist items yet.</p>
                )}
              </CardContent>
              {(deal.status === "DRAFT" || deal.status === "SCRIPT_PENDING") && (
                <CardFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleApproveScript(true)}
                    disabled={actionLoading === "script"}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading === "script" ? "Processing..." : "Approve Script"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApproveScript(false)}
                    disabled={actionLoading === "script"}
                  >
                    Request Revision
                  </Button>
                </CardFooter>
              )}
              {deal.scriptApprovedAt && (
                <CardFooter>
                  <p className="text-sm text-gray-500">
                    Approved on {new Date(deal.scriptApprovedAt).toLocaleDateString()}
                  </p>
                </CardFooter>
              )}
            </Card>
            </AnimatedSection>

            {/* Deliverables */}
            <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Deliverables
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deal.deliverables && deal.deliverables.length > 0 ? (
                  <div className="space-y-3">
                    {deal.deliverables.map((file) => (
                      <div key={file.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{file.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(file.fileSize / 1024 / 1024).toFixed(2)} MB &middot; {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No deliverables uploaded yet.</p>
                )}
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Video Review */}
            <AnimatedSection animation="animate-slide-up" delay={250}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Video Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <VideoPlayer
                  src={deal.deliverables?.[0]?.fileUrl}
                  watermarked={true}
                />

                {/* Revision progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Revision {currentRevision} of {maxRevisions}</span>
                    <span className="text-gray-500">{maxRevisions - currentRevision} remaining</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0E61FF] transition-all duration-300"
                      style={{ width: `${(currentRevision / maxRevisions) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={currentRevision >= maxRevisions}
                      title={currentRevision >= maxRevisions ? "Max revisions reached" : undefined}
                      onClick={() => {
                        if (currentRevision < maxRevisions) {
                          setCurrentRevision((prev) => prev + 1);
                          toast("Revision requested", { description: "The creator has been notified." });
                        }
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Request Revision
                    </Button>
                  </div>
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      toast.success("Final version approved! Clean render is being prepared");
                    }}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve Final
                  </Button>
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Revision History */}
            <AnimatedSection animation="animate-slide-up" delay={275}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Revision History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revisionHistory.length > 0 ? (
                  <div className="relative pl-6">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-6">
                      {revisionHistory.map((entry) => (
                        <div key={entry.id} className="relative">
                          <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 border-[#0E61FF] bg-white flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#0E61FF]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Revision {entry.revision}</p>
                            <p className="text-sm text-gray-600 mt-1">{entry.feedback}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No revisions yet.</p>
                )}
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Video Review & Revisions */}
            {deal.revisions && deal.revisions.length > 0 && (
              <AnimatedSection animation="animate-slide-up" delay={250}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Video Review & Revisions
                      </CardTitle>
                      <Badge variant="outline" className="gap-1">
                        Revision {deal.currentRevision} of {deal.maxRevisions}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {deal.revisions.map((rev) => {
                      const hlsUrl = rev.videoAsset?.hlsUrl;
                      const isLatest = rev.revisionNumber === deal.currentRevision;

                      return (
                        <div
                          key={rev.id}
                          className={`rounded-lg border p-4 ${isLatest ? "border-[#0E61FF]/30 bg-blue-50/30" : "border-gray-200"}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                Revision #{rev.revisionNumber}
                              </span>
                              <Badge
                                variant={
                                  rev.status === "APPROVED" ? "default" :
                                  rev.status === "REVISION_REQUESTED" ? "destructive" : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {rev.status === "REVISION_REQUESTED" ? "Changes Requested" : rev.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(rev.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>

                          {/* HLS Video Player */}
                          {hlsUrl && (
                            <div className="mb-3 rounded-lg overflow-hidden bg-black aspect-video">
                              <video
                                controls
                                className="w-full h-full"
                                poster={rev.videoAsset?.thumbnailUrl || undefined}
                              >
                                <source src={hlsUrl} type="application/x-mpegURL" />
                                Your browser does not support HLS playback.
                              </video>
                              <p className="text-[10px] text-gray-400 mt-1 text-center">
                                Watermarked preview — clean render available after final approval
                              </p>
                            </div>
                          )}

                          {rev.feedback && (
                            <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-2">
                              <span className="font-medium text-gray-500 text-xs">Feedback: </span>
                              {rev.feedback}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Review Actions */}
                    {deal.status === "REVISION_PENDING" || deal.status === "DELIVERY_PENDING" ? (
                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleApproveFinal}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === "approve-final" ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve Final
                          </Button>

                          {deal.currentRevision < deal.maxRevisions ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={revisionFeedback}
                                onChange={(e) => setRevisionFeedback(e.target.value)}
                                placeholder="Provide feedback for revision..."
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                className="gap-1"
                                onClick={handleRequestRevision}
                                disabled={!revisionFeedback.trim() || !!actionLoading}
                              >
                                {actionLoading === "revision" ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4" />
                                )}
                                Request Revision
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                              <AlertTriangle className="w-4 h-4" />
                              Max revisions reached ({deal.maxRevisions})
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}

            {/* Chat */}
            <AnimatedSection animation="animate-slide-up" delay={300}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderRole === "SYSTEM" ? "justify-center" : msg.senderId === deal.brand?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                            msg.senderRole === "SYSTEM"
                              ? "bg-gray-100 text-gray-500 italic"
                              : msg.senderId === deal.brand?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-gray-100 text-secondary-foreground"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No messages yet. Start the conversation.</p>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sendingMessage}
                  />
                  <Button type="submit" disabled={sendingMessage || !chatMessage.trim()} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
            </AnimatedSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Section */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deal Amount</span>
                    <span className="font-semibold">₹{Number(deal.totalAmount).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-400">No platform fees — QuickConnects is free to use</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">50% Payment</span>
                    {deal.payment50Paid ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                  {!deal.payment50Paid && deal.status === "SCRIPT_APPROVED" && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => handlePayment("50")}
                      disabled={actionLoading === "pay-50"}
                    >
                      <DollarSign className="w-4 h-4" />
                      {actionLoading === "pay-50" ? "Processing..." : "Pay 50%"}
                    </Button>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Remaining 50%</span>
                    {deal.payment100Paid ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                  {!deal.payment100Paid && deal.payment50Paid && deal.filesUploaded && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => handlePayment("100")}
                      disabled={actionLoading === "pay-100"}
                    >
                      <DollarSign className="w-4 h-4" />
                      {actionLoading === "pay-100" ? "Processing..." : "Pay Remaining 50%"}
                    </Button>
                  )}
                </div>

                {deal.escrowTransactions && deal.escrowTransactions.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium mb-2 text-gray-500">Transaction History</p>
                    {deal.escrowTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between text-xs py-1">
                        <span>{tx.type}</span>
                        <span>₹{Number(tx.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            </AnimatedSection>

            {/* Creator Info */}
            <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-5 h-5" />
                  Creator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(deal.creator?.creatorProfile?.name || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{deal.creator?.creatorProfile?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{deal.creator?.email}</p>
                  </div>
                </div>
                {deal.creator?.creatorProfile?.reliabilityScore !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reliability</span>
                    <span className="font-medium">{deal.creator.creatorProfile.reliabilityScore}%</span>
                  </div>
                )}
                {deal.creator?.creatorProfile?.completionScore !== undefined && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Profile Score</span>
                    <span className="font-medium">{deal.creator.creatorProfile.completionScore}%</span>
                  </div>
                )}
              </CardContent>
            </Card>

            </AnimatedSection>

            {/* Dispute Section */}
            {deal.status !== "COMPLETED" && deal.status !== "CANCELLED" && (
              <AnimatedSection animation="animate-slide-up" delay={300}>
              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="w-5 h-5" />
                    Dispute
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deal.disputeRaised ? (
                    <div className="space-y-2">
                      <Badge variant="destructive">Dispute Active</Badge>
                      {deal.disputeReason && (
                        <p className="text-sm text-gray-500">{deal.disputeReason}</p>
                      )}
                    </div>
                  ) : showDisputeForm ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E61FF] min-h-[80px] resize-none"
                        placeholder="Describe the reason for your dispute..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleRaiseDispute}
                          disabled={actionLoading === "dispute" || !disputeReason.trim()}
                          className="gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {actionLoading === "dispute" ? "Submitting..." : "Submit Dispute"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowDisputeForm(false); setDisputeReason(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDisputeForm(true)}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Raise Dispute
                    </Button>
                  )}
                </CardContent>
              </Card>
              </AnimatedSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
