"use client";

import { useState } from "react";
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

  const brandNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/brand", icon: <Users className="w-4 h-4" /> },
    { label: "Find Influencers", href: "/dashboard/brand/discover", icon: <Search className="w-4 h-4" /> },
    { label: "My Deals", href: "/dashboard/brand/deals", icon: <FileText className="w-4 h-4" /> },
    { label: "Messages", href: "/dashboard/brand/messages", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "Profile", href: "/dashboard/brand/profile", icon: <User className="w-4 h-4" /> },
  ];

  const influencerNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/influencer", icon: <Users className="w-4 h-4" /> },
    { label: "Find Brands", href: "/dashboard/influencer/discover", icon: <Search className="w-4 h-4" /> },
    { label: "My Deals", href: "/dashboard/influencer/deals", icon: <FileText className="w-4 h-4" /> },
    { label: "Messages", href: "/dashboard/influencer/messages", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "Profile", href: "/dashboard/influencer/profile", icon: <User className="w-4 h-4" /> },
  ];

  const adminNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Users", href: "/dashboard/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "Disputes", href: "/dashboard/admin/disputes", icon: <AlertTriangle className="w-4 h-4" /> },
    { label: "Flagged", href: "/dashboard/admin/flagged-messages", icon: <Flag className="w-4 h-4" /> },
  ];

  const navItems =
    role === "admin"
      ? adminNavItems
      : role === "brand"
        ? brandNavItems
        : influencerNavItems;

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    router.push("/");
  };

  return (
    <div className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
              <Zap className="w-6 h-6 text-white icon-hover-bounce" />
            </div>
            <span className="text-2xl font-bold font-heading text-[hsl(var(--navy))]">QuickReach</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[hsl(var(--primary))] px-2 py-0.5 rounded-full">AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2 group",
                    pathname === item.href
                      ? "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 hover:text-white animate-pop"
                      : ""
                  )}
                >
                  <span className="group-hover-bounce">{item.icon}</span>
                  <span className="animated-underline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleLogout} className="gap-2 btn-press">
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
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 group",
                    pathname === item.href
                      ? "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 hover:text-white animate-pop"
                      : ""
                  )}
                >
                  <span className="group-hover-bounce">{item.icon}</span>
                  <span className="animated-underline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
