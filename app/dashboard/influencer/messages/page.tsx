"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare, Send, ArrowLeft, Building2 } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

interface Deal {
  id: string;
  title: string;
  status: string;
  creator: {
    id: string;
    email: string;
    creatorProfile: { name: string; avatar: string | null } | null;
  };
  brand: {
    id: string;
    email: string;
    brandProfile: { companyName: string; logo: string | null } | null;
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

export default function InfluencerMessagesPage() {
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
      setDeals(data.deals ?? []);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  const fetchMessages = useCallback(async (dealId: string) => {
    try {
      const res = await fetch(`/api/chat/${dealId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    if (!selectedDealId) return;
    setLoadingMessages(true);
    fetchMessages(selectedDealId);

    const interval = setInterval(() => fetchMessages(selectedDealId), 5000);
    return () => clearInterval(interval);
  }, [selectedDealId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDealId) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${selectedDealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }
      setNewMessage("");
      await fetchMessages(selectedDealId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  function getBrandName(deal: Deal) {
    return deal.brand.brandProfile?.companyName || deal.brand.email;
  }

  function getLastMessagePreview(deal: Deal) {
    const msg = messages.length > 0 && selectedDealId === deal.id ? messages[messages.length - 1] : null;
    if (msg) return msg.content;
    return deal._count.chatMessages > 0 ? "Tap to view messages" : "No messages yet";
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <AnimatedSection animation="animate-blur-in">
          <h1 className="text-3xl font-bold text-foreground mb-6">Messages</h1>
        </AnimatedSection>

        <div className="grid md:grid-cols-12 gap-0 md:gap-0 h-[calc(100vh-200px)] rounded-xl border border-border overflow-hidden bg-white shadow-md">
          {/* Sidebar - Conversation List */}
          <div
            className={`md:col-span-4 border-r border-border flex flex-col ${
              mobileShowChat ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Conversations
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingDeals ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-2 p-3 rounded-lg">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : deals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Conversations appear when brands create deals with you
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {deals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => {
                        setSelectedDealId(deal.id);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors hover-glow ${
                        selectedDealId === deal.id
                          ? "bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[hsl(var(--coral))] flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {getBrandName(deal)}
                            </span>
                            <span className="text-[10px] font-medium text-[hsl(var(--teal))] uppercase shrink-0">
                              {deal.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {deal.title}
                          </p>
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                            {getLastMessagePreview(deal)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`md:col-span-8 flex flex-col ${
              !mobileShowChat ? "hidden md:flex" : "flex"
            }`}
          >
            {selectedDeal ? (
              <div className="flex flex-col h-full animate-fade-in">
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 w-9 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {getBrandName(selectedDeal)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedDeal.title}
                    </p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[hsl(var(--emerald))] text-white">
                    {selectedDeal.status}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="space-y-4 py-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                        >
                          <div className="animate-pulse space-y-1.5">
                            <div
                              className={`h-10 bg-muted rounded-lg ${
                                i % 2 === 0 ? "w-48" : "w-56"
                              }`}
                            />
                            <div className="h-2 bg-muted rounded w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Send the first message to get the conversation started
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSystem = msg.messageType === "SYSTEM";
                      const isOwn = msg.sender?.role === "CREATOR";

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div className="bg-muted/60 text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isOwn
                                  ? "text-primary-foreground/60"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sending}
                      className="flex-1 bg-background"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sending || !newMessage.trim()}
                      className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white btn-press"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-16 w-16 text-[hsl(var(--primary))]/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Select a conversation
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Choose a deal from the sidebar to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
