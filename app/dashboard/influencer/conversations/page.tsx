"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  IndianRupee,
  ArrowLeft,
  Inbox,
  FileText,
} from "lucide-react";

interface Proposal {
  id: string;
  postId: string;
  postTitle: string;
  brandName: string;
  proposedRate: number;
  pitchMessage: string;
  submittedAt: string;
  status: "pending" | "accepted" | "rejected";
  entityHandle: string;
  entityPlatform: string;
}

interface Message {
  id: string;
  sender: "brand" | "creator";
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  postTitle: string;
  brandName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  agreedRate: number | null;
  messages: Message[];
}

const mockProposals: Proposal[] = [
  { id: "prop-1", postId: "post-1", postTitle: "Summer Skincare Collection Launch", brandName: "GlowSkin Beauty", proposedRate: 35000, pitchMessage: "I'd love to create engaging skincare content! I have 3 years of beauty content experience and a highly engaged audience in the skincare niche. My recent brand collaborations have driven 40% higher engagement than average.", submittedAt: "2026-02-28", status: "pending", entityHandle: "@sarahbeauty", entityPlatform: "Instagram" },
  { id: "prop-2", postId: "post-4", postTitle: "Street Style Fashion Lookbook", brandName: "Urban Threads", proposedRate: 25000, pitchMessage: "Fashion is my passion! I can create stunning lookbook content that resonates with Gen-Z audiences. My street style content consistently gets 50K+ views.", submittedAt: "2026-02-26", status: "pending", entityHandle: "@sarahstyle", entityPlatform: "Instagram" },
  { id: "prop-3", postId: "post-5", postTitle: "Restaurant Chain Food Review", brandName: "Foodie Haven", proposedRate: 15000, pitchMessage: "I'm a foodie at heart! Would love to review your restaurants and share authentic dining experiences with my audience.", submittedAt: "2026-02-24", status: "rejected", entityHandle: "@sarahfoodie", entityPlatform: "YouTube" },
];

const mockConversations: Conversation[] = [
  {
    id: "conv-1", postTitle: "Flagship Phone Review Campaign", brandName: "TechNova Gadgets",
    lastMessage: "We'd like to discuss the timeline for the review...", lastMessageAt: "2026-03-01 14:30",
    unread: 2, agreedRate: null,
    messages: [
      { id: "m1", sender: "brand", text: "Hi Sarah! We loved your proposal for our phone review campaign.", time: "2026-02-28 10:00" },
      { id: "m2", sender: "creator", text: "Thank you! I'm very excited about this opportunity. I have experience with detailed tech reviews.", time: "2026-02-28 10:15" },
      { id: "m3", sender: "brand", text: "Great! We'd like to discuss the timeline for the review. Can you do it within 2 weeks?", time: "2026-03-01 14:30" },
    ],
  },
  {
    id: "conv-2", postTitle: "Protein Supplement Partnership", brandName: "FitLife Nutrition",
    lastMessage: "Looking forward to starting the content series!", lastMessageAt: "2026-02-27 16:45",
    unread: 0, agreedRate: null,
    messages: [
      { id: "m4", sender: "brand", text: "Hi! Your fitness content is amazing. We want to discuss a 3-month partnership.", time: "2026-02-25 09:00" },
      { id: "m5", sender: "creator", text: "That sounds incredible! I'd love to work with FitLife. What's the content plan?", time: "2026-02-25 09:30" },
      { id: "m6", sender: "brand", text: "We're thinking 2 reels per month + 1 YouTube video per month.", time: "2026-02-26 11:00" },
      { id: "m7", sender: "creator", text: "Looking forward to starting the content series!", time: "2026-02-27 16:45" },
    ],
  },
];

type Tab = "proposals" | "chats";
type ProposalFilter = "all" | "pending" | "rejected";

