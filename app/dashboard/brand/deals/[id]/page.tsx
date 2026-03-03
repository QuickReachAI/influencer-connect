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
  ShieldAlert, User, Building2, ListChecks
} from "lucide-react";

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
    creatorProfile: { name: string; avatar?: string; reliabilityScore?: number } | null;
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
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SCRIPT_PENDING: { label: "Script Pending", variant: "secondary" },
  SCRIPT_APPROVED: { label: "Script Approved", variant: "default" },
  PAYMENT_PENDING: { label: "Payment Pending", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  FILES_UPLOADED: { label: "Files Uploaded", variant: "default" },
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
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="brand" />
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

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
        <DashboardNav role="brand" />
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Deal</h2>
              <p className="text-muted-foreground mb-4">{error || "Deal not found"}</p>
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
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard/brand/deals" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors animated-underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>

        {/* Deal Header */}
        <AnimatedSection animation="animate-blur-in" className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{deal.title}</h1>
              <Badge variant={status.variant} className="hover-pop">{status.label}</Badge>
            </div>
            <p className="text-muted-foreground mb-3">{deal.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </div>
        </AnimatedSection>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Script Checklist */}
            <AnimatedSection animation="animate-slide-up" delay={100}>
            <Card className="hover-glow">
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
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${deal.scriptApprovedAt ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No script checklist items yet.</p>
                )}
              </CardContent>
              {(deal.status === "DRAFT" || deal.status === "SCRIPT_PENDING") && (
                <CardFooter className="gap-2">
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
                  <p className="text-sm text-muted-foreground">
                    Approved on {new Date(deal.scriptApprovedAt).toLocaleDateString()}
                  </p>
                </CardFooter>
              )}
            </Card>
            </AnimatedSection>

            {/* Deliverables */}
            <AnimatedSection animation="animate-slide-up" delay={200}>
            <Card className="hover-glow">
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
                      <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">No deliverables uploaded yet.</p>
                )}
              </CardContent>
            </Card>
            </AnimatedSection>

            {/* Chat */}
            <AnimatedSection animation="animate-slide-up" delay={300}>
            <Card className="hover-glow">
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
                        className={`flex ${msg.senderRole === "SYSTEM" ? "justify-center" : msg.senderId === deal.brand?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                            msg.senderRole === "SYSTEM"
                              ? "bg-muted text-muted-foreground italic"
                              : msg.senderId === deal.brand?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
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
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation.</p>
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
            <AnimatedSection animation="animate-slide-right" delay={100}>
            <Card className="hover-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-medium">₹{Number(deal.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (5%)</span>
                    <span>₹{Number(deal.platformFee).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Creator Payout</span>
                    <span className="font-medium">₹{Number(deal.creatorPayout).toLocaleString()}</span>
                  </div>
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
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">Transaction History</p>
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
            <AnimatedSection animation="animate-slide-right" delay={200}>
            <Card className="hover-glow">
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
                    <p className="text-xs text-muted-foreground">{deal.creator?.email}</p>
                  </div>
                </div>
                {deal.creator?.creatorProfile?.reliabilityScore !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reliability</span>
                    <span className="font-medium">{deal.creator.creatorProfile.reliabilityScore}%</span>
                  </div>
                )}
              </CardContent>
            </Card>

            </AnimatedSection>

            {/* Dispute Section */}
            {deal.status !== "COMPLETED" && deal.status !== "CANCELLED" && (
              <AnimatedSection animation="animate-slide-right" delay={300}>
              <Card className="hover-glow border-destructive/20">
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
                        <p className="text-sm text-muted-foreground">{deal.disputeReason}</p>
                      )}
                    </div>
                  ) : showDisputeForm ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
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
