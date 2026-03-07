"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { AnimatedSection } from "@/components/ui/animated-section";
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
} from "lucide-react";

interface Deal {
  id: string;
  brandName: string;
  postTitle: string;
  status: "active" | "in_review" | "revision_requested" | "completed";
  agreedRate: number;
  creatives: { format: string; durationSeconds: number; status: string }[];
  startDate: string;
  deadline: string;
  currentRevision: number;
  maxRevisions: number;
  messages: { id: string; sender: "brand" | "creator" | "system"; text: string; time: string }[];
}

const mockDeals: Deal[] = [
  {
    id: "deal-1",
    brandName: "GlowSkin Beauty",
    postTitle: "Summer Skincare Collection Launch",
    status: "active",
    agreedRate: 40000,
    creatives: [
      { format: "Reel/Short", durationSeconds: 30, status: "pending" },
      { format: "Reel/Short", durationSeconds: 60, status: "pending" },
    ],
    startDate: "2026-03-01",
    deadline: "2026-03-15",
    currentRevision: 0,
    maxRevisions: 2,
    messages: [
      { id: "dm1", sender: "system", text: "Deal started! Please review the creative brief.", time: "2026-03-01 10:00" },
      { id: "dm2", sender: "brand", text: "Hi Sarah! Excited to work with you. Please check the brief and let me know if you have questions.", time: "2026-03-01 10:30" },
      { id: "dm3", sender: "creator", text: "Thank you! I've reviewed the brief. I'll start working on the first reel today.", time: "2026-03-01 11:00" },
    ],
  },
  {
    id: "deal-2",
    brandName: "TechNova Gadgets",
    postTitle: "Flagship Phone Review",
    status: "in_review",
    agreedRate: 120000,
    creatives: [
      { format: "Long Form Video", durationSeconds: 600, status: "submitted" },
    ],
    startDate: "2026-02-20",
    deadline: "2026-03-10",
    currentRevision: 1,
    maxRevisions: 2,
    messages: [
      { id: "dm4", sender: "system", text: "Deal started.", time: "2026-02-20 09:00" },
      { id: "dm5", sender: "creator", text: "I've uploaded the first draft of the review video.", time: "2026-03-05 15:00" },
      { id: "dm6", sender: "brand", text: "Thanks! Reviewing now. Will get back to you within 48 hours.", time: "2026-03-05 16:00" },
    ],
  },
  {
    id: "deal-3",
    brandName: "FitLife Nutrition",
    postTitle: "Protein Supplement Partnership",
    status: "revision_requested",
    agreedRate: 60000,
    creatives: [
      { format: "Reel/Short", durationSeconds: 45, status: "revision_requested" },
      { format: "Reel/Short", durationSeconds: 30, status: "pending" },
      { format: "Long Form Video", durationSeconds: 480, status: "pending" },
    ],
    startDate: "2026-02-25",
    deadline: "2026-03-20",
    currentRevision: 1,
    maxRevisions: 3,
    messages: [
      { id: "dm7", sender: "system", text: "Deal started.", time: "2026-02-25 10:00" },
      { id: "dm8", sender: "brand", text: "The first reel needs some adjustments — the product placement should be more prominent in the opening.", time: "2026-03-02 14:00" },
    ],
  },
];

const STATUS_ORDER: Record<Deal["status"], number> = {
  revision_requested: 0,
  active: 1,
  in_review: 2,
  completed: 3,
};