export default function InfluencerConversationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("proposals");
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>("all");
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvId, conversations]);

  const pendingCount = mockProposals.filter((p) => p.status === "pending").length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const filteredProposals = mockProposals.filter((p) => {
    if (proposalFilter === "all") return true;
    return p.status === proposalFilter;
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId) ?? null;

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConvId) return;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: "creator",
      text: messageInput.trim(),
      time: timeStr,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMsg.text, lastMessageAt: timeStr }
          : c
      )
    );
    setMessageInput("");
    toast.success("Message sent!");
  };

  const selectConversation = (id: string) => {
    setSelectedConvId(id);
    setMobileShowChat(true);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  const formatTime = (t: string) => {
    const date = new Date(t.replace(" ", "T"));
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const tabs: { key: Tab; label: string; count: number; hasUnread: boolean }[] = [
    { key: "proposals", label: "Proposals", count: pendingCount, hasUnread: false },
    { key: "chats", label: "Active Chats", count: conversations.length, hasUnread: totalUnread > 0 },
  ];

  const filterPills: { key: ProposalFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <AnimatedSection animation="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 text-gray-900">Conversations</h1>
            <p className="text-gray-500">Manage your proposals and brand conversations</p>
          </div>
        </AnimatedSection>

        <AnimatedSection animation="animate-slide-up" delay={100}>
          <div className="relative inline-flex bg-gray-100 rounded-xl p-1 mb-6">
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300 ease-out"
              style={{
                width: `calc(${100 / tabs.length}% - 4px)`,
                left: activeTab === "proposals" ? "4px" : `calc(50% + 2px)`,
              }}
            />
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.key ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.key
                      ? "bg-[#0E61FF] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
                {tab.hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </AnimatedSection>

        {activeTab === "proposals" && (
          <AnimatedSection animation="animate-fade-in">
            <div className="flex gap-2 mb-5">
              {filterPills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setProposalFilter(pill.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    proposalFilter === pill.key
                      ? "bg-[#0E61FF] text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredProposals.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-1">No proposals yet</p>
                <p className="text-gray-400 text-sm">Discover posts to start applying!</p>
                <Button
                  className="mt-4 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white"
                  onClick={() => router.push("/dashboard/influencer/discover")}
                >
                  Discover Posts
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProposals.map((proposal, index) => {
                  const isExpanded = expandedProposal === proposal.id;
                  const isRejected = proposal.status === "rejected";

                  return (
                    <AnimatedSection key={proposal.id} animation="animate-fade-in" delay={index * 60}>
                      <div
                        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 cursor-pointer ${
                          isRejected ? "opacity-70" : "hover:shadow-md"
                        } ${isExpanded ? "ring-2 ring-[#0E61FF]/20" : ""}`}
                        onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-semibold text-gray-900 truncate ${isRejected ? "text-gray-500" : ""}`}>
                                  {proposal.postTitle}
                                </h3>
                                <Badge
                                  className={
                                    proposal.status === "pending"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-600 border-red-200"
                                  }
                                >
                                  {proposal.status === "pending" ? "Pending" : "Rejected"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">{proposal.brandName}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
                                  {proposal.entityHandle} on {proposal.entityPlatform}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <IndianRupee className="w-3 h-3" />
                                  <span className={isRejected ? "line-through text-gray-400" : "font-medium text-gray-700"}>
                                    ₹{proposal.proposedRate.toLocaleString("en-IN")}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(proposal.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 p-2 rounded-lg text-gray-400 transition-transform duration-200">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="px-5 pb-5 pt-0">
                            <div className="border-t border-gray-100 pt-4 space-y-3">
                              <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Your Pitch</p>
                                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{proposal.pitchMessage}</p>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div>
                                  <span className="text-gray-400">Proposed Rate: </span>
                                  <span className={`font-semibold ${isRejected ? "line-through text-gray-400" : "text-gray-900"}`}>
                                    ₹{proposal.proposedRate.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Applied as: </span>
                                  <span className="font-medium text-gray-700">{proposal.entityHandle}</span>
                                  <span className="text-gray-400"> on {proposal.entityPlatform}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs">For: </span>
                                <span className="text-xs font-medium text-gray-700">{proposal.postTitle}</span>
                                <span className="text-xs text-gray-400"> by {proposal.brandName}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AnimatedSection>
                  );
                })}
              </div>
            )}
          </AnimatedSection>
        )}

        {activeTab === "chats" && (
          <AnimatedSection animation="animate-fade-in">
            {conversations.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-1">No active conversations yet</p>
                <p className="text-gray-400 text-sm">Brands will reach out after reviewing your proposals.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}>
                <div className="flex h-full">
                  {/* Conversation list — hidden on mobile when chat is open */}
                  <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Messages</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv.id)}
                          className={`w-full text-left p-4 border-b border-gray-50 transition-all duration-150 hover:bg-gray-50 relative ${
                            selectedConvId === conv.id ? "bg-blue-50/50" : ""
                          }`}
                        >
                          {selectedConvId === conv.id && (
                            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#0E61FF]" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{conv.brandName}</p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{conv.postTitle}</p>
                              <p className="text-xs text-gray-400 truncate mt-1">{conv.lastMessage}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-[10px] text-gray-400">{formatTime(conv.lastMessageAt)}</span>
                              {conv.unread > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0E61FF] text-white text-[10px] font-bold">
                                  {conv.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className={`w-full md:w-2/3 flex flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
                    {selectedConv ? (
                      <>
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                          <button
                            onClick={() => {
                              setMobileShowChat(false);
                              setSelectedConvId(null);
                            }}
                            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div className="w-9 h-9 rounded-full bg-[#0E61FF]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[#0E61FF]">{selectedConv.brandName.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{selectedConv.brandName}</p>
                            <p className="text-xs text-gray-500 truncate">{selectedConv.postTitle}</p>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                          {selectedConv.messages.map((msg) => {
                            const isCreator = msg.sender === "creator";
                            return (
                              <div key={msg.id} className={`flex ${isCreator ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                    isCreator
                                      ? "bg-[#0E61FF] text-white rounded-br-md"
                                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed">{msg.text}</p>
                                  <p className={`text-[10px] mt-1 ${isCreator ? "text-white/60" : "text-gray-400"}`}>
                                    {formatTime(msg.time)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
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
                              disabled={!messageInput.trim()}
                              className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white rounded-xl h-10 w-10 p-0 flex items-center justify-center disabled:opacity-40"
                            >
                              <Send className="w-4 h-4" />
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
                        <p className="text-gray-400 text-sm mt-1">Choose a conversation from the list to start chatting</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
