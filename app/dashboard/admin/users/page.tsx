'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
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
    const { loading: authLoading } = useAuth('admin');
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
                        <div className="w-12 h-12 rounded-lg bg-[#0E61FF] flex items-center justify-center">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    </div>
                    <p className="text-gray-500 mt-1">
                        {pagination?.total || 0} total users
                    </p>
                </div>

                {/* Filters */}
                <AnimatedSection animation="animate-fade-in" className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                            <Search className="h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by email, phone, or name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 border-0 focus:ring-0 text-sm text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-500" />
                            <select
                                value={filters.role}
                                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700"
                            >
                                <option value="">All Roles</option>
                                <option value="CREATOR">Creator</option>
                                <option value="BRAND">Brand</option>
                                <option value="ADMIN">Admin</option>
                            </select>

                            <select
                                value={filters.kycStatus}
                                onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700"
                            >
                                <option value="">All KYC Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="VERIFIED">Verified</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            <select
                                value={filters.isBanned}
                                onChange={(e) => setFilters({ ...filters, isBanned: e.target.value })}
                                className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700"
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
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-900">
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
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={`hover:bg-gray-50 transition-all ${user.isBanned ? 'bg-red-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                user.role === 'CREATOR' ? 'bg-amber-500' : 'bg-[#0E61FF]'
                                            }`}>
                                                {user.role === 'CREATOR' ? (
                                                    <User className="h-5 w-5 text-white" />
                                                ) : (
                                                    <Building2 className="h-5 w-5 text-white" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {user.creatorProfile?.name ||
                                                        user.brandProfile?.companyName ||
                                                        'N/A'}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                                            user.role === 'CREATOR'
                                                ? 'bg-amber-500 text-white'
                                                : user.role === 'BRAND'
                                                ? 'bg-[#0E61FF] text-white'
                                                : 'bg-gray-900 text-white'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {user.kycStatus === 'VERIFIED' ? (
                                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                            ) : user.kycStatus === 'REJECTED' ? (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            ) : (
                                                <Shield className="h-4 w-4 text-amber-500" />
                                            )}
                                            <span className={`text-sm font-medium ${
                                                user.kycStatus === 'VERIFIED'
                                                    ? 'text-emerald-600'
                                                    : user.kycStatus === 'REJECTED'
                                                    ? 'text-red-600'
                                                    : 'text-amber-500'
                                            }`}>
                                                {user.kycStatus}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user._count.dealsAsCreator + user._count.dealsAsBrand}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.isBanned ? (
                                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-medium">
                                                Banned
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded font-medium">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {!user.isBanned && user.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => setBanModal({ user, reason: '' })}
                                                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 transition-colors"
                                            >
                                                <Ban className="h-4 w-4" />
                                                Ban
                                            </button>
                                        )}
                                        {user.isBanned && (
                                            <span className="text-xs text-gray-500">
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
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                                {pagination.total}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchUsers(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchUsers(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
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
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2 mb-4">
                            <Ban className="h-5 w-5" />
                            Ban User
                        </h3>
                        <p className="text-gray-500 mb-4">
                            You are about to permanently ban{' '}
                            <strong className="text-gray-900">{banModal.user.email}</strong>. This action cannot be undone.
                        </p>
                        <textarea
                            value={banModal.reason}
                            onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                            placeholder="Enter ban reason (required)..."
                            className="w-full p-3 border border-gray-200 rounded-lg mb-4 text-gray-900 placeholder:text-gray-400"
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBanModal({ user: null, reason: '' })}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={banUser}
                                disabled={!banModal.reason}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors"
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