const STATUS_CONFIG: Record<Deal["status"], { label: string; color: string; bg: string; ring: string; icon: React.ReactNode }> = {
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

function daysRemaining(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CreativeIcon({ format }: { format: string }) {
  if (format.toLowerCase().includes("reel") || format.toLowerCase().includes("short")) {
    return <Film className="w-4 h-4 text-gray-400" />;
  }
  return <Video className="w-4 h-4 text-gray-400" />;
}

function CreativeStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-300",
    submitted: "bg-amber-400",
    revision_requested: "bg-red-500",
    approved: "bg-emerald-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-300"}`} />;
}

export default function InfluencerDealsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.push("/auth/login");
      return;
    }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (expandedDeal && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [expandedDeal, deals]);

  const sortedDeals = [...deals].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  );

  function handleSendMessage(dealId: string) {
    const text = messageInputs[dealId]?.trim();
    if (!text) return;

    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              messages: [
                ...d.messages,
                {
                  id: `msg-${Date.now()}`,
                  sender: "creator" as const,
                  text,
                  time: new Date().toISOString().replace("T", " ").slice(0, 16),
                },
              ],
            }
          : d
      )
    );
    setMessageInputs((prev) => ({ ...prev, [dealId]: "" }));
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0E61FF] border-t-transparent rounded-full animate-spin" />
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
              const sc = STATUS_CONFIG[deal.status];
              const days = daysRemaining(deal.deadline);
              const completedCreatives = deal.creatives.filter(
                (c) => c.status === "approved" || c.status === "submitted"
              ).length;

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
                              {deal.brandName}
                            </h3>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${sc.color} ${sc.bg} ${sc.ring}`}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{deal.postTitle}</p>

                          {/* Quick stats row */}
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                              <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                              ₹{deal.agreedRate.toLocaleString("en-IN")}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                              <Film className="w-3.5 h-3.5 text-gray-400" />
                              {completedCreatives} of {deal.creatives.length} creatives
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className={`inline-flex items-center gap-1.5 text-sm ${days <= 3 ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                              {days > 0 ? `${days} day${days !== 1 ? "s" : ""} left` : days === 0 ? "Due today" : "Overdue"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                              Revision {deal.currentRevision} of {deal.maxRevisions}
                            </span>
                          </div>

                          {/* Creatives mini-list */}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {deal.creatives.map((c, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1"
                              >
                                <CreativeStatusDot status={c.status} />
                                <CreativeIcon format={c.format} />
                                {c.format} · {formatDuration(c.durationSeconds)}
                              </span>
                            ))}
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
                            {/* Deliverables */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Deliverables
                              </h4>
                              <ul className="space-y-2">
                                {deal.creatives.map((c, ci) => {
                                  const done = c.status === "approved" || c.status === "submitted";
                                  return (
                                    <li key={ci} className="flex items-center gap-3">
                                      <span
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                          done
                                            ? "bg-[#0E61FF] border-[#0E61FF]"
                                            : c.status === "revision_requested"
                                              ? "border-red-400 bg-red-50"
                                              : "border-gray-300"
                                        }`}
                                      >
                                        {done && (
                                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {c.status === "revision_requested" && (
                                          <RotateCcw className="w-3 h-3 text-red-500" />
                                        )}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                          {c.format}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {formatDuration(c.durationSeconds)} · {c.status.replace("_", " ")}
                                        </p>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>

                            {/* Timeline */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                Timeline
                              </h4>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400">Start</p>
                                  <p className="text-sm font-medium text-gray-800">{formatDate(deal.startDate)}</p>
                                </div>
                                <div className="w-8 border-t-2 border-dashed border-gray-200" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400">Deadline</p>
                                  <p className={`text-sm font-medium ${days <= 3 ? "text-red-600" : "text-gray-800"}`}>
                                    {formatDate(deal.deadline)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Revision + Rate */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Revisions</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {deal.currentRevision}
                                  <span className="text-sm font-normal text-gray-400"> / {deal.maxRevisions}</span>
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-400 mb-1">Agreed Rate</p>
                                <p className="text-lg font-bold text-gray-900">
                                  ₹{deal.agreedRate.toLocaleString("en-IN")}
                                </p>
                              </div>
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
                              {deal.messages.map((msg) => {
                                if (msg.sender === "system") {
                                  return (
                                    <div key={msg.id} className="flex justify-center">
                                      <p className="text-xs text-gray-400 italic bg-gray-50 rounded-full px-3 py-1">
                                        {msg.text}
                                      </p>
                                    </div>
                                  );
                                }
                                const isCreator = msg.sender === "creator";
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
                                      <p className="text-sm leading-relaxed">{msg.text}</p>
                                      <p
                                        className={`text-[10px] mt-1 ${
                                          isCreator ? "text-blue-200" : "text-gray-400"
                                        }`}
                                      >
                                        {msg.time}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
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
                                  disabled={!messageInputs[deal.id]?.trim()}
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
