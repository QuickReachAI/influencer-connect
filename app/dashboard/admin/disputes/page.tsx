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
                // Refresh disputes list
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
            <div className="min-h-screen bg-[hsl(var(--bg-blue))] p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-muted rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                <div className="mb-8">
                    <Link
                        href="/dashboard/admin"
                        className="text-primary hover:text-primary flex items-center gap-1 mb-4"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[hsl(var(--sunflower))] flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">Active Disputes</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
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
                                    className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover-tilt group ${
                                        selectedDispute?.id === dispute.id
                                            ? 'ring-2 ring-[hsl(var(--coral))]'
                                            : 'hover:shadow-lg'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-lg">{dispute.title}</h3>
                                        <span className="bg-[hsl(var(--sunflower))] text-white text-xs px-2 py-1 rounded font-medium">
                                            Disputed
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground group-hover-wiggle" />
                                            <span>{dispute.brand.brandProfile?.companyName || dispute.brand.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground group-hover-wiggle" />
                                            <span>{dispute.creator.creatorProfile?.name || dispute.creator.email}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 p-3 bg-[hsl(var(--rose))]/10 border border-[hsl(var(--rose))]/20 rounded text-sm">
                                        <strong className="text-[hsl(var(--rose))]">Reason:</strong> {dispute.disputeReason?.slice(0, 100)}...
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
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
                                    <CheckCircle className="h-12 w-12 text-[hsl(var(--emerald))] mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold">All Clear!</h3>
                                    <p className="text-muted-foreground">No active disputes to review.</p>
                                </div>
                            </AnimatedSection>
                        )}
                    </div>

                    {/* Dispute Details & Resolution */}
                    {selectedDispute && (
                        <AnimatedSection animation="animate-slide-left" className="bg-white rounded-lg shadow-md sticky top-8 overflow-hidden">
                            <div className="p-6 bg-[hsl(var(--navy))]">
                                <h2 className="text-xl font-bold text-white">{selectedDispute.title}</h2>
                                <p className="text-white/60 text-sm">Deal ID: {selectedDispute.id}</p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Parties */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[hsl(var(--primary))] rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="h-5 w-5 text-white" />
                                            <span className="font-semibold text-white">Brand</span>
                                        </div>
                                        <p className="text-sm text-white/90">{selectedDispute.brand.brandProfile?.companyName}</p>
                                        <p className="text-xs text-white/60">{selectedDispute.brand.email}</p>
                                    </div>
                                    <div className="p-4 bg-[hsl(var(--coral))] rounded-lg">
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
                                    <h4 className="font-semibold mb-2">Dispute Reason</h4>
                                    <p className="text-sm bg-secondary p-3 rounded">
                                        {selectedDispute.disputeReason}
                                    </p>
                                </div>

                                {/* Evidence */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 border rounded">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Chat Messages</span>
                                        </div>
                                        <p className="text-2xl font-bold">{selectedDispute.chatMessages.length}</p>
                                    </div>
                                    <div className="p-3 border rounded">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Deliverables</span>
                                        </div>
                                        <p className="text-2xl font-bold">{selectedDispute.deliverables.length}</p>
                                    </div>
                                </div>

                                {/* Resolution Form */}
                                <div className="border-t pt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Scale className="h-5 w-5 text-muted-foreground" />
                                        <h4 className="font-semibold">Resolution Decision</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setDecision('FAVOR_CREATOR')}
                                                className={`p-3 rounded-lg border text-center transition-colors btn-animate ${
                                                    decision === 'FAVOR_CREATOR'
                                                        ? 'bg-[hsl(var(--coral))] border-[hsl(var(--coral))] text-white'
                                                        : 'hover:bg-secondary'
                                                }`}
                                            >
                                                <User className="h-5 w-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Favor Creator</span>
                                            </button>
                                            <button
                                                onClick={() => setDecision('FAVOR_BRAND')}
                                                className={`p-3 rounded-lg border text-center transition-colors btn-animate ${
                                                    decision === 'FAVOR_BRAND'
                                                        ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white'
                                                        : 'hover:bg-secondary'
                                                }`}
                                            >
                                                <Building2 className="h-5 w-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Favor Brand</span>
                                            </button>
                                            <button
                                                onClick={() => setDecision('PARTIAL')}
                                                className={`p-3 rounded-lg border text-center transition-colors btn-animate ${
                                                    decision === 'PARTIAL'
                                                        ? 'bg-[hsl(var(--sunflower))] border-[hsl(var(--sunflower))] text-white'
                                                        : 'hover:bg-secondary'
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
                                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                            rows={4}
                                        />

                                        <button
                                            onClick={resolveDispute}
                                            disabled={!decision || !notes || resolving}
                                            className="w-full bg-[hsl(var(--emerald))] hover:bg-[hsl(var(--emerald))]/90 disabled:bg-muted text-white py-3 rounded-lg font-semibold transition-colors btn-animate"
                                        >
                                            {resolving ? 'Resolving...' : 'Submit Resolution'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>
                    )}

                    {!selectedDispute && disputes.length > 0 && (
                        <AnimatedSection animation="animate-fade-in" className="bg-white rounded-lg border-2 border-dashed border-[hsl(var(--primary))]/30 p-8 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Scale className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--primary))]/40" />
                                <p>Select a dispute to review</p>
                            </div>
                        </AnimatedSection>
                    )}
                </div>
            </div>
        </div>
    );
}
