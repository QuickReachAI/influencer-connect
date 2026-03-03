'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    ChevronLeft,
    User,
    Building2,
    MessageSquare,
    FileText,
    CheckCircle,
    XCircle,
    Scale
} from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

interface Dispute {
    id: string;
    title: string;
    status: string;
    disputeReason: string;
    totalAmount: number;
    brand: {
        id: string;
        email: string;
        brandProfile?: { companyName: string };
    };
    creator: {
        id: string;
        email: string;
        creatorProfile?: { name: string; reliabilityScore: number };
    };
    assignedMediator?: { id: string; email: string };
    chatMessages: any[];
    deliverables: any[];
    createdAt: string;
    updatedAt: string;
}

export default function DisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [decision, setDecision] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        fetchDisputes();
    }, []);

    async function fetchDisputes() {
        try {
            const res = await fetch('/api/admin/disputes');
            if (res.ok) {
                const data = await res.json();
                setDisputes(data.disputes);
            }
        } catch (error) {
            console.error('Error fetching disputes:', error);
        } finally {
            setLoading(false);
        }
    }

    async function resolveDispute() {
        if (!selectedDispute || !decision || !notes) return;

        setResolving(true);
        try {
            const res = await fetch(`/api/deals/${selectedDispute.id}/dispute`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, notes })
            });

            if (res.ok) {
                fetchDisputes();
                setSelectedDispute(null);
                setDecision('');
                setNotes('');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to resolve dispute');
            }
        } catch (error) {
            console.error('Error resolving dispute:', error);
        } finally {
            setResolving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                <div className="mb-8">
                    <Link
                        href="/dashboard/admin"
                        className="text-[#0E61FF] hover:text-[#0B4FD9] flex items-center gap-1 mb-4"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-amber-500 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Active Disputes</h1>
                    </div>
                    <p className="text-gray-500 mt-1">
                        {disputes.length} dispute{disputes.length !== 1 ? 's' : ''} requiring attention
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Disputes List */}
                    <div className="space-y-4">
                        {disputes.map((dispute, index) => (
                            <AnimatedSection key={dispute.id} animation="animate-slide-up" delay={index * 80}>
                                <div
                                    onClick={() => setSelectedDispute(dispute)}
                                    className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover-lift group ${
                                        selectedDispute?.id === dispute.id
                                            ? 'ring-2 ring-[#0E61FF]'
                                            : 'hover:shadow-lg'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-lg text-gray-900">{dispute.title}</h3>
                                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-medium">
                                            Disputed
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{dispute.brand.brandProfile?.companyName || dispute.brand.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{dispute.creator.creatorProfile?.name || dispute.creator.email}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded text-sm">
                                        <strong className="text-red-600">Reason:</strong>{' '}
                                        <span className="text-gray-700">{dispute.disputeReason?.slice(0, 100)}...</span>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                                        <span>
                                            Deal Value: {new Intl.NumberFormat('en-IN', {
                                                style: 'currency',
                                                currency: 'INR'
                                            }).format(dispute.totalAmount)}
                                        </span>
                                        <span>{new Date(dispute.updatedAt).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>
                            </AnimatedSection>
                        ))}

                        {disputes.length === 0 && (
                            <AnimatedSection animation="animate-slide-up">
                                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                    <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
                                    <p className="text-gray-500">No active disputes to review.</p>
                                </div>
                            </AnimatedSection>
                        )}
                    </div>

                    {/* Dispute Details & Resolution */}
                    {selectedDispute && (
                        <AnimatedSection animation="animate-slide-up" className="bg-white rounded-lg shadow-md sticky top-8 overflow-hidden">
                            <div className="p-6 bg-gray-900">
                                <h2 className="text-xl font-bold text-white">{selectedDispute.title}</h2>
                                <p className="text-white/60 text-sm">Deal ID: {selectedDispute.id}</p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Parties */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[#0E61FF] rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="h-5 w-5 text-white" />
                                            <span className="font-semibold text-white">Brand</span>
                                        </div>
                                        <p className="text-sm text-white/90">{selectedDispute.brand.brandProfile?.companyName}</p>
                                        <p className="text-xs text-white/60">{selectedDispute.brand.email}</p>
                                    </div>
                                    <div className="p-4 bg-amber-500 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-5 w-5 text-white" />
                                            <span className="font-semibold text-white">Creator</span>
                                        </div>
                                        <p className="text-sm text-white/90">{selectedDispute.creator.creatorProfile?.name}</p>
                                        <p className="text-xs text-white/60">
                                            Score: {selectedDispute.creator.creatorProfile?.reliabilityScore}/5
                                        </p>
                                    </div>
                                </div>

                                {/* Dispute Reason */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Dispute Reason</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                        {selectedDispute.disputeReason}
                                    </p>
                                </div>

                                {/* Evidence */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 border border-gray-200 rounded">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageSquare className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-700">Chat Messages</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{selectedDispute.chatMessages.length}</p>
                                    </div>
                                    <div className="p-3 border border-gray-200 rounded">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-700">Deliverables</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{selectedDispute.deliverables.length}</p>
                                    </div>
                                </div>

                                {/* Resolution Form */}
                                <div className="border-t border-gray-200 pt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Scale className="h-5 w-5 text-gray-400" />
                                        <h4 className="font-semibold text-gray-900">Resolution Decision</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setDecision('FAVOR_CREATOR')}
                                                className={`p-3 rounded-lg border text-center transition-colors ${
                                                    decision === 'FAVOR_CREATOR'
                                                        ? 'bg-amber-500 border-amber-500 text-white'
                                                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                <User className="h-5 w-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Favor Creator</span>
                                            </button>
                                            <button
                                                onClick={() => setDecision('FAVOR_BRAND')}
                                                className={`p-3 rounded-lg border text-center transition-colors ${
                                                    decision === 'FAVOR_BRAND'
                                                        ? 'bg-[#0E61FF] border-[#0E61FF] text-white'
                                                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                <Building2 className="h-5 w-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Favor Brand</span>
                                            </button>
                                            <button
                                                onClick={() => setDecision('PARTIAL')}
                                                className={`p-3 rounded-lg border text-center transition-colors ${
                                                    decision === 'PARTIAL'
                                                        ? 'bg-gray-900 border-gray-900 text-white'
                                                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                <Scale className="h-5 w-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Partial</span>
                                            </button>
                                        </div>

                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Enter your decision notes (required)..."
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0E61FF] focus:border-[#0E61FF] text-gray-900 placeholder:text-gray-400"
                                            rows={4}
                                        />

                                        <button
                                            onClick={resolveDispute}
                                            disabled={!decision || !notes || resolving}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white py-3 rounded-lg font-semibold transition-colors"
                                        >
                                            {resolving ? 'Resolving...' : 'Submit Resolution'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>
                    )}

                    {!selectedDispute && disputes.length > 0 && (
                        <AnimatedSection animation="animate-fade-in" className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <Scale className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Select a dispute to review</p>
                            </div>
                        </AnimatedSection>
                    )}
                </div>
            </div>
        </div>
    );
}
