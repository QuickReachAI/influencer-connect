'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

interface EscalationData {
  pendingKYC: any[];
  pendingKYB: any[];
}

export default function EscalationQueuePage() {
  const { loading: authLoading } = useAuth('admin');
  const [data, setData] = useState<EscalationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kyc' | 'kyb'>('kyc');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/escalation-queue');
        if (!res.ok) throw new Error('Failed to fetch escalation data');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Escalation Queue</h1>
          <p className="text-sm text-gray-500">Pending KYC and KYB verification cases</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'kyc'
                ? 'bg-[#0E61FF] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="h-4 w-4" />
            Pending KYC ({data?.pendingKYC.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('kyb')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'kyb'
                ? 'bg-[#0E61FF] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Pending KYB ({data?.pendingKYB.length || 0})
          </button>
        </div>

        {/* KYC Tab */}
        {activeTab === 'kyc' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#0E61FF] p-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Pending KYC Verifications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Registered</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.pendingKYC.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user.creatorProfile?.name || 'N/A'}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.phone}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition-colors">
                            Approve
                          </button>
                          <button className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.pendingKYC || data.pendingKYC.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No pending KYC cases
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KYB Tab */}
        {activeTab === 'kyb' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-amber-500 p-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Pending KYB Verifications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">GSTIN</th>
                    <th className="px-4 py-3 text-left">Filing Status</th>
                    <th className="px-4 py-3 text-left">Registered</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.pendingKYB.map((brand) => (
                    <tr key={brand.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{brand.companyName}</td>
                      <td className="px-4 py-3">{brand.user?.email}</td>
                      <td className="px-4 py-3 font-mono text-xs">{brand.gstin || 'Not provided'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          brand.gstinVerified
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {brand.filingStatus || (brand.gstin ? 'Unverified' : 'Missing GSTIN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(brand.user?.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-[#0E61FF] text-white rounded text-xs hover:bg-[#0B4FD9] transition-colors">
                            Verify
                          </button>
                          <button className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 transition-colors">
                            Request Info
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.pendingKYB || data.pendingKYB.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No pending KYB cases
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
