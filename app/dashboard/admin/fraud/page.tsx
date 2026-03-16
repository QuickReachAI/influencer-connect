'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Eye } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

interface FraudData {
  highEngagementLowFollowers: any[];
  lowEngagementHighFollowers: any[];
  zeroEngagement: any[];
  totalSuspicious: number;
}

export default function FraudDetectionPage() {
  const { loading: authLoading } = useAuth('admin');
  const [data, setData] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/fraud-detection');
        if (!res.ok) throw new Error('Failed to fetch fraud data');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleBan(userId: string, reason: string) {
    try {
      await fetch('/api/admin/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban_users',
          userIds: [userId],
          reason,
        }),
      });
      // Refresh data
      window.location.reload();
    } catch (err) {
      alert('Failed to ban user');
    }
  }

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

  const allSuspicious = [
    ...(data?.highEngagementLowFollowers || []),
    ...(data?.lowEngagementHighFollowers || []),
    ...(data?.zeroEngagement || []),
  ];

  const anomalyColors: Record<string, string> = {
    HIGH_ENGAGEMENT_LOW_FOLLOWERS: 'bg-amber-100 text-amber-700',
    LOW_ENGAGEMENT_HIGH_FOLLOWERS: 'bg-red-100 text-red-700',
    ZERO_ENGAGEMENT_WITH_DEALS: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fraud Detection</h1>
            <p className="text-sm text-gray-500">
              {data?.totalSuspicious || 0} suspicious entities detected
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">High Engagement / Low Followers</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data?.highEngagementLowFollowers.length || 0}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Low Engagement / High Followers</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data?.lowEngagementHighFollowers.length || 0}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Zero Engagement with Deals</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data?.zeroEngagement.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suspicious Entities Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-red-600 p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Suspicious Entities</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left">Platform</th>
                  <th className="px-3 sm:px-4 py-3 text-left">Handle</th>
                  <th className="px-3 sm:px-4 py-3 text-left hidden sm:table-cell">Owner</th>
                  <th className="px-3 sm:px-4 py-3 text-right hidden md:table-cell">Followers</th>
                  <th className="px-3 sm:px-4 py-3 text-right hidden md:table-cell">Engagement</th>
                  <th className="px-3 sm:px-4 py-3 text-left">Anomaly</th>
                  <th className="px-3 sm:px-4 py-3 text-left hidden lg:table-cell">Reason</th>
                  <th className="px-3 sm:px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allSuspicious.map((entity) => (
                  <tr key={entity.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-3 font-medium">{entity.platform}</td>
                    <td className="px-3 sm:px-4 py-3">@{entity.handle}</td>
                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                      {entity.master?.email}
                      {entity.master?.isBanned && (
                        <span className="ml-1 text-xs text-red-500">(banned)</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right font-mono hidden md:table-cell">
                      {entity.followerCount.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right font-mono hidden md:table-cell">{Number(entity.engagementRate).toFixed(2)}%</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${anomalyColors[entity.anomaly] || 'bg-gray-200'}`}>
                        {entity.anomaly.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-500 text-xs max-w-xs truncate hidden lg:table-cell">{entity.reason}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {!entity.master?.isBanned && (
                          <button
                            onClick={() => handleBan(entity.masterId, `Fraud detection: ${entity.reason}`)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Ban user"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {allSuspicious.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No suspicious entities detected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
