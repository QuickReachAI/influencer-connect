"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Inbox,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Deal {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
  brand: {
    id: string;
    email: string;
    brandProfile: { companyName: string; logo: string | null } | null;
  };
  creator: {
    id: string;
    email: string;
    creatorProfile: { name: string; avatar: string | null } | null;
  };
  _count: { deliverables: number; chatMessages: number };
}

interface ChatMessage {
  id: string;
  dealId: string;
  senderId: string;
  messageType: "TEXT" | "FILE" | "SYSTEM";
  content: string;
  flagged: boolean;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    role: string;
    creatorProfile: { name: string; avatar: string | null } | null;
    brandProfile: { companyName: string; logo: string | null } | null;
  };
}

export default function InfluencerConversationsPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.replace("/");
    }
  }, [router]);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error("Failed to fetch deals");
      const data = await res.json();
      setDeals(data.deals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const fetchMessages = useCallback(async (dealId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      toast.error("Couldn't load messages — try refreshing");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setMobileShowChat(true);
    fetchMessages(dealId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDealId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${selectedDealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setNewMessage("");
      await fetchMessages(selectedDealId);
    } catch {
      toast.error("Message didn't go through — give it another try");
    } finally {
      setSending(false);
    }
  };

  const selectedDeal = deals.find((d) => d.id === selectedDealId) ?? null;

  const formatTime = (t: string) => {
    const date = new Date(t);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    SCRIPT_PENDING: "bg-amber-50 text-amber-700",
    LOCKED: "bg-blue-50 text-blue-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-600",
    DISPUTED: "bg-red-50 text-red-600",
  };

  if (loadingDeals) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <AnimatedSection animation="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 text-gray-900">Messages</h1>
            <p className="text-gray-500">Chat with brands about your deals</p>
          </div>
        </AnimatedSection>

        {deals.length === 0 ? (
          <AnimatedSection animation="animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-1">No chats yet</p>
              <p className="text-gray-400 text-sm">When brands reach out or you land a deal, your chats will show up here.</p>
              <Button
                className="mt-4 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white"
                onClick={() => router.push("/dashboard/influencer/discover")}
              >
                Discover Campaigns
              </Button>
            </div>
          </AnimatedSection>
        ) : (
          <AnimatedSection animation="animate-slide-up" delay={100}>
            <div
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100dvh-280px)] min-h-[400px] sm:min-h-[500px]"
            >
              <div className="flex h-full">
                {/* Deal list */}
                <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Conversations ({deals.length})
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {deals.map((deal) => {
                      const brandName = deal.brand?.brandProfile?.companyName || deal.brand?.email || "Brand";
                      return (
                        <button
                          key={deal.id}
                          onClick={() => selectDeal(deal.id)}
                          className={`w-full text-left p-4 border-b border-gray-50 transition-all duration-150 hover:bg-gray-50 relative ${
                            selectedDealId === deal.id ? "bg-blue-50/50" : ""
                          }`}
                        >
                          {selectedDealId === deal.id && (
                            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#0E61FF]" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{brandName}</p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{deal.title}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge className={`text-[10px] ${statusColors[deal.status] || "bg-gray-100 text-gray-600"}`}>
                                  {deal.status.replace(/_/g, " ")}
                                </Badge>
                                {deal._count.chatMessages > 0 && (
                                  <span className="text-[10px] text-gray-400">
                                    {deal._count.chatMessages} msgs
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chat area */}
                <div className={`w-full md:w-2/3 flex flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
                  {selectedDeal ? (
                    <>
                      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                        <button
                          onClick={() => {
                            setMobileShowChat(false);
                            setSelectedDealId(null);
                          }}
                          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-9 h-9 rounded-full bg-[#0E61FF]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-[#0E61FF]">
                            {(selectedDeal.brand?.brandProfile?.companyName || "B").charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {selectedDeal.brand?.brandProfile?.companyName || selectedDeal.brand?.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{selectedDeal.title}</p>
                        </div>
                        <Badge className={`text-[10px] ${statusColors[selectedDeal.status] || "bg-gray-100 text-gray-600"}`}>
                          {selectedDeal.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                        {loadingMessages ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                            <p className="text-gray-400 text-sm">No messages yet — say hi and get things rolling!</p>
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isMe = msg.sender?.role === "CREATOR";
                            return (
                              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 ${
                                    isMe
                                      ? "bg-[#0E61FF] text-white rounded-br-md"
                                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed">{msg.content}</p>
                                  <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-gray-400"}`}>
                                    {formatTime(msg.createdAt)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0E61FF]/20 focus:border-[#0E61FF] transition-all"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white rounded-xl h-10 w-10 p-0 flex items-center justify-center disabled:opacity-40"
                          >
                            {sending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <MessageSquare className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">Select a conversation</p>
                      <p className="text-gray-400 text-sm mt-1">Choose a deal from the list to view messages</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
