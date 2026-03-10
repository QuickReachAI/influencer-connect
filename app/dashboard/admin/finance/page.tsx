"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import {
  ChevronLeft,
  DollarSign,
  Download,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  IndianRupee,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface LedgerEntry {
  id: string;
  source: "ESCROW" | "WALLET";
  type: string;
  amount: number;
  status: string;
  dealId?: string;
  dealTitle?: string;
  userId?: string;
  userEmail?: string;
  description?: string;
  createdAt: string;
}

interface FinanceSummary {
  totalEscrowDeposits: number;
  totalEscrowReleases: number;
  totalWalletCredits: number;
  totalWalletWithdrawals: number;
  totalPlatformFees: number;
  pendingTransactions: number;
}

type FilterSource = "ALL" | "ESCROW" | "WALLET";
type FilterStatus = "ALL" | "COMPLETED" | "PENDING" | "FAILED";

export default function FinanceAuditPage() {
  const { loading: authLoading } = useAuth("admin");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalEscrowDeposits: 0,
    totalEscrowReleases: 0,
    totalWalletCredits: 0,
    totalWalletWithdrawals: 0,
    totalPlatformFees: 0,
    pendingTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<FilterSource>("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  useEffect(() => {
    async function fetchFinance() {
      try {
        const [ledgerRes, summaryRes] = await Promise.all([
          fetch("/api/admin/finance/ledger"),
          fetch("/api/admin/finance/summary"),
        ]);

        if (ledgerRes.ok) {
          const data = await ledgerRes.json();
          setEntries(data.entries ?? []);
        }
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data.summary ?? summary);
        }
      } catch {
        toast.error("Failed to load financial data");
      } finally {
        setLoading(false);
      }
    }
    fetchFinance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchTerm ||
      entry.dealTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === "ALL" || entry.source === sourceFilter;
    const matchesStatus = statusFilter === "ALL" || entry.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = ["ID", "Source", "Type", "Amount", "Status", "Deal", "User", "Description", "Date"];
    const rows = filteredEntries.map((e) => [
      e.id,
      e.source,
      e.type,
      e.amount,
      e.status,
      e.dealTitle || e.dealId || "",
      e.userEmail || e.userId || "",
      e.description || "",
      new Date(e.createdAt).toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const formatCurrency = (amount: number) =>
    `₹${Math.abs(amount).toLocaleString("en-IN")}`;

  const statCards = [
    { label: "Escrow Deposits", value: formatCurrency(summary.totalEscrowDeposits), icon: <ArrowDownToLine className="w-5 h-5" />, bg: "bg-[#0E61FF]" },
    { label: "Escrow Releases", value: formatCurrency(summary.totalEscrowReleases), icon: <ArrowUpFromLine className="w-5 h-5" />, bg: "bg-emerald-600" },
    { label: "Platform Fees", value: formatCurrency(summary.totalPlatformFees), icon: <TrendingUp className="w-5 h-5" />, bg: "bg-amber-500" },
    { label: "Wallet Withdrawals", value: formatCurrency(summary.totalWalletWithdrawals), icon: <Wallet className="w-5 h-5" />, bg: "bg-gray-900" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse max-w-6xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/admin"
            className="text-[#0E61FF] hover:text-[#0B4FD9] flex items-center gap-1 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Financial Audit Trail</h1>
                <p className="text-gray-500 text-sm">
                  Read-only ledger of all Escrow and Wallet transactions
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="gap-2"
              disabled={filteredEntries.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, idx) => (
            <AnimatedSection key={card.label} animation="animate-slide-up" delay={idx * 80}>
              <Card className={`${card.bg} border-none`}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-center gap-2 mb-2 text-white/80">
                    {card.icon}
                    <span className="text-xs font-medium">{card.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{card.value}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {/* Filters */}
        <AnimatedSection animation="animate-fade-in" delay={400}>
          <Card className="mb-6 bg-white shadow-md">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by deal, user, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  {(["ALL", "ESCROW", "WALLET"] as FilterSource[]).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={sourceFilter === f ? "default" : "ghost"}
                      onClick={() => setSourceFilter(f)}
                      className={sourceFilter === f ? "bg-[#0E61FF] text-white text-xs" : "text-gray-500 text-xs"}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {(["ALL", "COMPLETED", "PENDING"] as FilterStatus[]).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={statusFilter === f ? "default" : "ghost"}
                      onClick={() => setStatusFilter(f)}
                      className={statusFilter === f ? "bg-gray-900 text-white text-xs" : "text-gray-500 text-xs"}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Ledger Table */}
        <AnimatedSection animation="animate-slide-up" delay={500}>
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <IndianRupee className="w-5 h-5" />
                Transaction Ledger
                <span className="text-sm font-normal text-gray-500 ml-auto">
                  {filteredEntries.length} entries
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No transactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Source</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Deal / User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-4 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge
                              variant={entry.source === "ESCROW" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {entry.source}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-700 text-xs">
                            {entry.type.replace(/_/g, " ")}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`font-semibold tabular-nums ${
                              entry.amount >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}>
                              {entry.amount >= 0 ? "+" : ""}
                              {formatCurrency(entry.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            {entry.status === "COMPLETED" ? (
                              <Badge variant="default" className="gap-0.5 text-[10px]">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Completed
                              </Badge>
                            ) : entry.status === "PENDING" ? (
                              <Badge variant="secondary" className="gap-0.5 text-[10px]">
                                <Clock className="w-2.5 h-2.5" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Failed
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                            {entry.dealTitle || entry.userEmail || entry.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
