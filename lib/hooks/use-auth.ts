"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: "CREATOR" | "BRAND" | "ADMIN";
  kycStatus: string;
  creatorProfile?: {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
  } | null;
  brandProfile?: {
    id: string;
    companyName: string;
    industry?: string;
    description?: string;
    website?: string;
    logo?: string;
    gstin?: string;
    gstinVerified?: boolean;
  } | null;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

const ROLE_DASHBOARD: Record<string, string> = {
  BRAND: "/dashboard/brand",
  CREATOR: "/dashboard/influencer",
  ADMIN: "/dashboard/admin",
};

export function useAuth(requiredRole?: "brand" | "influencer" | "admin"): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (!cancelled) router.replace("/auth/login");
          return;
        }

        const data = await res.json();
        const fetchedUser: User = data.user;

        if (!fetchedUser) {
          if (!cancelled) router.replace("/auth/login");
          return;
        }

        // Check role match
        const roleMap: Record<string, string> = {
          brand: "BRAND",
          influencer: "CREATOR",
          admin: "ADMIN",
        };

        if (requiredRole && fetchedUser.role !== roleMap[requiredRole]) {
          const correctDash = ROLE_DASHBOARD[fetchedUser.role] || "/auth/login";
          if (!cancelled) router.replace(correctDash);
          return;
        }

        if (!cancelled) {
          setUser(fetchedUser);
          setLoading(false);
        }
      } catch {
        if (!cancelled) router.replace("/auth/login");
      }
    }

    fetchUser();
    return () => { cancelled = true; };
  }, [requiredRole, router]);

  return { user, loading };
}
