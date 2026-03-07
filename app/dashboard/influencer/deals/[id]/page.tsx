"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, FileText, CheckCircle, DollarSign, Upload,
  MessageSquare, AlertTriangle, Send, Clock,
  ShieldAlert, Building2, ListChecks, X, Loader2,
  FileVideo, MessageCircle
} from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import { FileUploader } from "@/components/ui/file-uploader";

interface ExclusiveNegotiation {
  id: string;
  lockedAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface DealData {
  id: string;
  title: string;
  description: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  creatorPayout: number;
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
    creatorProfile: { name: string; avatar?: string } | null;
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
  exclusiveNegotiations?: ExclusiveNegotiation[];
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

function useCountdown(targetDate: string | undefined) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    if (!targetDate) return;

    const tick = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function InfluencerDealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.id as string;

  const [deal, setDeal] = useState<DealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [revisionFeedback] = useState([
    { id: 1, feedback: "Audio levels in the intro are too low. Please boost and re-render.", date: "2026-03-01T14:00:00Z", from: "Brand" },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
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

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadPaused, setUploadPaused] = useState<Record<string, boolean>>({});
  const tusUploadsRef = useRef<Record<string, { abort: () => void; start: () => void }>>({});

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const initRes = await fetch("/api/files/initiate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          files: Array.from(files).map((f) => ({
            fileName: f.name,
            fileSize: f.size,
            fileType: f.type,
          })),
        }),
      });

      if (!initRes.ok) {
        const data = await initRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initiate upload");
      }

      const { uploadEndpoints } = await initRes.json();

      const uploadPromises = Array.from(files).map((file, idx) => {
        const endpoint = uploadEndpoints?.[idx]?.url || "/api/files/upload";
        const fileId = file.name;

        return new Promise<void>((resolve, reject) => {
          setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("file", file);
          formData.append("dealId", dealId);
          if (uploadEndpoints?.[idx]?.uploadId) {
            formData.append("uploadId", uploadEndpoints[idx].uploadId);
          }

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress((prev) => ({ ...prev, [fileId]: pct }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
              resolve();
            } else {
              reject(new Error(`Upload failed for ${file.name}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error(`Upload failed for ${file.name}`)));

          tusUploadsRef.current[fileId] = {
            abort: () => xhr.abort(),
            start: () => xhr.send(formData),
          };

          xhr.open("POST", endpoint);
          xhr.send(formData);
        });
      });

      await Promise.all(uploadPromises);

      await fetch("/api/files/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });

      await fetchDeal();
      setUploadProgress({});
      tusUploadsRef.current = {};
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const togglePause = (fileId: string) => {
    const upload = tusUploadsRef.current[fileId];
    if (!upload) return;

    if (uploadPaused[fileId]) {
      upload.start();
      setUploadPaused((prev) => ({ ...prev, [fileId]: false }));
    } else {
      upload.abort();
      setUploadPaused((prev) => ({ ...prev, [fileId]: true }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
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
        throw new Error(data.error || "Failed to send");
      }
      setChatMessage("");
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingMessage(false);
    }
  };

  const activeLock = deal?.exclusiveNegotiations?.find((n) => n.isActive);
  const countdown = useCountdown(activeLock?.expiresAt);

  const handleLockAction = async (action: "accept" | "reject") => {
    setActionLoading(`lock-${action}`);
    try {
      const res = await fetch(`/api/deals/${dealId}/lock/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} lock`);
      }
      await fetchDeal();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Lock ${action} failed`);
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
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="skeleton h-8 w-48 mb-6 rounded" />
          <div className="skeleton h-12 w-96 mb-4 rounded" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
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

  if (error && !deal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Deal</h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => { setError(null); setLoading(true); fetchDeal(); }}>
                  Try Again
                </Button>
                <Link href="/dashboard/influencer/deals">
                  <Button variant="outline">Back to Deals</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  const status = statusConfig[deal.status] || { label: deal.status, variant: "secondary" as const };
  const messages = [...(deal.chatMessages || [])].reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <Link href="/dashboard/influencer/deals" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>

        {error && (
          <Card className="mb-4 border-destructive/30 bg-white shadow-md">
            <CardContent className="py-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deal Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{deal.title}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-gray-500 mb-3">{deal.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                Brand: {deal.brand?.brandProfile?.companyName || deal.brand?.email || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(deal.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ₹{Number(deal.creatorPayout).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Your Payout</div>
          </div>
        </div>

        {/* 48-Hour Exclusive Negotiation Lock Modal */}
        {deal.status === "LOCKED" && activeLock && !countdown.expired && (
          <AnimatedSection animation="animate-slide-down" className="mb-6">
            <Card className="bg-gradient-to-r from-[#0E61FF] to-indigo-600 border-none shadow-xl">
              <CardContent className="py-6">
                <div className="text-center text-white">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Clock className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Exclusive Negotiation Lock</h2>
                  </div>
                  <p className="text-white/80 text-sm mb-5">
                    {deal.brand?.brandProfile?.companyName || "A brand"} wants to lock this entity for an exclusive deal.
                    You have 48 hours to accept or reject.
                  </p>

                  <div className="flex items-center justify-center gap-4 mb-6">
                    {[
                      { value: countdown.hours, label: "Hours" },
                      { value: countdown.minutes, label: "Min" },
                      { value: countdown.seconds, label: "Sec" },
                    ].map((unit) => (
                      <div key={unit.label} className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 min-w-[72px]">
                        <div className="text-3xl font-bold tabular-nums">
                          {String(unit.value).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-white/70">
                          {unit.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => handleLockAction("accept")}
                      disabled={!!actionLoading}
                      className="bg-white text-[#0E61FF] hover:bg-white/90 gap-1.5 px-6"
                    >
                      {actionLoading === "lock-accept" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Accept Deal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleLockAction("reject")}
                      disabled={!!actionLoading}
                      className="border-white/30 text-white hover:bg-white/10 gap-1.5 px-6"
                    >
                      {actionLoading === "lock-reject" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Script Checklist */}
            <AnimatedSection animation="animate-slide-up" delay={0}>
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5" />
                    Script / Checklist
                    {deal.scriptApprovedAt && (
                      <Badge variant="default" className="ml-2 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </Badge>
                    )}
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
                    <p className="text-sm text-gray-500">No script checklist items.</p>
                  )}
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* File Upload */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Deliverables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragOver ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-gray-500">Uploading... Do not close this page.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-500" />
                      <p className="text-sm font-medium">Drop files here or click to browse</p>
                      <p className="text-xs text-gray-500">Resumable multipart upload (up to 500 MB)</p>
                    </div>
                  )}

                {/* Upload Progress Bars */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(uploadProgress).map(([fileId, pct]) => (
                      <div key={fileId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 truncate max-w-[70%]">{fileId}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 tabular-nums">{pct}%</span>
                            {pct < 100 && (
                              <button
                                type="button"
                                onClick={() => togglePause(fileId)}
                                className="text-[#0E61FF] hover:underline text-[10px]"
                              >
                                {uploadPaused[fileId] ? "Resume" : "Pause"}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              pct === 100 ? "bg-emerald-500" : uploadPaused[fileId] ? "bg-amber-500" : "bg-[#0E61FF]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>

                {/* Uploaded files */}
                {deal.deliverables && deal.deliverables.length > 0 && (
                  <div className="space-y-2">
                    {deal.deliverables.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{file.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(file.fileSize / 1024 / 1024).toFixed(2)} MB &middot; {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Uploaded
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Upload Deliverable */}
            <AnimatedSection animation="animate-slide-up" delay={150}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileVideo className="w-5 h-5" />
                  Upload Deliverable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploader
                  accept="video/*"
                  maxSize={500}
                  onUploadComplete={() => {
                    toast.success("Video uploaded! Processing will begin shortly.");
                  }}
                />
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Revision Feedback */}
            {revisionFeedback.length > 0 && (
              <AnimatedSection animation="animate-slide-up" delay={175}>
              <Card className="bg-white shadow-md border-amber-200/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Revision Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revisionFeedback.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{item.from}</span>
                            <span className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-sm text-gray-700">{item.feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </AnimatedSection>
            )}

            {/* Chat */}
            <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderRole === "SYSTEM" ? "justify-center" : msg.senderId === deal.creator?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                            msg.senderRole === "SYSTEM"
                              ? "bg-gray-100 text-gray-500 italic"
                              : msg.senderId === deal.creator?.id
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
                    <p className="text-sm text-gray-500 text-center py-8">No messages yet.</p>
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
            {/* Payment Status */}
            <AnimatedSection animation="animate-slide-up" delay={0}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Deal Value</span>
                    <span className="font-medium">₹{Number(deal.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform Fee (5%)</span>
                    <span>-₹{Number(deal.platformFee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-medium">Your Payout</span>
                    <span className="font-semibold text-primary">₹{Number(deal.creatorPayout).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium">First 50%</p>
                      <p className="text-xs text-gray-500">₹{(Number(deal.creatorPayout) / 2).toLocaleString()}</p>
                    </div>
                    {deal.payment50Paid ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Received
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium">Remaining 50%</p>
                      <p className="text-xs text-gray-500">₹{(Number(deal.creatorPayout) / 2).toLocaleString()}</p>
                    </div>
                    {deal.payment100Paid ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Received
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Brand Info */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-5 h-5" />
                  Brand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(deal.brand?.brandProfile?.companyName || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{deal.brand?.brandProfile?.companyName || "Unknown Brand"}</p>
                    <p className="text-xs text-gray-500">{deal.brand?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Dispute Section */}
            {deal.status !== "COMPLETED" && deal.status !== "CANCELLED" && (
              <AnimatedSection animation="animate-slide-up" delay={200}>
              <Card className="border-destructive/20 bg-white shadow-md">
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
