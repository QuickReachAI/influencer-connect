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
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-1">QuickCollab Platform Overview</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Link
                        href="/dashboard/admin/disputes"
                        className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-lg flex items-center gap-3 transition-colors"
                    >
                        <AlertTriangle className="h-6 w-6" />
                        <div>
                            <div className="font-semibold">Active Disputes</div>
                            <div className="text-2xl font-bold">{stats?.disputes.active || 0}</div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/admin/users"
                        className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg flex items-center gap-3 transition-colors"
                    >
                        <Users className="h-6 w-6" />
                        <div>
                            <div className="font-semibold">Total Users</div>
                            <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/admin/flagged-messages"
                        className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg flex items-center gap-3 transition-colors"
                    >
                        <MessageSquare className="h-6 w-6" />
                        <div>
                            <div className="font-semibold">Flagged Messages</div>
                            <div className="text-sm">Review Required</div>
                        </div>
                    </Link>

                    <div className="bg-green-500 text-white p-4 rounded-lg flex items-center gap-3">
                        <DollarSign className="h-6 w-6" />
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
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Users Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-8 w-8 text-blue-500" />
                            <h3 className="text-lg font-semibold">Users</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Creators</span>
                                <span className="font-semibold">{stats?.users.creators}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Brands</span>
                                <span className="font-semibold">{stats?.users.brands}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">KYC Verified</span>
                                <span className="font-semibold text-green-600">{stats?.users.verified}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Banned</span>
                                <span className="font-semibold text-red-600">{stats?.users.banned}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-gray-600">New (30d)</span>
                                <span className="font-semibold text-blue-600">+{stats?.users.newThisPeriod}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deals Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="h-8 w-8 text-purple-500" />
                            <h3 className="text-lg font-semibold">Deals</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total</span>
                                <span className="font-semibold">{stats?.deals.total}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Completed</span>
                                <span className="font-semibold text-green-600">{stats?.deals.completed}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Disputed</span>
                                <span className="font-semibold text-orange-600">{stats?.deals.disputed}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-gray-600">Total Value</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.deals.totalValue || 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Disputes Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="h-8 w-8 text-orange-500" />
                            <h3 className="text-lg font-semibold">Mediation</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Disputes</span>
                                <span className="font-semibold">{stats?.disputes.total}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Resolved</span>
                                <span className="font-semibold text-green-600">{stats?.disputes.resolved}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Active</span>
                                <span className="font-semibold text-orange-600">{stats?.disputes.active}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-gray-600">Resolution Rate</span>
                                <span className="font-semibold text-blue-600">{stats?.disputes.resolutionRate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="h-8 w-8 text-green-500" />
                            <h3 className="text-lg font-semibold">Revenue (30d)</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Gross Volume</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalGross || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Platform Fee (5%)</span>
                                <span className="font-semibold text-green-600">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalPlatformFee || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">GST Collected</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalGST || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">TDS Deducted</span>
                                <span className="font-semibold">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(stats?.revenue.totalTDS || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                        <div className="flex items-center gap-3">
                            <Clock className="h-6 w-6 text-gray-500" />
                            <h3 className="text-lg font-semibold">Recent Activity</h3>
                        </div>
                    </div>
                    <div className="divide-y">
                        {stats?.recentActivity.map((activity, index) => (
                            <div key={index} className="p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium">{activity.action.replace(/_/g, ' ')}</span>
                                        <span className="text-gray-500 ml-2">
                                            on {activity.entityType} {activity.entityId.slice(0, 8)}...
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(activity.createdAt).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                {activity.actor && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        by {activity.actor.email} ({activity.actor.role})
                                    </div>
                                )}
                            </div>
                        ))}
                        {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                            <div className="p-4 text-center text-gray-500">
                                No recent activity
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
