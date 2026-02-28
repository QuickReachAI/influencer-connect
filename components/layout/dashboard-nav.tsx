"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, Search, MessageSquare, FileText, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function DashboardNav({ role }: { role: "brand" | "influencer" }) {
  const pathname = usePathname();
  const router = useRouter();

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

  const navItems = role === "brand" ? brandNavItems : influencerNavItems;

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    router.push("/");
  };

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              InfluencerConnect
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2",
                    pathname === item.href && "bg-purple-50 text-purple-700"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
