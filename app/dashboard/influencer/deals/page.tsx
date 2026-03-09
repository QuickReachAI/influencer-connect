"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { AnimatedSection } from "@/components/ui/animated-section";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePusherChat } from "@/lib/hooks/use-pusher";
import { getDealStatusGroup, getDealStatusLabel } from "@/lib/utils/deal-status";
import { formatINR, formatDate } from "@/lib/utils/format";
import {
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Film,
  Video,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  CalendarDays,
  IndianRupee,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ApiDeal {
  id: string;
  title: string;
  description?: string;
  status: string;
  totalAmount: number;
  currentRevision: number;
  maxRevisions: number;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    brandProfile?: { companyName: string; logo?: string } | null;
  };
  _count: { deliverables: number; chatMessages: number };
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

type UIStatus = "active" | "in_review" | "revision_requested" | "completed";

function mapApiStatusToUI(status: string): UIStatus {
  const group = getDealStatusGroup(status);
  if (status === "REVISION_PENDING") return "revision_requested";
  if (status === "DELIVERY_PENDING" || status === "PAYMENT_100_PENDING") return "in_review";
  if (group === "completed") return "completed";
  return "active";
}

const STATUS_ORDER: Record<UIStatus, number> = {
  revision_requested: 0,
  active: 1,
  in_review: 2,
  completed: 3,
};

const STATUS_CONFIG: Record<UIStatus, { label: string; color: string; bg: string; ring: string; icon: React.ReactNode }> = {
  active: {
    label: "Active",
    color: "text-[#0E61FF]",
    bg: "bg-blue-50",
    ring: "ring-[#0E61FF]/20",
    icon: <CircleDot className="w-3.5 h-3.5" />,
  },
  in_review: {
    label: "In Review",
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-500/20",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  revision_requested: {
    label: "Revision Requested",
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-500/20",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-500/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

export default function InfluencerDealsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth("influencer");
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({});
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Pusher for real-time chat
  const { bind, isConnected } = usePusherChat(expandedDeal);

  // Fetch deals
  useEffect(() => {
    if (!user) return;

    async function fetchDeals() {
      try {
        const res = await fetch("/api/deals");
        if (!res.ok) throw new Error("Failed to load deals");
        const data = await res.json();
        setDeals(data.deals || []);
      } catch {
        // empty state
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, [user]);

  // Fetch chat when deal expanded
  useEffect(() => {
    if (!expandedDeal || chatMessages[expandedDeal]) return;

    async function fetchChat() {
      setChatLoading(prev => ({ ...prev, [expandedDeal!]: true }));
      try {
        const res = await fetch(`/api/chat/${expandedDeal}`);
        if (res.ok) {
          const data = await res.json();
          setChatMessages(prev => ({ ...prev, [expandedDeal!]: data.messages || [] }));
        }
      } catch {
        // ignore
      } finally {
        setChatLoading(prev => ({ ...prev, [expandedDeal!]: false }));
      }
    }

    fetchChat();
  }, [expandedDeal, chatMessages]);

  // Listen for real-time messages
  useEffect(() => {
    if (!expandedDeal) return;

    const unbind = bind<ChatMessage>("new-message", (msg) => {
      setChatMessages(prev => ({
        ...prev,
        [expandedDeal!]: [...(prev[expandedDeal!] || []), msg],
      }));
    });

    return () => { unbind?.(); };
  }, [expandedDeal, bind]);

  // Scroll chat to bottom
  useEffect(() => {
    if (expandedDeal && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [expandedDeal, chatMessages]);

  const handleSendMessage = useCallback(async (dealId: string) => {
    const text = messageInputs[dealId]?.trim();
    if (!text || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/chat/${dealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });

      if (res.ok) {
        const msg = await res.json();
        setChatMessages(prev => ({
          ...prev,
          [dealId]: [...(prev[dealId] || []), msg],
        }));
        setMessageInputs(prev => ({ ...prev, [dealId]: "" }));
      }
    } catch {
      // ignore
    } finally {
      setSendingMessage(false);
    }
  }, [messageInputs, sendingMessage]);

  const sortedDeals = [...deals].sort((a, b) => {
    const sa = STATUS_ORDER[mapApiStatusToUI(a.status)] ?? 1;
    const sb = STATUS_ORDER[mapApiStatusToUI(b.status)] ?? 1;
    return sa - sb;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E61FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Deals</h1>
            <p className="text-gray-500 mt-1">Manage your active collaborations</p>
          </div>
        </AnimatedSection>

        {sortedDeals.length === 0 ? (
          <AnimatedSection animation="animate-fade-in" delay={100}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-[#0E61FF]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active deals yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Start by discovering posts and submitting proposals!
              </p>
              <button
                onClick={() => router.push("/dashboard/influencer/discover")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0E61FF] text-white rounded-xl font-medium text-sm hover:bg-[#0B4FD9] transition-colors"
              >
                Discover Posts
              </button>
            </div>
          </AnimatedSection>
        ) : (
          <div className="space-y-4">
            {sortedDeals.map((deal, index) => {
              const isExpanded = expandedDeal === deal.id;
              const uiStatus = mapApiStatusToUI(deal.status);
              const sc = STATUS_CONFIG[uiStatus];
              const msgs = chatMessages[deal.id] || [];
              const isChatLoading = chatLoading[deal.id];

              return (
                <AnimatedSection key={deal.id} animation="animate-slide-up" delay={index * 80}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                    {/* Card Header — always visible */}
                    <button
                      onClick={() => setExpandedDeal(isExpanded ? null : deal.id)}
                      className="w-full text-left px-6 py-5 focus:outline-none"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1.5">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {deal.brand?.brandProfile?.companyName || "Brand"}
                            </h3>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${sc.color} ${sc.bg} ${sc.ring}`}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{deal.title}</p>

                          {/* Quick stats row */}
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                              <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                              {formatINR(Number(deal.totalAmount))}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                              <Film className="w-3.5 h-3.5 text-gray-400" />
                              {deal._count?.deliverables || 0} deliverables
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                              Revision {deal.currentRevision ?? 0} of {deal.maxRevisions ?? 2}
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded view */}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        <div className="grid lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                          {/* Left panel — deal info */}
                          <div className="lg:col-span-2 p-6 space-y-6">
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Deal Details
                              </h4>
                              <p className="text-sm text-gray-600 mb-3">{deal.description || "No description"}</p>
                              <p className="text-xs text-gray-400">Status: {getDealStatusLabel(deal.status)}</p>
                            </div>

                            {/* Revision + Rate */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Revisions</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {deal.currentRevision ?? 0}
                                  <span className="text-sm font-normal text-gray-400"> / {deal.maxRevisions ?? 2}</span>
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Agreed Rate</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {formatINR(Number(deal.totalAmount))}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                Created: {formatDate(deal.createdAt)} • Updated: {formatDate(deal.updatedAt)}
                              </p>
                            </div>
                          </div>

                          {/* Right panel — chat */}
                          <div className="lg:col-span-3 flex flex-col">
                            <div className="px-6 py-3 border-b border-gray-100">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Messages
                              </h4>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-80 px-6 py-4 space-y-3">
                              {isChatLoading ? (
                                <div className="flex justify-center py-8">
                                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                </div>
                              ) : msgs.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No messages yet. Start the conversation!</p>
                              ) : (
                                msgs.map((msg) => {
                                  const isCreator = msg.senderId === user?.id;
                                  if (msg.senderRole === "SYSTEM") {
                                    return (
                                      <div key={msg.id} className="flex justify-center">
                                        <p className="text-xs text-gray-400 italic bg-gray-50 rounded-full px-3 py-1">
                                          {msg.body}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      key={msg.id}
                                      className={`flex ${isCreator ? "justify-end" : "justify-start"}`}
                                    >
                                      <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                          isCreator
                                            ? "bg-[#0E61FF] text-white rounded-br-md"
                                            : "bg-gray-100 text-gray-800 rounded-bl-md"
                                        }`}
                                      >
                                        <p className="text-sm leading-relaxed">{msg.body}</p>
                                        <p
                                          className={`text-[10px] mt-1 ${
                                            isCreator ? "text-blue-200" : "text-gray-400"
                                          }`}
                                        >
                                          {new Date(msg.createdAt).toLocaleString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                              <div ref={chatEndRef} />
                            </div>

                            {/* Message input */}
                            <div className="px-6 py-3 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={messageInputs[deal.id] || ""}
                                  onChange={(e) =>
                                    setMessageInputs((prev) => ({
                                      ...prev,
                                      [deal.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendMessage(deal.id);
                                    }
                                  }}
                                  placeholder="Type a message…"
                                  className="flex-1 text-sm bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/30 focus:border-[#0E61FF] transition-all placeholder:text-gray-400"
                                />
                                <button
                                  onClick={() => handleSendMessage(deal.id)}
                                  disabled={!messageInputs[deal.id]?.trim() || sendingMessage}
                                  className="w-10 h-10 rounded-xl bg-[#0E61FF] text-white flex items-center justify-center hover:bg-[#0B4FD9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
