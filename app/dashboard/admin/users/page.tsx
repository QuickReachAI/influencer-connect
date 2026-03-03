'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Users,
    ChevronLeft,
    Search,
    Filter,
    Ban,
    Shield,
    CheckCircle,
    XCircle,
    User,
    Building2
} from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

interface UserData {
    id: string;
    email: string;
    phone: string;
    role: string;
    kycStatus: string;
    isBanned: boolean;
    banReason?: string;
    bannedAt?: string;
    createdAt: string;
    creatorProfile?: {
        name: string;
        reliabilityScore: number;
        totalDealsCompleted: number;
        totalEarnings: number;
    };
    brandProfile?: {
        companyName: string;
        industry: string;
    };
    _count: {
        dealsAsCreator: number;
        dealsAsBrand: number;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        role: '',
        kycStatus: '',
        isBanned: ''
    });
    const [search, setSearch] = useState('');
    const [banModal, setBanModal] = useState<{ user: UserData | null; reason: string }>({
        user: null,
        reason: ''
    });

    useEffect(() => {
        fetchUsers();
    }, [filters]);

    async function fetchUsers(page = 1) {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            if (filters.role) params.set('role', filters.role);
            if (filters.kycStatus) params.set('kycStatus', filters.kycStatus);
            if (filters.isBanned) params.set('isBanned', filters.isBanned);

            const res = await fetch(`/api/admin/users?${params}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function banUser() {
        if (!banModal.user || !banModal.reason) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: banModal.user.id,
                    reason: banModal.reason
                })
            });

            if (res.ok) {
                fetchUsers(pagination?.page || 1);
                setBanModal({ user: null, reason: '' });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to ban user');
            }
        } catch (error) {
            console.error('Error banning user:', error);
        }
    }

    const filteredUsers = users.filter((user) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            user.email.toLowerCase().includes(searchLower) ||
            user.phone.includes(search) ||
            user.creatorProfile?.name.toLowerCase().includes(searchLower) ||
            user.brandProfile?.companyName.toLowerCase().includes(searchLower)
        );
    });

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
                        <div className="w-12 h-12 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        {pagination?.total || 0} total users
                    </p>
                </div>

                {/* Filters */}
                <AnimatedSection animation="animate-slide-right" className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                            <Search className="h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by email, phone, or name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 border-0 focus:ring-0 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-muted-foreground" />
                            <select
                                value={filters.role}
                                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                className="border rounded px-3 py-1.5 text-sm"
                            >
                                <option value="">All Roles</option>
                                <option value="CREATOR">Creator</option>
                                <option value="BRAND">Brand</option>
                                <option value="ADMIN">Admin</option>
                            </select>

                            <select
                                value={filters.kycStatus}
                                onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}
                                className="border rounded px-3 py-1.5 text-sm"
                            >
                                <option value="">All KYC Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="VERIFIED">Verified</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            <select
                                value={filters.isBanned}
                                onChange={(e) => setFilters({ ...filters, isBanned: e.target.value })}
                                className="border rounded px-3 py-1.5 text-sm"
                            >
                                <option value="">All Users</option>
                                <option value="false">Active</option>
                                <option value="true">Banned</option>
                            </select>
                        </div>
                    </div>
                </AnimatedSection>

                {/* Users Table */}
                <AnimatedSection animation="animate-slide-up" delay={100} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-[hsl(var(--navy))]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                                    KYC Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                                    Deals
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-border">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={`hover-glow transition-all ${user.isBanned ? 'bg-destructive/10' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                user.role === 'CREATOR' ? 'bg-[hsl(var(--coral))]' : 'bg-[hsl(var(--primary))]'
                                            }`}>
                                                {user.role === 'CREATOR' ? (
                                                    <User className="h-5 w-5 text-white" />
                                                ) : (
                                                    <Building2 className="h-5 w-5 text-white" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {user.creatorProfile?.name ||
                                                        user.brandProfile?.companyName ||
                                                        'N/A'}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                                            user.role === 'CREATOR'
                                                ? 'bg-[hsl(var(--coral))] text-white'
                                                : user.role === 'BRAND'
                                                ? 'bg-[hsl(var(--primary))] text-white'
                                                : 'bg-[hsl(var(--navy))] text-white'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {user.kycStatus === 'VERIFIED' ? (
                                                <CheckCircle className="h-4 w-4 text-[hsl(var(--emerald))]" />
                                            ) : user.kycStatus === 'REJECTED' ? (
                                                <XCircle className="h-4 w-4 text-[hsl(var(--rose))]" />
                                            ) : (
                                                <Shield className="h-4 w-4 text-[hsl(var(--sunflower))]" />
                                            )}
                                            <span className={`text-sm font-medium ${
                                                user.kycStatus === 'VERIFIED'
                                                    ? 'text-[hsl(var(--emerald))]'
                                                    : user.kycStatus === 'REJECTED'
                                                    ? 'text-[hsl(var(--rose))]'
                                                    : 'text-[hsl(var(--sunflower))]'
                                            }`}>
                                                {user.kycStatus}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {user._count.dealsAsCreator + user._count.dealsAsBrand}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.isBanned ? (
                                            <span className="px-2 py-1 text-xs bg-[hsl(var(--rose))] text-white rounded font-medium">
                                                Banned
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs bg-[hsl(var(--emerald))] text-white rounded font-medium">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {!user.isBanned && user.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => setBanModal({ user, reason: '' })}
                                                className="text-destructive hover:text-destructive text-sm font-medium flex items-center gap-1 btn-animate"
                                            >
                                                <Ban className="h-4 w-4" />
                                                Ban
                                            </button>
                                        )}
                                        {user.isBanned && (
                                            <span className="text-xs text-muted-foreground">
                                                {user.banReason?.slice(0, 30)}...
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                                {pagination.total}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchUsers(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 btn-animate"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchUsers(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 btn-animate"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </AnimatedSection>
            </div>

            {/* Ban Modal */}
            {banModal.user && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-[hsl(var(--rose))] flex items-center gap-2 mb-4">
                            <Ban className="h-5 w-5" />
                            Ban User
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            You are about to permanently ban{' '}
                            <strong>{banModal.user.email}</strong>. This action cannot be undone.
                        </p>
                        <textarea
                            value={banModal.reason}
                            onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                            placeholder="Enter ban reason (required)..."
                            className="w-full p-3 border rounded-lg mb-4"
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBanModal({ user: null, reason: '' })}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-secondary btn-animate"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={banUser}
                                disabled={!banModal.reason}
                                className="flex-1 px-4 py-2 bg-[hsl(var(--rose))] hover:bg-[hsl(var(--rose))]/90 text-white rounded-lg disabled:opacity-50 btn-animate"
                            >
                                Confirm Ban
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
