'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Users,
    FileText,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    MessageSquare,
    Shield,
    Clock
} from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

interface DashboardStats {
    users: {
        total: number;
        creators: number;
        brands: number;
        verified: number;
        banned: number;
        newThisPeriod: number;
    };
    deals: {
        total: number;
        completed: number;
        disputed: number;
        newThisPeriod: number;
        totalValue: number;
    };
    revenue: {
        totalDeals: number;
        totalGross: number;
        totalPlatformFee: number;
        totalGST: number;
        totalTDS: number;
    };
    disputes: {
        total: number;
        resolved: number;
        active: number;
        resolutionRate: string;
    };
    storage: {
        totalFiles: number;
        totalSize: string;
        expiringSoon: number;
    };
    recentActivity: any[];
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            const res = await fetch('/api/admin/stats?period=30');
            if (!res.ok) {
                throw new Error('Failed to fetch stats');
            }
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading stats');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[hsl(var(--bg-blue))] p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-32 bg-muted rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[hsl(var(--bg-blue))] p-8">
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[hsl(var(--bg-blue))]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                <AnimatedSection animation="animate-blur-in" className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-1">QuickReach AI Platform Overview</p>
                </AnimatedSection>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <AnimatedSection animation="animate-pop" delay={0}>
                        <Link
                            href="/dashboard/admin/disputes"
                            className="bg-[hsl(var(--sunflower))] hover:bg-[hsl(var(--sunflower))]/90 text-white p-4 rounded-lg flex items-center gap-3 transition-colors hover-tilt group"
                        >
                            <AlertTriangle className="h-6 w-6 group-hover-bounce" />
                            <div>
                                <div className="font-semibold">Active Disputes</div>
                                <div className="text-2xl font-bold">{stats?.disputes.active || 0}</div>
                            </div>
                        </Link>
                    </AnimatedSection>

                    <AnimatedSection animation="animate-pop" delay={100}>
                        <Link
                            href="/dashboard/admin/users"
                            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white p-4 rounded-lg flex items-center gap-3 transition-colors hover-tilt group"
                        >
                            <Users className="h-6 w-6 group-hover-bounce" />
                            <div>
                                <div className="font-semibold">Total Users</div>
                                <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
                            </div>
                        </Link>
                    </AnimatedSection>

                    <AnimatedSection animation="animate-pop" delay={200}>
                        <Link
                            href="/dashboard/admin/flagged-messages"
                            className="bg-[hsl(var(--rose))] hover:bg-[hsl(var(--rose))]/90 text-white p-4 rounded-lg flex items-center gap-3 transition-colors hover-tilt group"
                        >
                            <MessageSquare className="h-6 w-6 group-hover-bounce" />
                            <div>
                                <div className="font-semibold">Flagged Messages</div>
                                <div className="text-sm">Review Required</div>
                            </div>
                        </Link>
                    </AnimatedSection>

                    <AnimatedSection animation="animate-pop" delay={300}>
                        <div className="bg-[hsl(var(--emerald))] text-white p-4 rounded-lg flex items-center gap-3 hover-tilt group">
                            <DollarSign className="h-6 w-6 group-hover-bounce" />
                            <div>
                                <div className="font-semibold">Revenue (30d)</div>
                                <div className="text-2xl font-bold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalPlatformFee || 0)}
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Users Stats */}
                    <AnimatedSection animation="animate-flip-in" delay={0} className="rounded-lg shadow-md hover-lift overflow-hidden bg-white">
                        <div className="bg-[hsl(var(--primary))] p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Users</h3>
                        </div>
                        <div className="bg-card p-6 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Creators</span>
                                <span className="font-semibold">{stats?.users.creators}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Brands</span>
                                <span className="font-semibold">{stats?.users.brands}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">KYC Verified</span>
                                <span className="font-semibold text-[hsl(var(--emerald))]">{stats?.users.verified}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Banned</span>
                                <span className="font-semibold text-[hsl(var(--rose))]">{stats?.users.banned}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground">New (30d)</span>
                                <span className="font-semibold text-[hsl(var(--primary))]">+{stats?.users.newThisPeriod}</span>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Deals Stats */}
                    <AnimatedSection animation="animate-flip-in" delay={100} className="rounded-lg shadow-md hover-lift overflow-hidden bg-white">
                        <div className="bg-[hsl(var(--coral))] p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Deals</h3>
                        </div>
                        <div className="bg-card p-6 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-semibold">{stats?.deals.total}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Completed</span>
                                <span className="font-semibold text-[hsl(var(--emerald))]">{stats?.deals.completed}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Disputed</span>
                                <span className="font-semibold text-[hsl(var(--sunflower))]">{stats?.deals.disputed}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground">Total Value</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.deals.totalValue || 0)}
                                </span>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Disputes Stats */}
                    <AnimatedSection animation="animate-flip-in" delay={200} className="rounded-lg shadow-md hover-lift overflow-hidden bg-white">
                        <div className="bg-[hsl(var(--sunflower))] p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Mediation</h3>
                        </div>
                        <div className="bg-card p-6 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Disputes</span>
                                <span className="font-semibold">{stats?.disputes.total}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Resolved</span>
                                <span className="font-semibold text-[hsl(var(--emerald))]">{stats?.disputes.resolved}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Active</span>
                                <span className="font-semibold text-[hsl(var(--coral))]">{stats?.disputes.active}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground">Resolution Rate</span>
                                <span className="font-semibold text-[hsl(var(--primary))]">{stats?.disputes.resolutionRate}</span>
                            </div>
                        </div>
                    </AnimatedSection>

                    {/* Revenue Stats */}
                    <AnimatedSection animation="animate-flip-in" delay={300} className="rounded-lg shadow-md hover-lift overflow-hidden bg-white">
                        <div className="bg-[hsl(var(--emerald))] p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Revenue (30d)</h3>
                        </div>
                        <div className="bg-card p-6 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Gross Volume</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalGross || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Platform Fee (5%)</span>
                                <span className="font-semibold text-[hsl(var(--emerald))]">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalPlatformFee || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">GST Collected</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalGST || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">TDS Deducted</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalTDS || 0)}
                                </span>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>

                {/* Recent Activity */}
                <AnimatedSection animation="animate-slide-up" delay={400} className="rounded-lg shadow-md overflow-hidden bg-white">
                    <div className="bg-[hsl(var(--navy))] p-6">
                        <div className="flex items-center gap-3">
                            <Clock className="h-6 w-6 text-white" />
                            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                        </div>
                    </div>
                    <div className="divide-y bg-card">
                        {stats?.recentActivity.map((activity, index) => (
                            <div key={index} className="p-4 hover:bg-secondary hover-glow transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium">{activity.action.replace(/_/g, ' ')}</span>
                                        <span className="text-muted-foreground ml-2">
                                            on {activity.entityType} {activity.entityId.slice(0, 8)}...
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(activity.createdAt).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                {activity.actor && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                        by {activity.actor.email} ({activity.actor.role})
                                    </div>
                                )}
                            </div>
                        ))}
                        {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                            <div className="p-4 text-center text-muted-foreground">
                                No recent activity
                            </div>
                        )}
                    </div>
                </AnimatedSection>
            </div>
        </div>
    );
}
