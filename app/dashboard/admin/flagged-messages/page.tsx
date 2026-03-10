"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  MessageSquare,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Ban,
  Eye,
  User,
  Building2,
  Undo2,
  ShieldOff,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";

interface FlaggedMessage {
  id: string;
  content: string;
  flagReason: string;
  createdAt: string;
  piiRedacted?: boolean;
  sender: {
    id: string;
    email: string;
    role: string;
  };
  deal: {
    id: string;
    title: string;
    brand: {
      email: string;
      brandProfile?: { companyName: string };
    };
    creator: {
      email: string;
      creatorProfile?: { name: string };
    };
  };
}

interface UserWarning {
  id: string;
  userId: string;
  user: { email: string; role: string };
  warningType: string;
  count: number;
  shadowBlocked: boolean;
  lastWarningAt: string;
}

interface EngagementAnomaly {
  entityId: string;
  handle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  anomalyType: string;
  severity: string;
}

type Tab = "flagged" | "warnings" | "anomalies";

export default function FlaggedMessagesPage() {
  const { loading: authLoading } = useAuth("admin");
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [anomalies, setAnomalies] = useState<EngagementAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("flagged");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [msgRes, warnRes, anomalyRes] = await Promise.all([
        fetch("/api/admin/flagged-messages"),
        fetch("/api/admin/user-warnings").catch(() => null),
        fetch("/api/admin/engagement-anomalies").catch(() => null),
      ]);

      if (msgRes.ok) {
        const data = await msgRes.json();
        setMessages(data.flaggedMessages ?? []);
      }
      if (warnRes?.ok) {
        const data = await warnRes.json();
        setWarnings(data.warnings ?? []);
      }
      if (anomalyRes?.ok) {
        const data = await anomalyRes.json();
        setAnomalies(data.anomalies ?? []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(messageId: string, action: "dismiss" | "warn" | "ban") {
    setProcessingId(messageId);
    try {
      const res = await fetch("/api/admin/flagged-messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action }),
      });

      if (res.ok) {
        setMessages(messages.filter((m) => m.id !== messageId));
        toast.success(`Action "${action}" applied successfully`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Error processing action:", error);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUndoRedaction(messageId: string) {
    setProcessingId(messageId);
    try {
      const res = await fetch("/api/admin/flagged-messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action: "undo-redaction" }),
      });
      if (res.ok) {
        toast.success("Redaction undone");
        await fetchData();
      } else {
        toast.error("Failed to undo redaction");
      }
    } catch {
      toast.error("Failed to undo redaction");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUnShadowBlock(warningId: string) {
    setProcessingId(warningId);
    try {
      const res = await fetch("/api/admin/user-warnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warningId, action: "un-shadow-block" }),
      });
      if (res.ok) {
        toast.success("Shadow block removed");
        setWarnings((prev) =>
          prev.map((w) =>
            w.id === warningId ? { ...w, shadowBlocked: false } : w
          )
        );
      } else {
        toast.error("Failed to remove shadow block");
      }
    } catch {
      toast.error("Failed to remove shadow block");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-8">
          <Link
            href="/dashboard/admin"
            className="text-[#0E61FF] hover:text-[#0B4FD9] flex items-center gap-1 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">PII & Fraud Management</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
          {[
            { id: "flagged" as Tab, label: "Flagged Messages", count: messages.length, icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { id: "warnings" as Tab, label: "User Warnings", count: warnings.length, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
            { id: "anomalies" as Tab, label: "Engagement Anomalies", count: anomalies.length, icon: <Activity className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Flagged Messages Tab */}
        {activeTab === "flagged" && (
          <>
            <AnimatedSection animation="animate-fade-in" className="bg-amber-500 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-white mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Platform Leakage Detection</h4>
                  <p className="text-sm text-white/90 mt-1">
                    Messages flagged by the PII detection engine for potential platform leakage or personal information sharing.
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <div className="space-y-4">
              {messages.map((message, index) => (
                <AnimatedSection key={message.id} animation="animate-slide-up" delay={index * 80}>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden hover-lift group">
                    <div className="p-4 border-b border-gray-100 bg-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            message.sender.role === "CREATOR" ? "bg-amber-500" : "bg-[#0E61FF]"
                          }`}>
                            {message.sender.role === "CREATOR" ? (
                              <User className="h-4 w-4 text-white" />
                            ) : (
                              <Building2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{message.sender.email}</div>
                            <div className="text-xs text-white/60">
                              {message.sender.role} in deal: {message.deal.title}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-white/60">
                          {new Date(message.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-red-600 font-medium">
                            Flag Reason: {message.flagReason}
                          </span>
                          {message.piiRedacted && (
                            <Badge variant="destructive" className="text-[10px]">
                              Redacted
                            </Badge>
                          )}
                        </div>
                        <div className="text-gray-900 whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 mb-4">
                        <span className="font-medium text-gray-700">Deal participants: </span>
                        {message.deal.brand.brandProfile?.companyName || message.deal.brand.email}
                        {" vs "}
                        {message.deal.creator.creatorProfile?.name || message.deal.creator.email}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAction(message.id, "dismiss")}
                          disabled={processingId === message.id}
                          className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleAction(message.id, "warn")}
                          disabled={processingId === message.id}
                          className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Warn User
                        </button>
                        <button
                          onClick={() => handleAction(message.id, "ban")}
                          disabled={processingId === message.id}
                          className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          <Ban className="h-4 w-4" />
                          Ban User
                        </button>
                        {message.piiRedacted && (
                          <button
                            onClick={() => handleUndoRedaction(message.id)}
                            disabled={processingId === message.id}
                            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            <Undo2 className="h-4 w-4" />
                            Undo Redaction
                          </button>
                        )}
                        <Link
                          href={`/dashboard/admin/disputes/${message.deal.id}`}
                          className="flex items-center gap-1 px-3 py-2 bg-[#0E61FF] hover:bg-[#0B4FD9] text-white rounded-lg text-sm transition-colors ml-auto"
                        >
                          <Eye className="h-4 w-4" />
                          View Deal
                        </Link>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}

              {messages.length === 0 && (
                <AnimatedSection animation="animate-slide-up">
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
                    <p className="text-gray-500">No flagged messages to review.</p>
                  </div>
                </AnimatedSection>
              )}
            </div>
          </>
        )}

        {/* User Warnings Tab */}
        {activeTab === "warnings" && (
          <div className="space-y-4">
            {warnings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No Active Warnings</h3>
              </div>
            ) : (
              warnings.map((warning, idx) => (
                <AnimatedSection key={warning.id} animation="animate-slide-up" delay={idx * 80}>
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                          warning.shadowBlocked ? "bg-red-600" : "bg-amber-500"
                        }`}>
                          {warning.shadowBlocked ? (
                            <Ban className="w-4 h-4 text-white" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{warning.user.email}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{warning.warningType.replace(/_/g, " ")}</span>
                            <span>-</span>
                            <span>{warning.count} violations</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {warning.shadowBlocked && (
                          <Badge variant="destructive" className="gap-0.5">
                            <Ban className="w-3 h-3" />
                            Shadow Blocked
                          </Badge>
                        )}
                        {warning.shadowBlocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnShadowBlock(warning.id)}
                            disabled={processingId === warning.id}
                            className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            <ShieldOff className="w-3 h-3" />
                            Un-Shadow-Block
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))
            )}
          </div>
        )}

        {/* Engagement Anomalies Tab */}
        {activeTab === "anomalies" && (
          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Activity className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No Anomalies Detected</h3>
                <p className="text-gray-500">All entities have normal engagement patterns.</p>
              </div>
            ) : (
              anomalies.map((anomaly, idx) => (
                <AnimatedSection key={anomaly.entityId} animation="animate-slide-up" delay={idx * 80}>
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            @{anomaly.handle}
                            <span className="text-gray-400 ml-1 text-sm">{anomaly.platform}</span>
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{anomaly.followerCount.toLocaleString()} followers</span>
                            <span>{anomaly.engagementRate}% engagement</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={anomaly.severity === "HIGH" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {anomaly.severity}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {anomaly.anomalyType.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
