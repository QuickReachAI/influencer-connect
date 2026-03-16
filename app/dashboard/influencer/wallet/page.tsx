"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AnimatedSection } from "@/components/ui/animated-section";
import { toast } from "sonner";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Clock,
  CheckCircle,
  IndianRupee,
  ArrowLeft,
  Filter,
  X,
} from "lucide-react";

interface WalletData {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingEscrow: number;
}

interface Transaction {
  id: string;
  type: "CREDIT" | "DEBIT" | "WITHDRAWAL" | "REFUND";
  amount: number;
  description: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  createdAt: string;
  dealId?: string;
  bankTransactionId?: string;
}

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  return `₹${abs.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type FilterType = "ALL" | "CREDIT" | "WITHDRAWAL";

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalEarned: 0, totalWithdrawn: 0, pendingEscrow: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "influencer") {
      router.push("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    async function fetchWalletData() {
      try {
        const [walletRes, txnRes] = await Promise.all([
          fetch("/api/wallet"),
          fetch("/api/wallet/transactions"),
        ]);

        if (walletRes.ok) {
          const data = await walletRes.json();
          setWallet({
            balance: Number(data.wallet?.balance ?? 0),
            totalEarned: Number(data.wallet?.totalEarned ?? 0),
            totalWithdrawn: Number(data.wallet?.totalWithdrawn ?? 0),
            pendingEscrow: Number(data.wallet?.pendingEscrow ?? 0),
          });
        }

        if (txnRes.ok) {
          const data = await txnRes.json();
          setTransactions(data.transactions ?? []);
        }
      } catch {
        toast.error("Couldn't load your wallet — try refreshing");
      } finally {
        setLoading(false);
      }
    }
    fetchWalletData();
  }, []);

  const filteredTransactions = transactions.filter((txn) => {
    if (filter === "ALL") return true;
    if (filter === "CREDIT") return txn.type === "CREDIT" || txn.type === "REFUND";
    if (filter === "WITHDRAWAL") return txn.type === "WITHDRAWAL" || txn.type === "DEBIT";
    return true;
  });

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount to withdraw");
      return;
    }
    if (amount > wallet.balance) {
      toast.error("Not enough balance for that — check your available funds");
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Withdrawal failed");
      }
      toast.success(`${formatCurrency(amount)} withdrawal initiated — money's on its way!`);
      setShowWithdraw(false);
      setWithdrawAmount("");
      setWallet((w) => ({ ...w, balance: w.balance - amount }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const transactionIcon = (txn: Transaction) => {
    if (txn.type === "CREDIT" || txn.type === "REFUND") {
      return (
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
          <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
        <ArrowUpFromLine className="w-4 h-4 text-red-600" />
      </div>
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="success" className="gap-0.5 text-[10px]">
            <CheckCircle className="w-2.5 h-2.5" />
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="warning" className="gap-0.5 text-[10px]">
            <Clock className="w-2.5 h-2.5" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-0.5 text-[10px]">
            Failed
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav role="influencer" />
        <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
          <div className="h-6 w-36 mb-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-12 w-64 mb-8 rounded bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Available Balance",
      value: formatCurrency(wallet.balance),
      icon: <Wallet className="w-5 h-5" />,
      bg: "bg-[#0E61FF]",
    },
    {
      label: "Total Earned",
      value: formatCurrency(wallet.totalEarned),
      icon: <TrendingUp className="w-5 h-5" />,
      bg: "bg-emerald-600",
    },
    {
      label: "Total Withdrawn",
      value: formatCurrency(wallet.totalWithdrawn),
      icon: <ArrowUpFromLine className="w-5 h-5" />,
      bg: "bg-gray-900",
    },
    {
      label: "Pending Escrow",
      value: formatCurrency(wallet.pendingEscrow),
      icon: <Clock className="w-5 h-5" />,
      bg: "bg-amber-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav role="influencer" />

      <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
        <Link
          href="/dashboard/influencer"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <AnimatedSection animation="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Wallet & Earnings
              </h1>
              <p className="text-gray-500 mt-1">
                Track your earnings and manage withdrawals
              </p>
            </div>
            <Button
              onClick={() => setShowWithdraw(true)}
              className="gap-2 bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white btn-premium w-full sm:w-auto"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Withdraw Funds
            </Button>
          </div>
        </AnimatedSection>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {statCards.map((card, idx) => (
            <AnimatedSection
              key={card.label}
              animation="animate-slide-up"
              delay={idx * 80}
            >
              <Card
                className={`${card.bg} border-none hover-lift stagger-${idx + 1}`}
              >
                <CardContent className="py-5 px-4">
                  <div className="flex items-center gap-2 mb-3 text-white/80">
                    {card.icon}
                    <span className="text-xs font-medium">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {/* Withdraw Modal */}
        {showWithdraw && (
          <AnimatedSection animation="animate-slide-down" className="mb-6">
            <Card className="bg-white shadow-lg border-[#0E61FF]/20 border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <ArrowUpFromLine className="w-5 h-5 text-[#0E61FF]" />
                    Withdraw Funds
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWithdraw(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>
                  Available balance: {formatCurrency(wallet.balance)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="pl-7 text-base sm:text-sm"
                      min="1"
                      max={wallet.balance}
                    />
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    className="bg-[#0E61FF] hover:bg-[#0E61FF]/90 text-white gap-1.5"
                  >
                    {withdrawing ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {withdrawing ? "Processing..." : "Confirm"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Transaction History */}
        <AnimatedSection animation="animate-slide-up" delay={400}>
          <Card className="bg-white shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <IndianRupee className="w-5 h-5" />
                  Transaction History
                </CardTitle>
                <div className="flex items-center gap-1 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  {(["ALL", "CREDIT", "WITHDRAWAL"] as FilterType[]).map(
                    (f) => (
                      <Button
                        key={f}
                        variant={filter === f ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter(f)}
                        className={
                          filter === f
                            ? "bg-[#0E61FF] text-white text-xs"
                            : "text-gray-500 text-xs"
                        }
                      >
                        {f === "ALL"
                          ? "All"
                          : f === "CREDIT"
                            ? "Credits"
                            : "Withdrawals"}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((txn, idx) => (
                    <div
                      key={txn.id}
                      className={`flex items-center gap-2 sm:gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors stagger-${Math.min(idx + 1, 6)}`}
                    >
                      {transactionIcon(txn)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {txn.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(txn.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {statusBadge(txn.status)}
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            txn.amount >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {txn.amount >= 0 ? "+" : ""}
                          {formatCurrency(txn.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
