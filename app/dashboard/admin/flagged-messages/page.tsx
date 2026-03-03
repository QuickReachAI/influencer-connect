'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    MessageSquare,
    ChevronLeft,
    AlertTriangle,
    XCircle,
    CheckCircle,
    Ban,
    Eye,
    User,
    Building2
} from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

interface FlaggedMessage {
    id: string;
    content: string;
    flagReason: string;
    createdAt: string;
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

export default function FlaggedMessagesPage() {
    const [messages, setMessages] = useState<FlaggedMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    async function fetchMessages() {
        try {
            const res = await fetch('/api/admin/flagged-messages');
            if (res.ok) {
                const data = await res.json();
                setMessages(data.flaggedMessages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(messageId: string, action: 'dismiss' | 'warn' | 'ban') {
        setProcessingId(messageId);
        try {
            const res = await fetch('/api/admin/flagged-messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, action })
            });

            if (res.ok) {
                setMessages(messages.filter((m) => m.id !== messageId));
            } else {
                const data = await res.json();
                alert(data.error || 'Action failed');
            }
        } catch (error) {
            console.error('Error processing action:', error);
        } finally {
            setProcessingId(null);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
                        <h1 className="text-3xl font-bold text-gray-900">Flagged Messages</h1>
                    </div>
                    <p className="text-gray-500 mt-1">
                        {messages.length} message{messages.length !== 1 ? 's' : ''} flagged for platform leakage
                    </p>
                </div>

                {/* Info Banner */}
                <AnimatedSection animation="animate-fade-in" className="bg-amber-500 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-white mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-white">Platform Leakage Detection</h4>
                            <p className="text-sm text-white/90 mt-1">
                                These messages contain keywords or patterns that suggest users may be attempting
                                to communicate outside the platform (email, phone, WhatsApp, etc.). Review each
                                message and take appropriate action.
                            </p>
                        </div>
                    </div>
                </AnimatedSection>

                {/* Messages List */}
                <div className="space-y-4">
                    {messages.map((message, index) => (
                        <AnimatedSection key={message.id} animation="animate-slide-up" delay={index * 80}>
                            <div className="bg-white rounded-lg shadow-md overflow-hidden hover-lift group">
                                <div className="p-4 border-b border-gray-100 bg-gray-900">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                                message.sender.role === 'CREATOR'
                                                    ? 'bg-amber-500'
                                                    : 'bg-[#0E61FF]'
                                            }`}>
                                                {message.sender.role === 'CREATOR' ? (
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
                                            {new Date(message.createdAt).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                                        <div className="text-sm text-red-600 font-medium mb-1">
                                            Flag Reason: {message.flagReason}
                                        </div>
                                        <div className="text-gray-900 whitespace-pre-wrap">
                                            {message.content}
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-500 mb-4">
                                        <span className="font-medium text-gray-700">Deal participants: </span>
                                        {message.deal.brand.brandProfile?.companyName || message.deal.brand.email}
                                        {' vs '}
                                        {message.deal.creator.creatorProfile?.name || message.deal.creator.email}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAction(message.id, 'dismiss')}
                                            disabled={processingId === message.id}
                                            className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => handleAction(message.id, 'warn')}
                                            disabled={processingId === message.id}
                                            className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <AlertTriangle className="h-4 w-4" />
                                            Warn User
                                        </button>
                                        <button
                                            onClick={() => handleAction(message.id, 'ban')}
                                            disabled={processingId === message.id}
                                            className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            <Ban className="h-4 w-4" />
                                            Ban User
                                        </button>
                                        <Link
                                            href={`/dashboard/admin/disputes?dealId=${message.deal.id}`}
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
            </div>
        </div>
    );
}
