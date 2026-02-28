"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sampleDeals, sampleInfluencers, sampleMessages } from "@/data/sample-data";
import { Send } from "lucide-react";

export default function BrandMessagesPage() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>("deal-1");
  const [newMessage, setNewMessage] = useState("");

  const brandDeals = sampleDeals.filter(deal => deal.brandId === "brand-1");
  const selectedDeal = brandDeals.find(deal => deal.id === selectedDealId);
  const selectedInfluencer = selectedDeal
    ? sampleInfluencers.find(inf => inf.id === selectedDeal.influencerId)
    : null;

  const dealMessages = selectedDealId
    ? sampleMessages.filter(msg => msg.dealId === selectedDealId)
    : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // In a real app, this would send to an API
    console.log("Sending message:", newMessage);
    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="brand" />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>

        <div className="grid md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="md:col-span-4 overflow-y-auto">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brandDeals.map((deal) => {
                const influencer = sampleInfluencers.find(inf => inf.id === deal.influencerId);
                const lastMessage = sampleMessages
                  .filter(msg => msg.dealId === deal.id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                return (
                  <button
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedDealId === deal.id
                        ? "bg-purple-50 border-purple-300"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium">{influencer?.name}</div>
                      <Badge
                        variant={deal.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {deal.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{deal.title}</div>
                    {lastMessage && (
                      <div className="text-xs text-gray-500 truncate">
                        {lastMessage.content}
                      </div>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-8 flex flex-col">
            {selectedDeal && selectedInfluencer ? (
              <>
                {/* Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedInfluencer.name}</CardTitle>
                      <p className="text-sm text-gray-600">{selectedDeal.title}</p>
                    </div>
                    <Badge variant={selectedDeal.status === "active" ? "default" : "secondary"}>
                      {selectedDeal.status}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                  {dealMessages.map((message) => {
                    const isFromBrand = message.senderRole === "brand";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromBrand ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-4 ${
                            isFromBrand
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm mb-1">{message.content}</p>
                          <div className={`text-xs ${isFromBrand ? "text-purple-100" : "text-gray-500"}`}>
                            {new Date(message.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>

                {/* Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="gap-2">
                      <Send className="w-4 h-4" />
                      Send
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Select a conversation to view messages</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
