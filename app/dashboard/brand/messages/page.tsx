"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  ShieldAlert,
} from "lucide-react";
import { usePusherChat } from "@/lib/hooks/use-pusher";

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
  piiRedacted?: boolean;
  shadowBlocked?: boolean;
  sender: {
    id: string;
    email: string;
    role: string;
    creatorProfile: { name: string; avatar: string | null } | null;
    brandProfile: { companyName: string; logo: string | null } | null;
  };
}

export default function BrandMessagesPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const {
    isConnected,
    typingUsers,
    bind,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt,
  } = usePusherChat(selectedDealId);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "brand") {
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
    sendReadReceipt(selectedDealId);
  }, [selectedDealId, fetchMessages, sendReadReceipt]);

  // Real-time message subscription via Pusher
  useEffect(() => {
    if (!selectedDealId || !bind) return;

    const unbindNewMessage = bind<ChatMessage>("new-message", (data) => {
      setMessages((prev) => [...prev, data]);
      sendReadReceipt(selectedDealId);
    });

    const unbindFlagged = bind<{ messageId: string; reason: string }>("message-flagged", (data) => {
      toast.warning(`PII detected: ${data.reason}`, { duration: 4000 });
    });

    return () => {
      unbindNewMessage?.();
      unbindFlagged?.();
    };
  }, [selectedDealId, bind, sendReadReceipt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (selectedDealId && value.trim()) {
      sendTypingStart(selectedDealId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedDealId) sendTypingStop(selectedDealId);
      }, 2000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDealId) return;

    if (selectedDealId) sendTypingStop(selectedDealId);

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${selectedDealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.piiWarning) {
          toast.warning(data.piiWarning, { duration: 5000 });
        }
        if (data.error) throw new Error(data.error);
      }
      setNewMessage("");
      if (!isConnected) {
        await fetchMessages(selectedDealId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  function getCreatorName(deal: Deal) {
    return deal.creator.creatorProfile?.name || deal.creator.email;
  }

  function renderMessageContent(msg: ChatMessage) {
    if (msg.shadowBlocked) {
      return <span className="text-gray-400 italic">[Message hidden]</span>;
    }
    if (msg.piiRedacted) {
      return (
        <span>
          {msg.content.split(/(\[REDACTED\])/).map((part, i) =>
            part === "[REDACTED]" ? (
              <span key={i} className="bg-red-100 text-red-600 px-1 rounded text-xs font-mono">
                [REDACTED]
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    }
    return msg.content;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            {isConnected && (
              <Badge variant="success" className="gap-1 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-12 gap-0 h-[calc(100vh-200px)] rounded-xl border border-gray-200 overflow-hidden bg-white shadow-md">
          {/* Sidebar */}
          <div
            className={`md:col-span-4 border-r border-gray-200 flex flex-col ${
              mobileShowChat ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Conversations
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingDeals ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-2 p-3 rounded-lg">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : deals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Create a deal to start messaging creators
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
                      className={`w-full text-left p-3 rounded-lg transition-smooth ${
                        selectedDealId === deal.id
                          ? "bg-[#0E61FF] text-white"
                          : "hover:bg-gray-100 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          selectedDealId === deal.id ? "bg-white/20" : "bg-blue-100"
                        }`}>
                          <User className={`h-4 w-4 ${selectedDealId === deal.id ? "text-white" : "text-[#0E61FF]"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium truncate ${selectedDealId === deal.id ? "text-white" : "text-gray-900"}`}>
                              {getCreatorName(deal)}
                            </span>
                            <span className={`text-[10px] font-semibold uppercase shrink-0 px-1.5 py-0.5 rounded ${
                              selectedDealId === deal.id
                                ? "bg-white/20 text-white"
                                : deal.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}>
                              {deal.status}
                            </span>
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${selectedDealId === deal.id ? "text-white/80" : "text-gray-500"}`}>
                            {deal.title}
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
              <AnimatedSection animation="animate-fade-in" className="flex flex-col flex-1">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden text-gray-500 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[#0E61FF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {getCreatorName(selectedDeal)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedDeal.title}
                    </p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {selectedDeal.status}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="space-y-4 py-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                          <div className="animate-pulse">
                            <div className={`h-10 bg-gray-200 rounded-lg ${i % 2 === 0 ? "w-48" : "w-56"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSystem = msg.messageType === "SYSTEM";
                      const isOwn = msg.sender?.role === "BRAND";

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
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
                                ? "bg-[#0E61FF] text-white rounded-br-md"
                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {renderMessageContent(msg)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[10px] ${isOwn ? "text-white/60" : "text-gray-500"}`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Asia/Kolkata",
                                })}
                              </span>
                              {msg.flagged && (
                                <ShieldAlert className={`w-3 h-3 ${isOwn ? "text-white/60" : "text-amber-500"}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl px-4 py-2 rounded-bl-md">
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                                style={{ animationDelay: `${i * 150}ms` }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 ml-1">
                            {typingUsers.map((u) => u.userName).join(", ")} typing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => handleInputChange(e.target.value)}
                      disabled={sending}
                      className="flex-1 bg-white"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sending || !newMessage.trim()}
                      className="bg-[#0E61FF] text-white hover:bg-[#0E61FF]/90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </AnimatedSection>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-500">
                  Select a conversation
                </p>
                <p className="text-sm text-gray-400 mt-1">
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
