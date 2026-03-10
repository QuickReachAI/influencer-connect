"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  MessageSquare,
  FileText,
  LogOut,
  User,
  Menu,
  X,
  LayoutDashboard,
  AlertTriangle,
  Flag,
  Zap,
  Wallet,
  Megaphone,
  IndianRupee,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function DashboardNav({ role }: { role: "brand" | "influencer" | "admin" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Fetch unread notification count
  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUnreadCount(data.count || 0); })
      .catch(() => {});
  }, [pathname]);

  async function toggleNotifications() {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications?pageSize=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "PUT" });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (role !== "brand" && role !== "influencer") return;

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (role === "brand") {
          const bp = data.user?.brandProfile;
          if (!bp) { setProfileCompletion(0); return; }
          let score = 0;
          if (bp.companyName) score += 15;
          if (bp.industry) score += 10;
          if (bp.description && bp.description.length >= 20) score += 15;
          if (bp.website && bp.website.includes(".")) score += 10;
          if (bp.logo) score += 5;
          const niches = (() => { try { return JSON.parse(localStorage.getItem("brandNiches") || "[]"); } catch { return []; } })();
          if (niches.length > 0) score += 15;
          if (data.user?.kycStatus === "VERIFIED") score += 10;
          if (bp.gstinVerified || bp.gstin) score += 20;
          localStorage.setItem("brandProfileComplete", score >= 100 ? "true" : "false");
          setProfileCompletion(score);
        } else {
          const cp = data.user?.creatorProfile;
          if (!cp) { setProfileCompletion(0); return; }
          let score = 0;
          if (cp.name && cp.name.length >= 2) score += 15;
          if (cp.bio && cp.bio.length >= 20) score += 15;
          if (cp.avatar) score += 5;
          const niches = (() => { try { return JSON.parse(localStorage.getItem("infNiches") || "[]"); } catch { return []; } })();
          if (niches.length > 0) score += 15;
          const entities = (() => { try { return JSON.parse(localStorage.getItem("infEntities") || "[]"); } catch { return []; } })();
          if (entities.length > 0) score += 30;
          if (data.user?.kycStatus === "VERIFIED") score += 10;
          const privacyConsent = localStorage.getItem("infPrivacyConsent") === "true";
          if (privacyConsent) score += 10;
          localStorage.setItem("infProfileComplete", score >= 100 ? "true" : "false");
          setProfileCompletion(score);
        }
      })
      .catch(() => {});
  }, [role, pathname]);

  const brandNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/brand", icon: <Users className="w-4 h-4" /> },
    { label: "Posts", href: "/dashboard/brand/campaigns", icon: <Megaphone className="w-4 h-4" /> },
    { label: "Deals", href: "/dashboard/brand/deals", icon: <FileText className="w-4 h-4" /> },
    { label: "Profile", href: "/dashboard/brand/profile", icon: <User className="w-4 h-4" /> },
  ];

  const influencerNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/influencer", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Discover", href: "/dashboard/influencer/discover", icon: <Search className="w-4 h-4" /> },
    { label: "Conversations", href: "/dashboard/influencer/conversations", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "Deals", href: "/dashboard/influencer/deals", icon: <FileText className="w-4 h-4" /> },
    { label: "Wallet", href: "/dashboard/influencer/wallet", icon: <Wallet className="w-4 h-4" /> },
    { label: "Profile", href: "/dashboard/influencer/profile", icon: <User className="w-4 h-4" /> },
  ];

  const adminNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Users", href: "/dashboard/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "Disputes", href: "/dashboard/admin/disputes", icon: <AlertTriangle className="w-4 h-4" /> },
    { label: "Flagged", href: "/dashboard/admin/flagged-messages", icon: <Flag className="w-4 h-4" /> },
    { label: "Finance", href: "/dashboard/admin/finance", icon: <IndianRupee className="w-4 h-4" /> },
  ];

  const navItems =
    role === "admin"
      ? adminNavItems
      : role === "brand"
        ? brandNavItems
        : influencerNavItems;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // continue with client-side cleanup even if API fails
    }
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("brandProfileComplete");
    localStorage.removeItem("brandNiches");
    localStorage.removeItem("infProfileComplete");
    localStorage.removeItem("infNiches");
    localStorage.removeItem("infEntities");
    localStorage.removeItem("infPrivacyConsent");
    router.push("/");
  };

  const showBanner = (role === "brand" || role === "influencer") && profileCompletion !== null && profileCompletion < 100;
  const profileHref = role === "brand" ? "/dashboard/brand/profile?complete=true" : "/dashboard/influencer/profile?complete=true";
  const isOnProfile = pathname === "/dashboard/brand/profile" || pathname === "/dashboard/influencer/profile";

  return (
    <>
      <div className="border-b-2 border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href={role === "admin" ? "/dashboard/admin" : role === "brand" ? "/dashboard/brand" : "/dashboard/influencer"} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-[#0E61FF] rounded-xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Quick<span className="text-[#0E61FF]">Connects</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "gap-2 rounded-xl text-gray-600 hover:text-gray-900",
                      pathname === item.href
                        ? "bg-[#0E61FF] text-white hover:bg-[#0B4FD9] hover:text-white"
                        : ""
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-500 hover:text-gray-900"
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 w-[calc(100vw-2rem)] sm:w-80 max-h-[70vh] sm:max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-[#0E61FF] hover:underline font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {notifLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="w-5 h-5 border-2 border-[#0E61FF] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">
                          No notifications yet
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((n: any) => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.readAt ? "bg-blue-50/50" : ""}`}
                            >
                              <p className="text-sm text-gray-800">{n.title}</p>
                              {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(n.createdAt).toLocaleString("en-IN", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button variant="ghost" onClick={handleLogout} className="gap-2 text-gray-500 hover:text-red-600">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden pb-4 flex flex-col gap-1 animate-slide-down">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      pathname === item.href
                        ? "bg-[#0E61FF] text-white hover:bg-[#0B4FD9] hover:text-white"
                        : "text-gray-600"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Brand profile completion banner — visible on every page until complete */}
      {showBanner && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-amber-800 truncate">
                  Your profile is incomplete ({profileCompletion}%)
                </p>
                <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
                  <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-amber-700 tabular-nums">{profileCompletion}%</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-0.5">Complete your profile to 100% to start {role === "brand" ? "posting and getting deals" : "discovering posts and getting deals"}.</p>
            </div>
            {!isOnProfile && (
              <Link href={profileHref}>
                <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 gap-1 flex-shrink-0">
                  <User className="w-3.5 h-3.5" /> Complete Profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
